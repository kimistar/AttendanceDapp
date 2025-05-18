// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Attendance is ERC1155, Ownable, ReentrancyGuard {
    struct UserCheckIn {
        uint256 totalCheckIns;
        uint256 lastCheckIn;
        uint256 currentStreak;
        uint256 maxStreak;
    }

    mapping(address => UserCheckIn) public checkInData;

    // NFT token IDs
    uint256 public constant BRONZE = 30;
    uint256 public constant SILVER = 90;
    uint256 public constant GOLD = 180;
    uint256 public constant PLATINUM = 365;
    uint256 public constant DIAMOND = 730;

    // token URI mapping
    // 30 days, 90 days, 180 days, 365 days, 730 days
    mapping(uint256 => string) private _tokenURIs;

    mapping(address => bool) public claimed30;
    mapping(address => bool) public claimed90;
    mapping(address => bool) public claimed180;
    mapping(address => bool) public claimed365;
    mapping(address => bool) public claimed730;

    event CheckedIn(address indexed user, uint256 timestamp, uint256 streak);
    event RewardClaimed(address indexed user, uint256 tokenId);

    constructor(
        address initialOwner,
        string memory uri30,
        string memory uri90,
        string memory uri180,
        string memory uri365,
        string memory uri730
    ) ERC1155("") Ownable(initialOwner) {
        _tokenURIs[BRONZE] = uri30;
        _tokenURIs[SILVER] = uri90;
        _tokenURIs[GOLD] = uri180;
        _tokenURIs[PLATINUM] = uri365;
        _tokenURIs[DIAMOND] = uri730;
    }

    // checkIn daily attendance
    function checkIn() external {
        UserCheckIn storage user = checkInData[msg.sender];
        uint256 today = block.timestamp / 1 days;

        require(user.lastCheckIn / 1 days < today, "Already checked in today");

        // if the last check-in was yesterday, increment the streak
        if (user.lastCheckIn / 1 days + 1 == today) {
            user.currentStreak += 1;
        } else {
            user.currentStreak = 1;
        }

        user.lastCheckIn = block.timestamp;
        user.totalCheckIns += 1;

        if (user.currentStreak > user.maxStreak) {
            user.maxStreak = user.currentStreak;
        }

        emit CheckedIn(msg.sender, block.timestamp, user.currentStreak);
    }

    // get user check-in history
    function getCheckInHistory(
        address userAddr
    )
        external
        view
        returns (
            uint256 total,
            uint256 lastCheckIn,
            uint256 currentStreak,
            uint256 maxStreak
        )
    {
        UserCheckIn memory u = checkInData[userAddr];
        return (u.totalCheckIns, u.lastCheckIn, u.currentStreak, u.maxStreak);
    }

    // claim NFT rewards based on streak
    function claimRewardNFT() external nonReentrant {
        uint256 streak = checkInData[msg.sender].currentStreak;
        uint256 tokenId = 0;

        // check the current streak is over 30 days
        require(streak >= 30, "Please check in for at least 30 days.");
 
        require(
            !claimed30[msg.sender] ||
                !claimed90[msg.sender] ||
                !claimed180[msg.sender] ||
                !claimed365[msg.sender] ||
                !claimed730[msg.sender],
            "Already claimed all rewards."
        );

        if (streak >= 30 && !claimed30[msg.sender]) {
            claimed30[msg.sender] = true;
            tokenId = BRONZE;
        } else if (streak >= 90 && !claimed90[msg.sender]) {
            claimed90[msg.sender] = true;
            tokenId = SILVER;
        } else if (streak >= 180 && !claimed180[msg.sender]) {
            claimed180[msg.sender] = true;
            tokenId = GOLD;
        } else if (streak >= 365 && !claimed365[msg.sender]) {
            claimed365[msg.sender] = true;
            tokenId = PLATINUM;
        } else if (streak >= 730 && !claimed730[msg.sender]) {
            claimed730[msg.sender] = true;
            tokenId = DIAMOND;
        } else {
            revert("No reward available or already claimed.");
        }

        _mint(msg.sender, tokenId, 1, "");
        emit RewardClaimed(msg.sender, tokenId);
    }

    // Check if the user has claimed the NFT for a specific streak
    function hasClaimedNFT(
        address user,
        uint256 daysStreak
    ) external view returns (bool) {
        if (daysStreak == 30) return claimed30[user];
        if (daysStreak == 90) return claimed90[user];
        if (daysStreak == 180) return claimed180[user];
        if (daysStreak == 365) return claimed365[user];
        if (daysStreak == 730) return claimed730[user];
        return false;
    }

    // Override uri function to return the token URI
    function uri(uint256 tokenId) public view override returns (string memory) {
        return _tokenURIs[tokenId];
    }
}
