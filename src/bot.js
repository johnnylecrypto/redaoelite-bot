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
    "Welcome to the NFT Checker Bot!\nPlease sign your wallet and copy the signature at the following link: https://redaoelite-ygmv.vercel.app/\nUse /sign <your-signature> to verify your wallet."
  );
});

bot.command("sign", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  const userSignature = args[0];

  if (!userSignature) {
    return ctx.reply(
      "Invalid or missing signature. Please use: /sign <your-signature>"
    );
  }

  try {
    const { id, first_name, last_name, username } = ctx.from;
    const message = "Hi, I,m reDao Elite NFT holder";

    const recoveredAddress = ethers.utils.verifyMessage(message, userSignature);

    const isHolder = await checkNFTHolder(recoveredAddress);

    if (!isHolder) {
      return ctx.reply("Sorry, you are not an NFT holder.");
    }

    const existingUser = await User.findOne({ wallet: recoveredAddress });
    console.log(existingUser);
    console.log("id", id);

    if (existingUser) {
      if (existingUser.userId === id) {
        return ctx.reply(
          `You have already been successfully verified with the wallet: ${existingUser.wallet}.`
        );
      } else {
        return ctx.reply(
          "This signature has already been registered. Please try a different wallet."
        );
      }
    }

    const newUser = new User({
      wallet: recoveredAddress,
      firstName: first_name || "",
      lastName: last_name || "",
      username: username || "",
      userId: id,
      signature: userSignature,
    });

    await newUser.save();

    const inviteLink = "https://t.me/+rZLfcvNxiHg4YmNl";
    await ctx.reply(
      `Congratulations! You are an NFT holder and your wallet has been registered. You can now join the channel.\n\n\n Here is the invite link: ${inviteLink}`
    );
  } catch (error) {
    console.error("Error processing /sign command:", error);
    ctx.reply(
      "An error occurred during the signature verification process. Please try again later."
    );
  }
});

bot.on("chat_join_request", async (ctx) => {
  const userId = ctx.from.id;

  try {
    const user = await User.findOne({ userId: userId });

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
