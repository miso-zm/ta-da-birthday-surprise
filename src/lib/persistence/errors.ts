export class PersistenceError extends Error {
  constructor(
    public readonly code:
      | "bad-request"
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
