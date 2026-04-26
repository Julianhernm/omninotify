import { withRetry } from '../shared/errors/retry.service';
import { AppError, ErrorCode } from '../shared/errors/app.error';

describe('withRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debe retornar el resultado si la operación tiene éxito', async () => {
    const operation = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(operation);
    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('debe reintentar cuando la operación falla', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('fallo 1'))
      .mockRejectedValueOnce(new Error('fallo 2'))
      .mockResolvedValue('ok en intento 3');

    const promise = withRetry(operation, {
      maxRetries: 3,
      baseDelayMs: 100,
    });

    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('ok en intento 3');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('debe lanzar el error después de agotar los reintentos', async () => {
    const error = new Error('siempre falla');
    const operation = jest.fn().mockImplementation(() => Promise.reject(error));

    let caughtError: Error | null = null;

    const promise = withRetry(operation, {
      maxRetries: 2,
      baseDelayMs: 100,
    }).catch((err: Error) => {
      caughtError = err;
    });

    await jest.runAllTimersAsync();
    await promise;

    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toBe('siempre falla');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('NO debe reintentar errores con retryable: false', async () => {
    const permanentError = new AppError(
      ErrorCode.INVALID_RECIPIENT,
      'Email inválido',
      false,
    );

    const operation = jest.fn().mockRejectedValue(permanentError);

    // No necesita runAllTimers porque no hay delays — falla inmediatamente
    await expect(
      withRetry(operation, { maxRetries: 3, baseDelayMs: 100 })
    ).rejects.toThrow('Email inválido');

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('debe llamar onRetry con el número de intento correcto', async () => {
    const onRetry = jest.fn();
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('fallo'))
      .mockResolvedValue('ok');

    const promise = withRetry(operation, {
      maxRetries: 3,
      baseDelayMs: 100,
      onRetry,
    });

    await jest.runAllTimersAsync();
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(
      1,
      expect.any(Error),
      expect.any(Number)
    );
  });
});