#!/usr/bin/env node
// SPDX-License-Identifier: MIT
/**
 * fhe_decrypt_result.mjs — publicly decrypt a confidential milestone's sealed result.
 *
 * After the final ballot, WeftMilestoneConfidential calls
 * FHE.makePubliclyDecryptable(verified). This helper reads the ebool handle from
 * the milestone struct and asks the Zama relayer to decrypt it, so the owner can
 * call confirmResult(hash, bool) onchain.
 *
 * Usage:
 *   node fhe_decrypt_result.mjs --rpc-url <sepolia-rpc> --contract <0x...> --milestone-hash <0x...>
 *
 * Output: JSON { verified: true|false, handle } or { error }.
 */

import { createPublicClient, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) args[argv[i].slice(2)] = argv[i + 1];
}
const { "rpc-url": rpcUrl, contract: contractAddress, "milestone-hash": milestoneHash } = args;

if (!rpcUrl || !contractAddress || !milestoneHash) {
  console.log(JSON.stringify({ error: "Missing required arguments" }));
  process.exit(1);
}

const ABI = parseAbi([
  "function milestones(bytes32) view returns (bytes32 projectId, bytes32 templateId, bytes32 metadataHash, address builder, uint64 createdAt, uint64 deadline, uint256 totalStaked, bool finalized, bytes32 verified, bool released, uint8 verifierCount, bytes32 verifiedVotes, bytes32 finalEvidenceRoot, bool resultConfirmed, bool resultVerified)",
]);

async function main() {
  try {
    const client = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
    const m = await client.readContract({
      address: contractAddress,
      abi: ABI,
      functionName: "milestones",
      args: [milestoneHash],
    });
    const finalized = m[7];
    const handle = m[8];
    if (!finalized) {
      console.log(JSON.stringify({ error: "Milestone not finalized — result still sealed" }));
      process.exit(1);
    }

    const instance = await createInstance({ ...SepoliaConfig, network: rpcUrl });
    const res = await instance.publicDecrypt([handle]);
    const values = res.clearValues ?? res;
    const key = Object.keys(values).find((k) => k.toLowerCase() === handle.toLowerCase());
    const v = values[key];
    const verified = v === true || v === 1n || v === 1;

    // abiEncodedClearValues + decryptionProof feed the trustless
    // confirmResult(bytes32,bytes,bytes) — the contract verifies the KMS
    // signatures itself, so no owner attestation is involved.
    console.log(JSON.stringify({
      verified,
      handle,
      abiEncodedClearValues: res.abiEncodedClearValues ?? null,
      decryptionProof: res.decryptionProof ?? null,
    }));
  } catch (err) {
    console.log(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    process.exit(1);
  }
}

main();
