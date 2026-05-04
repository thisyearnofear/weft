#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
fal.ai client — generates AI woven-textile imagery from milestone evidence.

Each verified milestone produces a unique generated image (a 'swatch') whose
visual character is driven by the verification metrics (callers, commits,
peer signers). Together, the per-milestone swatches form a visual tapestry
that backs the Builder Journey chronicle.

The Hermes Agent uses these images as the visual layer of the creative
output: technology provides the warp (data), liberal arts provide the weft
(narrative + image).

This module is dependency-free (stdlib only) and degrades gracefully when
FAL_API_KEY is unset — callers always receive a FalImageResult, never raise.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


FAL_QUEUE_URL = "https://queue.fal.run"
DEFAULT_MODEL = "fal-ai/flux/schnell"  # fast + cheap; good for demos
DEFAULT_IMAGE_SIZE = "square_hd"  # 1024x1024


class FalClientError(Exception):
    """Raised for unrecoverable fal.ai client errors (never raised by the
    public ``generate_*`` helpers — those always return a FalImageResult)."""


@dataclass
class FalImageResult:
    image_url: str = ""
    prompt: str = ""
    model: str = ""
    seed: Optional[int] = None
    error: str = ""

    @property
    def ok(self) -> bool:
        return bool(self.image_url) and not self.error


def fal_configured() -> bool:
    """True iff fal.ai is configured (FAL_API_KEY is set)."""
    return bool(os.environ.get("FAL_KEY") or os.environ.get("FAL_API_KEY"))


def _api_key() -> str:
    return os.environ.get("FAL_KEY") or os.environ.get("FAL_API_KEY") or ""


def _palette_for(verified: bool, callers: int, peer_signers: int) -> str:
    """Map verification state to a textile-style colour palette description."""
    if not verified:
        return "muted slate, faded indigo, charcoal — an unfinished, frayed weave"
    if callers >= 1000 or peer_signers >= 5:
        return "deep crimson, woven gold, copper sunset — a celebratory tapestry"
    if callers >= 100:
        return "ocean teal, woven silver, midnight blue — a confident weave"
    return "forest green, soft cream, woven amber — a quiet first thread"


def _density_for(commits: int, callers: int) -> str:
    """Map activity volume to weave density description."""
    score = commits * 2 + callers // 10
    if score >= 200:
        return "extremely dense, intricate brocade pattern with countless interlacings"
    if score >= 50:
        return "rich, multi-layered weave with visible warp and weft threads"
    if score >= 10:
        return "moderate plain-weave with clear horizontal weft lines"
    return "sparse, minimal weave — only a few threads laid down"


def build_milestone_prompt(
    *,
    chapter_heading: str,
    chapter_body: str,
    verified: bool,
    unique_callers: int,
    commits: int,
    peer_signers: int,
) -> str:
    """
    Build a textile-themed image prompt deterministically derived from
    milestone metrics. The output is a single string suitable for FLUX or
    similar text-to-image models.
    """
    palette = _palette_for(verified, unique_callers, peer_signers)
    density = _density_for(commits, unique_callers)
    motif = (chapter_heading or "Builder milestone").strip()
    cue = (chapter_body or "").strip().split(".")[0][:120]

    return (
        f"A close-up macro photograph of a hand-woven textile swatch, "
        f"in a colour palette of {palette}. "
        f"The weave is {density}. "
        f"The pattern subtly evokes the theme: '{motif}'. "
        f"{cue}. "
        f"Studio lighting, 8k, hyper-detailed fibres, no text, no logos, "
        f"editorial textile photography, woven fabric texture only."
    )


def build_chronicle_cover_prompt(
    *,
    title: str,
    chapter_count: int,
    total_callers: int,
    total_commits: int,
) -> str:
    """Cover-image prompt for a multi-milestone chronicle."""
    grandeur = (
        "monumental, museum-scale" if chapter_count >= 5
        else "intimate, wall-hung" if chapter_count >= 2
        else "small, framed"
    )
    activity = (
        "explosively dense and chromatic" if total_callers + total_commits * 5 >= 1000
        else "richly layered and confident" if total_callers + total_commits * 5 >= 100
        else "quiet and emergent"
    )
    return (
        f"A {grandeur} woven tapestry titled '{title.strip() or 'Builder Journey'}', "
        f"composed of {chapter_count} distinct woven panels stitched together, "
        f"the overall composition is {activity}. "
        f"Editorial textile photography, dramatic side lighting, deep shadows, "
        f"hyper-detailed fibre texture, no text, no logos, woven fabric only."
    )


def _submit_and_wait(
    *,
    prompt: str,
    model: str,
    image_size: str,
    seed: Optional[int],
    timeout: int,
) -> FalImageResult:
    """Submit a job to fal.ai queue API and poll until done. Stdlib only."""
    key = _api_key()
    if not key:
        return FalImageResult(prompt=prompt, model=model, error="FAL_KEY not set")

    body: Dict[str, Any] = {
        "prompt": prompt,
        "image_size": image_size,
        "num_images": 1,
        "enable_safety_checker": True,
    }
    if seed is not None:
        body["seed"] = seed

    submit_url = f"{FAL_QUEUE_URL}/{model}"
    try:
        req = urllib.request.Request(
            submit_url,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Key {key}",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            queued = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return FalImageResult(prompt=prompt, model=model, error=f"submit HTTP {e.code}: {e.reason}")
    except Exception as e:
        return FalImageResult(prompt=prompt, model=model, error=f"submit error: {e}")

    status_url = queued.get("status_url")
    response_url = queued.get("response_url")
    if not status_url or not response_url:
        return FalImageResult(prompt=prompt, model=model, error="no status_url in queue response")

    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            sreq = urllib.request.Request(status_url, headers={"Authorization": f"Key {key}"})
            with urllib.request.urlopen(sreq, timeout=15) as sresp:
                status = json.loads(sresp.read().decode("utf-8"))
        except Exception as e:
            return FalImageResult(prompt=prompt, model=model, error=f"status poll error: {e}")
        st = status.get("status", "")
        if st == "COMPLETED":
            break
        if st in ("FAILED", "CANCELLED"):
            return FalImageResult(prompt=prompt, model=model, error=f"job {st}")
        time.sleep(1.5)
    else:
        return FalImageResult(prompt=prompt, model=model, error="timeout waiting for image")

    try:
        rreq = urllib.request.Request(response_url, headers={"Authorization": f"Key {key}"})
        with urllib.request.urlopen(rreq, timeout=15) as rresp:
            result = json.loads(rresp.read().decode("utf-8"))
    except Exception as e:
        return FalImageResult(prompt=prompt, model=model, error=f"result fetch error: {e}")

    images = result.get("images") or []
    if not images:
        return FalImageResult(prompt=prompt, model=model, error="empty images in result")
    return FalImageResult(
        image_url=images[0].get("url", ""),
        prompt=prompt,
        model=model,
        seed=result.get("seed"),
    )


def generate_milestone_image(
    *,
    chapter_heading: str = "",
    chapter_body: str = "",
    verified: bool = False,
    unique_callers: int = 0,
    commits: int = 0,
    peer_signers: int = 0,
    milestone_hash: str = "",
    model: str = DEFAULT_MODEL,
    image_size: str = DEFAULT_IMAGE_SIZE,
    timeout: int = 60,
) -> FalImageResult:
    """
    Generate a single woven-textile image for a milestone. The prompt is
    derived deterministically from the milestone's metrics so the same
    inputs produce visually coherent (though not pixel-identical) output.

    Returns a FalImageResult — never raises. Check ``.ok`` before use.
    """
    prompt = build_milestone_prompt(
        chapter_heading=chapter_heading,
        chapter_body=chapter_body,
        verified=verified,
        unique_callers=unique_callers,
        commits=commits,
        peer_signers=peer_signers,
    )
    seed: Optional[int] = None
    if milestone_hash:
        h = milestone_hash[2:] if milestone_hash.startswith("0x") else milestone_hash
        try:
            seed = int(h[:8], 16)
        except ValueError:
            seed = None
    return _submit_and_wait(
        prompt=prompt, model=model, image_size=image_size, seed=seed, timeout=timeout
    )


def generate_chronicle_cover(
    *,
    title: str = "",
    chapters: Optional[List[Dict[str, Any]]] = None,
    attestations: Optional[List[Dict[str, Any]]] = None,
    model: str = DEFAULT_MODEL,
    image_size: str = "landscape_16_9",
    timeout: int = 60,
) -> FalImageResult:
    """
    Generate a chronicle cover image. The prompt is derived from the
    chronicle title and aggregate metrics across all attestations.
    """
    chapters = chapters or []
    attestations = attestations or []
    total_callers = sum(int(a.get("usage", {}).get("uniqueCallerCount", 0)) for a in attestations)
    total_commits = sum(len((a.get("github", {}) or {}).get("commits", []) or []) for a in attestations)
    prompt = build_chronicle_cover_prompt(
        title=title,
        chapter_count=max(len(chapters), len(attestations), 1),
        total_callers=total_callers,
        total_commits=total_commits,
    )
    return _submit_and_wait(
        prompt=prompt, model=model, image_size=image_size, seed=None, timeout=timeout
    )


# ---------------------------------------------------------------------------
# ComfyUI integration — supplement to fal.ai
# ---------------------------------------------------------------------------
# ComfyUI runs locally (or on a remote server) and provides a REST API.
# When COMFYUI_URL is set, Weft can route image generation through ComfyUI
# instead of (or alongside) fal.ai — giving full control over the pipeline
# and avoiding per-image API costs.
#
# The integration uses ComfyUI's /prompt endpoint with a minimal txt2img
# workflow. ComfyUI must be running separately (e.g. via Hermes ComfyUI
# skill or `python main.py --listen`).

COMFYUI_DEFAULT_URL = "http://127.0.0.1:8188"


def comfyui_configured() -> bool:
    """True iff ComfyUI is reachable (COMFYUI_URL is set or default is up)."""
    url = os.environ.get("COMFYUI_URL", "")
    if url:
        return True
    # Probe default
    try:
        req = urllib.request.Request(f"{COMFYUI_DEFAULT_URL}/system_stats")
        with urllib.request.urlopen(req, timeout=2):
            return True
    except Exception:
        return False


def _comfyui_url() -> str:
    return os.environ.get("COMFYUI_URL", COMFYUI_DEFAULT_URL).rstrip("/")


def _comfyui_txt2img_workflow(prompt: str, seed: int, width: int = 1024, height: int = 1024) -> Dict[str, Any]:
    """Minimal ComfyUI workflow JSON for txt2img via KSampler."""
    return {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": 20,
                "cfg": 7.0,
                "sampler_name": "euler",
                "scheduler": "normal",
                "denoise": 1.0,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0],
            },
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": os.environ.get("COMFYUI_CHECKPOINT", "sd_xl_base_1.0.safetensors")},
        },
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {"width": width, "height": height, "batch_size": 1},
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": prompt, "clip": ["4", 1]},
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": "text, logos, watermark, blurry, low quality", "clip": ["4", 1]},
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {"filename_prefix": "weft_swatch", "images": ["8", 0]},
        },
    }


def generate_comfyui_image(
    *,
    prompt: str,
    seed: int = 42,
    width: int = 1024,
    height: int = 1024,
    timeout: int = 120,
) -> FalImageResult:
    """
    Generate an image via a local/remote ComfyUI instance.

    Returns a FalImageResult for API compatibility — ``image_url`` will be
    a ``file://`` or ``http://`` URL pointing to the generated image.
    Never raises; check ``.ok`` before use.
    """
    base = _comfyui_url()
    workflow = _comfyui_txt2img_workflow(prompt, seed, width, height)

    try:
        body = json.dumps({"prompt": workflow}).encode("utf-8")
        req = urllib.request.Request(
            f"{base}/prompt",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            queued = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return FalImageResult(prompt=prompt, model="comfyui", error=f"ComfyUI submit: {e}")

    prompt_id = queued.get("prompt_id", "")
    if not prompt_id:
        return FalImageResult(prompt=prompt, model="comfyui", error="no prompt_id from ComfyUI")

    # Poll history until done
    deadline_t = time.time() + timeout
    while time.time() < deadline_t:
        try:
            hreq = urllib.request.Request(f"{base}/history/{prompt_id}")
            with urllib.request.urlopen(hreq, timeout=10) as hresp:
                history = json.loads(hresp.read().decode("utf-8"))
        except Exception:
            time.sleep(2)
            continue

        entry = history.get(prompt_id)
        if not entry:
            time.sleep(2)
            continue

        outputs = entry.get("outputs", {})
        for node_id, node_out in outputs.items():
            images = node_out.get("images", [])
            if images:
                img = images[0]
                filename = img.get("filename", "")
                subfolder = img.get("subfolder", "")
                img_type = img.get("type", "output")
                img_url = f"{base}/view?filename={filename}&subfolder={subfolder}&type={img_type}"
                return FalImageResult(image_url=img_url, prompt=prompt, model="comfyui", seed=seed)

        # Check for errors
        status = entry.get("status", {})
        if status.get("status_str") == "error":
            msgs = status.get("messages", [])
            return FalImageResult(prompt=prompt, model="comfyui", error=f"ComfyUI error: {msgs}")

        time.sleep(2)

    return FalImageResult(prompt=prompt, model="comfyui", error="ComfyUI timeout")


def generate_milestone_image_comfyui(
    *,
    chapter_heading: str = "",
    chapter_body: str = "",
    verified: bool = False,
    unique_callers: int = 0,
    commits: int = 0,
    peer_signers: int = 0,
    milestone_hash: str = "",
    width: int = 1024,
    height: int = 1024,
    timeout: int = 120,
) -> FalImageResult:
    """
    Generate a milestone swatch via ComfyUI. Same interface as
    ``generate_milestone_image`` but routes through a local ComfyUI
    instance. Falls back gracefully if ComfyUI is not running.
    """
    if not comfyui_configured():
        return FalImageResult(prompt="", model="comfyui", error="ComfyUI not available")

    prompt = build_milestone_prompt(
        chapter_heading=chapter_heading,
        chapter_body=chapter_body,
        verified=verified,
        unique_callers=unique_callers,
        commits=commits,
        peer_signers=peer_signers,
    )
    seed = 42
    if milestone_hash:
        h = milestone_hash[2:] if milestone_hash.startswith("0x") else milestone_hash
        try:
            seed = int(h[:8], 16)
        except ValueError:
            pass

    return generate_comfyui_image(
        prompt=prompt, seed=seed, width=width, height=height, timeout=timeout
    )
