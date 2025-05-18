require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    },
    hardhat: {} // This is the default network configuration for Hardhat
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  }
};
