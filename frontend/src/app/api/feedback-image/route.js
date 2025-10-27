// frontend/src/app/api/feedback-image/route.
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file"); // Key must match client-side append

    if (!file || (typeof file === "object" && file.size === 0)) {
      // Allow submission without an image (size 0 check for safety)
      return NextResponse.json({ url: "" }, { status: 200 });
    }

    // Safety check for file-like object
    if (typeof file === "string" || !file.name) {
      return NextResponse.json(
        { error: "No valid image file provided." },
        { status: 400 }
      );
    }

    // Max file size check (5MB) - server-side check is crucial
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image size exceeds 5MB limit." },
        { status: 413 }
      );
    }

    const contentType = file.type;
    const filename = file.name;

    // Upload to Vercel Blob storage
    const blob = await put(`feedback-images/${filename}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: contentType,
    });

    // Return the public URL
    return NextResponse.json(
      { url: blob.url, filename: blob.pathname },
      { status: 200 }
    );
  } catch (error) {
    console.error("Feedback Image Upload Error:", error);
    return NextResponse.json(
      { error: "Failed to upload image. Please try again." },
      { status: 500 }
    );
  }
}
