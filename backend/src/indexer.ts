import { capstoneToken, CONTRACT_ADDRESS } from "./contract";
import CapstoneTokenArtifact from "./abi/CapstoneToken.json";
import { ethers, EventLog } from "ethers";

/* -----------------------------
   Types
----------------------------- */

type Transfer = {
    from: string;
    to: string;
    amount: string;
    txHash: string;
};

type VestingSchedule = {
    owner: string;
    spender: string;
    total: bigint;
    step: bigint;
    intervalBlocks: number;
    startBlock: number;
};

export type VestingView = {
    owner: string;
    spender: string;

    total: string;
    released: string;
    spent: string;
    available: string;

    startBlock: number;
    intervalBlocks: number;
    step: string;
    nextReleaseBlock: number | null;
};

/* -----------------------------
   In-memory state
----------------------------- */

let lastProcessedBlock = 0;

const balances: Record<string, string> = {};
const transfers: Transfer[] = [];

const vestingSchedules: Record<string, VestingSchedule> = {};
const vestingSpent: Record<string, bigint> = {};

/* -----------------------------
   Helpers / config
----------------------------- */

function keyOf(owner: string, spender: string) {
    return `${owner.toLowerCase()}:${spender.toLowerCase()}`;
}

const DEFAULT_STEP = ethers.parseEther("25");
const DEFAULT_INTERVAL_BLOCKS = 10;

const iface = new ethers.Interface((CapstoneTokenArtifact as any).abi);

function computeReleased(schedule: VestingSchedule, currentBlock: number): bigint {
    const elapsedBlocks = Math.max(0, currentBlock - schedule.startBlock);
    const stepsUnlocked = Math.floor(elapsedBlocks / schedule.intervalBlocks) + 1;

    const released = schedule.step * BigInt(stepsUnlocked);
    return released > schedule.total ? schedule.total : released;
}

function computeNextReleaseBlock(schedule: VestingSchedule, currentBlock: number): number | null {
    const released = computeReleased(schedule, currentBlock);
    if (released >= schedule.total) return null;

    const elapsedBlocks = Math.max(0, currentBlock - schedule.startBlock);
    const stepsUnlocked = Math.floor(elapsedBlocks / schedule.intervalBlocks) + 1;

    return schedule.startBlock + stepsUnlocked * schedule.intervalBlocks;
}

/* -----------------------------
   Indexer
----------------------------- */

export async function startIndexer() {
    console.log("Starting indexer (polling mode)...");

    const provider = capstoneToken.runner?.provider as ethers.Provider;

    lastProcessedBlock = await provider.getBlockNumber();

    // Seed owner balance
    const ownerAddr = await capstoneToken.owner();
    const ownerBal = await capstoneToken.balanceOf(ownerAddr);
    balances[ownerAddr] = ethers.formatEther(ownerBal);
    console.log("Owner indexed:", ownerAddr, balances[ownerAddr]);

    setInterval(async () => {
        try {
            const latestBlock = await provider.getBlockNumber();
            if (latestBlock <= lastProcessedBlock) return;

            const fromBlock = lastProcessedBlock + 1;
            const toBlock = latestBlock;

            /* -------------------------
               1) Index Transfers
            ------------------------- */
            const transferLogs = await capstoneToken.queryFilter(
                capstoneToken.filters.Transfer(),
                fromBlock,
                toBlock
            );

            for (const log of transferLogs) {
                if (!(log instanceof EventLog)) continue;

                const { from, to, value } = log.args;
                const amount = ethers.formatEther(value);

                if (from !== ethers.ZeroAddress) {
                    balances[from] = (Number(balances[from] ?? "0") - Number(amount)).toString();
                }
                balances[to] = (Number(balances[to] ?? "0") + Number(amount)).toString();

                transfers.push({
                    from,
                    to,
                    amount,
                    txHash: log.transactionHash,
                });

                console.log(`Indexed transfer: ${from} → ${to} (${amount})`);
            }

            /* -------------------------
               2) Index Approvals → Create/Update/Revoke vesting schedules
            ------------------------- */
            const approvalLogs = await capstoneToken.queryFilter(
                capstoneToken.filters.Approval(),
                fromBlock,
                toBlock
            );

            for (const log of approvalLogs) {
                if (!(log instanceof EventLog)) continue;

                const { owner, spender, value } = log.args;
                const k = keyOf(owner, spender);

                const total = BigInt(value);

                // Revoke
                if (total === 0n) {
                    delete vestingSchedules[k];
                    delete vestingSpent[k];
                    console.log(`Indexed approval: revoke ${owner} → ${spender}`);
                    continue;
                }

                // Create/overwrite schedule (latest approval wins)
                vestingSchedules[k] = {
                    owner,
                    spender,
                    total,
                    step: DEFAULT_STEP,
                    intervalBlocks: DEFAULT_INTERVAL_BLOCKS,
                    startBlock: toBlock, // treat this approval as "vesting start"
                };

                // For demo semantics, reset spent on new grant
                vestingSpent[k] = 0n;

                console.log(
                    `📅 Vesting grant: ${owner} → ${spender} (${ethers.formatEther(total)} CPT)`
                );
            }

            /* -------------------------
               3) Track delegated spending (decode transferFrom calls)
               We look at transactions sent *to the token contract* and parse transferFrom.
            ------------------------- */
            for (let b = fromBlock; b <= toBlock; b++) {
                const block = await provider.getBlock(b, true);
                if (!block || !block.transactions) continue;

                for (const tx of block.transactions as any[]) {
                    if (!tx.to) continue;
                    if (tx.to.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) continue;
                    if (!tx.data || tx.data === "0x") continue;

                    // decode function call
                    let parsed: ethers.TransactionDescription | null = null;
                    try {
                        parsed = iface.parseTransaction({ data: tx.data, value: tx.value });
                    } catch {
                        continue;
                    }
                    if (!parsed) continue;

                    if (parsed.name !== "transferFrom") continue;

                    const ownerArg = String(parsed.args[0]);     // from
                    const spender = String(tx.from);             // msg.sender
                    const amountArg = BigInt(parsed.args[2]);    // value

                    const k = keyOf(ownerArg, spender);

                    // Only track if we have a schedule for that owner→spender
                    if (!vestingSchedules[k]) continue;

                    vestingSpent[k] = (vestingSpent[k] ?? 0n) + amountArg;

                    console.log(
                        `Tracked delegated spend: spender ${spender} used ${ethers.formatEther(amountArg)} from ${ownerArg}`
                    );
                }
            }

            lastProcessedBlock = latestBlock;
        } catch (err) {
            console.error("Indexer error:", err);
        }
    }, 2000);
}

/* -----------------------------
   Getters used by API routes
----------------------------- */

export function getBalances() {
    return balances;
}

export function getTransfers() {
    return transfers.slice(-10).reverse();
}

export function getVesting(currentBlock?: number): VestingView[] {
    const nowBlock = currentBlock ?? lastProcessedBlock;

    return Object.values(vestingSchedules).map((s) => {
        const k = keyOf(s.owner, s.spender);

        const released = computeReleased(s, nowBlock);
        const spent = vestingSpent[k] ?? 0n;
        const available = released > spent ? released - spent : 0n;

        const nextReleaseBlock = computeNextReleaseBlock(s, nowBlock);

        return {
            owner: s.owner,
            spender: s.spender,
            total: ethers.formatEther(s.total),
            released: ethers.formatEther(released),
            spent: ethers.formatEther(spent),
            available: ethers.formatEther(available),
            startBlock: s.startBlock,
            intervalBlocks: s.intervalBlocks,
            step: ethers.formatEther(s.step),
            nextReleaseBlock,
        };
    });
}

export function getIndexerStatus() {
    return {
        lastProcessedBlock,
        balancesCount: Object.keys(balances).length,
        transfersCount: transfers.length,
        vestingCount: Object.keys(vestingSchedules).length,
    };
}

export function debugVesting() {
    return {
        raw: vestingSchedules,
        list: Object.values(vestingSchedules),
        spent: vestingSpent,
    };
}