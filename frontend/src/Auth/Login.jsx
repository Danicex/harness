"use client"

import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useMyContext } from "@/Context/AppContext"
import logo from '../assets/963c7620-ebc1-427c-b9c2-009612cfa83b.png';
import logo2 from '../assets/9afc9890-5863-44a2-9c58-42eebfc842f4.png';
import { Header } from "@/About"

export default function Login() {
  const location = useLocation();
  const role = location.state?.role || "admin"; 
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const {login, theme} = useMyContext()


  const handleSubmit = (e) => {
    e.preventDefault()
    login(email, password, role ? role: "admin")
  }
  
  return (
    <div>

      <Header/>
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-16 px-4 sm:px-6 lg:px-8">
    <form  className="w-[500px] max-sm:w-[90%] flex gap-3 flex-col m-auto  overflow-y-hidden px-4 py-6 rounded-md" id="trans-bg">
      <div className="flex mb-5 lg:flex-1 items-center m-auto">
      
                  {
                    theme === 'dark' ? (<img
                      alt=""
                      src={logo2}
                      className="h-8 w-auto"
                    />) : (<img
                      alt=""
                      src={logo}
                      className="h-8 w-auto"
                    />)
                  }
                  <span className='px-3 font-bold' id='text'>Harness</span>
      
                </div> 
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="ring-1 "

        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link to="/request_reset_link" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="ring-1 "

          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="remember" checked={rememberMe} onCheckedChange={setRememberMe} />
        <Label
          htmlFor="remember"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Remember me
        </Label>
      </div>
      <Button onClick={handleSubmit} className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
          <span className="text-center">or <Link to={'/signup'} className="text-blue-600">signup</Link></span>
    </form>
    </div>
    </div>
  )
}
