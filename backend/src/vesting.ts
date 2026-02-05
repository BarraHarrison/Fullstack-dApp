export type VestingSchedule = {
    owner: string;
    spender: string;
    total: bigint;
    released: bigint;
    step: bigint;
    lastReleaseBlock: number;
};

export const vestingSchedules = new Map<string, VestingSchedule>();

export function vestingKey(owner: string, spender: string) {
    return `${owner.toLowerCase()}-${spender.toLowerCase()}`;
}