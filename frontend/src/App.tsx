import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getReadOnlyContract } from "./lib/contract";

function App() {
  const [tokenName, setTokenName] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const [totalSupply, setTotalSupply] = useState<string | null>(null);
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
    </div>
  );
}

export default App;