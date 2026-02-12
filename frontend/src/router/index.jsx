import { Suspense, lazy } from "react";
import { Navigate, useRoutes } from "react-router-dom";
import LoadingScreen from "../pages/LoadingScreen.jsx";

const Loadable = (Component) => (props) => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Component {...props} />
    </Suspense>
  );
};

const Layout = Loadable(lazy(() => import("../Layout.jsx")));
const Home = Loadable(lazy(() => import("../pages/Home.jsx")));
const DataTransfer = Loadable(lazy(() => import("../pages/DataTransfer.jsx")));
const Login = Loadable(lazy(() => import("../pages/Login.jsx")));
const Signup = Loadable(lazy(() => import("../pages/Signup.jsx")));
const Page404 = Loadable(lazy(() => import("../pages/Page404.jsx")));

import ProtectedRoute from "../components/ProtectedRoute.jsx";
import PublicRoute from "../components/PublicRoute.jsx";

export default function Router() {
  return useRoutes([
    // Auth Routes (No Sidebar)
    { path: "/login", element: <PublicRoute><Login /></PublicRoute> },
    { path: "/signup", element: <PublicRoute><Signup /></PublicRoute> },
    { path: "/", element: <Home /> },

    // Main App Routes (With Sidebar)
    {
      path: "/",
      element: <Layout />,
      children: [
        { path: "transfer", element: <ProtectedRoute><DataTransfer /></ProtectedRoute> },
        { path: "404", element: <Page404 /> },
        { path: "*", element: <Navigate to="/404" replace /> },
      ],
    },
  ]);
}


