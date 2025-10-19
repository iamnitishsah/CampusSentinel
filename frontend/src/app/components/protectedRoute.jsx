"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../context/authContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/pages/landing");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return children;
}
