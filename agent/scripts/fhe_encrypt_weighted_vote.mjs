#!/usr/bin/env node
// SPDX-License-Identifier: MIT
/**
 * fhe_encrypt_weighted_vote.mjs — Zama FHE encryption helper for
 * confidence-weighted sealed-ballot votes.
 *
 * Encrypts BOTH a boolean vote (0 or 1) AND a confidence score (1-100)
 * as two euint32 values in a single batch using the Zama relayer SDK,
 * then submits the encrypted weighted verdict to
 * WeftMilestoneConfidentialWeighted on-chain.
 *
 * The vote AND the confidence are sealed: encrypted here, multiplied and
 * tallied homomorphically by the contract (FHE.mul + FHE.add), and never
 * decrypted.
 *
 * Usage:
 *   node fhe_encrypt_weighted_vote.mjs \
 *     --rpc-url <sepolia-rpc> \
 *     --private-key <0x...> \
 *     --contract <0x...> \
 *     --milestone-hash <0x...> \
 *     --did-complete <true|false> \
 *     --confidence <1-100> \
 *     --evidence-root <0x...> \
 *     [--encrypt-only]            # smoke test: encrypt, skip the transaction
 *
 * Output: JSON with { txHash, encryptedHandles, inputProof } on success,
 *         JSON with { error } on failure.
 */

import { createWalletClient, createPublicClient, http, parseAbi, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";

// Parse CLI args (flags without a value, like --encrypt-only, become "true")
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
  "did-complete": didCompleteStr,
  confidence: confidenceStr,
  "evidence-root": evidenceRoot,
  "encrypt-only": encryptOnly,
} = args;

if (!rpcUrl || !privateKey || !contractAddress || !milestoneHash || !evidenceRoot) {
  console.log(JSON.stringify({ error: "Missing required arguments" }));
  process.exit(1);
}

const didComplete = didCompleteStr === "true" ? 1 : 0;
const confidence = Math.max(1, Math.min(100, parseInt(confidenceStr || "50", 10)));

const ABI = parseAbi([
  "function submitWeightedVerdict(bytes32 milestoneHash, bytes32 encryptedDidComplete, bytes32 encryptedConfidence, bytes inputProof, bytes32 evidenceRoot) external",
]);

const toHex = (bytes) => "0x" + Buffer.from(bytes).toString("hex");

async function main() {
  try {
    const account = privateKeyToAccount(privateKey);

    // Batch-encrypt both values in a single input proof.
    // The Zama SDK creates one proof covering both handles — the contract
    // calls FHE.fromExternal twice with the same proof, retrieving each
    // ciphertext separately.
    const contract = getAddress(contractAddress);
    const instance = await createInstance({ ...SepoliaConfig, network: rpcUrl });
    const input = instance.createEncryptedInput(contract, account.address);
    input.add32(didComplete);
    input.add32(confidence);
    const { handles, inputProof } = await input.encrypt();

    const encDidComplete = toHex(handles[0]);
    const encConfidence = toHex(handles[1]);
    const inputProofHex = toHex(inputProof);

    if (encryptOnly === "true") {
      console.log(JSON.stringify({
        txHash: "",
        encryptedHandles: [encDidComplete, encConfidence],
        inputProof: inputProofHex,
        status: "encrypted",
        gasUsed: "0",
      }));
      return;
    }

    const transport = http(rpcUrl);
    const walletClient = createWalletClient({ account, chain: sepolia, transport });
    const publicClient = createPublicClient({ chain: sepolia, transport });

    const txHash = await walletClient.writeContract({
      address: contract,
      abi: ABI,
      functionName: "submitWeightedVerdict",
      args: [milestoneHash, encDidComplete, encConfidence, inputProofHex, evidenceRoot],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    console.log(JSON.stringify({
      txHash,
      encryptedHandles: [encDidComplete, encConfidence],
      inputProof: inputProofHex,
      status: receipt.status === "success" ? "confirmed" : "failed",
      gasUsed: receipt.gasUsed.toString(),
    }));
  } catch (err) {
    console.log(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    process.exit(1);
  }
}

main();
