<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Local development

```bash
cd frontend
npm ci --cache .npm-cache
npm run dev          # predev → sync-zama-sdk
npm run lint
npm run build        # prebuild → sync-zama-sdk
```

### Zama Relayer SDK

Confidential milestones lazy-load the Zama SDK from `/zama/*` (see `src/lib/fhe.ts`). Assets are
synced by `scripts/sync-zama-sdk.mjs` from `@zama-fhe/relayer-sdk` on dev/build, with a fallback
to existing `public/zama/` when `node_modules` is missing.

### wagmi / RainbowKit

`.npmrc` enables `legacy-peer-deps` until RainbowKit 3 supports wagmi 3 natively. Do not pass
`--legacy-peer-deps` manually — CI and local installs read `.npmrc`.
