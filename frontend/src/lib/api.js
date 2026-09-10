import axios from "axios"

// Single axios instance for the whole app.
// Import this everywhere instead of calling axios directly:
//   import api from "@/lib/api"
//   api.get("/staff/get_staff")
//
// - baseURL is read once from VITE_API_BASE_URL
// - Authorization header is attached automatically on every request
//   (always reads the latest token from localStorage, so logging in/out
//   mid-session "just works" without re-creating the instance)
// - A 401 response automatically clears the session and sends the user
//   back to /login, so individual pages don't need to repeat that logic.

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL

const api = axios.create({
  baseURL: API_ENDPOINT,
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("admin_id")
      localStorage.removeItem("user_role")
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

export default api
export { API_ENDPOINT }
