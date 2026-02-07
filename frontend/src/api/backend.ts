const API_BASE = "http://localhost:4000";

export type TokenResponse = {
    name: string;
    symbol: string;
    totalSupply: string;
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

export type BalancesResponse = Record<string, string>;

export type Transfer = {
    from: string;
    to: string;
    amount: string;
    txHash: string;
};

export async function fetchToken(): Promise<TokenResponse> {
    const res = await fetch(`${API_BASE}/token`);
    if (!res.ok) throw new Error("Failed to fetch token");
    return res.json();
}

export async function fetchBalances(): Promise<BalancesResponse> {
    const res = await fetch(`${API_BASE}/balances`);
    if (!res.ok) throw new Error("Failed to fetch balances");
    return res.json();
}

export async function fetchTransfers(): Promise<Transfer[]> {
    const res = await fetch(`${API_BASE}/transfers`);
    if (!res.ok) throw new Error("Failed to fetch transfers");
    return res.json();
}

export async function fetchVesting(): Promise<VestingView[]> {
    const res = await fetch("http://localhost:4000/vesting");
    if (!res.ok) {
        throw new Error("Failed to fetch vesting");
    }
    return res.json();
}