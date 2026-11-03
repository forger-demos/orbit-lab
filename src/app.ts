const publicDir = new URL('../public/', import.meta.url);
const scripts: Record<string, string> = {
  '/main.js': new URL('./web/main.ts', import.meta.url).pathname,
  '/porkchop-worker.js': new URL('./web/porkchop-worker.ts', import.meta.url).pathname,
};

const bundles = new Map<string, Promise<string>>();

// Built on first request and kept; the page ships its own maths, so there is nothing to fetch at run time.
function bundleOf(entrypoint: string): Promise<string> {
  let bundle = bundles.get(entrypoint);
  if (!bundle) {
    bundle = Bun.build({entrypoints: [entrypoint], target: 'browser'}).then(async (out) => {
      if (!out.success) throw new Error(out.logs.map(String).join('\n'));
      return out.outputs[0]!.text();
    });
    bundle.catch(() => bundles.delete(entrypoint));
    bundles.set(entrypoint, bundle);
  }
  return bundle;
}

export async function handle(req: Request): Promise<Response> {
  const {pathname} = new URL(req.url);
  if (pathname === '/api/health') return Response.json({ok: true});
  const script = scripts[pathname];
  if (script) {
    return new Response(await bundleOf(script), {headers: {'content-type': 'text/javascript; charset=utf-8'}});
  }
  const name = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (name.split('/').includes('..')) return new Response('not found', {status: 404});
  const file = Bun.file(new URL(name, publicDir));
  return (await file.exists()) ? new Response(file) : new Response('not found', {status: 404});
}
