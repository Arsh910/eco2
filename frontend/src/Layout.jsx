import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./SideBar";

// Redesigned Dashboard Layout
// Features: Dark sidebar container + Floating rounded main content area
export default function Layout() {
  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#23153c] dark:bg-gradient-to-br dark:from-[#23153c] dark:via-[#2c1a4a] dark:to-[#1a0b2e] overflow-hidden text-slate-900 dark:text-slate-200 transition-colors duration-300">
      {/* Sidebar is fixed width, non-scrolling */}
      <Sidebar />

      {/* Main Content Area - Rounded Card Style */}
      {/* Added min-w-0 to prevent flex item from overflowing its container */}
      <main className="flex-1 h-full p-4 overflow-hidden min-w-0">
        <div className="h-full w-full p-4 bg-white/50 dark:bg-white/5 backdrop-blur-2xl rounded-[32px] overflow-y-auto shadow-2xl relative border border-slate-200/50 dark:border-white/10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
