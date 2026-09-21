export class PersistenceError extends Error {
  constructor(
    public readonly code:
      | "bad-request"
      | "payload-too-large"
      | "rate-limited"
      | "storage-exhausted"
      | "deletion-pending"
      | "conflict"
      | "forbidden"
      | "not-found"
      | "unavailable",
    message: string,
  ) {
    super(message);
    this.name = "PersistenceError";
  }
}
