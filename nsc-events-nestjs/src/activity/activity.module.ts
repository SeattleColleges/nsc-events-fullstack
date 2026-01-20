import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityController } from './controllers/activity/activity.controller';
import { ActivityService } from '../activity/services/activity/activity.service';
import { Activity } from './entities/activity.entity';
import { AuthModule } from '../auth/auth.module';
import { TagModule } from '../tag/tag.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Activity]),
    TagModule,
    MediaModule,
  ],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [TypeOrmModule, ActivityService],
})
export class ActivityModule {}
