import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityController } from './controllers/activity/activity.controller';
import { ActivityService } from '../activity/services/activity/activity.service';
import { Activity } from './entities/activity.entity';
import { AuthModule } from '../auth/auth.module';
import { S3Service } from '../activity/services/activity/s3.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Activity])],
  controllers: [ActivityController],
  providers: [ActivityService, S3Service],
  exports: [TypeOrmModule, ActivityService],
})
export class ActivityModule {}
