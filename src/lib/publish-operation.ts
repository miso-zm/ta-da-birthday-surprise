const STORAGE_KEY = "ta-da:publish-operation:v1";
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;

type OperationState = "pending" | "unknown";
type PublishOperation = {
  schemaVersion: 1;
  signature: string;
  idempotencyKey: string;
  state: OperationState;
};

type OperationStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export class PublishResultUnknownError extends Error {
  constructor(message = "发布结果待确认，请重试查询；不会重复创建作品。") {
    super(message);
    this.name = "PublishResultUnknownError";
  }
}
function readOperation(storage: OperationStorage | null): PublishOperation | null {
  if (!storage) return null;
  try {
    const value: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null");
    if (!value || typeof value !== "object") return null;
    const operation = value as PublishOperation;
    if (
      operation.schemaVersion !== 1
      || typeof operation.signature !== "string"
      || operation.signature.length > 160
      || !IDEMPOTENCY_KEY_PATTERN.test(operation.idempotencyKey)
      || !["pending", "unknown"].includes(operation.state)
    ) return null;
    return operation;
  } catch {
    return null;
  }
}

function writeOperation(storage: OperationStorage | null, operation: PublishOperation) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(operation));
    return true;
  } catch {
    return false;
  }
}

function removeOperation(storage: OperationStorage | null, idempotencyKey: string) {
  if (!storage) return;
  try {
    const current = readOperation(storage);
    if (!current || current.idempotencyKey === idempotencyKey) storage.removeItem(STORAGE_KEY);
  } catch {
    // Publishing has already succeeded; local cleanup must not change that result.
  }
}

export function getBrowserPublishOperationStorage(): OperationStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function createPublishOperationCoordinator(
  storage: OperationStorage | null,
  createKey: () => string,
) {
  let memoryOperation = readOperation(storage);
  let inFlight: Promise<unknown> | null = null;

  function operationFor(signature: string) {
    const stored = readOperation(storage);
    if (stored) memoryOperation = stored;
    if (!memoryOperation || memoryOperation.signature !== signature) {
      memoryOperation = {
        schemaVersion: 1,
        signature,
        idempotencyKey: createKey(),
        state: "pending",
      };
      writeOperation(storage, memoryOperation);
    }
    return memoryOperation;
  }

  return {
    publish<T>(signature: string, request: (idempotencyKey: string) => Promise<T>): Promise<T> {
      if (inFlight) return inFlight as Promise<T>;
      const operation = operationFor(signature);
      const active = Promise.resolve()
        .then(() => request(operation.idempotencyKey))
        .then((result) => {
          removeOperation(storage, operation.idempotencyKey);
          if (memoryOperation?.idempotencyKey === operation.idempotencyKey) memoryOperation = null;
          return result;
        })
        .catch((error: unknown) => {
          operation.state = error instanceof PublishResultUnknownError ? "unknown" : "pending";
          memoryOperation = operation;
          writeOperation(storage, operation);
          throw error;
        })
        .finally(() => {
          if (inFlight === active) inFlight = null;
        });
      inFlight = active;
      return active;
    },
  };
}

export function runWithPublishTimeout<T>(
  request: (signal: AbortSignal) => Promise<T>,
  timeoutMs = 20_000,
): Promise<T> {
  const controller = new AbortController();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new PublishResultUnknownError());
    }, timeoutMs);
    request(controller.signal).then(resolve, (error: unknown) => {
      if (controller.signal.aborted) reject(new PublishResultUnknownError());
      else reject(error);
    }).finally(() => clearTimeout(timer));
  });
}
