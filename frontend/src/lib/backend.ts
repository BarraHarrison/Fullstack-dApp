const API_BASE = "http://localhost:4000";

export type Vesting = {
    owner: string;
    spender: string;
    total: string;
    released: string;
    step: string;
    lastReleaseBlock: number;
};

export async function fetchVesting(): Promise<Vesting[]> {
    const res = await fetch(`${API_BASE}/vesting`);
    if (!res.ok) {
        throw new Error("Failed to fetch vesting data");
    }
    return res.json();
}
