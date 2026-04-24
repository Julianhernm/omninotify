import type { NotificationDTO } from "./notification.dto";

export interface INotificationChannel {
    readonly name: string;
    send(notification: NotificationDTO): Promise<void>;
    isAvailable(): boolean;
}