import { ethers } from "hardhat";

/* -------------------------------------------------
   Helpers
------------------------------------------------- */

function short(addr: string) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
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

async function logBalances(
    label: string,
    params: {
        owner: any;
        userA: any;
        userB: any;
        userC: any;
        token: any;
    }
) {
    const { owner, userA, userB, userC, token } = params;

    console.log(`\n=== ${label} ===`);

    console.log(
        `Owner (${short(owner.address)}): ${ethers.formatEther(
            await token.balanceOf(owner.address)
        )} CPT`
    );
    console.log(
        `UserA (${short(userA.address)}): ${ethers.formatEther(
            await token.balanceOf(userA.address)
        )} CPT`
    );
    console.log(
        `UserB (${short(userB.address)}): ${ethers.formatEther(
            await token.balanceOf(userB.address)
        )} CPT`
    );
    console.log(
        `UserC (${short(userC.address)}): ${ethers.formatEther(
            await token.balanceOf(userC.address)
        )} CPT`
    );
}

/* -------------------------------------------------
   Main Script
------------------------------------------------- */

async function main() {
    const [owner, userA, userB, userC] = await ethers.getSigners();
    const token = await ethers.getContractAt(
        "CapstoneToken",
        process.env.CONTRACT_ADDRESS ?? ""
    );

    console.log("Owner:", owner.address);
    console.log("Users:", userA.address, userB.address, userC.address);

    const actors = [
        { name: "Owner", addr: owner.address },
        { name: "UserA", addr: userA.address },
        { name: "UserB", addr: userB.address },
        { name: "UserC", addr: userC.address },
    ];

    await printBalances(token, "Initial balances", actors);

    /* -------------------------------------------------
       Phase 1: Owner distribution
    ------------------------------------------------- */
    console.log("\n--- Phase 1: Owner distribution ---");

    await token.connect(owner).transfer(userA.address, ethers.parseEther("120"));
    await token.connect(owner).transfer(userB.address, ethers.parseEther("80"));
    await token.connect(owner).transfer(userC.address, ethers.parseEther("50"));

    await printBalances(token, "After owner distribution", actors);

    /* -------------------------------------------------
       Phase 2: Activity rounds
    ------------------------------------------------- */
    console.log("\n--- Phase 2: Activity rounds ---");

    const rounds = [
        [
            { from: userA, to: userB.address, amount: "15" },
            { from: userB, to: userC.address, amount: "10" },
        ],
        [
            { from: userC, to: userA.address, amount: "5" },
            { from: userA, to: userC.address, amount: "7.5" },
        ],
        [{ from: userB, to: userA.address, amount: "12" }],
    ];

    for (const [i, actions] of rounds.entries()) {
        console.log(`\nRound ${i + 1}`);
        for (const a of actions) {
            await token
                .connect(a.from)
                .transfer(a.to, ethers.parseEther(a.amount));
        }
        await printBalances(token, `After round ${i + 1}`, actors);
    }

    /* -------------------------------------------------
       Failure Scenarios
    ------------------------------------------------- */
    console.log("\n--- Failure Scenarios ---");

    await attemptTransfer(
        "UserA tries to send 10,000 CPT",
        token.connect(userA),
        userB.address,
        "10000"
    );

    await attemptTransfer(
        "UserB sends to zero address",
        token.connect(userB),
        ethers.ZeroAddress,
        "1"
    );

    try {
        await token
            .connect(userC)
            .transferFrom(userA.address, userC.address, ethers.parseEther("5"));
        console.log("❌ Unexpected success");
    } catch {
        console.log("✅ Expected failure: transferFrom without approval");
    }

    /* -------------------------------------------------
       Phase 3: Allowances & Delegated Transfers
    ------------------------------------------------- */
    console.log("\n--- Phase 3: Allowances & Delegated Transfers ---");

    console.log("UserA approves UserB for 50 CPT");
    await token.connect(userA).approve(userB.address, ethers.parseEther("50"));

    console.log("UserB transfers 20 CPT from UserA to UserC");
    await token
        .connect(userB)
        .transferFrom(userA.address, userC.address, ethers.parseEther("20"));

    await logBalances("After delegated transfer", {
        owner,
        userA,
        userB,
        userC,
        token,
    });

    console.log("UserA revokes allowance");
    await token.connect(userA).approve(userB.address, 0);

    console.log("\n✅ Interaction scenario complete.");
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});