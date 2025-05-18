const fs = require("fs");

async function main() {
  const contractPath = "./artifacts/contracts/Attendance.sol/Attendance.json";
  const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const abi = contractJson.abi;
  console.log(JSON.stringify(abi, null, 2));
}

main();
