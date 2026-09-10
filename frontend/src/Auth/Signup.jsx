"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useMyContext } from "@/Context/AppContext";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/963c7620-ebc1-427c-b9c2-009612cfa83b.png";
import logo2 from "../assets/9afc9890-5863-44a2-9c58-42eebfc842f4.png";
import api from "@/lib/api";
import { Header } from "@/About";


//component A
export function Signup() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  const [sub, setSub] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const { theme, setAdminId, setToken, setAdminEmail } = useMyContext();
  const navigate = useNavigate();


  // const create_sub = (id, token) => {
  //   const today = new Date();
  //   const exp_date = new Date(today.setDate(today.getDate() + 30)).toISOString();

  //   const formData = {
  //     plan: '1 month',
  //     start_date: today,
  //     exp_date: exp_date
  //   }

  //   api
  //     .post(`/auth/subscription/${id}`, formData, 
  //       {
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //     }
  //     )
  //     .then(() => setSub(true))
  // };

  const sendVerificationEmail = async (userEmail) => {
    try {
     
      const response = await api.post(`/auth/send-verification-email`, {
        to: userEmail,
      });

      if (response.status === 200 || response.status === 201) {
        setVerificationSent(true);
        setVerificationStep(true);
        setVerificationError("");
      }
    } catch (error) {
      setVerificationError("Failed to send verification email. Please try again.");
    }
  };

  const verifyEmailCode = async () => {
    if (!verificationCode.trim()) {
      setVerificationError("Please enter the verification code");
      return;
    }

    try {
      setIsLoading(true);

      const response = await api.post(`/auth/verify-otp`, {
        email,
        otp: verificationCode,
      });

      if (response.status === 200 || response.status === 201) {
        setVerificationSuccess(true);
        setVerificationError("");

        setTimeout(() => {
          signup(email, password);
        }, 1000);
      }
    } catch (error) {
      setVerificationError("Invalid or expired verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async () => {
    try {
      const data = { email, password, role: "admin" };
      const response = await api.post(`/auth/signup`, data);
      const x = response.data;
      if (response.status === 200 || response.status === 201) {
        localStorage.setItem("admin_id", x.admin_id);
        setAdminId(x.admin_id)
        setToken(x.token)
        localStorage.setItem("token", x.token);
        localStorage.setItem("user_role", x.role);
        // create_sub(x.admin_id, x.token);
        setAuthenticated(true);
        navigate("/profile");
      }
    } catch (error) {
      navigate("/");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!verificationStep) {
      await sendVerificationEmail(email);
    }

    setIsLoading(false);
  };

  return (
    <div>
      <Header/>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-16 px-4 sm:px-6 lg:px-8">
    <form
      onSubmit={handleSubmit}
      className="w-[500px] max-sm:w-[90%] flex gap-3 flex-col m-auto px-4 py-6 rounded-md"
      id="trans-bg"
    >
      {/* <button onClick={create_sub}>test sub</button> */}
      <div className="flex mb-5 items-center m-auto">
        <img alt="" src={theme === "dark" ? logo2 : logo} className="h-8" />
        <span className="px-3 font-bold" id="text">Harness</span>
      </div>

      {!verificationStep ? (
        <>
          {/* EMAIL */}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={verificationSent}
              className="ring-1"
            />
          </div>

          {/* PASSWORD */}
          <div className="space-y-2">
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={verificationSent}
                className="ring-1"
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* TERMS */}
          <div className="flex items-center space-x-2">
            <Checkbox checked={agreeTerms} onCheckedChange={setAgreeTerms} />
            <Label className="text-sm">
              I agree to the{" "}
              <a href="#" className="text-primary hover:underline">Terms</a> and{" "}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </Label>
          </div>

          {/* SUBMIT */}
          <Button disabled={isLoading || !agreeTerms || !email || !password} className="w-full">
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending verification...</>
            ) : (
              "Continue"
            )}
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-4">
            {/* INFO BOX */}
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border">
              <p className="text-sm">
                We've sent a verification code to <strong>{email}</strong>.
              </p>
            </div>

            {/* SUCCESS */}
            {verificationSuccess && (
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <p>Email verified! Completing signup...</p>
              </div>
            )}

            {/* ERROR */}
            {verificationError && (
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p>{verificationError}</p>
              </div>
            )}

            <Label>Verification Code</Label>
            <Input
              type="text"
              placeholder="Enter 6-digit code"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="ring-1 text-center text-lg tracking-widest"
              disabled={isLoading || verificationSuccess}
            />

            <Button
              type="button"
              className="w-full"
              onClick={verifyEmailCode}
              disabled={isLoading || verificationSuccess || !verificationCode}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
              ) : verificationSuccess ? (
                <><CheckCircle className="mr-2 h-4 w-4" /> Verified</>
              ) : (
                "Verify Code"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setVerificationStep(false);
                setVerificationCode("");
                setVerificationError("");
              }}
            >
              Back to Signup
            </Button>
          </div>
        </>
      )}

      {/* DIVIDER */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><Separator /></div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2">Or continue with</span>
        </div>
      </div>

      <span className="text-center">
        or <Link to="/login" className="text-blue-600">login</Link>
      </span>

     
    </form>
      </div>
    </div>
  );
}
