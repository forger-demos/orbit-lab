import {bundleScript, scripts} from './entries';

const publicDir = new URL('../public/', import.meta.url);
const bundles = new Map<string, Promise<string>>();

// Built on first request and kept; the page ships its own maths, so there is nothing to fetch at run time.
function bundleOf(entrypoint: string): Promise<string> {
  let bundle = bundles.get(entrypoint);
  if (!bundle) {
    bundle = bundleScript(entrypoint, false);
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
