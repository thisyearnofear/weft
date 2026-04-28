# Weft Indexer

## Overview
The indexer writes verified milestone data to 0G Storage as permanent evidence archives.

## Architecture

- **Log Layer**: Raw evidence blobs (git snapshots, deployment proofs, usage logs)
- **KV Layer**: Structured attestation summaries for fast lookup

## Usage

Planned (not yet implemented):
- `indexer/writer.py`: write raw evidence + `attestation.json` bundles to 0G Storage
- `indexer/reader.py`: read evidence bundles by `evidenceRoot`

The canonical attestation schema for MVP is defined in `docs/mvp.md`.
