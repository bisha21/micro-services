import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Kafka, Producer, Consumer, KafkaMessage } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);

  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'auth-service',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'], // can use env
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({
      groupId: process.env.KAFKA_GROUP || 'auth-group',
    });
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('✅ Kafka Producer connected');

    await this.consumer.connect();
    this.logger.log('✅ Kafka Consumer connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
    this.logger.log('⚠️ Kafka disconnected');
  }

  /** Send message to Kafka topic */
  async sendMessage(topic: string, message: string) {
    await this.producer.send({
      topic,
      messages: [{ value: message }],
    });
    this.logger.log(`Message sent to topic "${topic}": ${message}`);
  }

  /** Subscribe to a topic */
  async subscribe(topic: string, callback: (message: string) => void) {
    await this.consumer.subscribe({ topic, fromBeginning: true });
    await this.consumer.run({
      eachMessage: async ({ message }: { message: KafkaMessage }) => {
        const value = message.value?.toString();
        if (value) callback(value);
      },
    });
    this.logger.log(`Subscribed to topic "${topic}"`);
  }
}
