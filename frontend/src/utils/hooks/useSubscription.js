//frontend/src/utils/hooks/useSubscription.js

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  initiateSubscriptionAPI,
  fetchCurrentSubscription,
} from "@/services/subscriptionAPI";
import toastAlert from "@/components/common/toast/toastAlert";
import globalConstants from "@/utils/constants/globalConstants";

const { ERROR_MESSAGES } = globalConstants;

export const useSubscriptionStatus = () => {
  return useQuery({
    queryKey: ["subscriptionStatus"],
    queryFn: fetchCurrentSubscription,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useInitiateSubscription = () => {
  return useMutation({
    mutationFn: initiateSubscriptionAPI,
    onSuccess: (data) => {
      if (data?.url) {
        // Redirect user to Paystack checkout
        window.location.href = data.url;
      } else {
        toastAlert.error("Payment initialization failed. No URL returned.");
      }
    },
    onError: (error) => {
      const message =
        error.response?.data?.message ||
        ERROR_MESSAGES.PAYMENT_FAILED ||
        "Failed to initialize payment. Please try again.";
      toastAlert.error(message);
    },
  });
};