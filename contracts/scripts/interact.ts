import { ethers } from "hardhat";

async function main() {
    const [owner, user] = await ethers.getSigners();

    const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const token = await ethers.getContractAt("CapstoneToken", tokenAddress);

    console.log("Owner:", owner.address);
    console.log("User:", user.address);

    console.log("Initial owner balance:");
    console.log(ethers.formatEther(await token.balanceOf(owner.address)));

    console.log("Transferring 100 tokens to user...");
    await token.transfer(user.address, ethers.parseEther("100"));

    console.log("User balance:");
    console.log(ethers.formatEther(await token.balanceOf(user.address)));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
