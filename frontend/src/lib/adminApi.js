import axios from "axios"

// Separate axios instance for the admin panel.
//   import adminApi from "@/lib/adminApi"
//
// Why it is separate from "@/lib/api":
// - It reads the admin token from sessionStorage ("admin_token"), never the
//   regular user's localStorage "token", so the two sessions can't clash.
// - A 401 here clears ONLY the admin session. It never touches the normal
//   user's token / admin_id / user_role and never redirects to /login.

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL

export const ADMIN_TOKEN_KEY = "admin_token"
// Where to send the admin when their session expires. Change to your route.
export const ADMIN_LOGIN_PATH = "/admin_login"

export const getAdminToken = () => sessionStorage.getItem(ADMIN_TOKEN_KEY)
export const setAdminToken = (token) => sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
export const clearAdminToken = () => sessionStorage.removeItem(ADMIN_TOKEN_KEY)

const adminApi = axios.create({
  baseURL: API_ENDPOINT,
  headers: {
    "Content-Type": "application/json",
  },
})

adminApi.interceptors.request.use((config) => {
  const token = getAdminToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error?.config?.url === "/admin/login"
    // A wrong code on the login form also returns 401. Don't redirect/reload
    // in that case or the "invalid code" message is lost.
    if (error?.response?.status === 401 && !isLoginRequest) {
      clearAdminToken()
      if (typeof window !== "undefined" && window.location.pathname !== ADMIN_LOGIN_PATH) {
        window.location.href = ADMIN_LOGIN_PATH
      }
    }
    return Promise.reject(error)
  }
)

export default adminApi