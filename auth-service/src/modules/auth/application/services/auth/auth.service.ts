import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { DatabaseService } from 'src/infra/database/database.service';
import { KafkaService } from 'src/infra/kafka/kafka/kafka.service';
import { RedisService } from 'src/infra/redis/redis/redis.service';
import { comparePassword, hashPassword } from 'src/common/utils/hash-password';
import { RegisterDto } from 'src/modules/auth/presentation/dto/register.dto';
import { LoginDto } from 'src/modules/auth/presentation/dto/login.dto';
import {
  generateAuthToken,
  TokenPayload,
} from 'src/common/utils/generate-token';

@Injectable()
export class AuthService {
  constructor(
    private prisma: DatabaseService,
    private jwtService: JwtService,
    private kafkaService: KafkaService,
    private redis: RedisService,
  ) {}

  /** ================= REGISTER ================= */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: { ...dto, password: hashed },
    });

    // Publish Kafka event
    await this.kafkaService.sendMessage(
      'user-registered',
      JSON.stringify({ userId: user.id, email: user.email }),
    );

    return { id: user.id, email: user.email, name: user.name };
  }

  /** ================= LOGIN ================= */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new NotFoundException('User not found');

    const valid = await comparePassword(dto.password, user.password!);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.createTokensAndSession(user.id, user.email, user.role);
  }

  /** ================= REFRESH TOKEN ================= */
  async refreshToken(oldToken: string) {
    const tokens = await this.prisma.refreshToken.findMany();
    let token: (typeof tokens)[number] | undefined;
    for (const t of tokens) {
      if (await comparePassword(oldToken, t.tokenHash)) {
        token = t;
        break;
      }
    }
    if (!token) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.prisma.user.findUnique({
      where: { id: token.userId },
    });
    if (!user) throw new NotFoundException('User not found');

    return this.createTokensAndSession(user.id, user.email, user.role);
  }

  /** ================= CREATE TOKENS + SESSION ================= */
  private async createTokensAndSession(
    userId: string,
    email: string,
    role?: string,
  ) {
    // Access token using shared util
    const payload: TokenPayload = { userId, email, role };
    const accessToken = generateAuthToken(this.jwtService, payload);

    // Refresh token
    const refreshToken = randomUUID();
    const hashedRefresh = await hashPassword(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashedRefresh,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // User session
    await this.prisma.userSession.create({
      data: { userId, deviceInfo: 'Browser', ipAddress: '127.0.0.1' },
    });

    return { accessToken, refreshToken };
  }

  /** ================= FORGOT PASSWORD ================= */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    const otp = this.generateOtp();
    await this.redis.set(`otp:${email}`, otp, 300); // 5 min TTL

    await this.kafkaService.sendMessage(
      'otp-generated',
      JSON.stringify({ email, otp }),
    );

    return { message: 'OTP sent to email' };
  }

  /** ================= VERIFY OTP ================= */
  async verifyOtp(email: string, otp: string) {
    const storedOtp = await this.redis.get(`otp:${email}`);
    if (!storedOtp) throw new BadRequestException('OTP expired or invalid');
    if (storedOtp !== otp) throw new BadRequestException('Invalid OTP');

    return { message: 'OTP verified successfully' };
  }

  /** ================= RESET PASSWORD ================= */
  async resetPassword(email: string, otp: string, newPassword: string) {
    await this.verifyOtp(email, otp); // Reuse verify logic

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    const hashed = await hashPassword(newPassword);
    await this.prisma.user.update({
      where: { email },
      data: { password: hashed },
    });
    await this.redis.del(`otp:${email}`);

    return { message: 'Password reset successfully' };
  }

  /** ================= SESSION MANAGEMENT ================= */
  async getSessions(userId: string) {
    return this.prisma.userSession.findMany({ where: { userId } });
  }

  async logoutSession(sessionId: string) {
    await this.prisma.userSession.delete({ where: { id: sessionId } });
    return { message: 'Session logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.prisma.userSession.deleteMany({ where: { userId } });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: 'All sessions logged out successfully' };
  }

  /** ================= HELPERS ================= */
  private generateOtp(length = 6): string {
    return Math.floor(100000 + Math.random() * 900000)
      .toString()
      .slice(0, length);
  }
}
