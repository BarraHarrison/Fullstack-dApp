export const SUPPORTED_NETWORKS: Record<number, string> = {
    31337: "Hardhat",
    11155111: "Sepolia",
};

export function isSupportedNetwork(chainId: number) {
    return Boolean(SUPPORTED_NETWORKS[chainId]);
}