const publicDir = new URL('../public/', import.meta.url);
const entry = new URL('./web/main.ts', import.meta.url).pathname;

let bundle: Promise<string> | undefined;

// Built on first request and kept; the page ships its own maths, so there is nothing to fetch at run time.
function pageBundle(): Promise<string> {
  bundle ??= Bun.build({entrypoints: [entry], target: 'browser'}).then(async (out) => {
    if (!out.success) throw new Error(out.logs.map(String).join('\n'));
    return out.outputs[0]!.text();
  });
  bundle.catch(() => (bundle = undefined));
  return bundle;
}

export async function handle(req: Request): Promise<Response> {
  const {pathname} = new URL(req.url);
  if (pathname === '/api/health') return Response.json({ok: true});
  if (pathname === '/main.js') {
    return new Response(await pageBundle(), {headers: {'content-type': 'text/javascript; charset=utf-8'}});
  }
  const name = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (name.split('/').includes('..')) return new Response('not found', {status: 404});
  const file = Bun.file(new URL(name, publicDir));
  return (await file.exists()) ? new Response(file) : new Response('not found', {status: 404});
}
