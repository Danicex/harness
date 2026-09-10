import api from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const EditProfile = ({ formData, setOnEdit, setReload }) => {
  const [formState, setFormState] = useState({
    email: formData.email || '',
    name: formData.name || '',
    phone: formData.phone || '',
    location: formData.address || '',
    description: formData.description || '',
    hotel_name: formData.hotel_name || '',
    website_url: formData.website_url || '',
    agent_phone: formData.agent_phone || '',
    social_links: formData.social_links || '',
    image_url: formData.image_url || '',
  });
  
  const [selectedImage, setSelectedImage] = useState(null); // State for the image file
  const [loading, setLoading] = useState(false); // Loading state

  const handleInputChange = (field, value) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      // Optional: Show preview
      const previewUrl = URL.createObjectURL(file);
      setFormState(prev => ({
        ...prev,
        image_url: previewUrl
      }));
    }
  };

  const handleSave = async () => {
    const formDataToSend = new FormData();

    // Only add fields that have values
    if (formState.email) formDataToSend.append("email", formState.email);
    if (formState.name) formDataToSend.append("name", formState.name);
    if (formState.phone) formDataToSend.append("phone", formState.phone);
    if (formState.location) formDataToSend.append("address", formState.location);
    if (formState.description) formDataToSend.append("description", formState.description);
    if (formState.hotel_name) formDataToSend.append("hotel_name", formState.hotel_name);
    if (formState.website_url) formDataToSend.append("website_url", formState.website_url);
    if (formState.agent_phone) formDataToSend.append("agent_phone", formState.agent_phone);
    if (formState.social_links) formDataToSend.append("social_links", formState.social_links);

    // Handle image file upload - use the actual File object, not the URL string
    if (selectedImage) {
      formDataToSend.append("image", selectedImage);
    }

    setLoading(true);
    
    try {
      const response = await api.put(
        `/hotel_profile/update_hotel_profile`,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      console.log("Success:", response.data);
      setOnEdit(false); 
      setReload(true)
    } catch (error) {
      console.error("Error updating profile:", error);
      console.log(error.response?.data?.detail || "Failed to update hotel profile");
    } finally {
      setLoading(false);
    }
  };

  if (!formData) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Edit Hotel Profile</CardTitle>
        <CardDescription>Update your hotel information and details</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Hotel Name */}
          <div className="space-y-2">
            <Label htmlFor="hotel-name">Hotel Name</Label>
            <Input
              id="hotel-name"
              type="text"
              value={formState.hotel_name || ""}
              onChange={(e) => handleInputChange("hotel_name", e.target.value)}
              placeholder="Enter hotel name"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formState.email || ""}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter email"
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              value={formState.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter name"
            />
          </div>

          {/* Phone and Agent Phone - Two columns */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formState.phone || ""}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-phone">Agent Phone</Label>
              <Input
                id="agent-phone"
                type="tel"
                value={formState.agent_phone || ""}
                onChange={(e) => handleInputChange("agent_phone", e.target.value)}
                placeholder="Enter agent phone number"
              />
            </div>
          </div>

          {/* Address/Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Address/Location</Label>
            <Input
              id="location"
              type="text"
              value={formState.location || ""}
              onChange={(e) => handleInputChange("location", e.target.value)}
              placeholder="Enter address"
            />
          </div>

          {/* Website URL */}
          <div className="space-y-2">
            <Label htmlFor="website-url">Website URL</Label>
            <Input
              id="website-url"
              type="url"
              value={formState.website_url || ""}
              onChange={(e) => handleInputChange("website_url", e.target.value)}
              placeholder="Enter website URL"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="image">Hotel Image</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="cursor-pointer"
            />
            {formState.image_url && (
              <div className="mt-2">
                <img 
                  src={formState.image_url} 
                  alt="Preview" 
                  className="h-32 w-32 object-cover rounded-md"
                />
                <p className="text-sm text-gray-500 mt-1">Current image (upload new to replace)</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formState.description || ""}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Enter description"
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
            <Button onClick={() => setOnEdit(false)} variant="outline" className="flex-1 bg-transparent">
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EditProfile;