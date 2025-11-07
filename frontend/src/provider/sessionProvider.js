// frontend/src/provider/SessionProvider.js
"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { verifySession } from "@/redux/action/actionAuth";

export default function SessionProvider({ children }) {
  const dispatch = useDispatch();
  const { sessionChecked } = useSelector((state) => state.auth);

  useEffect(() => {
    // Verify session once on app load to populate Redux state
    if (!sessionChecked) {
      console.log("[SessionProvider] Verifying session for Redux state...");
      dispatch(verifySession());
    }
  }, [dispatch, sessionChecked]);

  return <>{children}</>;
}
