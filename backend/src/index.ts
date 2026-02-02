import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import { capstoneToken } from "./contract";
import { startIndexer, getBalances, getTransfers } from "./indexer";

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

app.listen(PORT, async () => {
    console.log(`Backend API running at http://localhost:${PORT}`);
    await startIndexer();
});