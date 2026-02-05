import { capstoneToken } from "./contract";
import { ethers, EventLog } from "ethers";

type Transfer = {
    from: string;
    to: string;
    amount: string;
    txHash: string;
};

type VestingSchedule = {
    owner: string;
    spender: string;
    total: string;
    released: string;
    step: string;
    lastReleaseBlock: number;
};

type Allowance = {
    owner: string;
    spender: string;
    amount: string;
};

const allowances: Record<string, Allowance> = {};


let lastProcessedBlock = 0;

const balances: Record<string, string> = {};
const transfers: Transfer[] = [];
const vestingSchedules: Record<string, VestingSchedule> = {};

function vestingKey(owner: string, spender: string) {
    return `${owner.toLowerCase()}-${spender.toLowerCase()}`;
}

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

            // ---- Transfers ----
            const transferLogs = await capstoneToken.queryFilter(
                capstoneToken.filters.Transfer(),
                lastProcessedBlock + 1,
                latestBlock
            );

            for (const log of transferLogs) {
                if (!(log instanceof EventLog)) continue;

                const { from, to, value } = log.args;
                const amount = ethers.formatEther(value);

                if (from !== ethers.ZeroAddress) {
                    balances[from] =
                        (Number(balances[from] ?? "0") - Number(amount)).toString();
                }

                balances[to] =
                    (Number(balances[to] ?? "0") + Number(amount)).toString();

                transfers.push({
                    from,
                    to,
                    amount,
                    txHash: log.transactionHash,
                });

                console.log(`Indexed transfer: ${from} → ${to} (${amount})`);
            }

            // ---- Approvals (Vesting) ----
            const approvalLogs = await capstoneToken.queryFilter(
                capstoneToken.filters.Approval(),
                lastProcessedBlock + 1,
                latestBlock
            );

            for (const log of approvalLogs) {
                if (!(log instanceof EventLog)) continue;

                const { owner, spender, value } = log.args;
                const allowance = ethers.formatEther(value);
                const key = vestingKey(owner, spender);

                if (!vestingSchedules[key]) {
                    vestingSchedules[key] = {
                        owner,
                        spender,
                        total: allowance,
                        released: allowance,
                        step: ethers.formatEther(ethers.parseEther("25")),
                        lastReleaseBlock: latestBlock,
                    };
                } else {
                    vestingSchedules[key].released = allowance;
                    vestingSchedules[key].lastReleaseBlock = latestBlock;
                }

                console.log(
                    `Indexed approval (vesting): ${owner} → ${spender} (${allowance})`
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

export function getVestingSchedules() {
    return Object.values(vestingSchedules);
}