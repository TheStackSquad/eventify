// frontend/src/provider/SessionProvider.js
"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { restoreSession } from "@/redux/action/actionAuth";

export default function SessionProvider({ children }) {
  // 1. Get dispatch function
  const dispatch = useDispatch();

  const { isInitialized } = useSelector((state) => state.auth);
  console.log(`[SessionProvider] Render: isInitialized=${isInitialized}`); // 3. Effect hook to dispatch session restoration

  useEffect(() => {
    console.log(
      `[SessionProvider] Effect running. isInitialized=${isInitialized}`
    );
    if (!isInitialized) {
      console.log("[SessionProvider] Dispatching restoreSession...");
      dispatch(restoreSession());
    } else {
      console.log(
        "[SessionProvider] Session already initialized. Skipping dispatch."
      );
    }
  }, [dispatch, isInitialized]);

  return <>{children}</>;
}
