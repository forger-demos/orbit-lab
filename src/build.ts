import {cp, mkdir, rm} from 'node:fs/promises';
import {bundleScript, scripts} from './entries';

const publicDir = new URL('../public/', import.meta.url).pathname;

export async function build(outDir: string): Promise<void> {
  await rm(outDir, {recursive: true, force: true});
  await mkdir(outDir, {recursive: true});
  await cp(publicDir, outDir, {recursive: true});
  for (const [path, entrypoint] of Object.entries(scripts)) {
    await Bun.write(`${outDir}${path}`, await bundleScript(entrypoint, true));
  }
}
