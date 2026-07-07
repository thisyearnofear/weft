#!/usr/bin/env node
// SPDX-License-Identifier: MIT
/**
 * fhe_confirm_weighted_result.mjs — Decrypt the sealed verified result
 * for a WeftMilestoneConfidentialWeighted milestone and submit confirmResult
 * on-chain with the KMS public decryption proof.
 *
 * Usage:
 *   node fhe_confirm_weighted_result.mjs \
 *     --rpc-url <sepolia-rpc> \
 *     --private-key <0x...> \
 *     --contract <0x...> \
 *     --milestone-hash <0x...>
 */

import { createWalletClient, createPublicClient, http, parseAbi, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith("--")) continue;
  const key = argv[i].slice(2);
  const next = argv[i + 1];
  args[key] = next !== undefined && !next.startsWith("--") ? next : "true";
}

const {
  "rpc-url": rpcUrl,
  "private-key": privateKey,
  contract: contractAddress,
  "milestone-hash": milestoneHash,
} = args;

if (!rpcUrl || !privateKey || !contractAddress || !milestoneHash) {
  console.log(JSON.stringify({ error: "Missing required arguments" }));
  process.exit(1);
}

const ABI = parseAbi([
  "function milestones(bytes32) view returns (bytes32,bytes32,bytes32,address,uint64,uint64,uint256,bool,bytes32,bool,uint8,bytes32,bytes32,bytes32,bool,bool)",
  "function confirmResult(bytes32 milestoneHash, bytes abiEncodedCleartexts, bytes decryptionProof) external",
]);

const toHex = (bytes) => "0x" + Buffer.from(bytes).toString("hex");

async function main() {
  try {
    const account = privateKeyToAccount(privateKey);
    const contract = getAddress(contractAddress);
    const transport = http(rpcUrl);
    const publicClient = createPublicClient({ chain: sepolia, transport });
    const walletClient = createWalletClient({ account, chain: sepolia, transport });

    // 1. Read the milestone to get the verified handle (field index 8)
    const milestone = await publicClient.readContract({
      address: contract,
      abi: ABI,
      functionName: "milestones",
      args: [milestoneHash],
    });

    const finalized = milestone[7];
    const verifiedHandle = milestone[8];
    const resultConfirmed = milestone[14];

    if (!finalized) {
      console.log(JSON.stringify({ error: "Milestone not finalized yet" }));
      process.exit(1);
    }
    if (resultConfirmed) {
      console.log(JSON.stringify({ error: "Result already confirmed", resultVerified: milestone[15] }));
      process.exit(0);
    }

    console.log("Verified handle:", verifiedHandle);

    // 2. Public decrypt the verified ebool via the Zama relayer
    const instance = await createInstance({ ...SepoliaConfig, network: rpcUrl });
    const decryptResult = await instance.publicDecrypt([verifiedHandle]);

    // The relayer returns clearValues and a proof
    const clearValues = decryptResult.clearValues ?? decryptResult;
    const keys = Object.keys(clearValues);
    const key = keys.find((k) => k.toLowerCase() === verifiedHandle.toLowerCase());
    if (!key) {
      console.log(JSON.stringify({ error: "No cleartext for handle", availableKeys: keys }));
      process.exit(1);
    }

    const clearValue = clearValues[key];
    const isVerified = clearValue === true || clearValue === BigInt(1) || clearValue === 1 || clearValue === "1";
    console.log("Decrypted result:", isVerified ? "VERIFIED" : "REJECTED");

    // 3. Get the decryption proof
    // The relayer SDK provides the proof in a specific format
    // We need to extract abiEncodedCleartexts and decryptionProof
    const abiEncodedCleartexts = decryptResult.abiEncodedCleartexts ||
      `0x${(BigInt(isVerified ? 1 : 0)).toString(16).padStart(64, "0")}`;
    const decryptionProof = decryptResult.decryptionProof || decryptResult.proof || "";

    if (!decryptionProof) {
      console.log(JSON.stringify({ error: "No decryption proof from relayer", decryptResultKeys: Object.keys(decryptResult) }));
      process.exit(1);
    }

    // 4. Submit confirmResult on-chain
    const txHash = await walletClient.writeContract({
      address: contract,
      abi: ABI,
      functionName: "confirmResult",
      args: [milestoneHash, abiEncodedCleartexts, decryptionProof],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    console.log(JSON.stringify({
      txHash,
      status: receipt.status === "success" ? "confirmed" : "failed",
      verified: isVerified,
      gasUsed: receipt.gasUsed.toString(),
    }));
  } catch (err) {
    console.log(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    process.exit(1);
  }
}

main();
