import { Module } from '@nestjs/common';
import { MessagingAdminController, WebhooksController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { OpenWaProvider } from './providers/openwa.provider';
import { TwilioProvider } from './providers/twilio.provider';

@Module({
  controllers: [WebhooksController, MessagingAdminController],
  providers: [MessagingService, TwilioProvider, OpenWaProvider],
  exports: [MessagingService],
})
export class MessagingModule {}
