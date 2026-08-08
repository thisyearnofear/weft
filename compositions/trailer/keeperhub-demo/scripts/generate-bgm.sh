#!/usr/bin/env bash
# Generate a subtle ambient bed for the KeeperHub demo (63s, 48kHz stereo).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/bgm.wav"
DUR=63

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "sine=frequency=110:duration=${DUR}" \
  -f lavfi -i "sine=frequency=165:duration=${DUR}" \
  -f lavfi -i "anoisesrc=d=${DUR}:c=pink:a=0.008" \
  -filter_complex \
  "[0][1]amix=inputs=2:duration=first,volume=0.08[tones];
   [tones][2]amix=inputs=2:duration=first,
   afade=t=in:st=0:d=2,afade=t=out:st=58:d=5,
   volume=0.35,
   aformat=sample_rates=48000:channel_layouts=stereo" \
  "$OUT"

echo "Wrote $OUT"
