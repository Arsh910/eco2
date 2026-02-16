import { useEffect, useState } from 'react'
import Router from './router'
import { Themeprovider } from './context/themeContext'
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
  const [thememode, changemode] = useState('light');

  const changeMode = () => {
    if (thememode == 'light') {
      changemode('dark');
    }
    else {
      changemode('light');
    }
  }

  // saved theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('eco2-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      changemode(savedTheme);
    }
  }, []);

  // change theme
  useEffect(() => {
    let cl = document.querySelector('html').classList;
    cl.remove('light', 'dark');
    cl.add(thememode);

    localStorage.setItem('eco2-theme', thememode);
  }, [thememode])


  const [hasBooted, setHasBooted] = useState(false);

  return (
    <>
      {!hasBooted && (
        <BootSequence onComplete={() => setHasBooted(true)} />
      )}

      <AuthProvider>
        <BootTrigger setHasBooted={setHasBooted} />
        <ViewProvider>
          <Themeprovider value={{ thememode, changeMode }}>
            <ToastContainer autoClose={2000} />
            <Router />
          </Themeprovider>
        </ViewProvider>
      </AuthProvider>
    </>
  )
}

export default App
