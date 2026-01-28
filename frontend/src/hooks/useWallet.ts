import { useEffect, useState } from "react";
import { BrowserProvider } from "ethers";
import { isSupportedNetwork, SUPPORTED_NETWORKS } from "../lib/networks";

declare global {
    interface Window {
        ethereum?: any;
    }
}

export function useWallet() {
    const [provider, setProvider] = useState<BrowserProvider | null>(null);
    const [account, setAccount] = useState<string | null>(null);
    const [chainId, setChainId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function connectWallet() {
        if (!window.ethereum) {
            setError("MetaMask not detected");
            return;
        }

        try {
            const provider = new BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            const network = await provider.getNetwork();

            const currentChainId = Number(network.chainId);

            if (!isSupportedNetwork(currentChainId)) {
                setError(
                    `Unsupported network. Please switch to ${Object.values(
                        SUPPORTED_NETWORKS
                    ).join(", ")}`
                );
                return;
            }

            setProvider(provider);
            setAccount(accounts[0]);
            setChainId(currentChainId);
            setError(null);
        } catch (err: any) {
            if (err?.code === 4001) {
                setError("Wallet connection request was rejected");
            } else {
                setError("Failed to connect wallet");
            }
        }
    }

    useEffect(() => {
        if (!window.ethereum) return;

        function handleAccountsChanged(accounts: string[]) {
            setAccount(accounts.length ? accounts[0] : null);
        }

        function handleChainChanged() {
            window.location.reload();
        }

        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);

        return () => {
            window.ethereum.removeListener(
                "accountsChanged",
                handleAccountsChanged
            );
            window.ethereum.removeListener("chainChanged", handleChainChanged);
        };
    }, []);

    return {
        provider,
        account,
        chainId,
        connectWallet,
        error,
        networkName: chainId ? SUPPORTED_NETWORKS[chainId] : null,
    };
}