// frontend/src/app/api/event-image/route.js
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

    // --- Improvement: Extract Content Type ---
    // The File object has a 'type' property (e.g., 'image/jpeg')
    const contentType = file.type;
    const filename = file.name;

    // Use the Vercel Blob SDK to upload the file
    const blob = await put(`event-images/${filename}`, file, {
      access: "public",
      addRandomSuffix: true,
      // Pass the content type explicitly
      contentType: contentType,
    });

    // Successfully uploaded. Return the public URL.
    return NextResponse.json(
      { url: blob.url, filename: blob.pathname },
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
