import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
  Logger,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { ActivityModule } from './activity/activity.module';
import { AuthModule } from './auth/auth.module';
import { GoogleAuthModule } from './auth/google-auth/google-auth.module';
import { EventRegistrationModule } from './event-registration/event-registration.module';
import { WinstonLoggerModule } from './logger/winston.logger';
import { initializeConsoleSanitization } from './utils/logging-sanitizer';
import { HttpLoggerMiddleware } from './middlewares/http-logger.middleware';

// Import your entities
import { User } from './user/entities/user.entity';
import { Activity } from './activity/entities/activity.entity';
import { EventRegistration } from './event-registration/entities/event-registration.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    WinstonLoggerModule,
    // Configure TypeORM for PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres',
          host: configService.get<string>('POSTGRES_HOST', 'localhost'),
          port: configService.get<number>('POSTGRES_PORT', 5432),
          username: configService.get<string>('POSTGRES_USER', 'postgres'),
          password: configService.get<string>('POSTGRES_PASSWORD', 'postgres'),
          database: configService.get<string>(
            'POSTGRES_DATABASE',
            'nsc_events',
          ),
          entities: [User, Activity, EventRegistration],
          synchronize: configService.get<boolean>('TYPEORM_SYNCHRONIZE', true),
          logging: false, // Disable SQL query logging to prevent PII exposure
        };
      },
    }),
    UserModule,
    ActivityModule,
    AuthModule,
    GoogleAuthModule,
    EventRegistrationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  private logger = new Logger('AppModule');

  constructor() {
    // Initialize console sanitization on application startup
    initializeConsoleSanitization();
    this.logger.log('PII sanitization initialized');
  }

  configure(consumer: MiddlewareConsumer) {
    // Apply HTTP logger middleware to all routes
    consumer
      .apply(HttpLoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
