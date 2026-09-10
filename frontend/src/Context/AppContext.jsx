import { formatDate } from 'date-fns';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_ENDPOINT } from '@/lib/api';

const GlobalContext = createContext();

// Themes the user can pick from settings: 'light', 'dark', or 'system'
// (system = follow the OS/browser preference, and keep following it live).
const THEME_STORAGE_KEY = 'theme';

function getSystemPrefersDark() {
  return typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Applies the resolved (light/dark) class to <html> for Tailwind's `dark:` variants. */
function applyResolvedTheme(theme) {
  const isDark = theme === 'system' ? getSystemPrefersDark() : theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
}

export function AppDataProvider({ children }) {
  const navigate = useNavigate()
  //auth data
  const [authenticated, setAuthenticated] = useState(false);
  const [admin_id, setAdminId] = useState(localStorage.getItem('admin_id') || {});
  const [token, setToken] = useState(localStorage.getItem('token') || {})
  const [user_role, setUserRole] = useState(localStorage.getItem('user_role') || null )

  const [sub, setSub] = useState(false)

  // api_endpoint kept for any older code still reading it from context;
  // new code should just `import api from "@/lib/api"` directly.
  const api_endpoint = API_ENDPOINT

  const [theme, setThemeState] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'system');

  // Apply theme to <html> whenever it changes, and persist the choice.
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyResolvedTheme(theme);
  }, [theme]);

  // While in "system" mode, keep watching the OS preference live so the UI
  // updates immediately if the user flips their system theme.
  useEffect(() => {
    if (theme !== 'system' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyResolvedTheme('system');
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback((value) => {
    setThemeState(value);
  }, []);

//navigate to dashboard after login
  const login = async (email, password, role) => {
    //handle login
    try {
      const res = await api.post(`/auth/login`, { email, password, role });
      const x = res.data

      if (res.status === 200 || res.status === 201) {
        setAuthenticated(true);
        setToken(x.token)
        setAdminId(x.admin_id)
        setUserRole(x.role)
        localStorage.setItem('admin_id', x.admin_id)
        localStorage.setItem('user_role', x.role)
        localStorage.setItem('token', x.token)
        navigate('/dashboard')
      }
    } catch {
      navigate("/")
      setAuthenticated(false)
    }
    
  }
  //navigate to login after signin
  

  const logout = ()=>{
    localStorage.removeItem('admin_id')
    localStorage.removeItem('token')
    localStorage.removeItem('user_role')
    setAuthenticated(false)
    navigate('/')
  }



const get_admin_profile = async () => {
  try {
    const response = await api.get(`/hotel_profile/get_hotel_profile`);
    console.log("profile info:",response.data)
   if (!response.data ){
      navigate('/profile');
      return;
    }
    
  } catch (err) {
    console.error('Error fetching admin profile:', err);
    navigate('/profile');
  }
};

const get_sub_status = async () => {
  try {
    const res = await api.get(`/admin/${admin_id}/subscription`);
    return res.data.is_active;
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return false; // or handle error appropriately
  }
};

  return (
    <GlobalContext.Provider value={{
      theme,
      setTheme,
      authenticated,
      login,
      token,
      api_endpoint,
      admin_id,
      setAdminId,
      setToken,
      logout,
      get_admin_profile,
      get_sub_status,
      user_role
    }}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useMyContext() {
  return useContext(GlobalContext);
}