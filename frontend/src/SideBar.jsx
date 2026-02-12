import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useTheme from "./context/themeContext";
import { useAuth } from "./context/AuthContext";
import { useView } from "./context/ViewContext";
import { LogOut, MessageSquare, Files } from "lucide-react";

export default function Sidebar() {
  const { thememode, changeMode } = useTheme();
  const location = useLocation();
  const { mode, guestName, user, logout } = useAuth();
  const { isProMode, toggleView, activeTransferTab, setActiveTransferTab } = useView();
  const [showMobileUserMenu, setShowMobileUserMenu] = useState(false);

  // Get display name based on auth mode
  const displayName = mode === 'guest' ? guestName : (user?.username || user?.name || 'User');

  const isMeetingRoute = location.pathname.startsWith("/meeting");
  const bottomSafePadding = isMeetingRoute ? "calc(80px + 1rem)" : undefined;

  const navItems = [
    { name: "Home", path: "/", icon: HomeIcon },
  ];

  return (
    <aside
      className="flex flex-col justify-between shrink-0 h-screen sticky top-0
                 w-20 lg:w-64 p-4 text-slate-600 dark:text-slate-300
                 transition-colors duration-200 bg-white/50 dark:bg-transparent backdrop-blur-md border-r border-slate-200 dark:border-none"
      style={{ paddingBottom: bottomSafePadding }}
    >
      <div className="flex items-center justify-center lg:justify-start px-2">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/logo/logo.png"
            alt="Eco Logo"
            className="w-8 h-8 object-contain"
          />

          <div className="hidden lg:block">
            <div className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
              Eco2
            </div>
          </div>
        </Link>
      </div>

      <nav className="mt-8 flex-1">
        <ul className="space-y-2">
          {navItems.map(({ name, path, icon: Icon }) => (
            <li key={name}>
              <Link
                to={path}
                className={`flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-full text-[15px] font-medium transition-all duration-200 ${location.pathname === path
                  ? "bg-slate-900 text-white dark:bg-white/10 dark:text-[#ff2a6d] shadow-lg dark:shadow-[0_0_15px_rgba(255,42,109,0.3)]"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5"
                  }`}
              >
                <Icon />
                <span className="hidden lg:inline">{name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-4">

        {/* Theme Toggle */}
        <div className="px-2">
          <button
            onClick={changeMode}
            aria-label="Toggle theme"
            className="w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-2xl transition-all duration-300
                        bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 hover:text-slate-900
                        dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white"
          >
            {thememode === "dark" ? (
              <>
                <MoonIcon />
                <span className="hidden lg:inline text-sm font-semibold">Dark Mode</span>
              </>
            ) : (
              <>
                <SunIcon />
                <span className="hidden lg:inline text-sm font-semibold">Light Mode</span>
              </>
            )}
          </button>
        </div>

        {/* Transfer Toggle - Only visible on Mobile DataTransfer page */}
        {location.pathname === '/transfer' && (
          <div className="px-2 h-10 flex items-center justify-center lg:hidden">
            <div className="flex flex-col bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 -rotate-90 w-20">
              <button
                onClick={() => setActiveTransferTab('text')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all duration-300 ${activeTransferTab === 'text'
                  ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-[#ff2a6d] shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTransferTab('file')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all duration-300 ${activeTransferTab === 'file'
                  ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-[#05d9e8] shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
              >
                <Files className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Pro Mode Toggle - Only for logged in users */}
        {mode === 'login' && (
          <div className="px-2 h-32 lg:h-auto flex items-center justify-center lg:block">
            <button
              onClick={toggleView}
              aria-label="Toggle pro mode"
              className={`w-32 lg:w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-2xl transition-all duration-300 border -rotate-90 lg:rotate-0
                ${isProMode
                  ? "bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/50 dark:from-[#ff2a6d]/20 dark:to-[#05d9e8]/20 dark:border-[#ff2a6d]/50"
                  : "bg-slate-100 border-slate-200 hover:bg-slate-200 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10"
                }`}
            >
              <div className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${isProMode ? "bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-[#ff2a6d] dark:to-[#05d9e8]" : "bg-slate-400 dark:bg-slate-600"}`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isProMode ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <span className={`inline text-sm font-semibold whitespace-nowrap ${isProMode ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                3D Mode
              </span>
            </button>
          </div>
        )}

        {/* User Profile Section */}
        <div className="pt-4 border-t border-slate-200 dark:border-white/10 relative">
          {/* Mobile User Menu */}
          {showMobileUserMenu && (
            <div className="absolute bottom-full left-0 mb-2 lg:hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                <button
                  onClick={() => {
                    logout();
                    setShowMobileUserMenu(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4 cursor-pointer" />
                </button>
              </div>
            </div>
          )}

          <div
            onClick={() => setShowMobileUserMenu(!showMobileUserMenu)}
            className="flex items-center justify-center lg:justify-start gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-gradient-to-br dark:from-[#ff2a6d] dark:to-[#05d9e8] flex items-center justify-center flex-shrink-0 shadow-lg dark:shadow-[#ff2a6d]/20">
              <span className="text-slate-700 dark:text-white text-sm font-bold">
                {displayName ? displayName[0].toUpperCase() : 'U'}
              </span>
            </div>
            <div className="hidden lg:block overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-[#ff2a6d] transition-colors">
                {displayName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.email || (mode === 'guest' ? 'Guest Access' : 'View Profile')}
              </p>
            </div>

            {/* Logout Button (Desktop) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                logout();
              }}
              className="hidden lg:flex p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              style={{ zIndex: 100 }}
              title="Logout"
            >
              <LogOut className="w-4 h-4 cursor-pointer" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function HomeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="flex-shrink-0"
    >
      <path d="M21 10L12 3 3 10v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"></path>
      <path d="M7 21v-6a5 5 0 0 1 10 0v6"></path>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
    </svg>
  );
}


