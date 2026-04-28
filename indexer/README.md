# Weft Indexer

## Overview
The indexer writes verified milestone data to 0G Storage as permanent evidence archives.

## Architecture

- **Log Layer**: Raw evidence blobs (git snapshots, deployment proofs, usage logs)
- **KV Layer**: Structured attestation summaries for fast lookup

## Usage

```python
from indexer.writer import EvidenceWriter

writer = EvidenceWriter()

# Write evidence
writer.write_evidence(
    milestone_hash="0x...",
    evidence_type="github",
    data=commit_history
)

# Write attestation
writer.write_attestation(
    milestone_hash="0x...",
    attestation=attestation_object
)
```