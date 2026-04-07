import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import JwtConstants from '../config/jwt-config';

export type TokenPayload = {
  userId: string;
  email: string;
  role?: string;
};

export const generateAuthToken = (
  jwtService: JwtService,
  payload: TokenPayload,
) => {
  const options: JwtSignOptions = {
    secret: JwtConstants.secret,
    expiresIn: JwtConstants.expiresIn as JwtSignOptions['expiresIn'],
  };
  return jwtService.sign(payload, options);
};
