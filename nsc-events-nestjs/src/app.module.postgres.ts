import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { ActivityModule } from './activity/activity.module';
import { AuthModule } from './auth/auth.module';
import { GoogleAuthModule } from './auth/google-auth/google-auth.module';
import { EventRegistrationModule } from './event-registration/event-registration.module';

// Import your entities
import { User } from './user/entities/user.entity';
// Import other entities as needed

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST', 'localhost'),
        port: configService.get<number>('POSTGRES_PORT', 5432),
        username: configService.get<string>('POSTGRES_USER', 'postgres'),
        password: configService.get<string>('POSTGRES_PASSWORD', 'postgres'),
        database: configService.get<string>('POSTGRES_DATABASE', 'nsc_events'),
        entities: [
          User,
          // Add other entities as needed
        ],
        synchronize: configService.get<boolean>('TYPEORM_SYNCHRONIZE', true),
        // Set to false in production
      }),
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
export class AppModule {}
