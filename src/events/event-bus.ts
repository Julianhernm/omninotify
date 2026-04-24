import { EventEmitter } from "events";
import type { EventName, NotificationEvent, EventPayloadMap } from "../domain/events.types";
import { v4 as uuidv4 } from 'uuid';
import { logger } from "../shared/logger/logger";

type EventListener<T extends EventName> = (event: NotificationEvent<T>) => void | Promise<void>;

class TypedEventBus extends EventEmitter {
    emit<T extends EventName>(eventName: T, payload: EventPayloadMap[T]): boolean {
        const event: NotificationEvent<T> = {
            id: uuidv4(),
            name: eventName,
            timestamp: new Date(),
            payload,
        }

        logger.debug('Emitted event', {
            eventId: event.id,
            eventName
        })
        return super.emit(eventName, event)
    }

    on<T extends EventName>(eventName: T, listener: EventListener<T>): this {
        return super.on(eventName, listener)
    }

    once<T extends EventName>(eventName: T, listener: EventListener<T>): this {
        return super.once(eventName, listener)
    }

    off<T extends EventName>(eventName: T, listener: EventListener<T>): this {
        return super.off(eventName, listener)
    }
}

export const eventBus = new TypedEventBus();
eventBus.setMaxListeners(20);