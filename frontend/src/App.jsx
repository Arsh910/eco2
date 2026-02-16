import { useEffect, useState } from 'react'
import Router from './router'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ViewProvider } from './context/ViewContext'
import BootSequence from './components/BootSequence'

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Internal component to trigger boot sequence on login
const BootTrigger = ({ setHasBooted }) => {
  const { isAuthenticated } = useAuth();
  const [prevAuth, setPrevAuth] = useState(isAuthenticated);

  useEffect(() => {
    // If we just became authenticated (login), trigger boot sequence
    if (isAuthenticated && !prevAuth) {
      setHasBooted(false);
    }
    setPrevAuth(isAuthenticated);
  }, [isAuthenticated, prevAuth, setHasBooted]);

  return null;
};

function App() {
  const [hasBooted, setHasBooted] = useState(false);

  return (
    <>
      {!hasBooted && (
        <BootSequence onComplete={() => setHasBooted(true)} />
      )}

      <AuthProvider>
        <BootTrigger setHasBooted={setHasBooted} />
        <ViewProvider>
          <ToastContainer autoClose={2000} />
          <Router />
        </ViewProvider>
      </AuthProvider>
    </>
  )
}

export default App
