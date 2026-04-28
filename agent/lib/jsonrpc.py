#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

import json
import os
import time
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, Optional


class JsonRpcError(RuntimeError):
    pass


@dataclass(frozen=True)
class FileCache:
    root: str

    def _path(self, key: str) -> str:
        safe = "".join([c if c.isalnum() or c in ("-", "_", ".") else "_" for c in key])
        return os.path.join(self.root, f"{safe}.json")

    def get(self, key: str) -> Optional[Any]:
        path = self._path(key)
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def set(self, key: str, value: Any) -> None:
        os.makedirs(self.root, exist_ok=True)
        path = self._path(key)
        tmp = f"{path}.tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(value, f)
        os.replace(tmp, path)


class JsonRpcClient:
    def __init__(self, url: str, cache: Optional[FileCache] = None, timeout_s: int = 30):
        self.url = url
        self.cache = cache
        self.timeout_s = timeout_s
        self._id = 0

    def call(self, method: str, params: Any) -> Any:
        # Cache only idempotent reads.
        cache_key = None
        if self.cache is not None and method.startswith("eth_"):
            cache_key = f"{method}:{json.dumps(params, sort_keys=True, separators=(',', ':'))}"
            cached = self.cache.get(cache_key)
            if cached is not None:
                return cached

        self._id += 1
        body = {
            "jsonrpc": "2.0",
            "id": self._id,
            "method": method,
            "params": params,
        }

        req = urllib.request.Request(
            self.url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout_s) as resp:
                raw = resp.read()
        except Exception as e:
            raise JsonRpcError(f"RPC request failed for {method}: {e}") from e

        try:
            payload: Dict[str, Any] = json.loads(raw.decode("utf-8"))
        except Exception as e:
            raise JsonRpcError(f"RPC returned non-JSON for {method}: {raw[:200]!r}") from e

        if "error" in payload and payload["error"] is not None:
            raise JsonRpcError(f"RPC error for {method}: {payload['error']}")
        if "result" not in payload:
            raise JsonRpcError(f"RPC missing result for {method}: {payload}")

        result = payload["result"]
        if cache_key is not None:
            # Best-effort cache write.
            try:
                self.cache.set(cache_key, result)
            except Exception:
                pass

        return result


def default_cache() -> FileCache:
    # Keep cache local to repo under agent/.cache (ignored by git).
    return FileCache(root=os.path.join(os.path.dirname(__file__), "..", ".cache", "rpc"))

