import { ethers } from "hardhat";

/* -------------------------------------------------
   Helpers
------------------------------------------------- */

function short(addr: string) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
   Vesting Model (off-chain simulation)
------------------------------------------------- */

type VestingSchedule = {
    total: bigint;
    released: bigint;
    step: bigint;
};

const vesting: VestingSchedule = {
    total: ethers.parseEther("100"),
    released: ethers.parseEther("0"),
    step: ethers.parseEther("25"),
};

async function releaseVestedAllowance(
    token: any,
    owner: any,
    spender: string,
    vesting: VestingSchedule
) {
    if (vesting.released >= vesting.total) {
        console.log("⚠️ All tokens already vested");
        return;
    }

    vesting.released += vesting.step;
    if (vesting.released > vesting.total) {
        vesting.released = vesting.total;
    }

    console.log(
        `⏳ Vesting release: approving ${ethers.formatEther(
            vesting.released
        )} CPT`
    );

    await token.connect(owner).approve(spender, vesting.released);

    console.log(
        `Allowance updated → ${ethers.formatEther(
            await token.allowance(owner.address, spender)
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
    await sleep(300);
    await token.connect(owner).transfer(userB.address, ethers.parseEther("80"));
    await sleep(300);
    await token.connect(owner).transfer(userC.address, ethers.parseEther("50"));
    await sleep(300);

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
            await sleep(300);
        }
        await printBalances(token, `After round ${i + 1}`, actors);
    }

    /* -------------------------------------------------
       Failure Scenarios
    ------------------------------------------------- */
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
    } catch {
        console.log("✅ Expected failure: transferFrom without approval");
    }

    /* -------------------------------------------------
       Phase 3: Allowances & Delegated Transfers
    ------------------------------------------------- */
    console.log("\n--- Phase 3: Allowances & Delegated Transfers ---");

    await token.connect(userA).approve(userB.address, ethers.parseEther("50"));

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

    await token.connect(userA).approve(userB.address, 0);

    /* -------------------------------------------------
       Phase 4: Time-based Vesting Simulation
    ------------------------------------------------- */
    console.log("\n--- Phase 4: Time-based Allowance (Vesting) ---");

    vesting.released = ethers.parseEther("0");

    await releaseVestedAllowance(token, userA, userB.address, vesting);

    try {
        await token
            .connect(userB)
            .transferFrom(userA.address, userC.address, ethers.parseEther("40"));
    } catch {
        console.log("✅ Expected failure: vesting not unlocked yet");
    }

    await sleep(500);
    await releaseVestedAllowance(token, userA, userB.address, vesting);

    await token
        .connect(userB)
        .transferFrom(userA.address, userC.address, ethers.parseEther("40"));

    await logBalances("After vested delegated transfer", {
        owner,
        userA,
        userB,
        userC,
        token,
    });

    console.log("\n✅ Interaction scenario complete.");
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});