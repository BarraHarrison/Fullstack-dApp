import { Contract, BrowserProvider } from "ethers";
import CapstoneTokenArtifact from "./CapstoneToken.json";

export const CONTRACT_ADDRESS =
    import.meta.env.VITE_CONTRACT_ADDRESS || "";

export function getCapstoneTokenContract(
    provider: BrowserProvider
) {
    if (!CONTRACT_ADDRESS) {
        throw new Error("Contract address not set");
    }

    return new Contract(
        CONTRACT_ADDRESS,
        CapstoneTokenArtifact.abi,
        provider
    );
}