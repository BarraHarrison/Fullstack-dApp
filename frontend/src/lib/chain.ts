import { ethers } from "ethers";
import CapstoneTokenAbi from "../abi/CapstoneToken.json";

export const RPC_URL = "http://127.0.0.1:8545";
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

export const provider = new ethers.JsonRpcProvider(RPC_URL);

export const tokenContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    CapstoneTokenAbi,
    provider
);
