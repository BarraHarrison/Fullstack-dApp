import { useEffect, useState } from "react";
import { useWallet } from "./hooks/useWallet";
import { getCapstoneTokenContract } from "./lib/contract";
import { formatEther } from "ethers";

function App() {
  const { provider, account, connectWallet, error, networkName } =
    useWallet();

  console.log("App render", {
    provider,
    account,
    networkName,
  });

  const [tokenName, setTokenName] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    async function loadTokenData() {
      console.log("loadTokenData called", {
        provider,
        account,
      });

      if (!provider || !account) return;

      try {
        const contract = getCapstoneTokenContract(provider);

        const name = await contract.name();
        const symbol = await contract.symbol();
        const rawBalance = await contract.balanceOf(account);

        setTokenName(name);
        setTokenSymbol(symbol);
        setBalance(formatEther(rawBalance));
      } catch (err) {
        console.error("Failed to load token data", err);
      }
    }

    loadTokenData();
  }, [provider, account]);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Capstone dApp</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <p><strong>Account:</strong> {account}</p>
          <p><strong>Network:</strong> {networkName}</p>

          <hr />

          <h2>Token Info</h2>

          {tokenName ? (
            <>
              <p><strong>Name:</strong> {tokenName}</p>
              <p><strong>Symbol:</strong> {tokenSymbol}</p>
              <p><strong>Your Balance:</strong> {balance}</p>
            </>
          ) : (
            <p>Loading token data...</p>
          )}
        </>
      )}
    </div>
  );
}

export default App;