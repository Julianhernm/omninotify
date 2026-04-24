import type { INotificationChannel } from "../../domain/channel.interface";
import type { NotificationDTO } from "../../domain/notification.dto";

export class SmsChannel implements INotificationChannel {
    readonly name = 'sms';

    isAvailable(): boolean {
        return true;
    };

    async send(notification: NotificationDTO): Promise<void> {
        if (notification.body.length > 160) {
            console.warn(`SMS body exceeds 160 characters: ${notification.body.length}`);
        };
        await this.simulate();

        console.log(`[SMS Channel] Notification sent to ${notification.recipient} with body "${notification.body}"`);
    }
    private async simulate(): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, 50));
    }
}