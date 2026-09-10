import path from "node:path";

export type PersistenceConfig = {
  appOrigin: string;
  dataDir: string;
  shareTokenPepper: string;
  mediaSigningSecret: string;
};

function requiredSecret(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || value.length < 32 || value.startsWith("replace-")) {
    throw new Error(`${name} must be configured with at least 32 characters.`);
  }
  return value;
}

export function getPersistenceConfig(): PersistenceConfig {
  const rawOrigin = process.env.APP_ORIGIN?.trim();
  const rawDataDir = process.env.TADA_DATA_DIR?.trim();
  if (!rawOrigin) throw new Error("APP_ORIGIN must be configured.");
  if (!rawDataDir) throw new Error("TADA_DATA_DIR must be configured.");

  const origin = new URL(rawOrigin);
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new Error("APP_ORIGIN must be a bare HTTP(S) origin.");
  }

  const dataDir = path.resolve(rawDataDir);
  const filesystemRoot = path.parse(dataDir).root;
  const directoryDepth = dataDir.slice(filesystemRoot.length).split(path.sep).filter(Boolean).length;
  const workingDirectory = path.resolve(/* turbopackIgnore: true */ process.cwd());
  const publicDir = path.resolve(process.cwd(), "public");
  if (
    directoryDepth < 2 ||
    dataDir === workingDirectory ||
    workingDirectory.startsWith(`${dataDir}${path.sep}`) ||
    dataDir === publicDir ||
    dataDir.startsWith(`${publicDir}${path.sep}`)
  ) {
    throw new Error("TADA_DATA_DIR must be a dedicated directory outside the application and public directories.");
  }

  return {
    appOrigin: origin.origin,
    dataDir,
    shareTokenPepper: requiredSecret("SHARE_TOKEN_PEPPER"),
    mediaSigningSecret: requiredSecret("MEDIA_SIGNING_SECRET"),
  };
}
