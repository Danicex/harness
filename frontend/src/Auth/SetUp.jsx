"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Globe, Phone, CreditCard, Check, Monitor, Link, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { UploadCloud} from "lucide-react"
import PaystackBtn from "./Payment"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export default function SetUp() {
  const [domain, setDomain] = useState('')
  const [websiteLink, setWebsiteLink] = useState('')
  const [isWebsiteLinkValid, setIsWebsiteLinkValid] = useState(false)
  const [isDomainValid, setIsDomainValid] = useState(false)
  const [data, setData] = useState(JSON.parse(localStorage.getItem('setup')))
  const services = [
    {
      id: 1,
      icon: Monitor,
      name: "Website Setup",
      description: "Professional website with custom design",
      price: 20,
      included: ["Responsive Design", "SEO Optimization", "Contact Forms"],
    },
    {
      id: 2,
      icon: Globe,
      name: "Domain Registration",
      description: "Your custom domain name registration",
      price: 14,
      included: ["1 Year Registration", "DNS Management", "Email Forwarding"],
    },
    {
      id: 3,
      icon: Phone,
      name: "International Phone Number",
      description: "Automated calls, booking reservations, SMS sending",
      price: 10,
      included: ["Voice Calls", "SMS Messaging", "Call Routing", "Analytics"],
    },
  ]

  const checkSite = () => {
    // Validate domain (e.g. example.com)
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/
    setIsDomainValid(domainRegex.test(domain.trim()))

    // Validate websiteLink (e.g. https://example.com)
    const urlRegex =
      /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{2,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/

    if (websiteLink.trim() === '') {
      // Optional: if empty is allowed
      setIsWebsiteLinkValid(true)
    } else {
      setIsWebsiteLinkValid(urlRegex.test(websiteLink.trim()))
    }
  }

  useEffect(() => {
    checkSite()
  }, [websiteLink, domain])


  const filteredServices = services.filter((service) => {
    if (domain && service.id === 2) return false
    if (websiteLink && service.id === 1) return false
    return true
  })
  const totalPrice = filteredServices.reduce((sum, service) => sum + service.price, 0)


  const navigate = useNavigate();
  //send notification to my  mail: website_template, admin_id, paid for: domain, website, number.
  const success = () => {
    navigate('/dashboard')
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!file) {
      setError("Please select a .zip file.")
      return
    }

    // Handle upload logic here
  }

  const x = localStorage.getItem('setup') || {}
  const name = x.name;
  const phone = x.phone_number;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Complete Your Setup</h1>
          <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Configure your custom domain and website integration to get started with your professional business
            setup.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Domain and Website Setup Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Domain Configuration
              </CardTitle>
              <CardDescription>Enter your custom domain and website details to complete the setup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Domain Input */}
              <div className="space-y-2">
                <label htmlFor="domain" className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Custom Domain
                </label>
                <div className="flex gap-2">
                  <Input
                    id="domain"
                    placeholder="example.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className={`${domain &&
                      (isDomainValid
                        ? "border-green-500 focus:border-green-500"
                        : "border-red-500 focus:border-red-500")
                      }`}
                  />
                  {domain && (
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-md ${isDomainValid ? "bg-green-100" : "bg-red-100"
                        }`}
                    >
                      {isDomainValid ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  )}
                </div>
                {domain && (
                  <p className={`text-sm ${isDomainValid ? "text-green-600" : "text-red-600"}`}>
                    {isDomainValid ? "✓ Domain format is valid" : "✗ Please enter a valid domain (e.g., example.com)"}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  This will be your primary business domain for the website and communications.
                </p>
              </div>

              {/* Website Link Input */}
              <div className="space-y-2">
                <label htmlFor="website" className="text-sm font-medium flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Website URL (Optional)
                </label>
                <div className="flex gap-2">
                  <Input
                    id="website"
                    placeholder="https://www.yourwebsite.com"
                    value={websiteLink}
                    onChange={(e) => setWebsiteLink(e.target.value)}
                    className={`${websiteLink &&
                      (isWebsiteLinkValid
                        ? "border-green-500 focus:border-green-500"
                        : "border-red-500 focus:border-red-500")
                      }`}
                  />
                  {websiteLink && (
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-md ${isWebsiteLinkValid ? "bg-green-100" : "bg-red-100"
                        }`}
                    >
                      {isWebsiteLinkValid ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  )}
                </div>
                {websiteLink && (
                  <p className={`text-sm ${isWebsiteLinkValid ? "text-green-600" : "text-red-600"}`}>
                    {isWebsiteLinkValid
                      ? "✓ Website URL is valid"
                      : "✗ Please enter a valid URL (e.g., https://example.com)"}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  If you have an existing website, we can integrate it with your new setup.
                </p>
                <p className="text-4 text-blue-400">
                  Don't have a website? 
                  <AlertDialog>
                    <AlertDialogTrigger className="bg-blue-600 text-white">ceate a site</AlertDialogTrigger>
                    <AlertDialogContent className='overflow-y-scroll '>
                      <Card className="max-w-xl mx-auto p-6">
                        <CardHeader className="flex flex-col items-start gap-2">
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <UploadCloud className="h-5 w-5" />
                            Upload Website Assets
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Upload a zip folder that contains all assets needed to create your website. <br />
                            <span className="text-xs">Max file size: 20MB</span>
                          </p>
                        </CardHeader>

                        <CardContent>
                          <Button onClick={() => window.open("https://www.dropbox.com/scl/fo/ivaygvuodt78mz08cwd9b/AGUp8BznmDA_rmlhBvl7D2o?rlkey=un09i7mb518g1y6leig87ehqa&st=lvg4tzbj&dl=0", "_blank")}>
                            Upload ZIP File
                          </Button>
                        </CardContent>
                      </Card>

                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </p>
              </div>

              {/* Configuration Preview */}
              {(domain || websiteLink) && (
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-medium mb-2">Configuration Preview</h4>
                  <div className="space-y-2 text-sm">
                    {domain && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3" />
                        <span className="text-muted-foreground">Primary Domain:</span>
                        <span className="font-medium">{domain}</span>
                        {isDomainValid && <Check className="h-3 w-3 text-green-600" />}
                      </div>
                    )}
                    {websiteLink && (
                      <div className="flex items-center gap-2">
                        <Link className="h-3 w-3" />
                        <span className="text-muted-foreground">Website URL:</span>
                        <span className="font-medium">{websiteLink}</span>
                        {isWebsiteLinkValid && <Check className="h-3 w-3 text-green-600" />}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Included Services</CardTitle>
              <CardDescription>Complete your business setup with these professional services.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredServices.map((service, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 rounded-lg border bg-muted/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                      <service.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{service.name}</h3>
                        <Badge variant="secondary">${service.price}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {service.included.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-center text-xs text-muted-foreground">
                            <Check className="h-3 w-3 mr-1 text-green-600" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Domain Display */}
              {domain && (
                <div className="space-y-2">
                  <h4 className="font-medium">Domain Configuration</h4>
                  <p className="text-sm text-muted-foreground">{domain}</p>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isDomainValid ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-xs text-muted-foreground">
                      {isDomainValid ? "Valid format" : "Invalid format"}
                    </span>
                  </div>
                </div>
              )}

              {/* Website Link Display */}
              {websiteLink && (
                <div className="space-y-2">
                  <h4 className="font-medium">Website Integration</h4>
                  <p className="text-sm text-muted-foreground break-all">{websiteLink}</p>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isWebsiteLinkValid ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-xs text-muted-foreground">
                      {isWebsiteLinkValid ? "Valid URL" : "Invalid URL"}
                    </span>
                  </div>
                </div>
              )}

              {(domain || websiteLink) && <Separator />}

              {/* Pricing Breakdown */}
              <div className="space-y-3">
                {filteredServices.map((i) =>
                (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{i.name}</span>
                    <span className="font-medium">${i.price}</span>
                  </div>
                ))}


                <Separator />

                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span>${totalPrice}</span>
                </div>
              </div>

              <div className="pt-4">

                <PaystackBtn 
                amount={totalPrice} 
                email={localStorage.getItem("admin_email") || 'example@gmail.com'}
                name={name}
                phone={phone}
                />
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Secure payment processing • 30-day money-back guarantee
                </p>
                {(!isDomainValid || (websiteLink && !isWebsiteLinkValid)) && (
                  <p className="text-xs text-red-600 text-center mt-1">Please fix validation errors to continue</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

