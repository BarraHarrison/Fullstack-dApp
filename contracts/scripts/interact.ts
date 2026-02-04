import { ethers } from "hardhat";

function short(addr: string) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptTransfer(
    label: string,
    sender: any,
    to: string,
    amount: string
) {
    try {
        console.log(`Attempting: ${label}`);
        const tx = await sender.transfer(to, ethers.parseEther(amount));
        await tx.wait();
        console.log(`✅ Success: ${label}`);
    } catch (err: any) {
        const reason =
            err?.shortMessage ||
            err?.reason ||
            err?.message ||
            "Unknown error";

        console.log(`❌ Expected failure: ${label}`);
        console.log(`   ↳ Reason: ${reason}`);
    }
}

async function printBalances(
    token: any,
    label: string,
    addresses: { name: string; addr: string }[]
) {
    console.log(`\n=== ${label} ===`);
    for (const a of addresses) {
        const bal = await token.balanceOf(a.addr);
        console.log(`${a.name} (${short(a.addr)}): ${ethers.formatEther(bal)} CPT`);
    }
}

async function main() {
    const [owner, userA, userB, userC] = await ethers.getSigners();
    const token = await ethers.getContractAt("CapstoneToken", process.env.CONTRACT_ADDRESS ?? "");

    console.log("Owner:", owner.address);
    console.log("Users:", userA.address, userB.address, userC.address);

    const actors = [
        { name: "Owner", addr: owner.address },
        { name: "UserA", addr: userA.address },
        { name: "UserB", addr: userB.address },
        { name: "UserC", addr: userC.address },
    ];

    await printBalances(token, "Initial balances", actors);

    // -------------------------
    // Phase 1: Owner distributes tokens
    // -------------------------
    console.log("\n--- Phase 1: Owner distribution ---");

    const distA = ethers.parseEther("120");
    const distB = ethers.parseEther("80");
    const distC = ethers.parseEther("50");

    console.log(`Owner -> UserA: ${ethers.formatEther(distA)} CPT`);
    await (await token.connect(owner).transfer(userA.address, distA)).wait();
    await sleep(300);

    console.log(`Owner -> UserB: ${ethers.formatEther(distB)} CPT`);
    await (await token.connect(owner).transfer(userB.address, distB)).wait();
    await sleep(300);

    console.log(`Owner -> UserC: ${ethers.formatEther(distC)} CPT`);
    await (await token.connect(owner).transfer(userC.address, distC)).wait();
    await sleep(300);

    await printBalances(token, "After owner distribution", actors);

    // -------------------------
    // Phase 2: Simulate “activity rounds”
    // -------------------------
    console.log("\n--- Phase 2: Activity rounds (user-to-user transfers) ---");

    const rounds = [
        {
            label: "Round 1",
            actions: [
                { from: userA, to: userB.address, amount: "15" },
                { from: userB, to: userC.address, amount: "10" },
            ],
        },
        {
            label: "Round 2",
            actions: [
                { from: userC, to: userA.address, amount: "5" },
                { from: userA, to: userC.address, amount: "7.5" },
            ],
        },
        {
            label: "Round 3",
            actions: [
                { from: userB, to: userA.address, amount: "12" },
            ],
        },
    ];

    for (const round of rounds) {
        console.log(`\n${round.label}`);

        for (const a of round.actions) {
            const value = ethers.parseEther(a.amount);
            console.log(`${short(a.from.address)} -> ${short(a.to)}: ${a.amount} CPT`);
            await (await token.connect(a.from).transfer(a.to, value)).wait();
            await sleep(300);
        }

        await printBalances(token, `${round.label} balances`, actors);
    }

    console.log("\n--- Failure Scenario 1: Overspend attempt ---");

    await attemptTransfer(
        "UserA tries to send 10,000 CPT (insufficient balance)",
        token.connect(userA),
        userB.address,
        "10000"
    );

    console.log("\n--- Failure Scenario 2: Zero-address transfer ---");

    await attemptTransfer(
        "UserB sends to zero address",
        token.connect(userB),
        ethers.ZeroAddress,
        "1"
    );

    console.log("\n--- Failure Scenario 3: transferFrom without approval ---");

    try {
        await token
            .connect(userC)
            .transferFrom(userA.address, userC.address, ethers.parseEther("5"));
        console.log("❌ Unexpected success: transferFrom without approval");
    } catch (err: any) {
        console.log("✅ Expected failure: transferFrom without approval");
        console.log(
            "   ↳ Reason:",
            err?.shortMessage || err?.reason || err?.message
        );
    }



    console.log("\n✅ Interaction scenario complete.");
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
