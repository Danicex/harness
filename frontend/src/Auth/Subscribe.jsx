import React, { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { useMyContext } from "@/Context/AppContext"
import { motion, AnimatePresence } from "framer-motion"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Hotel,
  Calendar,
  Building2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Header } from "@/About"

// Prices here are for display only. The backend decides what is actually charged.
const MONTHLY_PRICE = 20000

const plans = [
  {
    name: "Monthly",
    period: "1 Month",
    interval: "month",
    months: 1,
    price: 20000,
    plan_code: "PLN_v3o2ntamoh7bgae",
    description: "Perfect for small hotels testing the waters",
    icon: Calendar,
    popular: false
  },
  {
    name: "Quarterly",
    period: "3 Months",
    interval: "3 months",
    months: 3,
    price: 55000,
    plan_code: "PLN_ls4chsrcaz52tf1",
    description: "Best value for growing hotel businesses",
    icon: Hotel,
    popular: true
  },
  {
    name: "Annual",
    period: "1 Year",
    interval: "year",
    months: 12,
    price: 220000,
    plan_code: "PLN_lw7fn7o13j0gr3c",
    description: "Complete solution for large establishments",
    icon: Building2,
    popular: false
  }
]

const getSavings = (plan) => {
  const full = MONTHLY_PRICE * plan.months
  const percent = Math.round((1 - plan.price / full) * 100)
  return percent > 0 ? `Save ${percent}%` : null
}

const formatPrice = (price) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price)

const formatDate = (iso) =>
  iso
    ? new Intl.DateTimeFormat("en-NG", { dateStyle: "long" }).format(new Date(iso))
    : "-"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 12 }
  }
}

const NOTICE_STYLES = {
  success: "bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-900",
  error: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900",
  warning: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900"
}

function Notice({ type = "error", children }) {
  const Icon = type === "success" ? CheckCircle : AlertCircle
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      role={type === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm max-w-2xl mx-auto mb-8",
        NOTICE_STYLES[type]
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div>{children}</div>
    </motion.div>
  )
}

// Defined at module level so it isn't re-created (and re-animated) on every parent render
function ExistingPlan({ sub, onManage, managing }) {
  const needsAttention = sub.status === "attention"
  const endsSoon = sub.cancel_at_period_end

  let badge = { label: "Active", className: "bg-green-500 hover:bg-green-600" }
  if (needsAttention) badge = { label: "Payment issue", className: "bg-amber-500 hover:bg-amber-600" }
  else if (endsSoon) badge = { label: "Ends soon", className: "bg-orange-500 hover:bg-orange-600" }

  const dateLabel = endsSoon ? "Access until" : "Next billing date"

  const rows = [
    { label: "Plan", value: <span className="capitalize">{sub.plan_type || "-"}</span> },
    { label: dateLabel, value: formatDate(sub.expires_at) },
    {
      label: "Days left",
      value: `${sub.days_left} day${sub.days_left === 1 ? "" : "s"}`
    }
  ]

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="w-full max-w-md"
      >
        <Card className="overflow-hidden">
          <div className="bg-purple-600 px-6 py-6">
            <h2 className="text-2xl font-bold text-white">Your Current Plan</h2>
            <p className="text-purple-100 text-sm mt-1">Manage your subscription</p>
            <Badge className={cn("mt-4 text-white border-0 px-3 py-1", badge.className)}>
              <CheckCircle className="w-3 h-3 mr-1 inline-block" />
              {badge.label}
            </Badge>
          </div>

          <CardContent className="pt-6 space-y-1">
            {needsAttention && (
              <p className="text-sm text-amber-700 dark:text-amber-300 pb-3">
                Your last payment didn't go through. Update your card to avoid losing access.
              </p>
            )}
            {endsSoon && (
              <p className="text-sm text-orange-700 dark:text-orange-300 pb-3">
                Your subscription won't renew. You keep full access until the date below.
              </p>
            )}
            {rows.map((row, i) => (
              <motion.div
                key={row.label}
                initial={{ x: -16, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 * (i + 1) }}
                className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <span className="text-slate-500 font-medium">{row.label}</span>
                <span className="font-semibold">{row.value}</span>
              </motion.div>
            ))}
          </CardContent>

          <CardFooter>
            <Button
              onClick={onManage}
              disabled={managing}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold h-12"
            >
              {managing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening...
                </>
              ) : (
                "Manage Subscription"
              )}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

export default function Subscribe() {
  const { adminEmail, admin_id } = useMyContext()
  const navigate = useNavigate()
  const redirectTimer = useRef(null)

  // Don't fire the redirect if the user leaves the page first
  useEffect(() => () => clearTimeout(redirectTimer.current), [])

  const [checking, setChecking] = useState(true) // first load of subscription state
  const [planData, setPlanData] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [loading, setLoading] = useState(false) // starting a payment
  const [managing, setManaging] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState(null) // 'verifying' | 'success' | 'failed'
  const [error, setError] = useState("")

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await api.get(`/admin/${admin_id}/subscription`)
      setPlanData(res.data)
    } catch (err) {
      console.error("Error fetching subscription:", err)
      setPlanData(null)
    } finally {
      setChecking(false)
    }
  }, [admin_id])

  // Paystack sends the user back with ?reference=...; confirm it with the backend
  const verifyPayment = useCallback(
    async (reference) => {
      setPaymentStatus("verifying")
      setError("")
      try {
        const res = await api.get(`/verify-payment/${admin_id}`, { params: { reference } })
        setPlanData(res.data)
        setPaymentStatus("success")
        if (res.data?.is_active) {
          // Short pause so the user sees the confirmation, then go to the dashboard
          redirectTimer.current = setTimeout(
            () => navigate("/dashboard", { replace: true }),
            1500
          )
        }
      } catch (err) {
        console.error("Payment verification failed:", err)
        setPaymentStatus("failed")
        setError(
          err?.response?.data?.detail ||
            `We couldn't confirm your payment. If you were charged, contact support with reference ${reference}.`
        )
        await fetchSubscription()
      } finally {
        setChecking(false)
        window.history.replaceState({}, "", window.location.pathname)
      }
    },
    [admin_id, fetchSubscription, navigate]
  )

  useEffect(() => {
    if (!admin_id) return
    const params = new URLSearchParams(window.location.search)
    const reference = params.get("reference") || params.get("trxref")
    if (reference) verifyPayment(reference)
    else fetchSubscription()
  }, [admin_id, verifyPayment, fetchSubscription])

  const handleSubscribe = async (plan) => {
    setLoading(true)
    setSelectedPlan(plan)
    setError("")
    try {
      // Only send what the server needs; it decides the price from the plan code
      const { data } = await api.post(`/initialize-transaction/${admin_id}`, {
        email: adminEmail,
        plan_code: plan.plan_code
      })
      if (!data.authorization_url) throw new Error("No payment link returned")
      window.location.href = data.authorization_url // keep the spinner while redirecting
    } catch (err) {
      console.error("Payment initialization failed:", err)
      setError(err?.response?.data?.detail || "We couldn't start the payment. Please try again.")
      setLoading(false)
      setSelectedPlan(null)
    }
  }

  const handleManage = async () => {
    setManaging(true)
    setError("")
    try {
      const { data } = await api.get(`/admin/${admin_id}/subscription/manage-link`)
      if (!data.link) throw new Error("No link returned")
      window.location.href = data.link
    } catch (err) {
      console.error("Manage link failed:", err)
      if (planData?.manage_link) {
        window.location.href = planData.manage_link
        return
      }
      setError(err?.response?.data?.detail || "We couldn't open the subscription manager. Please try again.")
      setManaging(false)
    }
  }

  const renderBody = () => {
    if (checking) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-purple-600" />
          <p>Loading your subscription details...</p>
        </div>
      )
    }

    if (planData?.is_active) {
      return (
        <>
          <div className="pt-8 px-4">
            {paymentStatus === "success" && (
              <Notice type="success">Payment confirmed. Taking you to your dashboard...</Notice>
            )}
            {error && <Notice type="error">{error}</Notice>}
          </div>
          <ExistingPlan sub={planData} onManage={handleManage} managing={managing} />
        </>
      )
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-16 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="mb-4 px-4 py-1 text-sm border-primary/20 bg-primary/5">
            <Sparkles className="w-3.5 h-3.5 mr-1 inline-block" />
            Flexible Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-4">
            Choose Your Perfect Plan
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Select the subscription that best fits your hotel's needs. All plans include full access to our core features.
          </p>
        </motion.div>

        {planData?.status === "expired" && (
          <Notice type="warning">
            Your subscription expired on {formatDate(planData.expires_at)}. Pick a plan to continue.
          </Notice>
        )}
        {error && <Notice type="error">{error}</Notice>}

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
        >
          {plans.map((plan, index) => {
            const Icon = plan.icon
            const isSelected = selectedPlan?.plan_code === plan.plan_code
            const savings = getSavings(plan)

            return (
              <motion.div
                key={plan.plan_code}
                variants={itemVariants}
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative"
              >
                {plan.popular && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1, type: "spring" }}
                    className="absolute -top-4 left-0 right-0 flex justify-center z-10"
                  >
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-4 py-1 text-sm font-medium shadow-lg">
                      <Sparkles className="w-3.5 h-3.5 mr-1 inline-block" />
                      Most Popular
                    </Badge>
                  </motion.div>
                )}

                <Card
                  className={cn(
                    "h-full flex flex-col transition-all duration-300 overflow-hidden",
                    "hover:shadow-2xl hover:shadow-primary/10 border-2",
                    plan.popular
                      ? "border-primary/30 bg-gradient-to-b from-white to-primary/5 dark:from-slate-900 dark:to-primary/10"
                      : "border-transparent hover:border-primary/20",
                    isSelected && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={cn(
                          "p-3 rounded-xl",
                          plan.popular
                            ? "bg-primary/20 text-primary"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      {savings && (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        >
                          {savings}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                    <span className="text-sm text-slate-500">{plan.period}</span>
                    <CardDescription className="text-sm">{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="pb-4 flex-1">
                    <span className="text-4xl font-bold">{formatPrice(plan.price)}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-sm ml-2">
                      / {plan.interval}
                    </span>
                    {plan.months > 1 && (
                      <p className="text-xs text-slate-500 mt-2">
                        That's about {formatPrice(Math.round(plan.price / plan.months))} per month
                      </p>
                    )}
                  </CardContent>

                  <CardFooter>
                    <Button
                      onClick={() => handleSubscribe(plan)}
                      disabled={loading}
                      aria-busy={isSelected && loading}
                      className={cn(
                        "w-full h-12 text-base font-medium transition-all",
                        "hover:scale-105 active:scale-95",
                        plan.popular
                          ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
                          : "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
                      )}
                    >
                      {isSelected && loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Redirecting...
                        </>
                      ) : (
                        "Get Started"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-sm text-slate-500 dark:text-slate-400 mt-16"
        >
          🔒 All transactions are secure and encrypted. Need help? Contact our support team.
        </motion.p>
      </div>
    )
  }

  return (
    <div>
      <Header />
      {renderBody()}

      <AnimatePresence>
        {paymentStatus === "verifying" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <Card className="w-96 max-w-[90vw] text-center p-6">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Verifying Payment</h3>
              <p className="text-sm text-slate-500">
                Please wait while we confirm your subscription...
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}