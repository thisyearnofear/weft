#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

from typing import List, Tuple


def _strip_0x(hex_str: str) -> str:
    return hex_str[2:] if hex_str.startswith("0x") else hex_str


def encode_bytes32(value_hex: str) -> bytes:
    raw = bytes.fromhex(_strip_0x(value_hex))
    if len(raw) != 32:
        raise ValueError("bytes32 must be exactly 32 bytes")
    return raw


def encode_call(selector_hex: str, args_32: List[bytes]) -> str:
    sel = bytes.fromhex(_strip_0x(selector_hex))
    if len(sel) != 4:
        raise ValueError("selector must be 4 bytes")
    data = sel + b"".join(args_32)
    return "0x" + data.hex()


def decode_word(word: bytes) -> int:
    if len(word) != 32:
        raise ValueError("word must be 32 bytes")
    return int.from_bytes(word, byteorder="big", signed=False)


def decode_bool(word: bytes) -> bool:
    return decode_word(word) != 0


def decode_uint64(word: bytes) -> int:
    return decode_word(word) & ((1 << 64) - 1)


def decode_uint8(word: bytes) -> int:
    return decode_word(word) & 0xFF


def decode_address(word: bytes) -> str:
    # address is right-most 20 bytes.
    return "0x" + word[12:].hex()


def decode_bytes32(word: bytes) -> str:
    return "0x" + word.hex()


def chunk_words(data_hex: str) -> List[bytes]:
    s = _strip_0x(data_hex)
    if len(s) % 64 != 0:
        raise ValueError("return data is not word-aligned")
    out: List[bytes] = []
    for i in range(0, len(s), 64):
        out.append(bytes.fromhex(s[i : i + 64]))
    return out

