#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Deterministic bundle packer.

Goal: package an attestation output directory (attestation.json, consensus.json, etc.)
into a single stable tar.gz artifact that can be uploaded to 0G Storage.

Determinism rules:
- stable file ordering (lexicographic)
- stable metadata (uid/gid/uname/gname/mtime normalized)
- stable gzip header mtime (0)
"""

from __future__ import annotations

import gzip
import io
import os
import tarfile
from typing import Iterable, List, Tuple


def list_files_recursively(root_dir: str) -> List[Tuple[str, str]]:
    """
    Returns [(abs_path, rel_path)] sorted by rel_path.
    """
    root_dir = os.path.abspath(root_dir)
    pairs: List[Tuple[str, str]] = []
    for dirpath, _, filenames in os.walk(root_dir):
        for name in filenames:
            abs_path = os.path.join(dirpath, name)
            rel_path = os.path.relpath(abs_path, root_dir)
            pairs.append((abs_path, rel_path))
    pairs.sort(key=lambda x: x[1])
    return pairs


def create_deterministic_tar_gz(src_dir: str, out_path: str) -> str:
    """
    Create a deterministic tar.gz from src_dir at out_path.
    Returns out_path.
    """
    src_dir = os.path.abspath(src_dir)
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)

    # gzip header mtime must be fixed for determinism.
    with open(out_path, "wb") as raw_out:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw_out, mtime=0) as gz:
            with tarfile.open(fileobj=gz, mode="w") as tf:
                _add_dir_entry(tf, ".", mode=0o755)
                for abs_path, rel_path in list_files_recursively(src_dir):
                    _add_file(tf, abs_path, rel_path)
    return out_path


def _norm_tarinfo(ti: tarfile.TarInfo, *, mode: int) -> tarfile.TarInfo:
    ti.uid = 0
    ti.gid = 0
    ti.uname = ""
    ti.gname = ""
    ti.mtime = 0
    ti.mode = mode
    return ti


def _add_dir_entry(tf: tarfile.TarFile, rel_path: str, *, mode: int) -> None:
    ti = tarfile.TarInfo(rel_path)
    ti.type = tarfile.DIRTYPE
    _norm_tarinfo(ti, mode=mode)
    ti.size = 0
    tf.addfile(ti)


def _add_file(tf: tarfile.TarFile, abs_path: str, rel_path: str) -> None:
    # Ensure parent directories are present implicitly by adding only files; tar readers handle it.
    with open(abs_path, "rb") as f:
        data = f.read()
    ti = tarfile.TarInfo(rel_path)
    # Preserve executability in a simple way.
    is_exec = os.access(abs_path, os.X_OK)
    mode = 0o755 if is_exec else 0o644
    _norm_tarinfo(ti, mode=mode)
    ti.size = len(data)
    tf.addfile(ti, io.BytesIO(data))

