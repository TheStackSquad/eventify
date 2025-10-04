import { signupUser } from "@/models/signupModel";

export const handleSignupSubmit = async (
  formData,
  setErrors,
  setIsLoading,
  router
) => {
  setIsLoading(true);

  try {
    const result = await signupUser(formData);

    if (result.success) {
      // Redirect to login or dashboard on success
      router.push("/login?signup=success");
    } else {
      setErrors({ submit: result.error || "Signup failed. Please try again." });
    }
  } catch (error) {
    setErrors({
      submit:
        error.response?.data?.message ||
        "An error occurred during signup. Please try again.",
    });
  } finally {
    setIsLoading(false);
  }
};
