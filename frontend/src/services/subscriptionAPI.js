//frontend/src/services/subscriptionAPI.js

import backendInstance from "@/axiosConfig/axios";

const SUBSCRIPTION_URL = "/api/v1/subscription";

/**
 * Initiates a payment session with Paystack
 * @param {string} tierId - The ID of the selected plan (basic, premium, featured)
 */
export async function initiateSubscriptionAPI(tierId) {
  const response = await backendInstance.post(`${SUBSCRIPTION_URL}/initiate`, {
    tier: tierId,
  });
  return response.data; // Expected to contain the payment URL
}

/**
 * Fetches the user's current subscription status
 */
export async function fetchCurrentSubscription() {
  const response = await backendInstance.get(`${SUBSCRIPTION_URL}/me`);
  return response.data?.data || response.data;
}