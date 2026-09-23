export type ManagementMode = "revoke" | "delete";

export async function performManagementOperation(
  mode: ManagementMode,
  request: () => Promise<{ ok: boolean }>,
  cleanupLocal: () => boolean,
): Promise<{ state: "revoked" | "deleted"; localCleanupFailed: boolean }> {
  const response = await request();
  if (!response.ok) throw new Error("server-operation-failed");
  if (mode === "revoke") return { state: "revoked", localCleanupFailed: false };
  let localCleanupFailed = false;
  try {
    localCleanupFailed = !cleanupLocal();
  } catch {
    localCleanupFailed = true;
  }
  return { state: "deleted", localCleanupFailed };
}
