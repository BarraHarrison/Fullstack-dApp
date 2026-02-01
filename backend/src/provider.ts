import { JsonRpcProvider } from "ethers";

/**
 * Hardhat local RPC
 * This is intentionally hardcoded for demo mode
 */
export const RPC_URL = "http://127.0.0.1:8545";

/**
 * Shared read-only provider
 */
export const provider = new JsonRpcProvider(RPC_URL);
