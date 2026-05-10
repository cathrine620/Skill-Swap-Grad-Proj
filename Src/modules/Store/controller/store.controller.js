import storeModel from "../../../../DB/models/store.model.js";
import purchaseModel from "../../../../DB/models/purchase.model.js";
import userModel from "../../../../DB/models/user.model.js";
import { asyncHandler } from "../../../../utils/errorHandling.js";
import cloudinary from "../../../../utils/cloudinary.js";

export const addStoreItem = asyncHandler(async (req, res, next) => {
  const { title, type, priceInPoints, value, validityDays, isActive } = req.body;
  let img = undefined;

  if (req.file) {
    const { secure_url, public_id } = await cloudinary.uploader.upload(
      req.file.path,
      { folder: `skillswap/Store` }
    );
    img = { secure_url, public_id };
  }

  const item = await storeModel.create({
    title,
    type,
    priceInPoints,
    value,
    validityDays,
    isActive,
    img: img || { secure_url: "", public_id: null }
  });
  return res.status(201).json({ message: "Store item created successfully", item });
});

export const getStoreItems = asyncHandler(async (req, res, next) => {
  const query = req.user.role === "Admin" ? {} : { isActive: true };
  let items = await storeModel.find(query).lean();

  if (req.user.role !== "Admin") {
    const userPurchases = await purchaseModel.find({ userId: req.user._id });

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyPurchasedItemIds = userPurchases
      .filter((p) => p.createdAt >= oneWeekAgo)
      .map((p) => p.itemId.toString());

    const everPurchasedItemIds = userPurchases.map((p) => p.itemId.toString());

    items = items.map((item) => {
      const itemIdStr = item._id.toString();
      let isLocked = false;
      let lockReason = "";

      if (item.type === "theme") {
        if (everPurchasedItemIds.includes(itemIdStr)) {
          isLocked = true;
          lockReason = "You already own this theme.";
        }
      } else if (item.type === "voucher" || item.type === "hours") {
        if (weeklyPurchasedItemIds.includes(itemIdStr)) {
          isLocked = true;
          lockReason = `You can only purchase this ${item.type} once per week.`;
        }
      }

      return {
        ...item,
        isLocked,
        locked: isLocked,
        lockReason,
      };
    });
  } else {
    items = items.map((item) => ({
      ...item,
      isLocked: false,
      locked: false,
    }));
  }

  return res
    .status(200)
    .json({ message: "Store items retrieved successfully", items });
});

export const getUserPurchases = asyncHandler(async (req, res, next) => {
  const purchases = await purchaseModel
    .find({ userId: req.user._id })
    .populate("itemId")
    .sort({ createdAt: -1 });

  return res.status(200).json({ message: "Purchase history retrieved successfully", purchases });
});

export const purchaseItem = asyncHandler(async (req, res, next) => {
  const { itemId } = req.body;
  const userId = req.user._id;

  const item = await storeModel.findById(itemId);
  if (!item) {
    return next(new Error("Store item not found", { cause: 404 }));
  }

  if (!item.isActive) {
    return next(new Error("This item is currently unavailable", { cause: 400 }));
  }

  const user = await userModel.findById(userId);
  if (user.points < item.priceInPoints) {
    return next(new Error("Insufficient points to purchase this item", { cause: 400 }));
  }

  if (item.type === "voucher" || item.type === "hours") {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentPurchase = await purchaseModel.findOne({
      userId,
      itemId,
      createdAt: { $gte: oneWeekAgo },
    });

    if (recentPurchase) {
      return next(new Error(`You can only purchase this ${item.type} once per week.`, { cause: 400 }));
    }
  }

  if (item.type === "theme") {
    const alreadyOwned = await purchaseModel.findOne({ userId, itemId });
    if (alreadyOwned) {
      return next(new Error("You already own this theme.", { cause: 400 }));
    }
  }

  let validUntil = null;
  if (item.validityDays) {
    validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + item.validityDays);
  }

  const purchase = await purchaseModel.create({
    userId,
    itemId,
    type: item.type,
    pointsPaid: item.priceInPoints,
    validUntil
  });

  user.points -= item.priceInPoints;

  if (item.type === "hours") {
    user.freeHours += parseInt(item.value);
  } else if (item.type === "theme") {
    user.activeTheme = item._id;
    if (!user.purchasedThemes.includes(item._id)) {
      user.purchasedThemes.push(item._id);
    }
  }

  await user.save();

  return res.status(200).json({
    message: "Item purchased successfully",
    purchase,
    remainingPoints: user.points
  });
});

export const updateStoreItem = asyncHandler(async (req, res, next) => {
  const { itemId } = req.params;
  const { title, type, priceInPoints, value, validityDays, isActive } = req.body;

  const item = await storeModel.findById(itemId);
  if (!item) {
    return next(new Error("Store item not found", { cause: 404 }));
  }

  if (title) item.title = title;
  if (type) item.type = type;
  if (priceInPoints !== undefined) item.priceInPoints = priceInPoints;
  if (value) item.value = value;
  if (validityDays !== undefined) item.validityDays = validityDays;
  if (isActive !== undefined) item.isActive = isActive;

  if (req.file) {
    if (item.img && item.img.public_id) {
      await cloudinary.uploader.destroy(item.img.public_id);
    }
    const { secure_url, public_id } = await cloudinary.uploader.upload(
      req.file.path,
      { folder: `skillswap/Store` }
    );
    item.img = { secure_url, public_id };
  }

  await item.save();
  return res.status(200).json({ message: "Store item updated successfully", item });
});

export const deleteStoreItem = asyncHandler(async (req, res, next) => {
  const { itemId } = req.params;

  const item = await storeModel.findById(itemId);
  if (!item) {
    return next(new Error("Store item not found", { cause: 404 }));
  }

  if (item.img && item.img.public_id) {
    const cloudinary = (await import("../../../../utils/cloudinary.js")).default;
    await cloudinary.uploader.destroy(item.img.public_id);
  }

  await storeModel.findByIdAndDelete(itemId);
  return res.status(200).json({ message: "Store item deleted successfully" });
});
