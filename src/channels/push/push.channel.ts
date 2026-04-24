import type { INotificationChannel } from "../../domain/channel.interface";
import type { NotificationDTO } from "../../domain/notification.dto";

export class PushChannel implements INotificationChannel {
    readonly name = 'push';

    isAvailable(): boolean {
        return true;
    }

    async send(notification: NotificationDTO): Promise<void> {
        await this.simulate();

        console.log(`[Push Channel] Notification sent to ${notification.recipient} with subject "${notification.subject}" and body "${notification.body}"`);
    };

    private async simulate(): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, 80));
    }   
}