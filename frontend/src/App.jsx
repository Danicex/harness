import { lazy, Suspense } from "react"
import { Routes, Route } from "react-router-dom"
import './App.css'

import { AppDataProvider } from "./Context/AppContext"
import './CoreComponents/AllStyles.css'
import ProtectedRoute from "./ProtectedRoute"
import NotFound from "./NotFound"
import PageSpinner from "./components/PageSpinner"

// Every page is lazy-loaded: each route's code only downloads when the
// user actually navigates there, instead of all being bundled into the
// initial page load. <Suspense fallback={<PageSpinner />}> below shows a
// spinner while a chunk is in flight.
const Dashboard = lazy(() => import("./CoreComponents/Dashboard"))
const About = lazy(() => import("./About"))
const HotelProfileForm = lazy(() => import("./Auth/Profile"))
const Login = lazy(() => import("./Auth/Login"))
const Subscribe = lazy(() => import("./Auth/Subscribe"))
const InboxPage = lazy(() => import("./CoreComponents/CreateInbox"))
const HTMLTextEditor = lazy(() => import("./CoreComponents/TextEditor"))
const Contact = lazy(() => import("./Contact"))

// Named exports need a small adapter so React.lazy (which expects a
// default export) can resolve them.
const Signup = lazy(() =>
  import("./Auth/Signup").then((module) => ({ default: module.Signup }))
)
const ResetPassword = lazy(() =>
  import("./Auth/ResetPassword").then((module) => ({ default: module.ResetPassword }))
)
const SendResetPasswordLink = lazy(() =>
  import("./Auth/ResetPassword").then((module) => ({ default: module.SendResetPasswordLink }))
)

function App() {

  return (

    <AppDataProvider>
      <Suspense fallback={<PageSpinner />}>
        <Routes>

                    <Route path="*" element={<NotFound />} />
                    <Route path="/text-editor" element={<HTMLTextEditor />} />

          <Route path="/onboarding" element={
                      <ProtectedRoute>
                        <HotelProfileForm/>
                      </ProtectedRoute>
            } />
          <Route path="/dashboard" element={
              <Dashboard />
            } />
          {/* <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
            } /> */}


          <Route path="/subscription" element={<Subscribe />} />

          <Route path="/" element={<About/>} />
          <Route path="/profile" element={<HotelProfileForm/>} />
          <Route path="/signup" element={<Signup/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/contact" element={<Contact/>} />
         <Route path="/password_reset" element={<ResetPassword />} />
          <Route path="/request_reset_link" element={<SendResetPasswordLink />} />
          <Route path="/inbox" element={<InboxPage/>} />
        </Routes>
      </Suspense>
    </AppDataProvider>
  )
}

export default App
