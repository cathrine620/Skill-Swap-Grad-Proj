import { asyncHandler } from "../../../../utils/errorHandling.js";
import sendEmail from "../../../../utils/email.js";
import { hash, compare } from "../../../../utils/HashAndCompare.js";
import userModel from "../../../../DB/models/user.model.js";
import trackModel from "../../../../DB/models/track.model.js";
import skillModel from "../../../../DB/models/skill.model.js";
import {
  generateToken,
  verifyToken,
} from "../../../../utils/GenerateAndVerifyToken.js";
import {
  sendForgetCodeTemplate,
  sendActivationCodeTemplate,
} from "../../../../utils/emailTemplates.js";
import { customAlphabet } from "nanoid";

export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;

  if (await userModel.findOne({ email: email.toLowerCase() })) {
    return next(new Error("Email is Already Exist", { cause: 409 }));
  }

  const nanoId = customAlphabet("123456789", 4);
  const activationCode = nanoId();
  const activationCodeExpires = Date.now() + 15 * 60 * 1000;

  const html = sendActivationCodeTemplate(name, activationCode);

  if (!(await sendEmail({ to: email, subject: "Activation Code", html }))) {
    return next(new Error("Send Email Error"), { cause: 400 });
  }

  const hashPassword = hash({ plaintext: password });

  const createUser = await userModel.create({
    name,
    email,
    password: hashPassword,
    activationCode,
    activationCodeExpires,
  });
  return res.status(201).json({
    message:
      "User Registered Successfully. Please check you email for activation code",
    flag: true,
    userId: createUser._id,
  });
});

export const verifyActivationCode = asyncHandler(async (req, res, next) => {
  const { email, activationCode } = req.body;

  const user = await userModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    return next(new Error("Not Register Account"), { cause: 404 });
  }

  if (user.confirmEmail) {
    return res
      .status(200)
      .json({ message: "Account already verified", flag: true });
  }

  if (user.activationCode !== activationCode) {
    return next(new Error("Invalid Activation Code"), { cause: 400 });
  }

  if (user.activationCodeExpires < Date.now()) {
    return next(new Error("Activation Code Expired"), { cause: 400 });
  }

  user.confirmEmail = true;
  user.activationCode = null;
  user.activationCodeExpires = null;
  await user.save();

  return res.status(200).json({
    message: "Account Activated Successfully. You can now login.",
    flag: true,
  });
});

export const resendActivationCode = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await userModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    return next(new Error("Not Register Account"), { cause: 404 });
  }
  if (user.confirmEmail) {
    return res
      .status(200)
      .json({ message: "Account already verified", flag: true });
  }

  const nanoId = customAlphabet("123456789", 4);
  const activationCode = nanoId();
  const activationCodeExpires = Date.now() + 15 * 60 * 1000;

  user.activationCode = activationCode;
  user.activationCodeExpires = activationCodeExpires;
  await user.save();

  const html = sendActivationCodeTemplate(user.name, activationCode);
  if (
    !(await sendEmail({
      to: email,
      subject: "Resend Activation Code",
      html,
    }))
  ) {
    return next(new Error("Send Email Error"), { cause: 400 });
  }

  return res.status(200).json({
    message: "Activation Code Resent Successfully",
    flag: true,
  });
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await userModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    return next(new Error("Not Register Account"), { cause: 404 });
  }

  if (!user.confirmEmail) {
    return next(new Error("Confirm You Email First"), { cause: 400 });
  }

  if (!compare({ plaintext: password, hashValue: user.password })) {
    return next(new Error("Invalid Login Data"), { cause: 400 });
  }

  const access_token = generateToken({
    payload: {
      id: user._id,
      role: user.role,
      userName: user.userName,
      email: user.email,
      phone: user.phone,
      address: user.address,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    expiresIn: 60 * 60 * 24,
  });

  const refresh_token = generateToken({
    payload: {
      id: user._id,
      role: user.role,
      userName: user.userName,
    },
    expiresIn: 60 * 60 * 24 * 365,
  });

  user.isActive = true;
  user.token = access_token;
  user.refreshToken = refresh_token;
  await user.save();

  return res.status(200).json({
    message: "User Login Successfully",
    flag: true,
    access_token,
    refresh_token,
    id: user._id,
    userName: user.userName,
    role: user.role,
  });
});

export const logout = asyncHandler(async (req, res, next) => {
  const { _id } = req.user;
  const user = await userModel.findByIdAndUpdate(
    _id,
    { isActive: false, token: null, refreshToken: null },
    { new: true },
  );
  if (!user) {
    return next(new Error("User not found"), { cause: 404 });
  }
  return res.status(200).json({ message: "User Logout Successfully" });
});

export const sendForgotPasswordCode = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const nanoId = customAlphabet("123456789", 6);
  const forgetCode = nanoId();
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const user = await userModel.findOneAndUpdate(
    { email: email.toLowerCase() },
    { forgetCode, forgetCodeExpires: expiresAt },
    { new: true },
  );
  if (!user) {
    return next(new Error("Not Register Account"), { cause: 404 });
  }
  const html = sendForgetCodeTemplate(user.name, forgetCode);
  if (!(await sendEmail({ to: email, subject: "Forget Password", html }))) {
    return next(new Error("Send Email Error"), { cause: 400 });
  }
  return res
    .status(200)
    .json({ message: "Verification Code Sent Successfully", flag: true });
});

export const verifyForgotPasswordCode = asyncHandler(async (req, res, next) => {
  const { email, forgetCode } = req.body;

  const user = await userModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    return next(new Error("Not Register Account"), { cause: 404 });
  }
  if (user.forgetCode != forgetCode) {
    return next(new Error("Invalid Reset Code"), { cause: 400 });
  }

  if (user.forgetCodeExpires < Date.now()) {
    return next(new Error("Reset Code Expired"), { cause: 400 });
  }

  return res
    .status(200)
    .json({ message: "Code Verified Successfully", flag: true });
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, forgetCode, password } = req.body;

  const user = await userModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    return next(new Error("Not Register Account"), { cause: 404 });
  }
  if (user.forgetCode != forgetCode) {
    return next(new Error("Invalid Reset Code"), { cause: 400 });
  }

  if (user.forgetCodeExpires < Date.now()) {
    return next(new Error("Reset Code Expired"), { cause: 400 });
  }

  const match = compare({ plaintext: password, hashValue: user.password });
  if (match) {
    return next(new Error("New Password cannot be the same as the old one"), {
      cause: 409,
    });
  }

  user.password = hash({ plaintext: password });
  user.forgetCode = null;
  user.forgetCodeExpires = null;
  user.changePasswordTime = Date.now();
  await user.save();
  return res
    .status(200)
    .json({ message: "Password Changed Successfully", flag: true });
});

export const completeProfile = asyncHandler(async (req, res, next) => {
  const { track, skills, userId } = req.body;

  let trackId = null;
  if (track) {
    if (track.match(/^[0-9a-fA-F]{24}$/)) {
      trackId = track;
    } else {
      const trackDoc = await trackModel.findOne({ slug: track.toLowerCase() });
      if (!trackDoc) {
        return next(new Error(`Track not found: ${track}`, { cause: 404 }));
      }
      trackId = trackDoc._id;
    }
  }

  const user = await userModel.findByIdAndUpdate(
    userId,
    { track: trackId, skills },
    { new: true },
  );

  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  return res.status(200).json({
    message: "Profile Completed Successfully",
    flag: true,
  });
});

/**
 * @desc    Get all tracks (public)
 * @route   GET /auth/tracks
 * @access  Public (no authentication required)
 */
export const getAllTracks = asyncHandler(async (req, res, next) => {
  const tracks = await trackModel.find().lean();

  const tracksWithSkills = await Promise.all(
    tracks.map(async (track) => {
      const skills = await skillModel.find({ track: track._id });
      return {
        ...track,
        skills,
      };
    }),
  );

  return res.status(200).json({
    message: "Tracks retrieved successfully",
    tracks: tracksWithSkills,
  });
});
