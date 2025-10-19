"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../context/authContext";

const FullPageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth(); 
  const router = useRouter();

  useEffect(() => {

    if (isLoading) {
      return;
    }

   
    if (!isAuthenticated) {

      router.replace("/pages/landing");
    }
  }, [isAuthenticated, isLoading, router]); 

  if (isLoading) {
    return <FullPageLoader />;
  }


  if (isAuthenticated) {
    return children;
  }


  return null;
}