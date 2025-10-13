// frontend/src/components/vendorUI/vendorCard.js

import Link from 'next/link';
import { MapPin, Star, CheckCircle, Briefcase, DollarSign } from 'lucide-react';
import { generateVendorSlug } from '@/utils/helper/vendorSlugHelper';
import Image from 'next/image';

const VendorCard = ({ vendor }) => {
    // 1. Generate the SEO-friendly slug for the link
    const vendorSlug = generateVendorSlug(vendor);
    
    // Fallback URL in case of a slug generation error
    const linkHref = `/vendor/${vendorSlug}`;

    // Helper for formatting price (Nigerian Naira)
    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(price);
    };

    return (
      <Link href={linkHref} passHref>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
          {/* Image Placeholder */}
          <Image
            src={imageUrl}
            alt={`Profile picture for ${vendor.name}`}
            // Use fill to size the image relative to the parent div's w-full h-48
            fill
            // object-cover ensures the image fills the space without distortion
            className="object-cover"
            // Set priority for images above the fold (top of the listing page)
            priority={false}
            // Style for placeholder while loading
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* Content Area */}
          <div className="p-5">
            {/* Name and PVS Score */}
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold text-gray-900 truncate mr-2">
                {vendor.name}
              </h3>
              <div className="flex items-center text-lg font-bold text-orange-500 bg-orange-50 px-2.5 py-0.5 rounded-full">
                <Star size={18} fill="currentColor" className="mr-1" />
                {vendor.pvsScore}
              </div>
            </div>

            {/* Category */}
            <p className="text-sm text-gray-500 mb-3 capitalize">
              {vendor.category}
            </p>

            {/* Details */}
            <div className="space-y-2 text-sm">
              {/* Location */}
              <div className="flex items-center text-gray-700">
                <MapPin size={16} className="text-red-500 mr-2 flex-shrink-0" />
                <span className="truncate">
                  {vendor.area}, {vendor.city}, {vendor.state}
                </span>
              </div>

              {/* Price Range */}
              <div className="flex items-center text-gray-700">
                <DollarSign
                  size={16}
                  className="text-green-600 mr-2 flex-shrink-0"
                />
                <span className="font-semibold">
                  Starting from:
                  <span className="ml-1 text-lg text-green-700">
                    {formatPrice(vendor.minPrice)}
                  </span>
                </span>
              </div>

              {/* Review Count & Bookings */}
              <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span>{vendor.reviewCount} Reviews</span>
                <span className="font-medium text-indigo-600">
                  {vendor.bookingsCompleted} Bookings Completed
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
};

export default VendorCard;