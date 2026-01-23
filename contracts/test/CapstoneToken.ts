import { expect } from "chai";
import { ethers } from "hardhat";

describe("CapstoneToken", function () {
    async function deployFixture() {
        const [owner, user] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("CapstoneToken");
        const token = await Token.deploy(
            "Capstone Token",
            "CPT",
            ethers.parseEther("1000000")
        );

        return { token, owner, user };
    }

    it("should deploy with correct name and symbol", async function () {
        const { token } = await deployFixture();

        expect(await token.name()).to.equal("Capstone Token");
        expect(await token.symbol()).to.equal("CPT");
    });

    it("should mint initial supply to deployer", async function () {
        const { token, owner } = await deployFixture();

        const balance = await token.balanceOf(owner.address);
        expect(balance).to.equal(ethers.parseEther("1000000"));
    });
});