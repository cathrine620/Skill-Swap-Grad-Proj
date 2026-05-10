import reportModel from "../../../../DB/models/report.model.js";
import { asyncHandler } from "../../../../utils/errorHandling.js";
import userModel from "../../../../DB/models/user.model.js";

export const createReport = asyncHandler(async (req, res, next) => {
  const { reason, reportedUser } = req.body;

  const userExists = await userModel.findById(reportedUser);
  if (!userExists) {
    return next(new Error("Reported user not found", { cause: 404 }));
  }

  if (reportedUser.toString() === req.user._id.toString()) {
    return next(new Error("You cannot report yourself", { cause: 400 }));
  }

  const report = await reportModel.create({
    reason,
    reportedUser,
    reportedBy: req.user._id,
    date: new Date(),
  });

  await userModel.findByIdAndUpdate(reportedUser, {
    $push: { reports: report._id },
  });

  return res
    .status(201)
    .json({ message: "Report created successfully", report });
});

export const getAllReports = asyncHandler(async (req, res, next) => {
  const reports = await reportModel
    .find()
    .populate("reportedBy", "name email")
    .populate("reportedUser", "name email");
  return res
    .status(200)
    .json({ message: "Reports retrieved successfully", reports });
});

export const getReport = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const report = await reportModel
    .findById(id)
    .populate("reportedBy", "name email")
    .populate("reportedUser", "name email");

  if (!report) {
    return next(new Error("Report not found", { cause: 404 }));
  }

  return res
    .status(200)
    .json({ message: "Report retrieved successfully", report });
});

export const updateReport = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;

  const report = await reportModel.findByIdAndUpdate(
    id,
    { reason },
    { new: true },
  );

  if (!report) {
    return next(new Error("Report not found", { cause: 404 }));
  }

  return res
    .status(200)
    .json({ message: "Report updated successfully", report });
});

export const deleteReport = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const report = await reportModel.findByIdAndDelete(id);

  if (!report) {
    return next(new Error("Report not found", { cause: 404 }));
  }

  await userModel.findByIdAndUpdate(report.reportedUser, {
    $pull: { reports: id },
  });

  return res.status(200).json({ message: "Report deleted successfully" });
});
