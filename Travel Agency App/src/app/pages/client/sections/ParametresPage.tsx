import React from "react";
import { LogOut } from "lucide-react";

interface ParametresPageProps {
  user: any;
  handleLogout: () => void;
}

export function ParametresPage({ user, handleLogout }: ParametresPageProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md">
      <h3 className="text-[#0a1628] text-lg mb-6" style={{ fontWeight: 600 }}>Paramètres</h3>
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-blue-700 text-sm" style={{ fontWeight: 500 }}>Compte connecté</p>
          <p className="text-blue-600 text-sm mt-1">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-500 hover:text-red-600 text-sm transition-colors"
        >
          <LogOut className="h-4 w-4" /> Se déconnecter
        </button>
      </div>
    </div>
  );
}
