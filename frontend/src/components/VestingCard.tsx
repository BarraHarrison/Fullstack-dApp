import type { VestingView } from "../api/backend";

function short(addr: string) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function VestingCard({ v }: { v: VestingView }) {
    const total = Number(v.total);
    const released = Number(v.released);
    const progress =
        total > 0 ? Math.min(100, (released / total) * 100) : 0;

    return (
        <div style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
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
            <p>
                <strong>Next unlock block:</strong>{" "}
                {v.nextReleaseBlock ?? "Fully vested"}
            </p>

            <div style={{ background: "#eee", height: 10 }}>
                <div
                    style={{
                        background: "#4caf50",
                        width: `${progress}%`,
                        height: "100%",
                    }}
                />
            </div>
        </div>
    );
}