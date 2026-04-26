import { eventBus } from './event-bus';
import type { NotificationEvent } from '../domain/events.types';
import { createContextLogger } from "../shared/logger/logger";

const log = createContextLogger({ service: 'Event Handler'})
export function registerEventHandlers(): void {
    eventBus.on('user.registered', async (event: NotificationEvent)=>{
        log.info(`[User Registered event received.`, {
            eventId: event.id,
            userId: event.payload.userId,
            email: event.payload.email
        });
    })

    eventBus.on('payment.completed', async (event: NotificationEvent<'payment.completed'>)=>{
        log.info(`[Payment Completed event received.`, {
            eventId: event.id,
            userId: event.payload.userId,
            email: event.payload.email,
            amount: event.payload.amount,
            currency: event.payload.currency
        });
    })

    eventBus.on('order.cancelled', async (event: NotificationEvent<'order.cancelled'>)=>{
        log.info(`[Order Cancelled event received.`, {
            eventId: event.id,
            userId: event.payload.userId,
            email: event.payload.email,
            orderId: event.payload.orderId,
            reason: event.payload.reason
        });
    });

    log.info('Event handlers registered.');
}