"use client";

import { ReactNode } from "react";
import { useAuth } from "@/lib/AuthContext";
import LoginScreen from "@/components/LoginScreen";
import Sidebar from "@/components/Sidebar";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm animate-pulse">
          BTG
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 p-8 lg:p-10 overflow-auto">{children}</main>
    </>
  );
}
