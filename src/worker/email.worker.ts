import { parentPort } from 'worker_threads';
import type { NotificationDTO } from '../domain/notification.dto';

interface WorkerInput {
  notification: NotificationDTO;
}

interface WorkerResult {
  success: boolean;
  notificationId: string;
  processedBody: string;
  durationMs: number;
  error?: string;
}

function renderEmailTemplate(notification: NotificationDTO): string {
  let result = '';
  for (let i = 0; i < 100_000; i++) {
    result = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>${notification.subject}</title></head>
        <body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>${notification.subject ?? 'Notificación'}</h1>
            <p>${notification.body}</p>
            <p>Enviado a: ${notification.recipient}</p>
            <small>ID: ${notification.id} — ${new Date().toISOString()}</small>
          </div>
        </body>
      </html>
    `.trim();
  }
  return result;
}

if (!parentPort) {
  throw new Error('Este archivo debe correr como worker_thread');
}

// Escucha mensajes del pool — aquí llegan las tareas
parentPort.on('message', (input: WorkerInput) => {
  const startTime = Date.now();

  try {
    const processedBody = renderEmailTemplate(input.notification);

    const result: WorkerResult = {
      success: true,
      notificationId: input.notification.id,
      processedBody,
      durationMs: Date.now() - startTime,
    };

    parentPort!.postMessage(result);
  } catch (err) {
    const result: WorkerResult = {
      success: false,
      notificationId: input.notification.id,
      processedBody: '',
      durationMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : 'Error desconocido',
    };

    parentPort!.postMessage(result);
  }
});