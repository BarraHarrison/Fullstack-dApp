import { Contract } from "ethers";
import { provider } from "./provider";
import CapstoneTokenArtifact from "./abi/CapstoneToken.json";

export const CONTRACT_ADDRESS =
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

const abi = CapstoneTokenArtifact.abi;

export const capstoneToken = new Contract(
    CONTRACT_ADDRESS,
    abi,
    provider
);
