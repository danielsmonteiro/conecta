import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { MessagingAdminController, WebhooksController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { OpenWaProvider } from './providers/openwa.provider';
import { TwilioProvider } from './providers/twilio.provider';

@Module({
  imports: [QueueModule],
  controllers: [WebhooksController, MessagingAdminController],
  providers: [MessagingService, TwilioProvider, OpenWaProvider],
  exports: [MessagingService],
})
export class MessagingModule {}
