import { useEffect, useState } from "react"
import api from "@/lib/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Upload, Plus, Trash2, Link, Mail, Phone, MapPin, Building, User } from "lucide-react"
import { useMyContext } from "@/Context/AppContext"
import { Textarea } from "@/components/ui/textarea"
import HotelInfoExporter from "./template"
import { useNavigate } from "react-router-dom"
import { Header } from "@/About"

const platforms = [
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "Twitter" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
]

export default function HotelProfileForm() {
  const { admin_id } = useMyContext()
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    hotel_name: "",
    phone: "",
    agent_phone: "",
    address: "",
    description: "",
    website_url: "",
    social_links: [],
  })

  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSocialChange = (index, field, value) => {
    const updatedSocials = [...formState.social_links]
    updatedSocials[index] = {
      ...updatedSocials[index],
      [field]: value,
    }
    setFormState((prev) => ({
      ...prev,
      social_links: updatedSocials,
    }))
  }

  const handleAddSocial = () => {
    setFormState((prev) => ({
      ...prev,
      social_links: [...prev.social_links, { platform: "", url: "" }],
    }))
  }

  const handleRemoveSocial = (index) => {
    if (formState.social_links.length > 1) {
      const updatedSocials = formState.social_links.filter((_, i) => i !== index)
      setFormState((prev) => ({
        ...prev,
        social_links: updatedSocials,
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUploading(true)

    try {
      // Convert social_links array to dictionary format
      const socialLinksDict = formState.social_links.reduce((acc, social) => {
        if (social.platform && social.url) {
          acc[social.platform] = social.url;
        }
        return acc;
      }, {});
      // Create FormData object
      const formData = new FormData();
      formData.append("email", formState.email)
      formData.append("name", formState.name)
      formData.append("hotel_name", formState.hotel_name)
      formData.append("phone", formState.phone)
      formData.append("address", formState.address)
      formData.append("website_url", formState.website_url)
      formData.append("description", formState.description)
      formData.append("agent_phone", "null")
      formData.append("social_links", JSON.stringify(socialLinksDict))
      if (imageFile) {
        formData.append('image', imageFile);
      }
           const response = await api.post(`/hotel_profile/create_hotel_profile`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          // Optional: Track upload progress
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
          }
        }
      );

      if (response.status === 200) {
        navigate("/dashboard");
      }

    } catch (error) {
      if (error.response) {
        console.error("Server Error:", error.response.data);
        alert(`Error: ${error.response.data.detail || 'Something went wrong'}`);
      } else if (error.request) {
        console.error("No Response:", error.request);
        alert("Network error. Please check your connection.");
      } else {
        console.error("Error:", error.message);
        alert(`Error: ${error.message}`);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="">
      <Header/>
      <h1 className="text-center text-xl font-bold py-5">Profile setup</h1>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Create Hotel Profile</CardTitle>
          <CardDescription>
            Set up your hotel profile with basic information and social media
            links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="space-y-6"
          >
            {/* Profile Image */}
            <div className="space-y-2">
              <Label htmlFor="image">Profile Image</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-24 w-24 rounded-md overflow-hidden border bg-muted">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full text-muted-foreground">
                      <Upload className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Label htmlFor="image" className="cursor-pointer">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      asChild
                      disabled={uploading}
                    >
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        {uploading ? "Uploading..." : "Choose Image"}
                      </div>
                    </Button>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {imageFile ? `Selected: ${imageFile.name}` : "Upload a logo for your Hotel."}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </h3>
              
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formState.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                  disabled={uploading}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formState.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                  required
                  disabled={uploading}
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formState.phone}
                  onChange={handleInputChange}
                  placeholder="+1234567890"
                  required
                  disabled={uploading}
                />
              </div>
            </div>

            <Separator />

            {/* Hotel Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Building className="h-5 w-5" />
                Hotel Information
              </h3>

              {/* Hotel Name */}
              <div className="space-y-2">
                <Label htmlFor="hotel_name">Hotel Name</Label>
                <Input
                  id="hotel_name"
                  name="hotel_name"
                  value={formState.hotel_name}
                  onChange={handleInputChange}
                  placeholder="Grand Hotel"
                  required
                  disabled={uploading}
                />
              </div>

              {/* Website URL */}
              <div className="space-y-2">
                <Label htmlFor="website_url" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Website URL
                </Label>
                <Input
                  id="website_url"
                  name="website_url"
                  type="url"
                  value={formState.website_url}
                  onChange={handleInputChange}
                  placeholder="https://www.yourhotel.com"
                  disabled={uploading}
                />
              </div>

              {/* Hotel Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Hotel Description</Label>
                <p className="text-[13px] text-blue-300 pb-2">
                  Download a sample template to guide you in writing your hotel's description. <br />
                  Use the downloaded document as a reference when creating your own description.
                </p>
                <HotelInfoExporter />
                <Textarea
                  id="description"
                  name="description"
                  value={formState.description}
                  onChange={handleInputChange}
                  placeholder="Write a detailed description of your hotel..."
                  rows={5}
                  required
                  disabled={uploading}
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formState.address}
                  onChange={handleInputChange}
                  placeholder="123 Main Street, Lagos, Nigeria"
                  rows={3}
                  required
                  disabled={uploading}
                />
              </div>
            </div>

            <Separator />

            {/* Social Media Links */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Social Media Links</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSocial}
                  disabled={uploading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
              </div>

              {formState.social_links.map((social, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <Select
                      value={social.platform}
                      onValueChange={(value) =>
                        handleSocialChange(index, "platform", value)
                      }
                      disabled={uploading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {platforms.map((platform) => (
                          <SelectItem key={platform.value} value={platform.value}>
                            {platform.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-[2]">
                    <Input
                      type="url"
                      value={social.url}
                      onChange={(e) =>
                        handleSocialChange(index, "url", e.target.value)
                      }
                      placeholder="https://..."
                      disabled={uploading}
                    />
                  </div>

                  {formState.social_links.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSocial(index)}
                      disabled={uploading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <p className="text-sm text-muted-foreground">
                Add links to your hotel's social media profiles.
              </p>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={uploading}>
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Uploading...
                </div>
              ) : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}