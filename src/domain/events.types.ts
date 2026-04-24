export const EventNames = {
    USER_REGISTERED: 'user.registered',
    PAYMENT_COMPLETED: 'payment.completed',
    ORDER_SHIPPED: 'order.shipped',
    PASSWORD_REST: 'password.reset',
    ORDER_CANCELLED: 'order.cancelled',
} as const;

export type EventName = typeof EventNames[keyof typeof EventNames];

export interface BaseEvent {
    id: string;
    name: EventName;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

export interface UserRegisteredPayload {
    userId: string;
    email: string;
    name: string;
}

export interface PaymentCompletedPayload {
    userId: string;
    email: string;
    amount: number;
    currency: string;
    transactionId: string;
}

export type EventPayloadMap = {
    "user.registered": UserRegisteredPayload;
    "payment.completed": PaymentCompletedPayload;
    "order.shipped": {userId: string; email: string; orderId: string; trackingUrl: string;};
    "password.reset": {userId: string; email: string; resetLink: string;};
    "order.cancelled": {userId: string; email: string; orderId: string; reason: string;};
 };

export interface NotificationEvent<T extends EventName = EventName> extends BaseEvent {
  name: T;
  payload: EventPayloadMap[T];
}