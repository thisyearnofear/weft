#!/usr/bin/env bash
# Classical bed — Nuncio Backblaze demo (ElevenLabs solo piano/strings).
# Ducked to ~0.12 like nuncio/backblaze-demo/assets/audio/build-master.mjs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/bgm.wav"
DUR=63
SRC="${KEEPERHUB_DEMO_BGM:-$ROOT/../../../../nuncio/backblaze-demo/assets/audio/bgm-classical-raw.mp3}"

test -f "$SRC" || { echo "Missing BGM source: $SRC" >&2; exit 1; }

ffmpeg -y -hide_banner -loglevel error \
  -i "$SRC" \
  -filter_complex \
  "[0:a]atrim=0:${DUR},asetpts=PTS-STARTPTS,
   volume=0.20,
   afade=t=in:st=0:d=2,
   afade=t=out:st=58:d=5,
   aformat=sample_rates=48000:channel_layouts=stereo" \
  "$OUT"

echo "Wrote $OUT (from $(basename "$SRC"))"
