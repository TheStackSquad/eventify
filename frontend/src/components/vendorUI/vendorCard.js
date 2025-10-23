// // frontend/src/components/vendorUI/vendorCard.js

// import Link from 'next/link';
// import { MapPin, Star, CheckCircle, Briefcase, DollarSign } from 'lucide-react';
// import { generateVendorSlug } from '@/utils/helper/vendorSlugHelper';
// import Image from 'next/image';

// const VendorCard = ({ vendor }) => {
//     // 1. Generate the SEO-friendly slug for the link
//     const vendorSlug = generateVendorSlug(vendor);
    
//     // Fallback URL in case of a slug generation error
//     const linkHref = `/vendor/${vendorSlug}`;

//     // Helper for formatting price (Nigerian Naira)
//     const formatPrice = (price) => {
//         return new Intl.NumberFormat('en-NG', {
//             style: 'currency',
//             currency: 'NGN',
//             minimumFractionDigits: 0,
//         }).format(price);
//     };

//     return (
//       <Link href={linkHref} passHref>
//         <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
//           {/* Image Placeholder */}
//           <Image
//             src={imageUrl}
//             alt={`Profile picture for ${vendor.name}`}
//             // Use fill to size the image relative to the parent div's w-full h-48
//             fill
//             // object-cover ensures the image fills the space without distortion
//             className="object-cover"
//             // Set priority for images above the fold (top of the listing page)
//             priority={false}
//             // Style for placeholder while loading
//             sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
//           />

//           {/* Content Area */}
//           <div className="p-5">
//             {/* Name and PVS Score */}
//             <div className="flex justify-between items-start mb-2">
//               <h3 className="text-xl font-bold text-gray-900 truncate mr-2">
//                 {vendor.name}
//               </h3>
//               <div className="flex items-center text-lg font-bold text-orange-500 bg-orange-50 px-2.5 py-0.5 rounded-full">
//                 <Star size={18} fill="currentColor" className="mr-1" />
//                 {vendor.pvsScore}
//               </div>
//             </div>

//             {/* Category */}
//             <p className="text-sm text-gray-500 mb-3 capitalize">
//               {vendor.category}
//             </p>

//             {/* Details */}
//             <div className="space-y-2 text-sm">
//               {/* Location */}
//               <div className="flex items-center text-gray-700">
//                 <MapPin size={16} className="text-red-500 mr-2 flex-shrink-0" />
//                 <span className="truncate">
//                   {vendor.area}, {vendor.city}, {vendor.state}
//                 </span>
//               </div>

//               {/* Price Range */}
//               <div className="flex items-center text-gray-700">
//                 <DollarSign
//                   size={16}
//                   className="text-green-600 mr-2 flex-shrink-0"
//                 />
//                 <span className="font-semibold">
//                   Starting from:
//                   <span className="ml-1 text-lg text-green-700">
//                     {formatPrice(vendor.minPrice)}
//                   </span>
//                 </span>
//               </div>

//               {/* Review Count & Bookings */}
//               <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
//                 <span>{vendor.reviewCount} Reviews</span>
//                 <span className="font-medium text-indigo-600">
//                   {vendor.bookingsCompleted} Bookings Completed
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </Link>
//     );
// };

// export default VendorCard;


// frontend/src/components/vendorUI/VendorCard.jsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Star,
  MapPin,
  Verified,
  Calendar,
  Building2,
} from "lucide-react";
import { generateVendorSlug } from "@/utils/helper/vendorSlugHelper";

const VendorCard = ({ vendor, formatPrice, getRatingPercentage, onVendorClick }) => {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleCardClick = () => {
    console.log("🎯 Vendor card clicked:", vendor.name, vendor.id);
    
    // Generate slug for URL
    const slug = generateVendorSlug(vendor);
    
    // Navigate to vendor detail page
    router.push(`/vendor/${slug}`);
    
    // Also call optional callback if provided
    if (onVendorClick) {
      onVendorClick(vendor);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 cursor-pointer overflow-hidden group hover:translate-y-[-4px]"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={`View ${vendor.name} profile`}
    >
      {/* Vendor Image with Enhanced Error Handling */}
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50">
        {/* Fallback - Shows while loading or on error */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            !imageLoaded || imageError ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-indigo-600 font-bold text-2xl shadow-lg border-2 border-indigo-100">
            {vendor.name?.charAt(0) || "V"}
          </div>
        </div>

        {/* Actual Image */}
        {vendor.imageURL && !imageError && (
          <Image
            src={vendor.imageURL}
            alt={vendor.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className={`object-cover group-hover:scale-105 transition duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            priority={true}
          />
        )}

        {/* Verification Badge */}
        {vendor.isIdentityVerified && (
          <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 backdrop-blur-sm bg-green-600/95 shadow-lg">
            <Verified className="w-3 h-3" />
            <span>Verified</span>
          </div>
        )}

        {/* Price Badge */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-gray-900 px-3 py-1.5 rounded-full text-sm font-bold shadow-lg border border-gray-200">
          {formatPrice(vendor.minPrice)}
        </div>

        {/* Category Badge */}
        <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm">
          {vendor.category?.replace(/_/g, " ") || "Uncategorized"}
        </div>
      </div>

      {/* Vendor Info */}
      <div className="p-5 space-y-4">
        {/* Vendor Name */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
            {vendor.name}
          </h3>
        </div>

        {/* Location */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="line-clamp-1">
            {[vendor.city, vendor.state].filter(Boolean).join(", ") ||
              "Location not specified"}
          </span>
        </div>

        {/* Rating and Reviews */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-lg">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm font-semibold text-gray-900">
                {(vendor.pvsScore / 20).toFixed(1)}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              ({vendor.reviewCount || 0} reviews)
            </span>
          </div>

          {/* Bookings Completed */}
          <div className="flex items-center space-x-1 text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
            <Calendar className="w-4 h-4" />
            <span>{vendor.bookingsCompleted || 0}</span>
          </div>
        </div>

        {/* Rating Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${getRatingPercentage(vendor.pvsScore)}%` }}
          />
        </div>

        {/* Additional Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span
            className={`flex items-center space-x-1 ${
              vendor.isBusinessRegistered
                ? "text-green-600 bg-green-50 px-2 py-1 rounded"
                : "text-gray-400"
            }`}
          >
            <Building2 className="w-3 h-3" />
            <span>Registered</span>
          </span>

          {/* Member Since */}
          <span className="bg-gray-50 px-2 py-1 rounded">
            Since {new Date(vendor.createdAt).getFullYear()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VendorCard;