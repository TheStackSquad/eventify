import axios from "@/axiosConfig/axios";

export const signupUser = async (userData) => {
  try {
    const response = await axios.post("/api/auth/signup", userData);

    if (response.data.success) {
      return { success: true, user: response.data.user };
    } else {
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    console.error("Signup error:", error);

    if (error.response?.data?.message) {
      return { success: false, error: error.response.data.message };
    }

    return { success: false, error: "Network error. Please try again." };
  }
};
