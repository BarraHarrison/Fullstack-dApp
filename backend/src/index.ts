import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import { capstoneToken } from "./contract";
import { startIndexer, getBalances, getTransfers, getVesting, getIndexerStatus, debugVesting } from "./indexer";

const app = express();
const PORT = 4000;

app.use(cors());

app.get("/token", async (_req, res) => {
    const name = await capstoneToken.name();
    const symbol = await capstoneToken.symbol();
    const supply = await capstoneToken.totalSupply();

    res.json({
        name,
        symbol,
        totalSupply: ethers.formatEther(supply),
    });
});

app.get("/balances", (_req, res) => {
    res.json(getBalances());
});

app.get("/transfers", (_req, res) => {
    res.json(getTransfers());
});

app.get("/vesting", (_req, res) => {
    res.json(getVesting());
});

app.get("/health", async (_req, res) => {
    res.json({
        status: "ok",
        network: "localhost",
        contract: capstoneToken.target,
        indexer: getIndexerStatus(),
        timestamp: new Date().toISOString(),
    });
});

app.get("/debug/vesting", (_req, res) => {
    res.json(debugVesting());
});

app.listen(PORT, async () => {
    console.log(`Backend API running at http://localhost:${PORT}`);
    await startIndexer();
});