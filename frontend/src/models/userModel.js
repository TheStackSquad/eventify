// src/models/UserModel.js
// This file defines the Mongoose Schema for the MongoDB database.

import mongoose from "mongoose";
import bcrypt from "bcryptjs"; // Library for secure password hashing

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      // Setting select: false ensures the password hash is not retrieved
      // accidentally in normal queries.
      select: false,
    },
    fullName: {
      type: String,
      trim: true,
    },
    accountStatus: {
      type: String,
      enum: ["PENDING_ONBOARDING", "ACTIVE", "BLOCKED", "VERIFICATION_NEEDED"],
      default: "PENDING_ONBOARDING",
    },
    // Security fields for rate limiting and lockouts
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

// Mongoose Pre-Save Hook for Password Security
UserSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords in the login flow (Instance Method)
UserSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    // Note: 'this.password' needs to be explicitly selected in the query before calling this method
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    throw new Error(err);
  }
};

// Ensure Mongoose doesn't try to compile the model multiple times in development/Next.js
const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);

export default UserModel;
