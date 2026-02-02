import { useEffect, useState } from "react";
import {
  fetchToken,
  fetchBalances,
  fetchTransfers,
} from "./api/backend";
import type { Transfer } from "./api/backend";
import { OWNER_ADDRESS, USER_ADDRESS } from "./lib/demo";

function App() {
  const [tokenName, setTokenName] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const [totalSupply, setTotalSupply] = useState<string | null>(null);

  const [ownerBalance, setOwnerBalance] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string | null>(null);

  const [events, setEvents] = useState<Transfer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFromBackend() {
      try {
        // --- Token metadata ---
        const token = await fetchToken();
        setTokenName(token.name);
        setTokenSymbol(token.symbol);
        setTotalSupply(token.totalSupply);

        // --- Balances ---
        const balances = await fetchBalances();
        setOwnerBalance(balances[OWNER_ADDRESS] ?? "0");
        setUserBalance(balances[USER_ADDRESS] ?? "0");

        // --- Transfers ---
        const transfers = await fetchTransfers();
        setEvents(transfers);
      } catch (err) {
        console.error("Backend fetch failed", err);
        setError("Failed to load data from backend");
      }
    }

    loadFromBackend();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Capstone dApp (Hardhat Demo Mode)</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* --- Token Info --- */}
      <h2>Token Info</h2>

      {tokenName ? (
        <>
          <p>
            <strong>Name:</strong> {tokenName}
          </p>
          <p>
            <strong>Symbol:</strong> {tokenSymbol}
          </p>
          <p>
            <strong>Total Supply:</strong> {totalSupply}
          </p>
        </>
      ) : (
        <p>Loading token data...</p>
      )}

      <hr />

      {/* --- Balances --- */}
      <h2>Balances (Hardhat Demo)</h2>

      <p>
        <strong>Owner:</strong>{" "}
        {ownerBalance !== null ? ownerBalance : "Loading..."}
      </p>

      <p>
        <strong>User:</strong>{" "}
        {userBalance !== null ? userBalance : "Loading..."}
      </p>

      <hr />

      {/* --- Transfer Events --- */}
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
    </div>
  );
}

export default App;