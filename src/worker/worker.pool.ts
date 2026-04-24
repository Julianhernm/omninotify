import { Worker } from 'worker_threads';
import path from 'path';

interface PoolTask<T, R> {
  data: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
}

interface WorkerState<R> {
  worker: Worker;
  busy: boolean;
  currentResolve?: (result: R) => void;
  currentReject?: (error: Error) => void;
}

export class WorkerPool<TInput, TResult> {
  private workers: WorkerState<TResult>[] = [];
  private queue: PoolTask<TInput, TResult>[] = [];
  private readonly scriptPath: string;

  constructor(scriptPath: string, private readonly poolSize: number) {
    this.scriptPath = path.resolve(scriptPath);
    this.initialize();
  }

  private initialize(): void {
    for (let i = 0; i < this.poolSize; i++) {
      this.createWorker();
    }
    console.log(`[WorkerPool] Iniciado con ${this.poolSize} workers`);
  }

  private createWorker(): void {
    const worker = new Worker(this.scriptPath, {
      execArgv: ['--require', 'ts-node/register'],
    });

    const state: WorkerState<TResult> = { worker, busy: false };

    // El worker responde con el resultado de la tarea
    worker.on('message', (result: TResult) => {
      state.busy = false;
      state.currentResolve?.(result);
      state.currentResolve = undefined;
      state.currentReject = undefined;
      this.processQueue();
    });

    worker.on('error', (error: any) => {
      console.error(`[WorkerPool] Worker error:`, error.message);
      state.busy = false;
      state.currentReject?.(error);
      state.currentResolve = undefined;
      state.currentReject = undefined;
      this.processQueue();
    });

    // Solo se dispara si el worker muere — lo reemplazamos
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.warn(`[WorkerPool] Worker murió (código ${code}). Reemplazando...`);
        const index = this.workers.indexOf(state);
        if (index !== -1) this.workers.splice(index, 1);
        this.createWorker();
      }
    });

    this.workers.push(state);
  }

  run(data: TInput): Promise<TResult> {
    return new Promise((resolve, reject) => {
      const availableWorker = this.workers.find(w => !w.busy);

      if (availableWorker) {
        this.assignTask(availableWorker, { data, resolve, reject });
      } else {
        this.queue.push({ data, resolve, reject });
        console.log(`[WorkerPool] Sin workers libres. Queue: ${this.queue.length}`);
      }
    });
  }

  private assignTask(state: WorkerState<TResult>, task: PoolTask<TInput, TResult>): void {
    state.busy = true;
    state.currentResolve = task.resolve;
    state.currentReject = task.reject;
    state.worker.postMessage(task.data);
  }

  private processQueue(): void {
    if (this.queue.length === 0) return;
    const availableWorker = this.workers.find(w => !w.busy);
    if (!availableWorker) return;
    const nextTask = this.queue.shift()!;
    this.assignTask(availableWorker, nextTask);
  }

  async destroy(): Promise<void> {
    await Promise.all(this.workers.map(s => s.worker.terminate()));
    this.workers = [];
    this.queue = [];
    console.log('[WorkerPool] destroyed');
  }

  get stats() {
    return {
      total: this.workers.length,
      busy: this.workers.filter(w => w.busy).length,
      idle: this.workers.filter(w => !w.busy).length,
      queued: this.queue.length,
    };
  }
}