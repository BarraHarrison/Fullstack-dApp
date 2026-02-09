import { useEffect, useState } from "react";
import {
  fetchToken,
  fetchBalances,
  fetchTransfers,
} from "./api/backend";
import type { Transfer } from "./api/backend";
import { fetchVesting } from "./api/backend";
import type { VestingView } from "./api/backend";
import { OWNER_ADDRESS, USER_ADDRESS } from "./lib/demo";
import { VestingCard } from "./components/VestingCard";

function App() {
  const [tokenName, setTokenName] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const [totalSupply, setTotalSupply] = useState<string | null>(null);

  const [ownerBalance, setOwnerBalance] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string | null>(null);

  const [events, setEvents] = useState<Transfer[]>([]);

  const [vesting, setVesting] = useState<VestingView[]>([]);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFromBackend() {
      try {
        const token = await fetchToken();
        setTokenName(token.name);
        setTokenSymbol(token.symbol);
        setTotalSupply(token.totalSupply);

        const balances = await fetchBalances();
        setOwnerBalance(balances[OWNER_ADDRESS] ?? "0");
        setUserBalance(balances[USER_ADDRESS] ?? "0");

        const transfers = await fetchTransfers();
        setEvents(transfers);
      } catch (err) {
        console.error("Backend fetch failed", err);
        setError("Failed to load data from backend");
      }

      try {
        const vestingData = await fetchVesting();
        setVesting(vestingData);
      } catch (err) {
        console.error("Failed to load vesting data", err);
      }
    }

    loadFromBackend();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const balances = await fetchBalances();
        setOwnerBalance(balances[OWNER_ADDRESS] ?? "0");
        setUserBalance(balances[USER_ADDRESS] ?? "0");

        const transfers = await fetchTransfers();
        setEvents(transfers);
      } catch (err) {
        console.error("Live sync failed", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);


  return (
    <div style={{ padding: "2rem", maxWidth: "720px" }}>
      <h1>Capstone dApp (Hardhat Demo Mode)</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* ---------------- Token Info ---------------- */}
      <h2>Token Info</h2>

      {tokenName ? (
        <>
          <p><strong>Name:</strong> {tokenName}</p>
          <p><strong>Symbol:</strong> {tokenSymbol}</p>
          <p><strong>Total Supply:</strong> {totalSupply}</p>
        </>
      ) : (
        <p>Loading token data…</p>
      )}

      <hr />

      {/* ---------------- Balances ---------------- */}
      <h2>Balances</h2>

      <p><strong>Owner:</strong> {ownerBalance ?? "Loading…"}</p>
      <p><strong>User:</strong> {userBalance ?? "Loading…"}</p>

      <hr />

      {/* ---------------- Transfers ---------------- */}
      <h2>Recent Transfers</h2>

      {events.length > 0 ? (
        <ul>
          {events.map((e, i) => (
            <li key={e.txHash ?? i}>
              {e.from.slice(0, 6)}… → {e.to.slice(0, 6)}… : {e.amount} CPT
            </li>
          ))}
        </ul>
      ) : (
        <p>No transfers yet.</p>
      )}

      <hr />

      {/* ---------------- Vesting ---------------- */}
      <h2>Vesting Progress</h2>

      {vesting.length === 0 ? (
        <p>No active vesting schedules.</p>
      ) : (
        vesting.map((v, i) => {
          const total = Number(v.total);
          const released = Number(v.released);
          const progress = Math.min((released / total) * 100, 100);

          return (
            <div
              key={i}
              style={{
                padding: "1rem",
                marginBottom: "1rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
              }}
            >
              <p>
                <strong>Owner:</strong> {v.owner.slice(0, 6)}…<br />
                <strong>Spender:</strong> {v.spender.slice(0, 6)}…
              </p>

              <div
                style={{
                  height: "10px",
                  background: "#eee",
                  borderRadius: "5px",
                  overflow: "hidden",
                  marginBottom: "0.5rem",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: progress === 100 ? "#4caf50" : "#2196f3",
                  }}
                />
              </div>

              <p>
                {released} / {total} CPT vested{" "}
                {progress === 100 && "🟢"}
              </p>
            </div>
          );
        })
      )}

      <hr />

      <h2>Vesting Schedules</h2>

      {vesting.length === 0 ? (
        <p>No active vesting schedules.</p>
      ) : (
        vesting.map((v, i) => <VestingCard key={i} v={v} />)
      )}

    </div>
  );
}

export default App;