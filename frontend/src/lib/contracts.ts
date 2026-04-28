import { mainnet, base, sepolia } from "wagmi/chains";
import { Address } from "viem";

import WeftMilestoneAbi from "./abis/WeftMilestone.json";
import VerifierRegistryAbi from "./abis/VerifierRegistry.json";

export const WEFT_CHAINS = {
  mainnet,
  base,
  sepolia,
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
} as const;

export type ChainName = keyof typeof CONTRACT_ADDRESSES;

export const DEFAULT_CHAIN: ChainName = (process.env.NEXT_PUBLIC_DEFAULT_CHAIN as ChainName) || "sepolia";

export function getAddresses(chain: ChainName = DEFAULT_CHAIN) {
  return CONTRACT_ADDRESSES[chain];
}

export { WeftMilestoneAbi, VerifierRegistryAbi };
