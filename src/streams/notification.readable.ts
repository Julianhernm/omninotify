import { Readable, ReadableOptions } from "stream";
import type { NotificationDTO } from "../domain/notification.dto";

interface NotificationReadableOptions extends ReadableOptions {
    notifications: Array<NotificationDTO>;
    batchDelay?: number;
}

export class NotificationReadable extends Readable {
    private notifications: NotificationDTO[];
    private index: number = 0
    private readonly batchDelay: number

    constructor(options: NotificationReadableOptions) {
        super({...options, objectMode: true});
        this.notifications = options.notifications
        this.batchDelay = options.batchDelay ?? 0
    }

    _read(): void {
        if(this.index > this.notifications.length){
            this.push(null);
            return;
        }

        const notification = this.notifications[this.index++];

        if(this.batchDelay > 0) {
            setTimeout(() =>{
                this.push(notification), this.batchDelay
            })
        } else {
            this.push(notification)
        }
    }
}