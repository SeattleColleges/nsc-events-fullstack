import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserController } from './controllers/user/user.controller';
import { UserService } from './services/user/user.service';
import { User } from './entities/user.entity';

@Module({
  imports: [
    ConfigModule,
    // Import TypeORM module with User entity
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [UserController],
  providers: [
    // Use the UserService directly with TypeORM
    UserService,
  ],
  exports: [UserService],
})
export class UserModule {}
