// frontend/src/app/api/vendor-image/route.js
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No image file provided." },
        { status: 400 }
      );
    }

    // Extract content type and filename
    const contentType = file.type;
    const filename = file.name;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, and WEBP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit." },
        { status: 400 }
      );
    }

    // Use Vercel Blob SDK to upload the file
    const blob = await put(`vendor-images/${filename}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: contentType,
    });

    // Successfully uploaded. Return the public URL.
    return NextResponse.json(
      {
        url: blob.url,
        filename: blob.pathname,
        size: file.size,
        type: contentType,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Vercel Blob Upload Error:", error);

    // Return a generic server error
    return NextResponse.json(
      { error: "Failed to upload image. Please try again." },
      { status: 500 }
    );
  }
}
