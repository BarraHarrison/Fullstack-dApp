import { ethers } from "ethers";
import CapstoneTokenArtifact from "./CapstoneToken.json";

const RPC_URL = "http://127.0.0.1:8545";
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export function getReadOnlyContract() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    return new ethers.Contract(
        CONTRACT_ADDRESS,
        CapstoneTokenArtifact.abi,
        provider
    );
}