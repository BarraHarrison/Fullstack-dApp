type Vesting = {
    owner: string;
    spender: string;
    total: string;
    released: string;
    spent: string;
    available: string;
    nextReleaseBlock: number | null;
};

function short(addr: string) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function VestingCard({ v }: { v: Vesting }) {
    const total = Number(v.total);
    const released = Number(v.released);
    const progress = total > 0 ? Math.min(100, (released / total) * 100) : 0;

    return (
        <div
            style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "1rem",
                marginBottom: "1rem",
            }}
        >
            <p>
                <strong>Owner:</strong> {short(v.owner)}
            </p>
            <p>
                <strong>Spender:</strong> {short(v.spender)}
            </p>

            <p>
                <strong>Total:</strong> {v.total} CPT
            </p>
            <p>
                <strong>Released:</strong> {v.released} CPT
            </p>
            <p>
                <strong>Spent:</strong> {v.spent} CPT
            </p>
            <p>
                <strong>Available:</strong> {v.available} CPT
            </p>

            {/* Progress bar */}
            <div
                style={{
                    background: "#eee",
                    height: "10px",
                    borderRadius: "5px",
                    overflow: "hidden",
                    margin: "0.5rem 0",
                }}
            >
                <div
                    style={{
                        width: `${progress}%`,
                        height: "100%",
                        background: progress === 100 ? "#22c55e" : "#3b82f6",
                    }}
                />
            </div>

            {v.nextReleaseBlock === null ? (
                <p style={{ color: "green" }}>✅ Fully vested</p>
            ) : (
                <p>
                    ⏳ Next unlock at block <strong>{v.nextReleaseBlock}</strong>
                </p>
            )}
        </div>
    );
}