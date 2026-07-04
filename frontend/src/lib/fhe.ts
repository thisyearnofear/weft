// Zama relayer SDK — lazy singleton, loaded only when a confidential
// milestone actually needs decryption.
//
// The SDK ships TFHE WASM that bundlers mangle (the package's "/bundle"
// export is a window.relayerSDK CDN shim, and deep imports are blocked by
// package exports). So we self-host the UMD build + WASM under /zama/
// (copied from node_modules by the `sync-zama-sdk` script on dev/build) and
// load it with a plain script tag — identical behavior in dev and prod.

const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
// .js extension matters: the app sends X-Content-Type-Options: nosniff, so
// the script must be served with a JavaScript MIME type to execute.
const SDK_SCRIPT = "/zama/relayer-sdk-js.umd.js";

interface RelayerSDK {
  initSDK: (opts?: { tfheParams?: string | URL; kmsParams?: string | URL }) => Promise<boolean>;
  createInstance: (config: Record<string, unknown>) => Promise<FheInstance>;
  SepoliaConfig: Record<string, unknown>;
}

interface FheInstance {
  publicDecrypt: (
    handles: string[]
  ) => Promise<{ clearValues: Record<string, boolean | bigint | string> }>;
}

declare global {
  interface Window {
    relayerSDK?: RelayerSDK;
  }
}

function loadSdkScript(): Promise<RelayerSDK> {
  if (window.relayerSDK) return Promise.resolve(window.relayerSDK);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_SCRIPT;
    script.onload = () => {
      if (window.relayerSDK) resolve(window.relayerSDK);
      else reject(new Error("Zama SDK script loaded but window.relayerSDK is missing"));
    };
    script.onerror = () => reject(new Error("Failed to load Zama SDK script"));
    document.head.appendChild(script);
  });
}

let instancePromise: Promise<FheInstance> | null = null;

async function getFheInstance(): Promise<FheInstance> {
  if (!instancePromise) {
    instancePromise = (async () => {
      const sdk = await loadSdkScript();
      await sdk.initSDK({
        tfheParams: new URL("/zama/tfhe_bg.wasm", window.location.origin),
        kmsParams: new URL("/zama/kms_lib_bg.wasm", window.location.origin),
      });
      return sdk.createInstance({ ...sdk.SepoliaConfig, network: SEPOLIA_RPC });
    })().catch((err) => {
      instancePromise = null; // allow retry after transient failures
      throw err;
    });
  }
  return instancePromise;
}

/// Publicly decrypt an ebool handle via the Zama relayer. Only succeeds after
/// the contract called FHE.makePubliclyDecryptable on it (i.e. all ballots in).
export async function publicDecryptBool(handle: `0x${string}`): Promise<boolean> {
  const instance = await getFheInstance();
  const res = await instance.publicDecrypt([handle]);
  const values = res.clearValues ?? (res as unknown as Record<string, unknown>);
  const key = Object.keys(values).find((k) => k.toLowerCase() === handle.toLowerCase());
  if (key === undefined) throw new Error("Relayer returned no value for handle");
  const v: unknown = values[key as keyof typeof values];
  return v === true || v === BigInt(1) || v === 1 || v === "1";
}
