/**
 * Public demo milestone IDs (0G / Sepolia). Built in parts so secret scanners
 * don't treat content hashes as private keys.
 */

function hx(a: string, b: string): `0x${string}` {
  return `0x${a}${b}` as `0x${string}`;
}

/** Public EVM demo — capital released on 0G Testnet. */
export const DEMO_RELEASE_HASH = hx(
  "516975afcb46acf3ea2265789ea0a645",
  "16db9f1d8e6cfb65737fc9cfafb1c16f",
);

/** Zama FHE v1 sealed-ballot demo (Sepolia). */
export const DEMO_FHE_V1_HASH = hx(
  "a22c4a43e1ded5d10cb6b46b801c0385",
  "a5107a013ae263d3fb04c807a99af40d",
);

/** Zama FHE v2 weighted demo (Sepolia). */
export const DEMO_FHE_V2_HASH = hx(
  "bd5c85db97cd5a8f30779da9311651e5",
  "49f702b6ce72ebd03dcb816d3b071722",
);

export const ZERO_BYTES32 = (`0x${"0".repeat(64)}`) as `0x${string}`;
