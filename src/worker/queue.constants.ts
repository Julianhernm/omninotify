export const QUEUES = {
    EMAIL: 'omninotify:queue:email',
    SMS: 'omninotify:queue:sms',
    PUSH: 'omninotify:queue:push',
} as const;

export type QueueName = typeof QUEUES[keyof typeof QUEUES];