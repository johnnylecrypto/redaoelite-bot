const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const abiPath = path.join(__dirname, "abi", "ERC721.json");
const abi = JSON.parse(fs.readFileSync(abiPath, "utf-8"));

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);

const contractAddress = process.env.NFT_CONTRACT_ADDRESS;

async function checkNFTHolder(address) {
  try {
    const nftContract = new ethers.Contract(contractAddress, abi, provider);
    const balance = await nftContract.balanceOf(address);

    return balance.gt(0);
  } catch (error) {
    console.error("Error checking NFT holder:", error);
    throw new Error("Failed to check NFT holder.");
  }
}

module.exports = {
  checkNFTHolder,
};
