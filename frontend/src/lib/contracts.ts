import { defineChain } from "viem";
import { mainnet, base, sepolia } from "wagmi/chains";
import { Address } from "viem";

import WeftMilestoneAbi from "./abis/WeftMilestone.json";
import VerifierRegistryAbi from "./abis/VerifierRegistry.json";

export const zeroGTestnet = defineChain({
  id: 16602,
  name: "0G Testnet",
  network: "0g-testnet",
  nativeCurrency: { name: "OG", symbol: "OG", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc-testnet.0g.ai"] },
    public: { http: ["https://evmrpc-testnet.0g.ai"] },
  },
});

export const WEFT_CHAINS = {
  mainnet,
  base,
  sepolia,
  zeroGTestnet,
} as const;

export const CONTRACT_ADDRESSES = {
  sepolia: {
    weftMilestone: process.env.NEXT_PUBLIC_WEFT_MILESTONE_SEPOLIA as Address,
    verifierRegistry: process.env.NEXT_PUBLIC_VERIFIER_REGISTRY_SEPOLIA as Address,
  },
  baseSepolia: {
    weftMilestone: process.env.NEXT_PUBLIC_WEFT_MILESTONE_BASE_SEPOLIA as Address,
    verifierRegistry: process.env.NEXT_PUBLIC_VERIFIER_REGISTRY_BASE_SEPOLIA as Address,
  },
  mainnet: {
    weftMilestone: process.env.NEXT_PUBLIC_WEFT_MILESTONE_MAINNET as Address,
    verifierRegistry: process.env.NEXT_PUBLIC_VERIFIER_REGISTRY_MAINNET as Address,
  },
  base: {
    weftMilestone: process.env.NEXT_PUBLIC_WEFT_MILESTONE_BASE as Address,
    verifierRegistry: process.env.NEXT_PUBLIC_VERIFIER_REGISTRY_BASE as Address,
  },
  zeroGTestnet: {
    weftMilestone: (process.env.NEXT_PUBLIC_WEFT_MILESTONE_0G_TESTNET || "0x9f66158c560ce5c8b40820fdcd2874ff8d852192") as Address,
    verifierRegistry: (process.env.NEXT_PUBLIC_VERIFIER_REGISTRY_0G_TESTNET || "0x1356dd3f28461685ffd81d44f6ae9ae87937e34a") as Address,
  },
} as const;

export type ChainName = keyof typeof CONTRACT_ADDRESSES;

export const DEFAULT_CHAIN: ChainName = (process.env.NEXT_PUBLIC_DEFAULT_CHAIN as ChainName) || "zeroGTestnet";

export function getAddresses(chain: ChainName = DEFAULT_CHAIN) {
  return CONTRACT_ADDRESSES[chain];
}

export { WeftMilestoneAbi, VerifierRegistryAbi };
