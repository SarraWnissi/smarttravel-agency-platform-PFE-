import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";

interface Props {
  children?: React.ReactNode;
  role?: "admin" | "client";
}

export function ProtectedRoute({ children, role }: Props) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/" replace />;

  if (role && user?.role !== role) {
    return <Navigate to={user?.role === "admin" ? "/admin" : "/client"} replace />;
  }

  return <>{children}</>;
}
