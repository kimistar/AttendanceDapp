const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying with account:", deployer.address);

  const Attendance = await ethers.getContractFactory("Attendance");

  const contract = await Attendance.deploy(
    deployer.address,
    "ipfs://bafybeibbkpc42gg36mrji23ikqgiic6av3hxt6h6ebiq3nhjeb3fg4ufky/metadata.json",
    "ipfs://bafybeiabn4tvqy2aitglciwefn4xjmreot4twz4kpaazunu5bk275qbhim/metadata.json",
    "ipfs://bafybeicne4fqegfyhsdm7vboahkvi5lirwa3fpxntfuvujjqmvn6jma6hq/metadata.json",
    "ipfs://bafybeicgju3tliip77xhv2tzaegcr37lclxgoiv63ick2cbb7wadltyzry/metadata.json",
    "ipfs://bafybeibfxuwsdkltgv2xqohizd6rxlntg6ysodbtq3zxnq5iznjfqjzsri/metadata.json"
  );

  await contract.waitForDeployment(); // ✅ v6 必须使用 waitForDeployment()

  console.log("✅ Attendance deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
