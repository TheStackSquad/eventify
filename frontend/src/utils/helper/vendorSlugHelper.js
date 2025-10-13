//frontend/src/utils/helpers/vendorSlugHelper.js


// Function to convert a string into a URL-friendly slug
const toKebabCase = (str) => {
	return str
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "") // Remove all non-word chars except space and hyphen
		.replace(/[\s_-]+/g, "-") // Replace spaces and repeated hyphens with a single hyphen
		.replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};

export const generateVendorSlug = (vendor) => {
	if (!vendor || !vendor.id || !vendor.name || !vendor.city || !vendor.state) {
		console.error("Invalid vendor object provided for slug generation:", vendor);
		return `vendor-error-${new Date().getTime()}`;
	}

	const nameSlug = toKebabCase(vendor.name);
	const citySlug = toKebabCase(vendor.city || "");
	const stateSlug = toKebabCase(vendor.state || "");

	// Create a concise, readable slug segment
	const readableSlug = [nameSlug, citySlug, stateSlug].filter(Boolean).join("-");

	// Append the unique MongoDB ID to the end for reliable lookup
	return `${readableSlug}-${vendor.id}`;
};


export const parseSlugToId = (slug) => {
  if (!slug || typeof slug !== "string") {
    return null;
  }

  const segments = slug.split("-");

  // The ID is a 24-character hexadecimal string. We can perform a basic length check.
  const uniqueId = segments[segments.length - 1];

  // Optional: Add more robust ID validation (e.g., regex for 24 hex characters)
  if (uniqueId && uniqueId.length === 24) {
    return uniqueId;
  }

  return null;
};