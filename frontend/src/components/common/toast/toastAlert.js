// frontend/src/components/common/toast/toastAlert.js
import { toast } from "react-toastify";

// Option A: Keep as default export (recommended)
const toastAlert = {
  success: (message) => {
    toast.success(message);
  },
  error: (message) => {
    toast.error(message);
  },
  warn: (message) => {
    toast.warn(message);
  },
  info: (message) => {
    toast.info(message);
  },
};

export default toastAlert;

