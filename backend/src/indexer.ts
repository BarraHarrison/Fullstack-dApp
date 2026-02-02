import { capstoneToken } from "./contract";
import { ethers } from "ethers";

export type TransferEvent = {
    from: string;
    to: string;
    amount: string;
    txHash: string;
};

const balances = new Map<string, string>();
const transfers: TransferEvent[] = [];

const MAX_TRANSFERS = 10;

export async function startIndexer() {
    console.log("Starting indexer...");

    const owner = await capstoneToken.owner();
    const ownerBalance = await capstoneToken.balanceOf(owner);

    balances.set(owner, ethers.formatEther(ownerBalance));

    console.log("Owner indexed:", owner, balances.get(owner));

    capstoneToken.on(
        "Transfer",
        async (from: string, to: string, value: bigint, event) => {
            const amount = ethers.formatEther(value);

            if (from !== ethers.ZeroAddress) {
                const fromBal = await capstoneToken.balanceOf(from);
                balances.set(from, ethers.formatEther(fromBal));
            }

            const toBal = await capstoneToken.balanceOf(to);
            balances.set(to, ethers.formatEther(toBal));

            transfers.unshift({
                from,
                to,
                amount,
                txHash: event.log.transactionHash,
            });

            if (transfers.length > MAX_TRANSFERS) {
                transfers.pop();
            }

            console.log(`Indexed transfer: ${from} → ${to} (${amount})`);
        }
    );
}

export function getBalances() {
    return Object.fromEntries(balances);
}

export function getTransfers() {
    return transfers;
}