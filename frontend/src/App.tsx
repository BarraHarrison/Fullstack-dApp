import { useState } from "react";
import { BrowserProvider } from "ethers";

function App() {
  const [account, setAccount] = useState<string | null>(null);

  async function connectWallet() {
    if (!(window as any).ethereum) {
      alert("MetaMask not detected");
      return;
    }

    const provider = new BrowserProvider((window as any).ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);

    setAccount(accounts[0]);
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Capstone dApp</h1>

      {account ? (
        <>
          <p><strong>Connected account:</strong></p>
          <p>{account}</p>
        </>
      ) : (
        <button onClick={connectWallet}>
          Connect Wallet
        </button>
      )}
    </div>
  );
}

export default App;