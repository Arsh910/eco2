import { Suspense, lazy, useState, useEffect } from "react";
import { Navigate, useRoutes } from "react-router-dom";

// Renders nothing — fires onReady when mounted (i.e. lazy content loaded)
function ReadySignal({ onReady }) {
  useEffect(() => { onReady(); }, []);
  return null;
}

const Loadable = (Component) => {
  return function LoadableWrapper(props) {
    const [showOverlay, setShowOverlay] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);

    const handleContentReady = () => {
      // Content is loaded — start the fade out
      setFadeOut(true);
      // Remove overlay from DOM after the CSS transition finishes
      setTimeout(() => setShowOverlay(false), 1000);
    };

    return (
      <>
        {showOverlay && (
          <div
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
            style={{
              opacity: fadeOut ? 0 : 1,
              transition: "opacity 1s ease-in-out",
            }}
          >
            <video
              src="/video/boot.mp4"
              className="w-50 h-50 object-cover"
              autoPlay
              muted
              playsInline
              loop
            />
          </div>
        )}
        <Suspense fallback={null}>
          <Component {...props} />
          <ReadySignal onReady={handleContentReady} />
        </Suspense>
      </>
    );
  };
};

const Home = Loadable(lazy(() => import("../pages/Eco2Desktop.jsx")));
const Login = Loadable(lazy(() => import("../pages/Login.jsx")));
const Signup = Loadable(lazy(() => import("../pages/Signup.jsx")));
const Page404 = Loadable(lazy(() => import("../pages/Page404.jsx")));
const EcoMeets = Loadable(lazy(() => import("../pages/eco2apps/ecomeets/EcoMeets.jsx")));

import PublicRoute from "../components/PublicRoute.jsx";
import ProtectedRoute from "../components/ProtectedRoute.jsx";

export default function Router() {
  return useRoutes([
    // Auth Routes
    { path: "/login", element: <PublicRoute><Login /></PublicRoute> },
    { path: "/signup", element: <PublicRoute><Signup /></PublicRoute> },

    // Desktop Home - Protected
    { path: "/", element: <ProtectedRoute><Home /></ProtectedRoute> },
    { path: "/eco2apps/ecomeets", element: <ProtectedRoute><EcoMeets /></ProtectedRoute> },

    // Fallback
    { path: "/404", element: <Page404 /> },
    { path: "*", element: <Navigate to="/" replace /> },
  ]);
}
