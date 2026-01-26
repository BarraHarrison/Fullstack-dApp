import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    const CapstoneToken = await ethers.getContractFactory("CapstoneToken");

    const token = await CapstoneToken.deploy(
        "Capstone Token",
        "CPT",
        ethers.parseEther("1000000")
    );

    await token.waitForDeployment();

    const address = await token.getAddress();
    console.log("CapstoneToken deployed to:", address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
