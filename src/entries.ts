export const scripts: Record<string, string> = {
  '/main.js': new URL('./web/main.ts', import.meta.url).pathname,
  '/porkchop-worker.js': new URL('./web/porkchop-worker.ts', import.meta.url).pathname,
};

export async function bundleScript(entrypoint: string, minify: boolean): Promise<string> {
  const out = await Bun.build({entrypoints: [entrypoint], target: 'browser', minify});
  if (!out.success) throw new Error(out.logs.map(String).join('\n'));
  return out.outputs[0]!.text();
}
