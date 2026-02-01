import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getReadOnlyContract } from "./lib/contract";
import { OWNER_ADDRESS, USER_ADDRESS } from "./lib/demo";

function App() {
  const [tokenName, setTokenName] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const [totalSupply, setTotalSupply] = useState<string | null>(null);

  const [ownerBalance, setOwnerBalance] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string | null>(null);

  const [events, setEvents] = useState<
    { from: string; to: string; value: string }[]
  >([]);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTokenData() {
      try {
        const contract = getReadOnlyContract();

        const name = await contract.name();
        const symbol = await contract.symbol();
        const supply = await contract.totalSupply();

        setTokenName(name);
        setTokenSymbol(symbol);
        setTotalSupply(ethers.formatEther(supply));

        const ownerBal = await contract.balanceOf(OWNER_ADDRESS);
        const userBal = await contract.balanceOf(USER_ADDRESS);

        setOwnerBalance(ethers.formatEther(ownerBal));
        setUserBalance(ethers.formatEther(userBal));

        const filter = contract.filters.Transfer();
        const logs = await contract.queryFilter(filter, 0, "latest");

        const formattedEvents = logs.slice(-5).map((log) => ({
          from: log.args?.from,
          to: log.args?.to,
          value: ethers.formatEther(log.args?.value),
        }));

        setEvents(formattedEvents);
      } catch (err) {
        console.error("Failed to load token data", err);
        setError("Failed to load token data");
      }
    }

    loadTokenData();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Capstone dApp (Hardhat Demo Mode)</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* --- Token Info --- */}
      <h2>Token Info</h2>

      {tokenName ? (
        <>
          <p><strong>Name:</strong> {tokenName}</p>
          <p><strong>Symbol:</strong> {tokenSymbol}</p>
          <p><strong>Total Supply:</strong> {totalSupply}</p>
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
            <li key={i}>
              {e.from.slice(0, 6)}… → {e.to.slice(0, 6)}… : {e.value} CPT
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