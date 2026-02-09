import { useEffect, useState } from "react";
import {
  fetchToken,
  fetchBalances,
  fetchTransfers,
  fetchVesting,
} from "./api/backend";
import type { Transfer, VestingView } from "./api/backend";
import { OWNER_ADDRESS, USER_ADDRESS } from "./lib/demo";
import { VestingCard } from "./components/VestingCard";
import { tokenContract } from "./lib/chain";
import { ethers } from "ethers";

function App() {
  const [tokenName, setTokenName] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const [totalSupply, setTotalSupply] = useState<string | null>(null);

  const [ownerBalance, setOwnerBalance] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string | null>(null);

  const [events, setEvents] = useState<Transfer[]>([]);
  const [vesting, setVesting] = useState<VestingView[]>([]);

  const [error, setError] = useState<string | null>(null);

  /* -------------------------
     Load token metadata (once)
  ------------------------- */
  useEffect(() => {
    async function loadToken() {
      try {
        const token = await fetchToken();
        setTokenName(token.name);
        setTokenSymbol(token.symbol);
        setTotalSupply(token.totalSupply);
      } catch (err) {
        console.error("Token fetch failed", err);
        setError("Failed to load token data");
      }
    }

    loadToken();
  }, []);

  /* -------------------------
     Backend polling (state sync)
  ------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const [balances, transfers, vestingData] = await Promise.all([
          fetchBalances(),
          fetchTransfers(),
          fetchVesting(),
        ]);

        if (cancelled) return;

        setOwnerBalance(balances[OWNER_ADDRESS] ?? "0");
        setUserBalance(balances[USER_ADDRESS] ?? "0");
        setEvents(transfers);
        setVesting(vestingData);
      } catch (err) {
        console.error("Live sync failed", err);
      }
    }

    poll();
    const interval = setInterval(poll, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  /* -------------------------
     Blockchain live listener (instant UI)
  ------------------------- */
  useEffect(() => {
    function onTransfer(
      from: string,
      to: string,
      value: bigint,
      event: ethers.EventLog
    ) {
      console.log("🔔 Transfer event:", from, to, value.toString());

      const amount = ethers.formatEther(value);

      // Push transfer instantly
      setEvents((prev) => [
        {
          from,
          to,
          amount,
          txHash: event.transactionHash,
        },
        ...prev,
      ]);

      // Refresh balances once
      fetchBalances()
        .then((balances) => {
          setOwnerBalance(balances[OWNER_ADDRESS] ?? "0");
          setUserBalance(balances[USER_ADDRESS] ?? "0");
        })
        .catch(console.error);
    }

    tokenContract.on("Transfer", onTransfer);

    return () => {
      tokenContract.off("Transfer", onTransfer);
    };
  }, []);

  /* -------------------------
     UI
  ------------------------- */
  return (
    <div style={{ padding: "2rem", maxWidth: "720px" }}>
      <h1>Capstone dApp (Hardhat Demo Mode)</h1>

      <p style={{ fontSize: "0.8rem", opacity: 0.6, marginTop: "-0.5rem" }}>
        🔄 Live sync enabled (polling + blockchain events)
      </p>

      {error && <p style={{ color: "red" }}>{error}</p>}

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

      <h2>Balances</h2>
      <p><strong>Owner:</strong> {ownerBalance ?? "Loading…"}</p>
      <p><strong>User:</strong> {userBalance ?? "Loading…"}</p>

      <hr />

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