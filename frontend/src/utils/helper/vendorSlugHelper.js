// frontend/src/utils/helper/vendorSlugHelper.js

export const generateVendorSlug = (vendor) => {
  if (!vendor || !vendor.id || !vendor.name) {
    if (process.env.NODE_ENV === "development") {
      console.warn("❌ Invalid vendor data for slug generation:", vendor);
    }
    return "unknown-vendor";
  }

  // Clean the vendor name for URL
  const cleanName = vendor.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .substring(0, 50); // Limit length

  // Use the full ID for uniqueness
  const vendorId = vendor.id;

  const slug = `${cleanName}-${vendorId}`;

  if (process.env.NODE_ENV === "development") {
    console.log("🔗 Generated slug:", {
      vendorName: vendor.name,
      vendorId,
      slug,
    });
  }

  return slug;
};

/**
 * Parses slug back to vendor ID
 * Extracts the ID from the end of the slug
 */
export const parseSlugToId = (slug) => {
  if (process.env.NODE_ENV === "development") {
    console.log("🔍 Parsing slug:", slug);
  }

  if (!slug) {
    if (process.env.NODE_ENV === "development") {
      console.error("❌ No slug provided for parsing");
    }
    return null;
  }

  try {
    // Split by last hyphen to separate name from ID
    const parts = slug.split("-");

    if (process.env.NODE_ENV === "development") {
      console.log("📋 Slug parts:", parts);
    }

    // The ID should be the last part
    const potentialId = parts[parts.length - 1];

    if (process.env.NODE_ENV === "development") {
      console.log("🎯 Potential ID:", potentialId);
    }

    // Validate it looks like a MongoDB ID (24 hex chars)
    const isValidId = potentialId && /^[0-9a-fA-F]{24}$/.test(potentialId);

    if (isValidId) {
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Valid vendor ID found:", potentialId);
      }
      return potentialId;
    } else {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "❌ Invalid vendor ID in slug:",
          potentialId,
          "Slug:",
          slug
        );
      }

      // Try alternative parsing: maybe the ID is somewhere else in the slug
      for (let part of parts) {
        if (/^[0-9a-fA-F]{24}$/.test(part)) {
          if (process.env.NODE_ENV === "development") {
            console.log("🔄 Found valid ID in alternative part:", part);
          }
          return part;
        }
      }

      return null;
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("❌ Error parsing vendor slug:", error, "Slug:", slug);
    }
    return null;
  }
};

/**
 * Validates if a slug format is correct
 */
export const isValidVendorSlug = (slug) => {
  const result = !!parseSlugToId(slug);

  if (process.env.NODE_ENV === "development") {
    console.log("🔍 Slug validation result:", { slug, isValid: result });
  }

  return result;
};
