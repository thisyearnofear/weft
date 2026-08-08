# Weft × KeeperHub — Agents Onchain Demo (63s)

HyperFrames composition for the KeeperHub Agents Onchain hackathon submission.

## Quick render

```bash
cd compositions/trailer/keeperhub-demo
npm run assets     # capture screenshots + BGM + narration
npm run check
npm run render     # → renders/keeperhub-demo_<timestamp>.mp4
```

## Primary proof transaction

**MCP `submitVerdict()`** on 0G Galileo (chain 16602):

- Tx: [`0x4348599a…9157d`](https://chainscan-galileo.0g.ai/tx/0x4348599a0c6eec130b03dd6ec5806488651734aadbc5623d2da4d2559a09157d)
- execution_id: `5nlz4ndmxbvrqe7c22qeh`
- Milestone: `0xb643d0a8223cf278a77e2dfe82e6d20e6f641335a8ccae71daaf6a94936bd7a2`

Also: MCP `stake()` [`0xd27b96ed…0138e`](https://chainscan-galileo.0g.ai/tx/0xd27b96ed9ee32147e44c5fa8ce546e4798dfc4aff63ed8876994499baaf0138e)

## Scenes

| Time | Scene | Content |
|---|---|---|
| 0–8s | Hook | Agents decide · KeeperHub executes |
| 8–18s | Problem | Verdict ≠ execution |
| 18–38s | Proof | Project page + chainscan **submitVerdict** tx + audit JSON |
| 41–55s | Flow | Weft → MCP → KeeperHub → `submitVerdict()` |
| 55–63s | CTA | weft.thisyearnofear.com + proof tx |

## Audio

- **Narration:** Kokoro TTS (`am_adam`, `data-volume="1"`)
- **BGM:** generated ambient bed (`npm run bgm`, `data-volume="0.28"`)

Upload MP4 to YouTube/Loom (unlisted) and paste URL into `docs/submissions/keeperhub-agents-onchain.md`.
