import { Module, forwardRef } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { MessagingAdminController, WebhooksController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { OpenWaProvider } from './providers/openwa.provider';
import { TwilioProvider } from './providers/twilio.provider';

@Module({
  imports: [forwardRef(() => AiModule)],
  controllers: [WebhooksController, MessagingAdminController],
  providers: [MessagingService, TwilioProvider, OpenWaProvider],
  exports: [MessagingService],
})
export class MessagingModule {}
