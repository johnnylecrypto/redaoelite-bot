const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    wallet: { type: String, required: true, unique: true },
    firstName: { type: String },
    lastName: { type: String },
    username: { type: String },
    signature: { type: String },
    chatId: { type: String, required: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

module.exports = User;
