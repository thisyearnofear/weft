#!/usr/bin/env node
// SPDX-License-Identifier: MIT
/**
 * fhe_encrypt_vote.mjs — Zama FHE encryption helper for confidential milestone votes.
 *
 * Encrypts a boolean vote (0 or 1) as an euint32 using the Zama SDK,
 * then submits the encrypted verdict to WeftMilestoneConfidential on-chain.
 *
 * Called as a subprocess by agent/lib/fhe_client.py (same pattern as
 * the existing `cast` subprocess calls in weft_daemon.py).
 *
 * Usage:
 *   node fhe_encrypt_vote.mjs \
 *     --rpc-url <sepolia-rpc> \
 *     --private-key <0x...> \
 *     --contract <0x...> \
 *     --milestone-hash <0x...> \
 *     --did-complete <true|false> \
 *     --evidence-root <0x...>
 *
 * Output: JSON with { txHash, encryptedHandle, inputProof } on success,
 *         JSON with { error } on failure.
 */

import { createWalletClient, createPublicClient, http, parseAbi, formatEther } from "viem";
import { sepolia } from "viem/chains";
import { createConfig, ZamaSDK } from "@zama-fhe/sdk/viem";
import { web } from "@zama-fhe/sdk/web";
import { sepolia as sepoliaFhe } from "@zama-fhe/sdk/chains";

// Parse CLI args
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, val, i, arr) => {
    if (val.startsWith("--")) {
      const key = val.slice(2);
      const value = arr[i + 1];
      acc.push([key, value]);
    }
    return acc;
  }, [])
);

const {
  "rpc-url": rpcUrl,
  "private-key": privateKey,
  contract: contractAddress,
  "milestone-hash": milestoneHash,
  "did-complete": didCompleteStr,
  "evidence-root": evidenceRoot,
} = args;

if (!rpcUrl || !privateKey || !contractAddress || !milestoneHash || !evidenceRoot) {
  console.log(JSON.stringify({ error: "Missing required arguments" }));
  process.exit(1);
}

const didComplete = didCompleteStr === "true" ? 1 : 0;

// Minimal ABI for the submitVerdict function
const ABI = parseAbi([
  "function submitVerdict(bytes32 milestoneHash, bytes32 encryptedDidComplete, bytes inputProof, bytes32 evidenceRoot) external",
]);

async function main() {
  try {
    const transport = http(rpcUrl);
    const walletClient = createWalletClient({
      chain: sepolia,
      transport,
    });
    const publicClient = createPublicClient({
      chain: sepolia,
      transport,
    });

    // Configure Zama SDK for Sepolia
    const fheChain = {
      ...sepoliaFhe,
      relayerUrl: process.env.ZAMA_RELAYER_URL || "",
    };
    const config = createConfig({
      chains: [fheChain],
      publicClient,
      walletClient,
      relayers: { [fheChain.id]: web() },
    });
    const sdk = new ZamaSDK(config);

    // Encrypt the boolean vote as euint32 (0 or 1)
    const [account] = await walletClient.getAddresses();
    const encrypted = await sdk
      .createEncryptedInput(contractAddress, account)
      .add32(didComplete)
      .encrypt();

    // Submit the encrypted verdict on-chain
    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: ABI,
      functionName: "submitVerdict",
      args: [
        milestoneHash,
        encrypted.handles[0],
        encrypted.inputProof,
        evidenceRoot,
      ],
      account,
      chain: sepolia,
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    console.log(JSON.stringify({
      txHash,
      encryptedHandle: encrypted.handles[0],
      inputProof: "0x" + Buffer.from(encrypted.inputProof).toString("hex"),
      status: receipt.status === "success" ? "confirmed" : "failed",
      gasUsed: receipt.gasUsed.toString(),
    }));
  } catch (err) {
    console.log(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    process.exit(1);
  }
}

main();
