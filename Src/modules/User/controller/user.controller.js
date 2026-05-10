import userModel from "../../../../DB/models/user.model.js";
import trackModel from "../../../../DB/models/track.model.js";
import bookingModel from "../../../../DB/models/booking.model.js";
import messageModel from "../../../../DB/models/message.model.js";
import purchaseModel from "../../../../DB/models/purchase.model.js";
import availabilityModel from "../../../../DB/models/availability.model.js";
import reportModel from "../../../../DB/models/report.model.js";
import chatModel from "../../../../DB/models/chat.model.js";
import { asyncHandler } from "../../../../utils/errorHandling.js";
import { compare, hash } from "../../../../utils/HashAndCompare.js";
import cloudinary from "../../../../utils/cloudinary.js";
import { triggerPusher } from "../../../../utils/pusher.js";

export const getProfile = asyncHandler(async (req, res, next) => {
  const { id } = req.query;
  const _id = id ? id : req.user._id;

  const user = await userModel
    .findById(_id)
    .select(
      "-password -forgetCode -forgetCodeExpires -confirmEmail -changePasswordTime",
    )
    .populate("track", "name slug")
    .populate("reviews.reviewer", "name userImage role")
    .populate("purchasedThemes", "title value img")
    .populate("activeTheme", "title value img");
  if (!user) {
    return next(new Error("User not found"), { cause: 404 });
  }
  return res
    .status(200)
    .json({ message: "Profile retrieved successfully", user });
});

export const getAllUsers = asyncHandler(async (req, res, next) => {
  const {
    role,
    track,
    minRating,
    maxRating,
    minPrice,
    maxPrice,
    name,
    search,
    sort,
    page = 1,
    limit = 100,
  } = req.query;

  const filter = {};

  if (role) {
    const normalizedRole =
      role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    if (["Normal", "Mentor", "Admin"].includes(normalizedRole)) {
      filter.role = normalizedRole;
    }
  }

  if (track) {
    const foundTrack = await trackModel.findOne({
      $or: [
        { slug: track.toLowerCase() },
        { name: { $regex: `^${track}$`, $options: "i" } },
      ],
    });
    if (foundTrack) {
      filter.track = foundTrack._id;
    } else {
      return res.status(200).json({
        message: "Users retrieved successfully",
        data: {
          users: [],
          total: 0,
          page: Number(page),
          limit: Number(limit),
          totalPages: 0,
        },
      });
    }
  }

  if (minRating || maxRating) {
    filter.rate = {};
    if (minRating) filter.rate.$gte = Number(minRating);
    if (maxRating) filter.rate.$lte = Number(maxRating);
  }

  if (minPrice || maxPrice) {
    filter.hourlyPrice = {};
    if (minPrice) filter.hourlyPrice.$gte = Number(minPrice);
    if (maxPrice) filter.hourlyPrice.$lte = Number(maxPrice);
  }

  if (name) {
    filter.name = { $regex: name, $options: "i" };
  }

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  let sortCriteria = {};
  switch (sort) {
    case "rate_desc":
      sortCriteria = { rate: -1 };
      break;
    case "rate_asc":
      sortCriteria = { rate: 1 };
      break;
    case "name_asc":
      sortCriteria = { name: 1 };
      break;
    case "name_desc":
      sortCriteria = { name: -1 };
      break;
    default:
      sortCriteria = { createdAt: -1 };
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(Math.max(1, Number(limit)), 100);
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    userModel
      .find(filter)
      .select(
        "-password -forgetCode -forgetCodeExpires -confirmEmail -changePasswordTime",
      )
      .populate("track", "name slug")
      .populate("reviews.reviewer", "name userImage role")
      .collation({ locale: "en", strength: 3, caseFirst: "upper" })
      .sort(sortCriteria)
      .skip(skip)
      .limit(limitNum),
    userModel.countDocuments(filter),
  ]);

  return res.status(200).json({
    message: "Users retrieved successfully",
    data: {
      users,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

export const changePassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  const { _id } = req.user;
  const user = await userModel.findById(_id);
  if (!user) {
    return next(new Error("User not found"), { cause: 404 });
  }

  const match = compare({ plaintext: oldPassword, hashValue: user.password });
  if (!match) {
    return next(new Error("Invalid old password"), { cause: 400 });
  }
  if (compare({ plaintext: newPassword, hashValue: user.password })) {
    return next(new Error("New password is the same as old password"), {
      cause: 400,
    });
  }
  const hashPassword = hash({ plaintext: newPassword });
  user.password = hashPassword;
  user.changePasswordTime = Date.now();
  await user.save();

  return res.status(200).json({ message: "Password changed successfully" });
});

export const updateProfile = asyncHandler(async (req, res, next) => {
  const { _id } = req.user;
  const { name, profile, skills } = req.body;

  const user = await userModel.findById(_id);
  if (!user) {
    return next(new Error("User not found"), { cause: 404 });
  }

  if (name) user.name = name;
  if (profile) {
    if (profile.bio) user.profile.bio = profile.bio;
    if (profile.skillSummary) user.profile.skillSummary = profile.skillSummary;
    if (profile.location) user.profile.location = profile.location;
    user.profile.lastUpdated = Date.now();
  }
  if (user.skills.length > 0 && skills) {
    const isExistSkill = user.skills.some((skill) =>
      skills
        .map((skill) => skill.skillName.toLowerCase())
        .includes(skill.skillName.toLowerCase()),
    );
    if (isExistSkill) {
      return next(new Error("Skill already exists"), { cause: 400 });
    }
    user.skills.push(...skills);
  }

  if (skills && user.skills.length === 0) {
    user.skills = skills;
  }
  if (req.file) {
    if (user?.userImage?.public_id) {
      await cloudinary.uploader.destroy(user.userImage.public_id);
    }
    const { secure_url, public_id } = await cloudinary.uploader.upload(
      req.file.path,
      { folder: `skillswap/Users/${user._id}` },
    );
    user.userImage = { secure_url, public_id };
  }

  await user.save();

  return res
    .status(200)
    .json({ message: "Profile updated successfully", user });
});

export const deleteUser = asyncHandler(async (req, res, next) => {
  const { _id } = req.user;

  const user = await userModel.findById(_id);
  if (!user) return next(new Error("User not found", { cause: 404 }));

  if (user.userImage?.public_id) {
    await cloudinary.uploader.destroy(user.userImage.public_id);
  }

  const usersWithReviews = await userModel.find({ "reviews.reviewer": _id });
  const updateReviewPromises = usersWithReviews.map(async (affectedUser) => {
    affectedUser.reviews = affectedUser.reviews.filter(
      (rev) => rev.reviewer && rev.reviewer.toString() !== _id.toString(),
    );
    affectedUser.numberOfReviews = affectedUser.reviews.length;
    if (affectedUser.numberOfReviews > 0) {
      const sum = affectedUser.reviews.reduce(
        (acc, rev) => acc + rev.rating,
        0,
      );
      affectedUser.rate = sum / affectedUser.numberOfReviews;
    } else {
      affectedUser.rate = 0;
    }
    return affectedUser.save();
  });

  await Promise.all([
    ...updateReviewPromises,
    bookingModel.deleteMany({
      $or: [{ studentId: _id }, { instructorId: _id }],
    }),
    messageModel.deleteMany({ senderId: _id }),
    purchaseModel.deleteMany({ userId: _id }),
    availabilityModel.deleteMany({ instructorId: _id }),
    reportModel.deleteMany({
      $or: [{ reportedBy: _id }, { reportedUser: _id }],
    }),
    trackModel.updateMany({ users: _id }, { $pull: { users: _id } }),
    chatModel.updateMany(
      { participants: _id },
      { $pull: { participants: _id } },
    ),
    chatModel.deleteMany({ type: "private", participants: _id }),
    userModel.findByIdAndDelete(_id),
  ]);

  return res
    .status(200)
    .json({ message: "User and all related data deleted successfully" });
});

export const requestMentor = asyncHandler(async (req, res, next) => {
  const { hourlyPrice } = req.body;
  const { _id } = req.user;
  const user = await userModel.findById(_id);
  if (!user) {
    return next(new Error("User not found"), { cause: 404 });
  }
  if (user.helpTotalHours < 100) {
    return next(
      new Error("You need to help at least 100 hours to request a mentor"),
      { cause: 400 },
    );
  }
  if (user.role === "Mentor") {
    return next(new Error("You're already a mentor"), { cause: 400 });
  }
  if (user.skills.length === 0) {
    return next(new Error("You need to add at least one skill"), {
      cause: 400,
    });
  }
  const isVerifiedSkills = user.skills.every((skill) => skill.isVerified);
  if (!isVerifiedSkills) {
    return next(
      new Error("You need to verify at all skills to request a mentor"),
      { cause: 400 },
    );
  }

  user.hourlyPrice = 30;
  user.role = "Mentor";
  await user.save();
  return res.status(200).json({ message: "You're now a mentor", user });
});

export const verifySkillQuiz = asyncHandler(async (req, res, next) => {
  const { skillName, quizScore } = req.body;
  const userId = req.user._id;

  const user = await userModel.findById(userId);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  const skillIndex = user.skills.findIndex(
    (s) => s.skillName.toLowerCase() === skillName.toLowerCase(),
  );

  if (skillIndex === -1) {
    return next(new Error("Skill not found for this user", { cause: 404 }));
  }

  user.skills[skillIndex].quizScore = quizScore;
  if (quizScore >= 85) {
    user.skills[skillIndex].isVerified = true;
  }

  await user.save();

  return res.status(200).json({
    message: "Quiz score processed successfully",
    skill: user.skills[skillIndex],
  });
});

export const getUserPoints = asyncHandler(async (req, res, next) => {
  const _id = req.body.id || req.user._id;
  const user = await userModel
    .findById(_id)
    .select("points totalScore score helpTotalHours");
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }
  return res.status(200).json({
    message: "Points retrieved successfully",
    points: user.points || 0,
    totalScore: user.totalScore || 0,
    score: user.score || 0,
    helpTotalHours: user.helpTotalHours || 0,
  });
});

export const selectTheme = asyncHandler(async (req, res, next) => {
  let { themeId } = req.body;
  if (themeId === undefined && req.body !== undefined) {
    themeId = req.body;
  }
  const userId = req.user._id;

  const user = await userModel.findById(userId);
  if (!user) return next(new Error("User not found", { cause: 404 }));

  if (themeId && themeId !== "") {
    const isOwned = user.purchasedThemes.some(
      (id) => id.toString() === themeId.toString(),
    );
    if (!isOwned) {
      return next(
        new Error("You do not own this theme. Please purchase it first.", {
          cause: 403,
        }),
      );
    }
  }

  user.activeTheme = themeId === "" ? null : themeId;
  await user.save();

  const updatedUser = await userModel
    .findById(userId)
    .populate("activeTheme", "title value img");
  await triggerPusher(`user-${userId}`, "theme-updated", {
    activeTheme: updatedUser.activeTheme,
  });

  return res
    .status(200)
    .json({ message: "Theme activated successfully", activeTheme: themeId });
});

export const getTopScorers = asyncHandler(async (req, res, next) => {
  const topUsers = await userModel
    .find({})
    .sort({ totalScore: -1 })
    .limit(3)
    .select("name totalScore");

  return res.status(200).json({
    message: "Top 3 users retrieved successfully",
    data: topUsers,
  });
});
