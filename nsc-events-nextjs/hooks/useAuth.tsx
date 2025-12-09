{/* Custom React hook to manage and track user authentication state.*/}
import { useState, useEffect } from 'react';

interface User {
  role: string; 
}

const useAuth = () => {
  const [isAuth, setIsAuth] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const checkAuth = () => {
    try {
      const token = localStorage.getItem('token');
      
      // Trim whitespace and check if token exists
      const trimmedToken = token?.trim();
      
      if (!trimmedToken) {
        setIsAuth(false);
        setUser(null);
        return;
      }

      setIsAuth(true);

      // Validate JWT format (must have 3 parts)
      const parts = trimmedToken.split('.');
      if (parts.length !== 3) {
        console.error('Invalid JWT format');
        setUser(null);
        return;
      }

      // Decode token payload
      const payload = parts[1];
      const decoded = atob(payload);
      const user = JSON.parse(decoded);
      
      setUser(user);
    } catch (error) {
      // Handle any decoding or parsing errors gracefully
      console.error('Error decoding token:', error);
      setIsAuth(false);
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth(); // Initial check

    const handleAuthChange = () => {
      checkAuth();
    };
    // Listen for 'auth-change' events to dynamically update auth state across the app.
    window.addEventListener('auth-change', handleAuthChange);

    // Cleanup by removing the event listener on component unmount.
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  return { isAuth, user };
};


export default useAuth;