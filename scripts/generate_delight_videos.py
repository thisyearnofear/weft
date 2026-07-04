#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""
Generate the frame-matched Seedance video set for Weft's delight moments.

Pipeline (one-time, static assets — no recurring cost):
  1. flux/schnell keyframe images (sealed knot, verified fabric, hero a/b)
  2. Seedance 1.0 Pro image-to-video with start+end frame control, 480p 5s:
       sealed_loop  : K_sealed -> K_sealed   (seamless loop on the milestone page)
       reveal       : K_sealed -> K_verified (plays when the relayer decrypt resolves)
       hero_a       : K_hero_a -> K_hero_b   (chained ping-pong on the landing hero)
       hero_b       : K_hero_b -> K_hero_a

Outputs to frontend/public/delight/. Usage:
  set -a; source .env.fal.local; set +a
  python3 scripts/generate_delight_videos.py [--only reveal,hero_a]
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
from pathlib import Path

FAL_QUEUE = "https://queue.fal.run"
IMAGE_MODEL = "fal-ai/flux/schnell"
VIDEO_MODEL = "fal-ai/bytedance/seedance/v1/pro/image-to-video"
OUT_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public" / "delight"
STATE_FILE = OUT_DIR / "generation-state.json"  # cache keyframe/video URLs across runs

STYLE = (
    "macro photograph of a dark weaving loom, deep indigo and violet silk threads, "
    "faint emerald accents, dramatic low-key lighting, deep navy-black background, "
    "cinematic, photorealistic textile detail"
)

KEYFRAMES = {
    "k_sealed": f"{STYLE}, threads half-woven converging into a dense tangled knot at the "
    "center, the knot faintly glowing violet like sealed encrypted data, loose warp threads "
    "radiating outward",
    "k_verified": f"{STYLE}, the weave fully completed into smooth luminous fabric, orderly "
    "interlaced threads with a soft emerald-green glow of verification, serene and settled",
    "k_hero_a": f"{STYLE}, wide calm expanse of half-woven fabric, warp threads stretching "
    "into darkness, gentle highlights",
    "k_hero_b": f"{STYLE}, the same wide loom with the weave slightly further along, a shuttle "
    "of glowing thread mid-pass, gentle highlights",
}

VIDEOS = {
    "sealed_loop": {
        "start": "k_sealed",
        "end": "k_sealed",
        "prompt": "the tangled encrypted knot pulses with faint violet light, threads tremble "
        "almost imperceptibly, slow ambient shimmer travels along the warp, seamless loop, "
        "no camera movement",
    },
    "reveal": {
        "start": "k_sealed",
        "end": "k_verified",
        "prompt": "the tangled knot slowly unwinds and weaves itself into completed fabric, "
        "threads interlace smoothly row by row, a soft emerald verification glow spreads "
        "across the finished weave, elegant and continuous, no camera movement",
    },
    "hero_a": {
        "start": "k_hero_a",
        "end": "k_hero_b",
        "prompt": "a glowing shuttle of thread glides across the loom weaving a new row, "
        "threads settle gently, calm ambient motion, no camera movement",
    },
    "hero_b": {
        "start": "k_hero_b",
        "end": "k_hero_a",
        "prompt": "the glowing thread dims as the weave relaxes back, threads drift gently, "
        "calm ambient motion, seamless continuation, no camera movement",
    },
}


def _key() -> str:
    k = os.environ.get("FAL_KEY") or os.environ.get("FAL_API_KEY") or ""
    if not k:
        sys.exit("FAL_KEY not set — source .env.fal.local first")
    return k


def _post(model: str, payload: dict) -> dict:
    req = urllib.request.Request(
        f"{FAL_QUEUE}/{model}",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Key {_key()}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def _get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"Authorization": f"Key {_key()}"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def _wait(submit: dict, label: str, timeout_s: int = 900) -> dict:
    status_url, response_url = submit["status_url"], submit["response_url"]
    start = time.time()
    while time.time() - start < timeout_s:
        st = _get(status_url)
        if st.get("status") == "COMPLETED":
            return _get(response_url)
        if st.get("status") in ("FAILED", "ERROR"):
            sys.exit(f"{label}: generation failed: {st}")
        time.sleep(5)
    sys.exit(f"{label}: timed out after {timeout_s}s")


def _load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"keyframes": {}, "videos": {}}


def _save_state(state: dict) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2))


def main() -> None:
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))

    state = _load_state()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Keyframes (cached across runs so retries don't regenerate them)
    for name, prompt in KEYFRAMES.items():
        if state["keyframes"].get(name):
            print(f"{name}: cached {state['keyframes'][name]}")
            continue
        print(f"{name}: generating keyframe...")
        res = _wait(
            _post(IMAGE_MODEL, {"prompt": prompt, "image_size": "landscape_16_9", "num_images": 1}),
            name,
            timeout_s=300,
        )
        state["keyframes"][name] = res["images"][0]["url"]
        _save_state(state)
        print(f"{name}: {state['keyframes'][name]}")

    # 2. Videos (Seedance Pro, 480p, 5s, fixed camera, frame-matched)
    for name, spec in VIDEOS.items():
        if only and name not in only:
            continue
        out_path = OUT_DIR / f"{name}.mp4"
        if out_path.exists() and not (only and name in only):
            print(f"{name}: already downloaded, skipping")
            continue
        print(f"{name}: generating video ({spec['start']} -> {spec['end']})...")
        res = _wait(
            _post(
                VIDEO_MODEL,
                {
                    "prompt": spec["prompt"],
                    "image_url": state["keyframes"][spec["start"]],
                    "end_image_url": state["keyframes"][spec["end"]],
                    "resolution": "480p",
                    "duration": "5",
                    "camera_fixed": True,
                },
            ),
            name,
        )
        video_url = res["video"]["url"]
        state["videos"][name] = video_url
        _save_state(state)
        urllib.request.urlretrieve(video_url, out_path)
        print(f"{name}: saved {out_path} ({out_path.stat().st_size // 1024} KB)")

    print("\nDone. Assets in frontend/public/delight/")


if __name__ == "__main__":
    main()
