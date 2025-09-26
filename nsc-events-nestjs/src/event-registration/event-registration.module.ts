import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventRegistration } from './entities/event-registration.entity';
import { EventRegistrationService } from './services/event-registration.service';
import { EventRegistrationController } from './controllers/event-registration.controller';
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  imports: [TypeOrmModule.forFeature([EventRegistration]), ActivityModule],
  controllers: [EventRegistrationController],
  providers: [EventRegistrationService],
  exports: [EventRegistrationService],
})
export class EventRegistrationModule {}
