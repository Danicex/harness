import React, { useEffect, useState } from "react"
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
import { Loader2, CheckCircle, Sparkles, Hotel, Calendar, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Header } from "@/About"

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYMENT_KEY

const plans = [
  {
    name: "Monthly",
    period: "1 Month",
    price: 20000,
    plan_code: 'PLN_v3o2ntamoh7bgae',
    description: "Perfect for small hotels testing the waters",
    icon: Calendar,
    popular: false,
    savings: null
  },
  {
    name: "Quarterly",
    period: "3 Months",
    price: 55000,
    description: "Best value for growing hotel businesses",
    icon: Hotel,
    plan_code: 'PLN_ls4chsrcaz52tf1',
    popular: true,
    savings: "Save 15%"
  },
  {
    name: "Annual",
    period: "1 year",
    price: 220000,
    description: "Complete solution for large establishments",
    icon: Building2,
    plan_code: 'PLN_lw7fn7o13j0gr3c',
    popular: false,
    savings: "Save 25%"
  }
]


export default function Subscribe() {
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [planData, setPlanData] = useState(null) // This holds the actual subscription data
  const { adminEmail, admin_id } = useMyContext()

  const get_existing_sub = () => {
    api.get(`/admin/${admin_id}/subscription`).then(res => {
      setPlanData(res.data)
    }).catch(err => {
      console.error("Error fetching subscription:", err)
      setPlanData(null)
    })
  }

  useEffect(() => {
    get_existing_sub()
  }, [])

  const cancel_sub = () => {
    if (planData?.manage_link) {
      window.location.href = planData.manage_link
    }
  }

  const handleSubscribe = async (plan) => {
    setLoading(true)
    setSelectedPlan(plan)
    try {
      const params = {
        email: adminEmail,
        plan_code: plan.plan_code,
        amount: plan.price
      }
      const response = await api.post(`/initialize-transaction/${admin_id}`, params)
      
      const data = await response.data
      if (data.authorization_url) {
        window.location.href = data.authorization_url
      }
    } catch (error) {
      console.error("Payment initialization failed:", error)
      setLoading(false)
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  }

  // Component to show existing plan
const ExistingPlan = () => {
  if (!planData) {
    return (
      <div className="h-full w-80 bg-white border-r border-gray-200 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-purple-600" />
        <p className="text-gray-600 text-center">Loading your subscription details...</p>
      </div>
    )
  }

  return (
    <div className="w-80 m-auto overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="h-full flex flex-col"
      >
        <div className="bg-purple-600 px-6 py-6">
          <div className="flex flex-col">
            <div>
              <h2 className="text-2xl font-bold text-white">Your Current Plan</h2>
              <p className="text-purple-100 text-sm mt-1">Manage your subscription</p>
            </div>
            {planData.is_active && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mt-4"
              >
                <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 px-3 py-1">
                  <CheckCircle className="w-3 h-3 mr-1 inline-block" />
                  Active
                </Badge>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <div className="space-y-4 mb-8">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex justify-between items-center py-3 border-b border-gray-100"
            >
              <span className="text-gray-400 font-medium">Plan Type</span>
              <span className="text-gray-400 font-semibold capitalize">
                {planData.plan_type}
              </span>
            </motion.div>

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-between items-center py-3 border-b border-gray-100"
            >
              <span className="text-gray-400 font-medium">Status</span>
              <span className={`font-semibold flex items-center gap-2 ${
                planData.is_active ? 'text-green-600' : 'text-red-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  planData.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`} />
                {planData.is_active ? 'Active' : 'Inactive'}
              </span>
            </motion.div>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={cancel_sub}
              className="w-full bg-purple-600  hover:purple-700  text-white font-semibold py-3 h-auto"
            >
              Manage Subscription
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}


  return (
    <div>
      <Header />
      {planData?.is_active ? (
        <ExistingPlan />
      ) : (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-16 px-4 sm:px-6 lg:px-8">
          {/* Rest of your subscription plans UI remains the same */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
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

          {/* Pricing Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
          >
            {plans.map((plan, index) => {
              const Icon = plan.icon
              const isSelected = selectedPlan?.name === plan.name

              return (
                <motion.div
                  key={index}
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
                      className="absolute -top-4 left-0 right-0 flex justify-center"
                    >
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-4 py-1 text-sm font-medium shadow-lg">
                        <Sparkles className="w-3.5 h-3.5 mr-1 inline-block" />
                        Most Popular
                      </Badge>
                    </motion.div>
                  )}

                  <Card className={cn(
                    "h-full transition-all duration-300 overflow-hidden",
                    "hover:shadow-2xl hover:shadow-primary/10",
                    "border-2",
                    plan.popular
                      ? "border-primary/30 bg-gradient-to-b from-white to-primary/5 dark:from-slate-900 dark:to-primary/10"
                      : "border-transparent hover:border-primary/20",
                    isSelected && "ring-2 ring-primary ring-offset-2"
                  )}>
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className={cn(
                          "p-3 rounded-xl",
                          plan.popular
                            ? "bg-primary/20 text-primary"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        )}>
                          <Icon className="w-6 h-6" />
                        </div>
                        {plan.savings && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            {plan.savings}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                      <span>{plan.period}</span>
                      <CardDescription className="text-sm">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-4">
                      <div className="mb-6">
                        <span className="text-4xl font-bold">{formatPrice(plan.price)}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-sm ml-2">
                          /{plan.name.toLowerCase()}
                        </span>
                      </div>
                    </CardContent>

                    <CardFooter>
                      <Button
                        onClick={() => handleSubscribe(plan)}
                        disabled={loading}
                        className={cn(
                          "w-full h-12 text-base font-medium transition-all",
                          "hover:scale-105 active:scale-95",
                          plan.popular
                            ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
                            : "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
                        )}
                      >
                        {loading && selectedPlan?.name === plan.name ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Get Started"
                        )}
                      </Button>
                    </CardFooter>

                    {plan.popular && (
                      <motion.div
                        className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"
                        animate={{
                          x: ['-100%', '200%'],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 3,
                          ease: "linear",
                        }}
                      />
                    )}
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center text-sm text-slate-500 dark:text-slate-400 mt-16"
          >
            🔒 All transactions are secure and encrypted. Need help? Contact our support team.
          </motion.p>

          {/* Loading Overlay */}
          <AnimatePresence>
            {paymentStatus === 'verifying' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
              >
                <Card className="w-96 text-center p-6">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Verifying Payment</h3>
                  <p className="text-sm text-slate-500">Please wait while we confirm your subscription...</p>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}