import { capstoneToken, CONTRACT_ADDRESS } from "./contract";
import CapstoneTokenArtifact from "./abi/CapstoneToken.json";
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
    total: bigint;          // approved total (grant)
    step: bigint;           // vesting step amount
    startBlock: number;     // when grant was created
    intervalBlocks: number; // blocks per step unlock
};

type VestingView = {
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

let lastProcessedBlock = 0;

const balances: Record<string, string> = {};
const transfers: Transfer[] = [];

// key = "owner:spender"
const vestingSchedules: Record<string, VestingSchedule> = {};
const vestingSpent: Record<string, bigint> = {};

function keyOf(owner: string, spender: string) {
    return `${owner.toLowerCase()}:${spender.toLowerCase()}`;
}

const iface = new ethers.Interface((CapstoneTokenArtifact as any).abi);

// ---- Vesting policy (you can tweak later) ----
const DEFAULT_STEP = ethers.parseEther("25");     // 25 CPT unlocked per step
const DEFAULT_INTERVAL_BLOCKS = 10;              // unlock every 10 blocks (fast for demo)

function computeReleased(schedule: VestingSchedule, currentBlock: number): bigint {
    const elapsed = Math.max(0, currentBlock - schedule.startBlock);
    const stepsUnlocked = Math.floor(elapsed / schedule.intervalBlocks) + 1; // +1 means first chunk unlocks immediately after startBlock
    const released = schedule.step * BigInt(stepsUnlocked);
    return released > schedule.total ? schedule.total : released;
}

function computeNextReleaseBlock(schedule: VestingSchedule, currentBlock: number): number | null {
    const released = computeReleased(schedule, currentBlock);
    if (released >= schedule.total) return null;

    const elapsed = Math.max(0, currentBlock - schedule.startBlock);
    const stepsUnlocked = Math.floor(elapsed / schedule.intervalBlocks) + 1;
    return schedule.startBlock + stepsUnlocked * schedule.intervalBlocks;
}

export async function startIndexer() {
    console.log("Starting indexer (polling mode)...");

    const provider = capstoneToken.runner?.provider as ethers.Provider;

    // Start from current head (don’t replay old chain unless you want to)
    lastProcessedBlock = await provider.getBlockNumber();

    // seed owner balance
    const owner = await capstoneToken.owner();
    const ownerBalance = await capstoneToken.balanceOf(owner);
    balances[owner] = ethers.formatEther(ownerBalance);
    console.log("Owner indexed:", owner, balances[owner]);

    setInterval(async () => {
        try {
            const latestBlock = await provider.getBlockNumber();
            if (latestBlock <= lastProcessedBlock) return;

            const fromBlock = lastProcessedBlock + 1;
            const toBlock = latestBlock;

            // -------------------------
            // 1) Index Transfers (events)
            // -------------------------
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

            // -------------------------
            // 2) Index Approvals (grant)
            // -------------------------
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

                // If approval is set to 0, treat as revoke (delete schedule)
                if (total === 0n) {
                    delete vestingSchedules[k];
                    delete vestingSpent[k];
                    console.log(`Indexed approval: revoke ${owner} → ${spender}`);
                    continue;
                }

                // Create or overwrite schedule (latest approval wins)
                vestingSchedules[k] = {
                    owner,
                    spender,
                    total,
                    step: DEFAULT_STEP,
                    startBlock: toBlock, // start at the block we processed
                    intervalBlocks: DEFAULT_INTERVAL_BLOCKS,
                };

                // Reset spent when a new approval is issued (common “new grant” semantics for demo)
                vestingSpent[k] = 0n;

                console.log(
                    `Indexed approval (grant): ${owner} → ${spender} (${ethers.formatEther(total)} CPT)`
                );
            }

            // ----------------------------------------------------
            // 3) Track delegated spending by decoding transferFrom
            // ----------------------------------------------------
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

                    // only care about transferFrom(owner, to, amount)
                    if (parsed.name !== "transferFrom") continue;

                    const ownerArg = String(parsed.args[0]);
                    const spender = String(tx.from); // msg.sender
                    const amountArg = BigInt(parsed.args[2]);

                    const k = keyOf(ownerArg, spender);

                    // Only track if we have a vesting schedule for this pair
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

export function getBalances() {
    return balances;
}

export function getTransfers() {
    return transfers.slice(-10).reverse();
}

export function getVesting(currentBlock?: number): VestingView[] {
    // if not provided, just approximate "released" based on lastProcessedBlock
    const nowBlock = currentBlock ?? lastProcessedBlock;

    return Object.values(vestingSchedules).map((s) => {
        const k = keyOf(s.owner, s.spender);

        const total = s.total;
        const released = computeReleased(s, nowBlock);
        const spent = vestingSpent[k] ?? 0n;

        const available = released > spent ? released - spent : 0n;
        const nextReleaseBlock = computeNextReleaseBlock(s, nowBlock);

        return {
            owner: s.owner,
            spender: s.spender,
            total: ethers.formatEther(total),
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