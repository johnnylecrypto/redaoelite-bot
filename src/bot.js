const { Telegraf } = require("telegraf");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();
const User = require("./database");
const { ethers } = require("ethers");
const { checkNFTHolder } = require("./function");

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const CHANNEL_ID = process.env.CHANNEL_ID;

bot.start((ctx) => {
  ctx.reply(
    "Welcome to the NFT Checker Bot!\nUse /wallet <your-ethereum-wallet-address> to register."
  );
});

// Command /wallet to input the wallet address
bot.command("wallet", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  const walletAddress = args[0];

  if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
    return ctx.reply(
      "Invalid or missing wallet address. Usage: /wallet <your-ethereum-wallet-address>"
    );
  }

  const { first_name, last_name, username } = ctx.from;
  const chatId = ctx.chat.id.toString();

  try {
    let existingUser = await User.findOne({ wallet: walletAddress });

    if (existingUser && existingUser.chatId !== chatId) {
      return ctx.reply(
        "This wallet address is already registered by another user. Please use a different wallet."
      );
    }

    let user = await User.findOne({ chatId: chatId });

    if (user) {
      if (!user.signature) {
        user.wallet = walletAddress;
        user.firstName = first_name || "";
        user.lastName = last_name || "";
        user.username = username || "";
        await user.save();
        ctx.reply(
          `Your wallet information has been updated. Please sign a message at the following link: https://your-signing-website.com/?wallet=${walletAddress}\nAfter signing, use /check <Signature> to verify.`
        );
      } else {
        ctx.reply(
          "You have already registered a wallet and signed. You cannot update your wallet address."
        );
      }
    } else {
      user = new User({
        wallet: walletAddress,
        firstName: first_name || "",
        lastName: last_name || "",
        username: username || "",
        chatId: chatId,
        signature: "",
        g,
      });
      await user.save();
      ctx.reply(
        `Your wallet has been registered successfully. Please sign a message at the following link: https://your-signing-website.com/?wallet=${walletAddress}\nAfter signing, use /check <Signature> to verify.`
      );
    }
  } catch (error) {
    console.error("Error saving user to database:", error);
    ctx.reply(
      "An error occurred while registering your wallet. Please try again later."
    );
  }
});

bot.command("check", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  const userSignature = args[0];

  if (!userSignature) {
    return ctx.reply(
      "Invalid or missing signature. Please use: /check <Signature>"
    );
  }

  try {
    const user = await User.findOne({ chatId: ctx.chat.id });

    if (!user) {
      return ctx.reply(
        "You have not registered a wallet. Please use /wallet <your-ethereum-wallet-address> to register."
      );
    }

    const walletAddress = user.wallet;

    const recoveredAddress = ethers.utils.verifyMessage(
      walletAddress.toLowerCase(),
      userSignature
    );

    console.log("walletAddress", walletAddress);
    console.log("recoveredAddress", recoveredAddress);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return ctx.reply("The signature does not match the wallet address.");
    }

    const isHolder = await checkNFTHolder(walletAddress);

    if (isHolder) {
      user.signature = userSignature;
      await user.save();

      const inviteLink = "https://t.me/+rZLfcvNxiHg4YmNl";
      await ctx.reply(
        `Congratulations! You are an NFT holder.\nHere is the invite link to join the channel: ${inviteLink}`
      );
    } else {
      await ctx.reply("Sorry, you are not an NFT holder.");
    }
  } catch (error) {
    console.error("Error processing /check command:", error);
    ctx.reply(
      "An error occurred during the check process. Please try again later."
    );
  }
});

bot.on("chat_join_request", async (ctx) => {
  const userId = ctx.from.id;

  try {
    const user = await User.findOne({ chatId: userId });

    if (user?.signature) {
      await ctx.telegram.approveChatJoinRequest(CHANNEL_ID, userId);
      await ctx.telegram.sendMessage(
        userId,
        "Congratulations! Your request to join the channel has been approved."
      );
    } else {
      await ctx.telegram.declineChatJoinRequest(CHANNEL_ID, userId);
      await ctx.telegram.sendMessage(
        userId,
        "Sorry, you are not an NFT holder and cannot join the channel."
      );
    }
  } catch (error) {
    console.error("Error processing join request:", error);
  }
});

bot.catch((err, ctx) => {
  console.error(`Bot encountered an error for ${ctx.updateType}:`, err);
});

// Launch the bot
bot
  .launch()
  .then(() => console.log("Bot has been launched."))
  .catch((error) => console.error("Error launching bot:", error));

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
