import { capstoneToken } from "./contract";

async function test() {
    const name = await capstoneToken.name();
    const symbol = await capstoneToken.symbol();
    const supply = await capstoneToken.totalSupply();

    console.log("Token:", name, symbol);
    console.log("Supply:", supply.toString());
}

test();