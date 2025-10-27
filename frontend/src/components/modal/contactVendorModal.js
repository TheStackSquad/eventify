//frontend/src/modals/contactVendorModal.js
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Image from "next/image";
import {
  Mail,
  Loader2,
  X,
  User,
  MessageCircle,
  MapPin,
  Star,
} from "lucide-react";
import { createInquiry } from "@/redux/action/inquiryAction";
import { resetCreateInquiryStatus } from "@/redux/reducer/inquiryReducer";
import { STATUS } from "@/utils/constants/globalConstants";
import toastAlert from "@/components/common/toast/toastAlert";

const ContactVendorModal = ({
  vendorId,
  vendorData, // Add vendor data prop for image and details
  isOpen,
  onClose,
  initialData = null,
  mode = "create",
}) => {
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const createInquiryState = useSelector(
    (state) => state.inquiry.createInquiry
  );
  const isLoading = createInquiryState.status === STATUS.LOADING;
  const isSuccess = createInquiryState.status === STATUS.SUCCESS;
  const createInquiryError = createInquiryState.error;

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        email: initialData.email || "",
        message: initialData.message || "",
      });
    } else {
      setFormData({ name: "", email: "", message: "" });
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (isSuccess) {
      toastAlert.success(
        mode === "create"
          ? "Inquiry sent successfully! The vendor will contact you soon."
          : "Inquiry updated successfully!"
      );

      const timer = setTimeout(() => {
        dispatch(resetCreateInquiryStatus());
        onClose();
        setFormData({ name: "", email: "", message: "" });
      }, 1500);

      return () => clearTimeout(timer);
    }

    if (createInquiryError) {
      toastAlert.error(`Failed to submit inquiry: ${createInquiryError}`);
    }
  }, [isSuccess, createInquiryError, dispatch, onClose, mode]);

  useEffect(() => {
    if (isOpen) {
      dispatch(resetCreateInquiryStatus());
    }
  }, [isOpen, dispatch]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

const handleSubmit = (e) => {
  e.preventDefault();
  if (isLoading || isSuccess) return;

  console.log("📤 Form submitted with data:", {
    vendorId,
    ...formData,
  });

  dispatch(
    createInquiry({
      vendorId,
      ...formData,
    })
  );
};

  const handleClose = () => {
    dispatch(resetCreateInquiryStatus());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-200 bg-opacity-70 z-50
          flex items-center justify-center h-full mt-12 
      p-4 backdrop-blur-sm animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-200 rounded-2xl shadow-2xl w-full max-w-5xl transition-all transform scale-100 opacity-100 overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Absolute positioned */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 text-white bg-black bg-opacity-50 hover:bg-opacity-70 transition-all duration-200 rounded-full backdrop-blur-sm"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          {/* Desktop: Two Column Layout | Mobile: Stacked Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-full">
            {/* Left Side - Vendor Image & Info */}
            <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 p-8 lg:p-10 flex flex-col justify-between min-h-[300px] lg:min-h-[600px]">
              {/* Vendor Image */}
              <div className="flex-1 flex items-center justify-center mb-6">
                <div className="relative w-full h-64 lg:h-80 rounded-2xl shadow-2xl border-4 border-white border-opacity-20 overflow-hidden">
                  <div className="absolute inset-0 bg-white bg-opacity-10 rounded-3xl blur-2xl"></div>
                  <Image
                    src={vendorData?.image || "/img/vendor/vendorUI.webp"}
                    alt={vendorData?.name || "Vendor"}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/400x300?text=Vendor+Image";
                    }}
                  />
                </div>
              </div>

              {/* Vendor Details */}
              <div className="space-y-4 text-white">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold mb-2">
                    {vendorData?.name || "Professional Vendor"}
                  </h2>
                  <p className="text-indigo-100 text-sm lg:text-base">
                    {vendorData?.category || "Event Services"}
                  </p>
                </div>

                {vendorData?.location && (
                  <div className="flex items-center space-x-2 text-indigo-100">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{vendorData.location}</span>
                  </div>
                )}

                {vendorData?.rating && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{vendorData.rating}</span>
                    </div>
                    {vendorData?.reviewCount && (
                      <span className="text-indigo-100 text-sm">
                        ({vendorData.reviewCount} reviews)
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-white border-opacity-20">
                  <p className="text-sm text-indigo-100">
                    Fill out the form to get in touch. We typically respond
                    within 24-48 hours.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side - Contact Form */}
            <div className="p-6 lg:p-10 flex flex-col">
              {/* Form Header */}
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                    <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {mode === "create" ? "Send Inquiry" : "Update Inquiry"}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Let us know about your event requirements
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="space-y-5 flex-1 flex flex-col"
              >
                <div className="space-y-5 flex-1">
                  {/* Name Field */}
                  <div className="space-y-2">
                    <label
                      htmlFor="name"
                      className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Your Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Your Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  {/* Message Field */}
                  <div className="space-y-2 flex-1 flex flex-col">
                    <label
                      htmlFor="message"
                      className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message/Details
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows="5"
                      required
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white transition-all duration-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                      placeholder="Tell us about your event: date, location, guest count, budget, and any special requirements..."
                    ></textarea>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4 space-y-3">
                  <button
                    type="submit"
                    disabled={isLoading || isSuccess}
                    className={`w-full flex justify-center items-center py-3 px-6 border border-transparent rounded-xl shadow-sm text-base font-medium text-white transition-all duration-300 transform hover:scale-105 focus:scale-105 ${
                      isLoading
                        ? "bg-indigo-400 cursor-not-allowed scale-100"
                        : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    } ${
                      isSuccess
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 cursor-default"
                        : ""
                    } disabled:transform-none disabled:hover:scale-100`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {mode === "create" ? "Sending..." : "Updating..."}
                      </>
                    ) : isSuccess ? (
                      "✓ Success!"
                    ) : (
                      `${mode === "create" ? "Send" : "Update"} Inquiry`
                    )}
                  </button>

                  {/* Help Text */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    We respect your privacy. Your information will only be
                    shared with this vendor.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactVendorModal;
