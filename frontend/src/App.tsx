import { useWallet } from "./hooks/useWallet";

function App() {
  const { account, connectWallet, error, networkName } = useWallet();

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Capstone dApp</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {account ? (
        <>
          <p><strong>Connected account:</strong></p>
          <p>{account}</p>
          <p><strong>Network:</strong> {networkName}</p>
        </>
      ) : (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}
    </div>
  );
}

export default App;