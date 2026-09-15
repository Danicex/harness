"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Mail, Phone, MapPin, Globe, Hotel, Edit3, LogOut } from "lucide-react"
import { useMyContext } from "@/Context/AppContext"
import { useNavigate } from "react-router-dom"
import api from "@/lib/api"
import EditProfile from "@/CRUD/EditProfile"
import ThemeToggle from "@/components/ThemeToggle"

export default function HotelProfileView() {
  const [profile, setProfile] = useState(null) // Changed from array to single object
  const navigate = useNavigate()
  const [error, setError] = useState(false)
  const [onEdit, setOnEdit] = useState(false)
  const [reload, setReload] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false);
  const { logout } = useMyContext()

  useEffect(() => {
    fetchData()
  }, [reload])


  const fetchData = () => {
    setLoading(true)
    setError(false)
    api.get(`/hotel_profile/get_hotel_profile`)
      .then((res) => {
        // Handle both array and object responses
        const responseData = res.data;
        if (Array.isArray(responseData) && responseData.length > 0) {
          setProfile(responseData[0]); // Take first if array
        } else if (responseData && typeof responseData === 'object') {
          setProfile(responseData); // Direct object
        } else {
          setProfile(null);
        }
        console.log("Profile data:", responseData);
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching profile:", err);
        setTimeout(() => {
          setError(true)
        }, 3000)
        setLoading(false)
      })
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }



  // Helper to safely parse social links
  const getSocialLinks = (profileData) => {
    if (!profileData?.social_links) return []
    
    // If it's a string, try to parse it
    if (typeof profileData.social_links === 'string') {
      try {
        const parsed = JSON.parse(profileData.social_links);
        return Object.entries(parsed).map(([platform, url]) => ({
          platform,
          url
        }));
      } catch (e) {
        return [];
      }
    }
    
    // If it's an object
    if (typeof profileData.social_links === 'object') {
      return Object.entries(profileData.social_links).map(([platform, url]) => ({
        platform,
        url
      }));
    }
    
    return []
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <Button onClick={handleLogout} variant="outline" className="text-red-400">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
        
      </div>
      
      {error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-400">Unable to load profile.</CardTitle>
          </CardHeader>
          <CardContent>
            <small>Please refresh the page or try again later.</small>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchData}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hotel Profile</h1>
          <p className="text-muted-foreground">View your hotel information</p>
        </div>
        <Button onClick={() => setOnEdit(!onEdit)} className="flex items-center gap-2">
          <Edit3 className="h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      <div className="relative w-full bg-black"> 
        {onEdit && (
          <div className="absolute left-0 right-0 m-auto z-20 max-w-xl">
            <EditProfile formData={profile} setOnEdit={setOnEdit} onUpdate={fetchData} setReload={setReload}/>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : profile ? (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                  <img src={profile?.image_url} alt={profile.hotel_name} className="rounded-full w-[100px] "/>
               

                <div className="text-center">
                  <h2 className="text-2xl font-bold">{profile?.hotel_name || "Hotel Name"}</h2>
                  <p className="text-muted-foreground">{profile?.name || "Manager"}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Hotel className="h-3 w-3" />
                  Hotel Profile
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Hotel Information</CardTitle>
              <CardDescription>Your hotel details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact Details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{profile?.email || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{profile?.phone || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Address</p>
                      <p className="text-sm text-muted-foreground">{profile?.address || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Agent Phone</p>
                      <p className="text-sm text-muted-foreground">
                        {profile?.agent_phone && profile.agent_phone !== "null" ? profile.agent_phone : "Not set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Website</p>
                      <a href={profile?.website_url} target="_blank" rel="noopener noreferrer" 
                         className="text-sm text-primary hover:underline">
                        {profile?.website_url || "Not set"}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Description Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Hotel Description</h3>
                <div className="space-y-2">
                  <p className={`text-sm text-muted-foreground leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                    {profile?.description || "No description provided"}
                  </p>
                  
                  {profile?.description && profile.description.length > 200 && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      {isExpanded ? 'Show Less' : 'Read More'}
                    </button>
                  )}
                </div>
              </div>

              {getSocialLinks(profile).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Social Links</h3>
                    <div className="flex flex-wrap gap-2">
                      {getSocialLinks(profile).map((social, index) => (
                        <a key={index} href={social.url} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-white">
                            {social.platform}
                          </Badge>
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No profile data available
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}