import { Contract } from "ethers";
import { provider } from "./provider";
import CapstoneTokenArtifact from "./abi/CapstoneToken.json";

export const CONTRACT_ADDRESS =
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const abi = CapstoneTokenArtifact.abi;

export const capstoneToken = new Contract(
    CONTRACT_ADDRESS,
    abi,
    provider
);
