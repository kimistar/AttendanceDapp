const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
require("dotenv").config();

// Constants for the token IDs
const BRONZE = 30;
const SILVER = 90;
const GOLD = 180;
const PLATINUM = 365;
const DIAMOND = 730;

// IPFS URIs for the NFTs
const BRONZE_URI = process.env.BRONZE_URI;
const SILVER_URI = process.env.SILVER_URI;
const GOLD_URI = process.env.GOLD_URI;
const PLATINUM_URI = process.env.PLATINUM_URI;
const DIAMOND_URI = process.env.DIAMOND_URI;

describe("Attendance Contract - Check-In Tests", function () {
  let attendance;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    // Use a longer timeout to ensure contract deployment succeeds
    this.timeout(60000);
    
    // Get test accounts
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy contract
    const Attendance = await ethers.getContractFactory("Attendance");
    attendance = await Attendance.deploy(
      owner.address,
      BRONZE_URI,
      SILVER_URI,
      GOLD_URI,
      PLATINUM_URI,
      DIAMOND_URI
    );
    
    // Wait for deployment
    await attendance.waitForDeployment();
    console.log(`Test contract deployed at address: ${await attendance.getAddress()}`);
  });

  describe("Check-In Function Tests", function() {
    it("Should succeed on first check-in", async function () {
      // Execute check-in operation
      const tx = await attendance.connect(user1).checkIn();
      const receipt = await tx.wait();
      
      // Verify transaction success
      expect(receipt.status).to.equal(1);
      
      // Verify check-in data has been updated
      const [total, lastCheckIn, currentStreak, maxStreak] = 
        await attendance.getCheckInHistory(user1.address);
      
      expect(total).to.equal(1n);
      expect(lastCheckIn).to.be.gt(0n);
      expect(currentStreak).to.equal(1n);
      expect(maxStreak).to.equal(1n);
      
      console.log("✅ First check-in transaction successful!");
    });
    
    it("Should fail on repeated check-in on the same day", async function () {
      // First check-in
      await attendance.connect(user1).checkIn();
      
      // Attempt to check-in again on the same day
      await expect(
        attendance.connect(user1).checkIn()
      ).to.be.revertedWith("Already checked in today");
      
      console.log("✅ Same-day repeated check-in correctly prevented");
    });
    
    it("Should increase consecutive check-in count for two consecutive days", async function () {
      // Day 1 check-in
      await attendance.connect(user1).checkIn();
      
      // Forward time by one day
      await time.increase(24 * 60 * 60 + 10); // 1 day + 10 seconds
      
      // Day 2 check-in
      await attendance.connect(user1).checkIn();
      
      // Verify consecutive check-in count increased
      const [total, _, currentStreak, maxStreak] = 
        await attendance.getCheckInHistory(user1.address);
      
      expect(total).to.equal(2n);
      expect(currentStreak).to.equal(2n);
      expect(maxStreak).to.equal(2n);
      
      console.log("✅ Consecutive check-in count correctly increased");
    });
    
    it("Should reset consecutive check-in count after missing a day", async function () {
      // Day 1 check-in
      await attendance.connect(user1).checkIn();
      
      // Forward time by two days (skip one day)
      await time.increase(2 * 24 * 60 * 60 + 10); // 2 days + 10 seconds
      
      // Check-in after skipping a day
      await attendance.connect(user1).checkIn();
      
      // Verify consecutive check-in count was reset
      const [total, _, currentStreak, maxStreak] = 
        await attendance.getCheckInHistory(user1.address);
      
      expect(total).to.equal(2n);
      expect(currentStreak).to.equal(1n); // Reset to 1
      expect(maxStreak).to.equal(1n);
      
      console.log("✅ Consecutive count correctly reset after interrupted check-in");
    });
    
    it("Should have correct format and values for check-in history data", async function () {
      // Perform three check-ins, one day apart each
      await attendance.connect(user1).checkIn();
      await time.increase(24 * 60 * 60 + 10);
      await attendance.connect(user1).checkIn();
      await time.increase(24 * 60 * 60 + 10);
      await attendance.connect(user1).checkIn();
      
      // Get check-in history
      const history = await attendance.getCheckInHistory(user1.address);
      
      // Check history record length
      expect(history.length).to.equal(4);
      
      const [total, lastCheckIn, currentStreak, maxStreak] = history;
      
      // Check data types
      expect(typeof total).to.equal("bigint");
      expect(typeof lastCheckIn).to.equal("bigint");
      expect(typeof currentStreak).to.equal("bigint");
      expect(typeof maxStreak).to.equal("bigint");
      
      // Check values
      expect(total).to.equal(3n);
      expect(currentStreak).to.equal(3n);
      expect(maxStreak).to.equal(3n);
      
      console.log("📊 Check-in statistics:");
      console.log("  - Total check-ins:", total.toString());
      console.log("  - Last check-in time:", new Date(Number(lastCheckIn) * 1000).toLocaleString());
      console.log("  - Current streak:", currentStreak.toString());
      console.log("  - Maximum streak:", maxStreak.toString());
    });
  });
  
  describe("Maximum Check-in Record Tests", function() {
    it("Should correctly record historical maximum consecutive check-ins", async function () {
      // First round: 5 consecutive check-ins
      for (let i = 0; i < 5; i++) {
        await attendance.connect(user1).checkIn();
        if (i < 4) await time.increase(24 * 60 * 60 + 10);
      }
      
      // Check maximum consecutive check-ins is 5
      let [_, __, ___, maxStreak] = await attendance.getCheckInHistory(user1.address);
      expect(maxStreak).to.equal(5n);
      
      // Skip 2 days
      await time.increase(2 * 24 * 60 * 60 + 10);
      
      // Second round: 3 more consecutive check-ins
      for (let i = 0; i < 3; i++) {
        await attendance.connect(user1).checkIn();
        if (i < 2) await time.increase(24 * 60 * 60 + 10);
      }
      
      // Verify total check-ins and maximum consecutive check-ins
      const [total, lastCheckIn, currentStreak, newMaxStreak] = 
        await attendance.getCheckInHistory(user1.address);
      
      expect(total).to.equal(8n);       // 8 total check-ins
      expect(currentStreak).to.equal(3n); // Current streak is 3
      expect(newMaxStreak).to.equal(5n);  // Max streak remains 5
      
      console.log("✅ Maximum consecutive check-in record correctly preserved");
    });
  });
  
  describe("Multi-user Tests", function() {
    it("Different users should have independent check-in records", async function () {
      // User1 checks in for 3 days
      for (let i = 0; i < 3; i++) {
        await attendance.connect(user1).checkIn();
        await time.increase(24 * 60 * 60 + 10);
      }
      
      // User2 checks in for 2 days
      for (let i = 0; i < 2; i++) {
        await attendance.connect(user2).checkIn();
        if (i < 1) await time.increase(24 * 60 * 60 + 10);
      }
      
      // Check User1's data
      const [total1, _, streak1, maxStreak1] = 
        await attendance.getCheckInHistory(user1.address);
      
      // Check User2's data
      const [total2, __, streak2, maxStreak2] = 
        await attendance.getCheckInHistory(user2.address);
      
      // Verify data independence
      expect(total1).to.equal(3n);
      expect(streak1).to.equal(3n);
      expect(maxStreak1).to.equal(3n);
      
      expect(total2).to.equal(2n);
      expect(streak2).to.equal(2n);
      expect(maxStreak2).to.equal(2n);
      
      console.log("✅ Multi-user data independence verification successful");
    });
  });
  
  describe("Edge Case Tests", function() {
    it("Should handle check-ins across multiple days", async function () {
      // Day 1 check-in
      await attendance.connect(user1).checkIn();
      
      // Forward 365 days
      await time.increase(365 * 24 * 60 * 60 + 10);
      
      // Check-in after one year
      await attendance.connect(user1).checkIn();
      
      // Verify data
      const [total, _, currentStreak, maxStreak] = 
        await attendance.getCheckInHistory(user1.address);
      
      expect(total).to.equal(2n);       // 2 total check-ins
      expect(currentStreak).to.equal(1n); // Current streak reset to 1
      expect(maxStreak).to.equal(1n);    // Max streak is 1
      
      console.log("✅ Long interval check-in handled correctly");
    });
  });
});

describe("Attendance Contract - claimRewardNFT Tests", function () {
  let attendance;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    // Use a longer timeout for deployment
    this.timeout(60000);
    
    // Get test accounts
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy the contract
    const Attendance = await ethers.getContractFactory("Attendance");
    attendance = await Attendance.deploy(
      owner.address,
      BRONZE_URI,
      SILVER_URI,
      GOLD_URI,
      PLATINUM_URI,
      DIAMOND_URI
    );
    
    // Wait for deployment
    await attendance.waitForDeployment();
  });

  // Helper function to simulate consecutive check-ins
  async function performConsecutiveCheckIns(user, days) {
    const oneDay = 24 * 60 * 60; // 1 day in seconds
    
    // Connect as the specified user
    const userContract = attendance.connect(user);
    
    // Check in for the specified number of days
    for (let i = 0; i < days; i++) {
      await userContract.checkIn();
      
      // Advance time by 1 day + 1 second to ensure we're in a new day
      await time.increase(oneDay + 1);
    }
  }

  describe("Basic Requirements", function() {
    it("should fail if the user has not checked in for at least 30 days", async function() {
      // Perform 29 consecutive check-ins (not enough for any reward)
      await performConsecutiveCheckIns(user1, 29);
      
      // Attempt to claim a reward
      await expect(
        attendance.connect(user1).claimRewardNFT()
      ).to.be.revertedWith("Please check in for at least 30 days.");

      console.log("✅ Claiming reward failed as expected for insufficient check-ins");
    });
    
    it("should fail with appropriate message if no reward is available", async function() {
      // First claim the bronze reward
      await performConsecutiveCheckIns(user1, 30);
      await attendance.connect(user1).claimRewardNFT();
      
      // Try to claim again with same streak
      await expect(
        attendance.connect(user1).claimRewardNFT()
      ).to.be.revertedWith("No reward available or already claimed.");

      console.log("✅ Claiming reward failed as expected for already claimed reward");
    });
  });

  describe("Bronze Reward (30 days)", function() {
    it("should claim the Bronze NFT after a 30-day streak", async function() {
      // Perform 30 consecutive check-ins
      await performConsecutiveCheckIns(user1, 30);
      
      // Check initial balance
      expect(await attendance.balanceOf(user1.address, BRONZE)).to.equal(0);
      
      // Claim the Bronze NFT
      const tx = await attendance.connect(user1).claimRewardNFT();
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      
      // Verify event was emitted
      expect(receipt.logs.length).to.be.greaterThan(0);
      
      // Verify the user received the NFT
      expect(await attendance.balanceOf(user1.address, BRONZE)).to.equal(1);
      
      // Verify the claimed status
      expect(await attendance.hasClaimedNFT(user1.address, 30)).to.equal(true);
      
      // Verify the token URI
      expect(await attendance.uri(BRONZE)).to.equal(BRONZE_URI);

        console.log("✅ Bronze NFT claimed successfully!");
    });
    
    it("should not allow claiming the Bronze NFT twice", async function() {
      // Perform 30 consecutive check-ins
      await performConsecutiveCheckIns(user1, 30);
      
      // Claim the Bronze NFT
      await attendance.connect(user1).claimRewardNFT();
      
      // Try to claim again
      await expect(
        attendance.connect(user1).claimRewardNFT()
      ).to.be.revertedWith("No reward available or already claimed.");

        console.log("✅ Claiming Bronze NFT twice failed as expected");
    });
  });

  describe("Silver Reward (90 days)", function() {
    it("should claim the Silver NFT after a 90-day streak", async function() {
      // Perform 90 consecutive check-ins
      await performConsecutiveCheckIns(user1, 90);
      
      // Check initial balance
      expect(await attendance.balanceOf(user1.address, SILVER)).to.equal(0);
      
      // Claim the Bronze NFT first
      await attendance.connect(user1).claimRewardNFT();
      
      // Verify the Bronze has been claimed
      expect(await attendance.balanceOf(user1.address, BRONZE)).to.equal(1);
      
      // Claim the Silver NFT
      const tx = await attendance.connect(user1).claimRewardNFT();
      const receipt = await tx.wait();
      
      // Verify the user received the Silver NFT
      expect(await attendance.balanceOf(user1.address, SILVER)).to.equal(1);
      
      // Verify the claimed status
      expect(await attendance.hasClaimedNFT(user1.address, 90)).to.equal(true);

      console.log("✅ Silver NFT claimed successfully!");
    });
  });

  describe("Gold Reward (180 days)", function() {
    it("should claim the Gold NFT after a 180-day streak", async function() {
      // Perform 180 consecutive check-ins
      await performConsecutiveCheckIns(user1, 180);
      
      // Check initial balance
      expect(await attendance.balanceOf(user1.address, GOLD)).to.equal(0);
      
      // Claim the Bronze and Silver NFTs first
      await attendance.connect(user1).claimRewardNFT(); // Bronze
      await attendance.connect(user1).claimRewardNFT(); // Silver
      
      // Claim the Gold NFT
      const tx = await attendance.connect(user1).claimRewardNFT();
      const receipt = await tx.wait();
      
      // Verify the user received the Gold NFT
      expect(await attendance.balanceOf(user1.address, GOLD)).to.equal(1);
      
      // Verify the claimed status
      expect(await attendance.hasClaimedNFT(user1.address, 180)).to.equal(true);

        console.log("✅ Gold NFT claimed successfully!");
    });
  });

  describe("Platinum Reward (365 days)", function() {
    it("should claim the Platinum NFT after a 365-day streak", async function() {
      // This test may take longer to run
      this.timeout(300000);
      
      // Perform 365 consecutive check-ins
      await performConsecutiveCheckIns(user1, 365);
      
      // Claim the Bronze, Silver, and Gold NFTs first
      await attendance.connect(user1).claimRewardNFT(); // Bronze
      await attendance.connect(user1).claimRewardNFT(); // Silver
      await attendance.connect(user1).claimRewardNFT(); // Gold
      
      // Claim the Platinum NFT
      const tx = await attendance.connect(user1).claimRewardNFT();
      const receipt = await tx.wait();
      
      // Verify the user received the Platinum NFT
      expect(await attendance.balanceOf(user1.address, PLATINUM)).to.equal(1);
      
      // Verify the claimed status
      expect(await attendance.hasClaimedNFT(user1.address, 365)).to.equal(true);

        console.log("✅ Platinum NFT claimed successfully!");
    });
  });

  describe("Diamond Reward (730 days)", function() {
    it("should claim the Diamond NFT after a 730-day streak", async function() {
      // This test will take a long time to run
      this.timeout(600000);
      
      // Perform 730 consecutive check-ins
      await performConsecutiveCheckIns(user1, 730);
      
      // Claim all previous rewards first
      await attendance.connect(user1).claimRewardNFT(); // Bronze
      await attendance.connect(user1).claimRewardNFT(); // Silver
      await attendance.connect(user1).claimRewardNFT(); // Gold
      await attendance.connect(user1).claimRewardNFT(); // Platinum
      
      // Claim the Diamond NFT
      const tx = await attendance.connect(user1).claimRewardNFT();
      const receipt = await tx.wait();
      
      // Verify the user received the Diamond NFT
      expect(await attendance.balanceOf(user1.address, DIAMOND)).to.equal(1);
      
      // Verify the claimed status
      expect(await attendance.hasClaimedNFT(user1.address, 730)).to.equal(true);

        console.log("✅ Diamond NFT claimed successfully!");
    });
  });

  describe("Claim Order Tests", function() {
    it("should claim rewards in order of availability when streak is high", async function() {
      // Perform enough check-ins for multiple rewards
      await performConsecutiveCheckIns(user1, 100); // Enough for Bronze and Silver
      
      // First claim should be Bronze
      await attendance.connect(user1).claimRewardNFT();
      expect(await attendance.balanceOf(user1.address, BRONZE)).to.equal(1);
      expect(await attendance.balanceOf(user1.address, SILVER)).to.equal(0);
      
      // Second claim should be Silver
      await attendance.connect(user1).claimRewardNFT();
      expect(await attendance.balanceOf(user1.address, SILVER)).to.equal(1);

      console.log("✅ Rewards claimed in correct order");
    });
    
    it("should handle a reset streak after claiming a reward", async function() {
      // Perform enough check-ins for a reward
      await performConsecutiveCheckIns(user1, 35);
      
      // Claim the Bronze reward
      await attendance.connect(user1).claimRewardNFT();
      expect(await attendance.balanceOf(user1.address, BRONZE)).to.equal(1);
      
      // Break the streak (skip a day)
      await time.increase(2 * 24 * 60 * 60 + 1); // Skip 2 days
      
      // Check in again to start a new streak of 1
      await attendance.connect(user1).checkIn();
      
      // Verify the streak has been reset
      const [_, __, currentStreak, maxStreak] = await attendance.getCheckInHistory(user1.address);
      expect(currentStreak).to.equal(1n);
      expect(maxStreak).to.be.greaterThan(30n); // Max streak should still be recorded
      
      // Try to claim again should fail
      await expect(
        attendance.connect(user1).claimRewardNFT()
      ).to.be.revertedWith("Please check in for at least 30 days.");

        console.log("✅ Streak reset handled correctly after claiming a reward");
    });
  });

  describe("Multiple Users", function() {
    it("should handle multiple users claiming rewards independently", async function() {
      // User 1 gets a 30-day streak
      await performConsecutiveCheckIns(user1, 30);
      
      // User 2 gets a 90-day streak
      await performConsecutiveCheckIns(user2, 90);
      
      // User 1 claims Bronze
      await attendance.connect(user1).claimRewardNFT();
      expect(await attendance.balanceOf(user1.address, BRONZE)).to.equal(1);
      
      // User 2 claims Bronze
      await attendance.connect(user2).claimRewardNFT();
      expect(await attendance.balanceOf(user2.address, BRONZE)).to.equal(1);
      
      // User 2 claims Silver
      await attendance.connect(user2).claimRewardNFT();
      expect(await attendance.balanceOf(user2.address, SILVER)).to.equal(1);
      
      // User 1 should not be able to claim Silver yet
      await expect(
        attendance.connect(user1).claimRewardNFT()
      ).to.be.revertedWith("No reward available or already claimed.");

      console.log("✅ Multiple users can claim rewards independently");
    });
  });

  describe("Edge Cases", function() {
    it("should handle the exact day thresholds correctly", async function() {
      // Test exact thresholds for each reward level
      const thresholds = [
        { days: 30, reward: BRONZE },
        { days: 90, reward: SILVER },
        { days: 180, reward: GOLD },
        { days: 365, reward: PLATINUM },
        { days: 730, reward: DIAMOND }
      ];
      
      // Test each threshold with a new user
      for (let i = 0; i < thresholds.length; i++) {
        const { days, reward } = thresholds[i];
        const user = await ethers.Wallet.createRandom().connect(ethers.provider);
        
        // Fund the user with some ETH for gas
        await owner.sendTransaction({
          to: user.address,
          value: ethers.parseEther("1.0")
        });
        
        // Perform exact number of check-ins
        await performConsecutiveCheckIns(user, days);
        
        // Claim all previous rewards
        for (let j = 0; j < i; j++) {
          await attendance.connect(user).claimRewardNFT();
        }
        
        // Claim the current reward
        await attendance.connect(user).claimRewardNFT();
        
        // Verify the user received the correct NFT
        expect(await attendance.balanceOf(user.address, reward)).to.equal(1);

        console.log(`✅ ${days}-day reward claimed successfully for user ${user.address}`);
      }
    });
    
    it("should handle non-reentrant protection", async function() {
        // TODO: Implement a test for reentrancy protection
    });
  });
});