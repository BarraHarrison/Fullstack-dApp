import { capstoneToken } from "./contract";
import { ethers, EventLog } from "ethers";

type Transfer = {
    from: string;
    to: string;
    amount: string;
    txHash: string;
};

let lastProcessedBlock = 0;

const balances: Record<string, string> = {};
const transfers: Transfer[] = [];

export async function startIndexer() {
    console.log("Starting indexer (polling mode)...");

    const provider = capstoneToken.runner?.provider as ethers.Provider;
    lastProcessedBlock = await provider.getBlockNumber();

    const owner = await capstoneToken.owner();
    const ownerBalance = await capstoneToken.balanceOf(owner);
    balances[owner] = ethers.formatEther(ownerBalance);

    console.log("Owner indexed:", owner, balances[owner]);

    setInterval(async () => {
        try {
            const latestBlock = await provider.getBlockNumber();
            if (latestBlock <= lastProcessedBlock) return;

            const logs = await capstoneToken.queryFilter(
                capstoneToken.filters.Transfer(),
                lastProcessedBlock + 1,
                latestBlock
            );

            for (const log of logs) {
                if (!(log instanceof EventLog)) continue;

                const { from, to, value } = log.args;
                const amount = ethers.formatEther(value);

                if (from !== ethers.ZeroAddress) {
                    balances[from] =
                        (Number(balances[from] ?? "0") - Number(amount)).toString();
                }

                balances[to] =
                    (Number(balances[to] ?? "0") + Number(amount)).toString();

                const transfer: Transfer = {
                    from,
                    to,
                    amount,
                    txHash: log.transactionHash,
                };

                transfers.push(transfer);

                console.log(
                    `Indexed transfer: ${from} → ${to} (${amount})`
                );
            }

            lastProcessedBlock = latestBlock;
        } catch (err) {
            console.error("Indexer error:", err);
        }
    }, 2000);
}

export function getBalances() {
    return balances;
}

export function getTransfers() {
    return transfers.slice(-10).reverse();
}