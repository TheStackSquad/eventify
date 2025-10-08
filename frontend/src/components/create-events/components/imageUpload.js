//frontend/src/components/create-events/components/imageUpload.js
import Image from "next/image";

export default function ImageUpload({
  imagePreview,
  onImageUpload,
  onRemoveImage,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Event Cover Image
      </label>
      <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
        {imagePreview ? (
          <div className="relative">
            <div className="relative max-h-48 mx-auto rounded-lg overflow-hidden">
              <Image
                src={imagePreview}
                alt="Event preview"
                width={400}
                height={192}
                className="object-contain max-h-48"
                unoptimized={true} // Required for blob URLs
              />
            </div>
            <button
              type="button"
              onClick={onRemoveImage}
              className="mt-2 text-red-400 hover:text-red-300 text-sm"
            >
              Remove Image
            </button>
          </div>
        ) : (
          <div>
            <svg
              className="w-12 h-12 text-gray-600 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <input
              type="file"
              accept="image/*"
              onChange={onImageUpload}
              className="hidden"
              id="event-image"
            />
            <label
              htmlFor="event-image"
              className="cursor-pointer text-green-400 hover:text-green-300"
            >
              Click to upload image
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

