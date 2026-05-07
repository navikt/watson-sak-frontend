import { mkdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const lockPath = path.join(tmpdir(), "watson-sak-e2e-mockdata.lock");
const ventetidMs = 50;
const timeoutMs = 60_000;
const foreldetLåsMs = 120_000;

let aktivLåsDybde = 0;

async function vent(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fjernForeldetLås() {
  try {
    const metadata = await stat(lockPath);

    if (Date.now() - metadata.mtimeMs > foreldetLåsMs) {
      await rm(lockPath, { force: true, recursive: true });
    }
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

async function hentLås() {
  const start = Date.now();

  while (true) {
    try {
      await mkdir(lockPath);
      return;
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") {
        throw error;
      }

      if (Date.now() - start > timeoutMs) {
        throw new Error("Tidsavbrudd mens testen ventet på mockdata-lås.");
      }

      await fjernForeldetLås();
      await vent(ventetidMs);
    }
  }
}

async function frigiLås() {
  await rm(lockPath, { force: true, recursive: true });
}

export async function medMockDataLock<T>(callback: () => Promise<T>): Promise<T> {
  if (aktivLåsDybde > 0) {
    aktivLåsDybde += 1;
    try {
      return await callback();
    } finally {
      aktivLåsDybde -= 1;
    }
  }

  await hentLås();
  aktivLåsDybde = 1;

  try {
    return await callback();
  } finally {
    aktivLåsDybde = 0;
    await frigiLås();
  }
}
