import { eventBus } from './event-bus';
import type { NotificationEvent } from '../domain/events.types';

export function registerEventHandlers(): void {
    eventBus.on('user.registered', async (event: NotificationEvent)=>{
        console.log(`[Event Handler] User Registered event received.`, {
            eventId: event.id,
            userId: event.payload.userId,
            email: event.payload.email
        });
    })

    eventBus.on('payment.completed', async (event: NotificationEvent<'payment.completed'>)=>{
        console.log(`[Event Handler] Payment Completed event received.`, {
            eventId: event.id,
            userId: event.payload.userId,
            email: event.payload.email,
            amount: event.payload.amount,
            currency: event.payload.currency
        });
    })

    eventBus.on('order.cancelled', async (event: NotificationEvent<'order.cancelled'>)=>{
        console.log(`[Event Handler] Order Cancelled event received.`, {
            eventId: event.id,
            userId: event.payload.userId,
            email: event.payload.email,
            orderId: event.payload.orderId,
            reason: event.payload.reason
        });
    });

    console.log('Event handlers registered.');
}