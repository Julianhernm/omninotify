import { env } from './config/env';
import { eventBus } from './events/event-bus';
import { NotificationService } from './sevices/notification.service';
import { EmailChannel } from './channels/email/email.channel';
import { SmsChannel } from './channels/sms/sms.channel';
import { PushChannel } from './channels/push/push.channel';
import { notificationConsumer } from './worker/notification.consumer';
import { publisherClient, subscriberClient } from './worker/redis.client';
import { QUEUES } from './worker/queue.constants';
import { runNotificationPipeline } from './streams/notification.pipeline';
import { createNotification } from './domain/notification.factory';
import { logger } from './shared/logger/logger';
import { startHealthServer } from './health/health.server';
import { gracefulShutdown } from './shared/graceful-shutdown';

async function boostrap(): Promise<void> {
  logger.info('Starting OmniNotify...', { env: env.nodeEnv });

  // 1. Connect to Redis
  await subscriberClient.connect();
  await publisherClient.connect();

  // 2. Initialize services and consumers
  const notificationService = new NotificationService();
  const emailChannel = new EmailChannel
  notificationService.registerChannel(emailChannel);
  notificationService.registerChannel(new SmsChannel());
  notificationService.registerChannel(new PushChannel());

  // 3. Register handlers for each queue
  notificationConsumer.registerHanddler(
    QUEUES.EMAIL,
    n => notificationService.dispatch(n)
  );
  notificationConsumer.registerHanddler(
    QUEUES.SMS,
    n => notificationService.dispatch(n)
  );
  notificationConsumer.registerHanddler(
    QUEUES.PUSH,
    n => notificationService.dispatch(n)
  )

  // 4. Connect event bus to notification service
  eventBus.on('user.registered', e => notificationService.handleEvent(e));
  eventBus.on('payment.completed', e => notificationService.handleEvent(e));
  eventBus.on('order.cancelled', e => notificationService.handleEvent(e));

  // 5. Start consuming messages
  await notificationConsumer.start();

  // 6. Health server
  const healthServer = startHealthServer();

  // 7. Register shutdown handlers - in reverse order to startup
  gracefulShutdown.register(async () => {
    logger.info('Closing consumer...');
    notificationConsumer.stop();
  });

  gracefulShutdown.register(async () => {
    logger.info('Closing pool of workers...');
    await emailChannel.destroy();
  });

  gracefulShutdown.register(async () => {
    logger.info('Closing health server...');
    await new Promise<void>((resolve, reject) => {
      healthServer.close(err => err ? reject(err) : resolve());
    })
  });

  //8. Activate OS signal listeners
  gracefulShutdown.listen();

  logger.info('OmniNotify ready', { port: env.port })
}

boostrap().catch((error) => {
  console.error('Error fatal at startup: ', error);
  process.exit(1)
});