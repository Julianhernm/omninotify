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

async function boostrap(): Promise<void> {
  console.log('Starting OmniNotify...');

  // 1. Connect to Redis
  await subscriberClient.connect();
  await publisherClient.connect();

  // 2. Initialize services and consumers
  const notificationService = new NotificationService();
  notificationService.registerChannel(new EmailChannel());
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

  setTimeout(() => {
    console.log('emmiting test events');

    eventBus.emit('user.registered', {
      userId: 'usr-001',
      email: 'anaexample.com',
      name: 'Ana García',
    });

    eventBus.emit('payment.completed', {
      userId: 'usr-002',
      email: 'carlos@example.com',
      amount: 299.99,
      currency: 'USD',
      transactionId: 'txn-abc-123',
    });
  }, 1000)

  process.on('SIGNIT', async () => {
    console.log('\n[OmniNotify] turnig off...')
    notificationConsumer.stop();
    await publisherClient.quit();
    await subscriberClient.quit();
    console.log('[OmniNotify] Bye.');
    process.exit(0);
  })
  setTimeout(async () => {
    console.log('\n--- Demo Stream Pipeline ---\n');

    // Generamos 25 notificaciones de prueba
    const bulkNotifications = Array.from({ length: 25 }, (_, i) =>
      createNotification(
        `evt-bulk-${i}`,
        i % 3 === 0 ? 'email' : i % 3 === 1 ? 'sms' : 'push',
        `user${i}@example.com`,
        `Notificación masiva número ${i + 1}`,
        `Asunto ${i + 1}`,
      )
    );

    await runNotificationPipeline({
      notifications: bulkNotifications,
      notificationService,
      batchSize: 5,
      onProgress: (processed) => {
        console.log(`[Progress] ${processed}/${bulkNotifications.length} procesadas`);
      },
    });

  }, 6000);
}

boostrap().catch(console.error);