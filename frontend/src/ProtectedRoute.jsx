import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { jwtDecode } from "jwt-decode"
import { useMyContext } from "./Context/AppContext"

// Must match the route of your Subscribe page AND the backend's PAYSTACK_CALLBACK_URL
const SUBSCRIBE_PATH = "/subscription"

export default function ProtectedRoute({ children }) {
  const [access, setAccess] = useState("checking") // 'checking' | 'allowed' | 'denied'
  const { get_sub_status, loading: contextLoading } = useMyContext()
  const navigate = useNavigate()

  useEffect(() => {
    // Wait until the context has loaded (admin_id etc.)
    if (contextLoading) return

    let cancelled = false

    const check = async () => {
      // 1. Authentication
      const token = localStorage.getItem("token")
      if (!token) {
        setAccess("denied")
        navigate("/signup", { replace: true })
        return
      }

      try {
        const decoded = jwtDecode(token)
        if (decoded.exp < Math.floor(Date.now() / 1000)) {
          console.log("Token expired")
          localStorage.removeItem("token")
          setAccess("denied")
          navigate("/login", { replace: true })
          return
        }
      } catch (err) {
        console.error("Invalid token", err)
        localStorage.removeItem("token")
        setAccess("denied")
        navigate("/login", { replace: true })
        return
      }

      // 2. Subscription
      let subscribed = false
      try {
        subscribed = await get_sub_status()
      } catch (err) {
        console.error("Error checking subscription:", err)
      }

      if (cancelled) return

      // null means admin_id isn't ready yet; keep waiting, this effect re-runs when it is
      if (subscribed === null) return

      if (subscribed) {
        setAccess("allowed")
      } else {
        setAccess("denied")
        navigate(SUBSCRIBE_PATH, { replace: true })
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [navigate, get_sub_status, contextLoading])

  if (access === "checking" || contextLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Verifying access...</p>
      </div>
    )
  }

  // Only render the protected page once both checks have passed (no flash of content)
  return access === "allowed" ? children : null
}