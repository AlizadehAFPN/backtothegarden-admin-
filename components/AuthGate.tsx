"use client";

import { ReactNode } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import LoginScreen from "@/components/LoginScreen";
import Sidebar from "@/components/Sidebar";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Image src="/logo.png" alt="BTG" width={40} height={40} className="rounded-xl animate-pulse" />
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
