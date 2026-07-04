/// Single source of truth for milestone display identity (hash → name/promise)
/// and hash formatting. Resolution order: creation-time record saved by this
/// browser → known demo milestones → status-API pitch (caller-provided) →
/// short hash. Never invents names.

export interface MilestoneMeta {
  name: string;
  /** The acceptance criteria entered at creation. keccak256(utf8) of this
   *  string is the on-chain metadataHash, so the UI can verify it. */
  promise?: string;
}

/// Demo milestones whose creation inputs are known and hash-verifiable.
const KNOWN: Record<string, MilestoneMeta> = {
  "0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f": {
    name: "Weft demo milestone",
  },
  "0xc351d2446c4e245d3baa0fc206a05d61010589dd8635c844c17955d50fc58574": {
    name: "Zama sealed-ballot demo",
    promise: "Sealed-ballot verification demo for the Zama Developer Program",
  },
};

const STORAGE_KEY = "weft.milestoneNames";

/// Called by the create flow so the creator's browser remembers the name.
export function rememberMilestoneName(hash: string, name: string, promise?: string) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    all[hash.toLowerCase()] = { name, promise };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable — display falls back to short hash */
  }
}

export function shortHash(hash: string, head = 10, tail = 6): string {
  if (!hash || hash.length < head + tail + 2) return hash;
  return `${hash.slice(0, head)}...${hash.slice(-tail)}`;
}

export function resolveMilestoneMeta(hash: string, apiPitch?: string | null): MilestoneMeta {
  const key = hash.toLowerCase();
  if (typeof window !== "undefined") {
    try {
      const local = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")[key];
      if (local?.name) return local;
    } catch {
      /* fall through */
    }
  }
  if (KNOWN[key]) return KNOWN[key];
  if (apiPitch) return { name: apiPitch };
  return { name: `Milestone ${shortHash(hash)}` };
}
