

// frontend/src/app/vendor/[id]/page.js
'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getVendorProfile } from '@/redux/action/vendorAction';
import { clearSelectedVendor } from '@/redux/reducer/vendorReducer';
import { parseSlugToId } from '@/utils/helper/vendorSlugHelper';
import { STATUS } from '@/utils/constants/globalConstants';
import LoadingSpinner from '@/components/common/loading/loadingSpinner';
import VendorProfileDetail from '@/components/vendorUI/vendorProfileDetail';

// Define the Vendor Detail Page Component
const VendorProfilePage = ({ params }) => {
    const dispatch = useDispatch();
    const { selectedVendor, status, error } = useSelector((state) => state.vendors);

    // 1. Extract and Parse the Slug
    const slug = params.id;
    const vendorId = parseSlugToId(slug);

    // Determine the loading and error states for this specific fetch
    const isLoading = status === STATUS.LOADING && selectedVendor === null;
    
    // 2. Fetch the Vendor Data on Component Mount
    useEffect(() => {
        if (vendorId) {
            // Dispatch the thunk to fetch the profile using the extracted ID
            dispatch(getVendorProfile(vendorId));
        } else {
            // Handle case where the slug is invalid (e.g., set error state directly)
            console.error("Invalid vendor slug provided.");
            // Optionally, dispatch an action to set a local error state if needed
        }

        // Cleanup: Clear the selected vendor when leaving the page
        return () => {
            dispatch(clearSelectedVendor());
        };
    }, [dispatch, vendorId]);

    // 3. Render Logic (Loading, Error, or Success)

    if (!vendorId) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <h1 className="text-2xl text-red-600">
                    Error: Invalid Vendor URL.
                </h1>
            </div>
        );
    }
    
    if (isLoading) {
        return (
            <LoadingSpinner 
                fullScreen={true} 
                message="Loading Vendor Profile..." 
                subMessage="Fetching details from the database." 
            />
        );
    }

    if (error || !selectedVendor) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50 p-6 text-center">
                <div className="p-10 bg-white shadow-xl rounded-lg">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">
                        Vendor Not Found
                    </h1>
                    <p className="text-gray-600">
                        {error || "The profile you are looking for does not exist or has been removed."}
                    </p>
                </div>
            </div>
        );
    }
    
    // 4. Success: Display the detailed profile
    return (
        <main className="min-h-screen bg-gray-50 p-4 md:p-8">
            {/* TODO: Create a detailed component (VendorProfileDetail) 
                to handle the full presentation of all vendor fields.
            */}
            <VendorProfileDetail vendor={selectedVendor} />
        </main>
    );
};

export default VendorProfilePage;