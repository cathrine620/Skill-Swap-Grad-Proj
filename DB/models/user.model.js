import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    isActive: { type: Boolean, default: true },
    confirmEmail: { type: Boolean, default: false },
    activationCode: { type: String, default: null },
    activationCodeExpires: { type: Date, default: null },
    password: { type: String, required: true },
    rate: { type: Number, default: 0, min: 0, max: 5 },
    numberOfReviews: { type: Number, default: 0 },
    reviews: [
      {
        rating: { type: Number, required: true },
        review: { type: String, required: true },
        reviewer: { type: Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    userImage: {
      secure_url: {
        type: String,
        default: "",
      },
      public_id: { type: String, default: null },
    },
    role: {
      type: String,
      enum: ["Normal", "Admin", "Mentor"],
      default: "Normal",
    },
    freeHours: { type: Number, default: 5 },
    hourlyPrice: { type: Number, default: 0 },
    wallet: { type: Number, default: 0 },
    helpTotalHours: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    challenges: [{ type: String }],
    profile: {
      bio: { type: String, default: "" },
      skillSummary: { type: String, default: "" },
      reputationScore: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
    },
    skills: [
      {
        skillName: { type: String, required: true },
        isVerified: { type: Boolean, default: false },
        quizScore: { type: Number, default: 0 },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    track: { type: Schema.Types.ObjectId, ref: "Track" },
    messages: [{ type: Schema.Types.ObjectId, ref: "ChatMessage" }],
    reports: [{ type: Schema.Types.ObjectId, ref: "Report" }],
    requests: [{ type: Schema.Types.ObjectId, ref: "Request" }],
    feedbackGiven: [{ type: Schema.Types.ObjectId, ref: "Feedback" }],
    feedbackReceived: [{ type: Schema.Types.ObjectId, ref: "Feedback" }],
    mentorSuggestions: [
      { type: Schema.Types.ObjectId, ref: "MentorSuggestion" },
    ],
    forgetCode: {
      type: Number,
      default: null,
    },
    forgetCodeExpires: {
      type: Date,
    },
    changePasswordTime: {
      type: Date,
    },
    warnings: [
      {
        reason: { type: String, required: true },
        issuedBy: { type: Schema.Types.ObjectId, ref: "User" },
        issuedAt: { type: Date, default: Date.now },
      },
    ],
    warningCount: { type: Number, default: 0 },
    blockInfo: {
      isBlocked: { type: Boolean, default: false },
      blockedUntil: { type: Date, default: null },
      blockReason: { type: String, default: "" },
      blockedBy: { type: Schema.Types.ObjectId, ref: "User" },
      blockedAt: { type: Date },
    },
    fcmToken: { type: String, default: null },
    activeTheme: { type: Schema.Types.ObjectId, ref: "StoreItem", default: null },
    purchasedThemes: [{ type: Schema.Types.ObjectId, ref: "StoreItem" }],
    token: { type: String, default: null },
    refreshToken: { type: String, default: null },
  },
  {
    timestamps: true,
  },
);

const userModel = model("User", userSchema);
export default userModel;
