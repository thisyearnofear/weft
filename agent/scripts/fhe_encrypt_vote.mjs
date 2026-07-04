#!/usr/bin/env node
// SPDX-License-Identifier: MIT
/**
 * fhe_encrypt_vote.mjs — Zama FHE encryption helper for confidential milestone votes.
 *
 * Encrypts a boolean vote (0 or 1) as an euint32 using the Zama relayer SDK,
 * then submits the encrypted verdict to WeftMilestoneConfidential on-chain.
 * The vote is a sealed ballot: it is encrypted here, tallied homomorphically
 * by the contract, and never decrypted.
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
 *     --evidence-root <0x...> \
 *     [--encrypt-only]            # smoke test: encrypt, skip the transaction
 *
 * Output: JSON with { txHash, encryptedHandle, inputProof } on success,
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
  "evidence-root": evidenceRoot,
  "encrypt-only": encryptOnly,
} = args;

if (!rpcUrl || !privateKey || !contractAddress || !milestoneHash || !evidenceRoot) {
  console.log(JSON.stringify({ error: "Missing required arguments" }));
  process.exit(1);
}

const didComplete = didCompleteStr === "true" ? 1 : 0;

const ABI = parseAbi([
  "function submitVerdict(bytes32 milestoneHash, bytes32 encryptedDidComplete, bytes inputProof, bytes32 evidenceRoot) external",
]);

const toHex = (bytes) => "0x" + Buffer.from(bytes).toString("hex");

async function main() {
  try {
    const account = privateKeyToAccount(privateKey);

    // Encrypt the vote against the Zama Sepolia coprocessor. The input proof
    // binds the ciphertext to (contract, sender) so it cannot be replayed.
    // The relayer requires EIP-55 checksummed addresses
    const contract = getAddress(contractAddress);
    const instance = await createInstance({ ...SepoliaConfig, network: rpcUrl });
    const input = instance.createEncryptedInput(contract, account.address);
    input.add32(didComplete);
    const { handles, inputProof } = await input.encrypt();

    const encryptedHandle = toHex(handles[0]);
    const inputProofHex = toHex(inputProof);

    if (encryptOnly === "true") {
      console.log(JSON.stringify({
        txHash: "",
        encryptedHandle,
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
      functionName: "submitVerdict",
      args: [milestoneHash, encryptedHandle, inputProofHex, evidenceRoot],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    console.log(JSON.stringify({
      txHash,
      encryptedHandle,
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
