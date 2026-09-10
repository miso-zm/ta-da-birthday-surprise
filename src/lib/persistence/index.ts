import { getPersistenceConfig } from "./config";
import { getPublicationService } from "./service";

export const MANAGER_COOKIE_NAME = "tada_manager";

export function persistence() {
  const config = getPersistenceConfig();
  return { config, service: getPublicationService(config) };
}

export { PersistenceError } from "./errors";
