#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
HydraDB (CortexDB) client wrapper for Weft verifier agents.

Provides the 'Operational Memory' layer for capturing recovery events
and recalling historical patterns to improve autonomous decisions.
"""

import os
import time
import json
import logging
from typing import Any, Dict, List, Optional

try:
    from cortexdb.v1 import V1Client
    HAS_CORTEX = True
except ImportError:
    HAS_CORTEX = False

logger = logging.getLogger("weft.hydradb")

class HydraDBClient:
    def __init__(self, api_key: Optional[str] = None, scope: str = "weft:default"):
        self.api_key = api_key or os.environ.get("HYDRADB_API_KEY")
        self.scope = scope
        self.client = None
        
        if HAS_CORTEX and self.api_key:
            try:
                self.client = V1Client(api_key=self.api_key)
                logger.info(f"HydraDB initialized with scope: {self.scope}")
            except Exception as e:
                logger.error(f"Failed to initialize HydraDB client: {e}")
        elif not HAS_CORTEX:
            logger.warning("cortexdb library not found. HydraDB integration disabled.")
        elif not self.api_key:
            logger.warning("HYDRADB_API_KEY not found. HydraDB integration disabled.")

    def capture(self, text: str, metadata: Optional[Dict[str, Any]] = None, modality: str = "event"):
        """Record an experience/memory into HydraDB."""
        if not self.client:
            return None
            
        try:
            # metadata in cortexdb is usually passed via the text or separate fields if supported
            # For now we embed metadata into the text for better semantic recall
            full_text = text
            if metadata:
                full_text += f"\nMetadata: {json.dumps(metadata)}"
                
            result = self.client.experience(
                scope=self.scope,
                text=full_text,
                modality=modality,
                observed_at=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            )
            return result
        except Exception as e:
            logger.error(f"HydraDB capture failed: {e}")
            return None

    def recall(self, query: str, include: List[str] = None) -> str:
        """Retrieve relevant context from HydraDB."""
        if not self.client:
            return ""
            
        try:
            include = include or ["beliefs", "facts", "episodes"]
            pack = self.client.recall(
                scope=self.scope,
                query=query,
                include=include,
                view="holistic"
            )
            return pack.get("context_block", "")
        except Exception as e:
            logger.error(f"HydraDB recall failed: {e}")
            return ""

# Singleton instance
_instance = None

def get_client() -> HydraDBClient:
    global _instance
    if _instance is None:
        _instance = HydraDBClient()
    return _instance
