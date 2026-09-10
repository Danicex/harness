import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import { useMyContext } from './Context/AppContext';

export default function ProtectedRoute({ children }) {
  const [authenticated, setAuthenticated] = useState(null); // null means checking
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const { get_sub_status, loading: contextLoading } = useMyContext();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndSubscription = async () => {
      // First check authentication
      const token = localStorage.getItem("token");

      if (!token) {
        setAuthenticated(false);
        navigate('/signup', { replace: true });
        return;
      }

      try {
        const decoded = jwtDecode(token);
        const now = Math.floor(Date.now() / 1000);

        if (decoded.exp < now) {
          console.log("Token expired");
          localStorage.removeItem("token"); // Clear expired token
          setAuthenticated(false);
          navigate('/login', { replace: true });
          return;
        }

        // Token is valid
        setAuthenticated(true);
        
        // Now check subscription status
        try {
          const hasSubscription = await get_sub_status();
          
          if (!hasSubscription) {
            console.log("No active subscription, redirecting to subscribe");
            navigate('/subscription', { replace: true });
          }
        } catch (subError) {
          console.error("Error checking subscription:", subError);
          // If subscription check fails, redirect to subscribe to be safe
          navigate('/subscription', { replace: true });
        } finally {
          setSubscriptionChecked(true);
        }

      } catch (err) {
        console.error("Invalid token", err);
        localStorage.removeItem("token"); // Clear invalid token
        setAuthenticated(false);
        navigate('/login', { replace: true });
      }
    };

    checkAuthAndSubscription();
  }, [navigate, get_sub_status]);

  // Show loading while checking auth or subscription
  if (authenticated === null || !subscriptionChecked || contextLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Verifying access...</p>
      </div>
    );
  }

  return authenticated ? children : null;
}