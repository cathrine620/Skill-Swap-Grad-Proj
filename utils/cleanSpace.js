export const trimStringsInObject = (obj) => {
  if (!obj || typeof obj !== "object") return obj;

  const trimmed = {};
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === "string") {
      trimmed[key] = value.trim();
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      trimmed[key] = trimStringsInObject(value);
    } else {
      trimmed[key] = value;
    }
  }
  return trimmed;
};
