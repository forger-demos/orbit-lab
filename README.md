# orbit-lab

See the solar system on any date and find the launch windows to other planets.

The owner's brief is [docs/brief.md](docs/brief.md). A forger work loop builds it: requests are GitHub issues labelled `ready-for-agent`, each is built on its own branch, and a PR merges only when the gates in `.forger/workloop.config.json`, CI and an independent verifier pass.

## Develop

```
bun install
bun run start
bun run check
```

## Deploy

`bun run build` writes the static site to `dist/` (git-ignored): everything in `public/` plus each browser entry point, bundled and minified at the same path the dev server uses. The entry points are listed once, in `src/entries.ts`, and shared by the build and `bun run start`.

`vercel.json` configures a Vercel project linked to this repository to install, run the build and serve `dist/`, so every merge to main deploys with no server code.
