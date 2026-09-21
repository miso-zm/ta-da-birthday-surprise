import { chmod, mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export class FileStore {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(readonly root: string) {}

  private resolve(relativePath: string): string {
    if (!/^[a-z0-9][a-z0-9/_\-.]*$/i.test(relativePath) || relativePath.includes("..")) {
      throw new Error("Unsafe persistence path.");
    }
    return path.join(this.root, relativePath);
  }

  async readJson<T>(relativePath: string): Promise<T | null> {
    try {
      return JSON.parse(await readFile(this.resolve(relativePath), "utf8")) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async readBytes(relativePath: string): Promise<Buffer | null> {
    try {
      return await readFile(this.resolve(relativePath));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async atomicWrite(relativePath: string, value: string | Buffer): Promise<void> {
    const target = this.resolve(relativePath);
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await chmod(path.dirname(target), 0o700);
    const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, value, { mode: 0o600 });
      await rename(temporary, target);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
  }

  async remove(relativePath: string): Promise<void> {
    try {
      await unlink(this.resolve(relativePath));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  async list(relativeDirectory: string): Promise<string[]> {
    try {
      return await readdir(this.resolve(relativeDirectory));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.writeQueue.then(operation, operation);
    this.writeQueue = result.then(() => undefined, () => undefined);
    return result;
  }
}
