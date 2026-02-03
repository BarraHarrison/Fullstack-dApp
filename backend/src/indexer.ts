import { capstoneToken } from "./contract";
import { ethers, EventLog } from "ethers";

let lastProcessedBlock = 0;

export async function startIndexer() {
    console.log("Starting indexer (polling mode)...");

    const provider = capstoneToken.runner?.provider as ethers.Provider;
    lastProcessedBlock = await provider.getBlockNumber();

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

                console.log(
                    `Indexed transfer: ${from} → ${to} (${ethers.formatEther(value)})`
                );

                // TODO: store in memory / DB
            }

            lastProcessedBlock = latestBlock;
        } catch (err) {
            console.error("Indexer error:", err);
        }
    }, 2000);
}