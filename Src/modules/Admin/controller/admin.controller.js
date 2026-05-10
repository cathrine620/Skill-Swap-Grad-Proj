import userModel from "../../../../DB/models/user.model.js";
import reportModel from "../../../../DB/models/report.model.js";
import bookingModel from "../../../../DB/models/booking.model.js";
import trackModel from "../../../../DB/models/track.model.js";
import skillModel from "../../../../DB/models/skill.model.js";
import { asyncHandler } from "../../../../utils/errorHandling.js";

export const getDashboardStats = asyncHandler(async (req, res, next) => {
  const totalUsers = await userModel.countDocuments();
  const activeMentors = await userModel.countDocuments({ role: "Mentor" });

  const exchangedHoursResult = await userModel.aggregate([
    {
      $group: {
        _id: null,
        totalHours: { $sum: "$helpTotalHours" },
      },
    },
  ]);
  const exchangedHours = exchangedHoursResult[0]?.totalHours || 0;
  const totalRevenue = 0;

  return res.status(200).json({
    message: "Dashboard statistics retrieved successfully",
    data: {
      totalUsers,
      activeMentors,
      exchangedHours,
      totalRevenue,
    },
  });
});

export const getRevenueOverview = asyncHandler(async (req, res, next) => {
  const now = new Date();
  const weeks = [];

  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i * 7 + 7));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - i * 7);
    weekEnd.setHours(23, 59, 59, 999);

    weeks.push({
      weekNumber: 4 - i,
      startDate: weekStart,
      endDate: weekEnd,
      revenue: 0,
    });
  }

  return res.status(200).json({
    message: "Revenue overview retrieved successfully",
    data: {
      weeks,
    },
  });
});

export const getUserDistribution = asyncHandler(async (req, res, next) => {
  const distribution = await userModel.aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
      },
    },
  ]);

  const mentors = distribution.find((d) => d._id === "Mentor")?.count || 0;
  const normalUsers = distribution.find((d) => d._id === "Normal")?.count || 0;
  const admins = distribution.find((d) => d._id === "Admin")?.count || 0;

  return res.status(200).json({
    message: "User distribution retrieved successfully",
    data: {
      mentors,
      normalUsers,
      admins,
      total: mentors + normalUsers + admins,
    },
  });
});

export const getAllUsers = asyncHandler(async (req, res, next) => {
  const {
    role,
    search,
    isBlocked,
    sortBy = "rating",
    order = "desc",
    page = 1,
    limit = 10,
  } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { "skills.skillName": { $regex: search, $options: "i" } },
    ];
  }
  if (isBlocked !== undefined) {
    filter["blockInfo.isBlocked"] = isBlocked === "true";
  }

  const sort = {};
  if (sortBy === "rating") {
    sort["profile.reputationScore"] = order === "asc" ? 1 : -1;
  } else if (sortBy === "alphabetical") {
    sort["name"] = order === "asc" ? 1 : -1;
  } else {
    sort[sortBy] = order === "asc" ? 1 : -1;
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.max(1, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    userModel
      .find(filter)
      .select("-password -forgetCode -forgetCodeExpires")
      .collation({ locale: "en", strength: 2 })
      .sort(sort)
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

export const blockUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { days, reason } = req.body;

  if (!days || days < 1) {
    return next(
      new Error("Please provide valid number of days", { cause: 400 }),
    );
  }

  if (!reason || reason.trim() === "") {
    return next(
      new Error("Please provide a reason for blocking", { cause: 400 }),
    );
  }

  const user = await userModel.findById(userId);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  const blockedUntil = new Date();
  blockedUntil.setDate(blockedUntil.getDate() + parseInt(days));

  await userModel.findByIdAndUpdate(userId, {
    blockInfo: {
      isBlocked: true,
      blockedUntil,
      blockReason: reason,
      blockedBy: req.user._id,
      blockedAt: new Date(),
    },
    isActive: false,
  });

  return res.status(200).json({
    message: `User blocked successfully for ${days} day(s)`,
    data: {
      userId: user._id,
      blockedUntil,
      reason,
    },
  });
});

export const unblockUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const user = await userModel.findById(userId);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  await userModel.findByIdAndUpdate(userId, {
    blockInfo: {
      isBlocked: false,
      blockedUntil: null,
      blockReason: "",
      blockedBy: null,
      blockedAt: null,
    },
    isActive: true,
  });

  return res.status(200).json({
    message: "User unblocked successfully",
    data: {
      userId: user._id,
    },
  });
});

export const deleteUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const user = await userModel.findById(userId);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  if (user.role === "Admin") {
    return next(new Error("Cannot delete admin users", { cause: 403 }));
  }

  await userModel.findByIdAndDelete(userId);

  return res.status(200).json({
    message: "User deleted permanently",
    data: {
      userId: userId,
    },
  });
});

export const warnUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { reason } = req.body;

  if (!reason || reason.trim() === "") {
    return next(
      new Error("Please provide a reason for warning", { cause: 400 }),
    );
  }

  const user = await userModel.findById(userId);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  user.warnings.push({
    reason,
    issuedBy: req.user._id,
    issuedAt: new Date(),
  });
  user.warningCount = user.warnings.length;

  if (user.warningCount >= 10) {
    await userModel.findByIdAndUpdate(userId, {
      blockInfo: {
        isBlocked: true,
        blockedUntil: null,
        blockReason: "Exceeded maximum warnings (10)",
        blockedBy: req.user._id,
        blockedAt: new Date(),
      },
      isActive: false,
      warnings: user.warnings,
      warningCount: user.warningCount,
    });

    return res.status(200).json({
      message:
        "Warning issued. User has been automatically blocked due to 10 warnings",
      data: {
        userId: user._id,
        warningCount: user.warningCount,
        isBlocked: true,
      },
    });
  }
  await userModel.findByIdAndUpdate(userId, {
    warnings: user.warnings,
    warningCount: user.warningCount,
  });

  return res.status(200).json({
    message: "Warning issued successfully",
    data: {
      userId: user._id,
      warningCount: user.warningCount,
      remainingWarnings: 10 - user.warningCount,
    },
  });
});

export const getUserWarnings = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const user = await userModel
    .findById(userId)
    .select("warnings warningCount name email")
    .populate("warnings.issuedBy", "name email");

  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  return res.status(200).json({
    message: "User warnings retrieved successfully",
    data: {
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      warningCount: user.warningCount,
      warnings: user.warnings,
    },
  });
});

export const getAllSessions = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, mentorId, userId, search } = req.query;

  const filter = {};
  if (mentorId) filter.instructorId = mentorId;
  if (userId) filter.studentId = userId;

  if (search && search.trim() !== "") {
    const matchingUsers = await userModel
      .find({
        $or: [{ name: { $regex: search, $options: "i" } }],
      })
      .select("_id");

    const userIds = matchingUsers.map((u) => u._id);

    filter.$or = [
      { studentId: { $in: userIds } },
      { instructorId: { $in: userIds } },
      { bookingCode: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const sessions = await bookingModel
    .find(filter)
    .populate("studentId", "name email userImage")
    .populate("instructorId", "name email userImage")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await bookingModel.countDocuments(filter);

  return res.status(200).json({
    message: "Sessions retrieved successfully",
    data: {
      sessions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalSessions: total,
        limit: parseInt(limit),
      },
    },
  });
});

export const getAllPayments = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search } = req.query;

  const filter = { paymentStatus: "paid" };

  if (search && search.trim() !== "") {
    const matchingUsers = await userModel
      .find({
        $or: [{ name: { $regex: search, $options: "i" } }],
      })
      .select("_id");

    const userIds = matchingUsers.map((u) => u._id);
    filter.$or = [
      { studentId: { $in: userIds } },
      { instructorId: { $in: userIds } },
    ];
  }

  const skip = (page - 1) * limit;
  const payments = await bookingModel
    .find(filter)
    .populate("studentId", "name email userImage")
    .populate("instructorId", "name email userImage")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await bookingModel.countDocuments(filter);

  const revenueResult = await bookingModel.aggregate([
    { $match: { paymentStatus: "paid" } },
    { $group: { _id: null, total: { $sum: "$price" } } },
  ]);

  return res.status(200).json({
    message: "Payments retrieved successfully",
    data: {
      payments,
      totalRevenue: revenueResult[0]?.total || 0,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPayments: total,
        limit: parseInt(limit),
      },
    },
  });
});

export const getAllReports = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search } = req.query;

  const filter = {};
  if (search && search.trim() !== "") {
    const matchingUsers = await userModel
      .find({
        $or: [{ name: { $regex: search, $options: "i" } }],
      })
      .select("_id");

    const userIds = matchingUsers.map((u) => u._id);
    filter.$or = [
      { reportedUser: { $in: userIds } },
      { reportedBy: { $in: userIds } },
      { reason: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const reports = await reportModel
    .find(filter)
    .populate("reportedBy", "name email userImage")
    .populate("reportedUser", "name email userImage blockInfo")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await reportModel.countDocuments(filter);

  return res.status(200).json({
    message: "Reports retrieved successfully",
    data: {
      reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReports: total,
        limit: parseInt(limit),
      },
    },
  });
});

export const increaseFreeHours = asyncHandler(async (req, res, next) => {
  const { freeHours } = req.body;
  const userId = req.body.userId || (req.user ? req.user._id : null);

  if (!userId) return next(new Error("User ID is missing", { cause: 400 }));

  const user = await userModel.findById(userId);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  user.freeHours += parseInt(freeHours);
  await user.save();

  return res.status(200).json({
    message: "Free hours increased successfully",
    data: {
      userId: user._id,
      freeHours: user.freeHours,
    },
  });
});

export const addChallenge = asyncHandler(async (req, res, next) => {
  const { id, challenge } = req.body;

  const user = await userModel.findById(id);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  if (user.challenges.includes(challenge)) {
    return res.status(200).json({
      message: "Challenge already completed",
      challenges: user.challenges,
    });
  }

  user.challenges.push(challenge);
  await user.save();

  return res.status(200).json({
    message: "Challenge added successfully",
    challenges: user.challenges,
  });
});

export const updateScore = asyncHandler(async (req, res, next) => {
  const { score } = req.body;
  const userId = req.body.id || (req.user ? req.user._id : null);

  if (!userId) return next(new Error("User ID is missing", { cause: 400 }));

  const user = await userModel.findById(userId);
  if (!user) return next(new Error("User not found", { cause: 404 }));

  user.totalScore += Number(score);
  user.score = Number(score);
  await user.save();

  return res.status(200).json({
    message: "Score updated successfully",
    totalScore: user.totalScore,
    score: user.score,
  });
});

export const checkChallenge = asyncHandler(async (req, res, next) => {
  const { iduser, challengeName } = req.body;

  const user = await userModel.findById(iduser);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  const exists = user.challenges.includes(challengeName);

  return res.status(200).json({
    message: exists ? "Challenge found" : "Challenge not found",
    exists: exists,
  });
});

export const updatePoints = asyncHandler(async (req, res, next) => {
  const { points } = req.body;
  const userId = req.body.id || (req.user ? req.user._id : null);

  if (!userId) return next(new Error("User ID is missing", { cause: 400 }));

  const user = await userModel.findById(userId);
  if (!user) return next(new Error("User not found", { cause: 404 }));

  user.points = (user.points || 0) + Number(points);
  await user.save();

  return res.status(200).json({
    message: "Points updated successfully",
    points: user.points,
  });
});

export const createTrack = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const existingTrack = await trackModel.findOne({ slug });
  if (existingTrack) {
    return next(new Error("Track already exists", { cause: 409 }));
  }

  const track = await trackModel.create({
    name,
    slug,
    description: description || "",
  });

  return res.status(201).json({
    message: "Track created successfully",
    track,
  });
});

export const updateTrack = asyncHandler(async (req, res, next) => {
  const { trackId } = req.params;
  const { name, description } = req.body;

  const track = await trackModel.findById(trackId);
  if (!track) {
    return next(new Error("Track not found", { cause: 404 }));
  }

  if (name) {
    track.name = name;
    track.slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  if (description !== undefined) track.description = description;

  await track.save();

  return res.status(200).json({
    message: "Track updated successfully",
    track,
  });
});

export const deleteTrack = asyncHandler(async (req, res, next) => {
  const { trackId } = req.params;

  const track = await trackModel.findById(trackId);
  if (!track) {
    return next(new Error("Track not found", { cause: 404 }));
  }

  const userCount = await userModel.countDocuments({ track: trackId });

  if (userCount > 0) {
    const users = await userModel
      .find({ track: trackId })
      .select("name role")
      .limit(5);
    const userNames = users.map((u) => `${u.name} (${u.role})`).join(", ");

    return next(
      new Error(
        `Cannot delete track: there are ${userCount} users associated with it: [${userNames}${userCount > 5 ? "..." : ""}]`,
        { cause: 400 },
      ),
    );
  }

  await skillModel.deleteMany({ track: trackId });
  await trackModel.findByIdAndDelete(trackId);

  return res.status(200).json({
    message: "Track and its associated skills deleted successfully",
    trackId,
  });
});

export const getTracks = asyncHandler(async (req, res, next) => {
  const tracks = await trackModel.find().lean();

  const tracksWithDetails = await Promise.all(
    tracks.map(async (track) => {
      const mentorCount = await userModel.countDocuments({
        track: track._id,
        role: "Mentor",
      });
      const studentCount = await userModel.countDocuments({
        track: track._id,
        role: "Normal",
      });
      const skills = await skillModel.find({ track: track._id });
      return {
        ...track,
        mentorCount,
        studentCount,
        skills,
      };
    }),
  );

  return res.status(200).json({
    message: "Tracks retrieved successfully",
    data: tracksWithDetails,
  });
});

export const addSkill = asyncHandler(async (req, res, next) => {
  const { name, trackId } = req.body;

  const track = await trackModel.findById(trackId);
  if (!track) return next(new Error("Track not found", { cause: 404 }));

  const skill = await skillModel.create({ name, track: trackId });
  return res.status(201).json({
    message: "Skill added successfully",
    skill,
  });
});

export const updateSkill = asyncHandler(async (req, res, next) => {
  const { skillId } = req.params;
  const { name, trackId } = req.body;

  const skill = await skillModel.findById(skillId);
  if (!skill) return next(new Error("Skill not found", { cause: 404 }));

  if (name) skill.name = name;
  if (trackId) {
    const track = await trackModel.findById(trackId);
    if (!track) return next(new Error("Track not found", { cause: 404 }));
    skill.track = trackId;
  }

  await skill.save();
  return res.status(200).json({
    message: "Skill updated successfully",
    skill,
  });
});

export const deleteSkill = asyncHandler(async (req, res, next) => {
  const { skillId } = req.params;

  const skill = await skillModel.findByIdAndDelete(skillId);
  if (!skill) return next(new Error("Skill not found", { cause: 404 }));

  return res.status(200).json({
    message: "Skill deleted successfully",
    skillId,
  });
});

export const getAllSkills = asyncHandler(async (req, res, next) => {
  const { trackId } = req.query;
  const filter = {};
  if (trackId) filter.track = trackId;

  const skills = await skillModel.find(filter).populate("track", "name");

  return res.status(200).json({
    message: "Skills retrieved successfully",
    data: skills,
  });
});

export const updateUserRole = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { role } = req.body;

  const validRoles = ["Normal", "Mentor", "Admin"];
  if (!validRoles.includes(role)) {
    return next(new Error("Invalid role specified", { cause: 400 }));
  }

  const user = await userModel.findById(userId);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  if (userId === req.user._id.toString()) {
    return next(new Error("You cannot change your own role", { cause: 400 }));
  }

  user.role = role;
  await user.save();

  return res.status(200).json({
    message: `User role updated to ${role} successfully`,
    data: { userId, role },
  });
});
