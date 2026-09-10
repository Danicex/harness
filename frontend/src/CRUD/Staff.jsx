"use client"

import React, { useState, useEffect } from "react"
import api from "@/lib/api"
import { useMyContext } from "@/Context/AppContext"
import { Loader2, Upload, X, FileText, Key, EyeOff, Eye  } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"



export function CreateStaff({ setNewStaff, setReload, reload }) {
  const { admin_id } = useMyContext();
  const [staffData, setStaffData] = useState({
    name: "",
    role: "",
    email: "",
    password: "",
    bio: "", // Added bio field
  })
    const [showPassword, setShowPassword] = useState(false);
  const [image, setImage] = useState(null)
  const [cv, setCv] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingCv, setUploadingCv] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false) // Added missing state
  const [successMessage, setSuccessMessage] = useState("") // Added missing state

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setStaffData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith("image/")) {
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleCvChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === "application/pdf") {
      setCv(file)
    }
  }

const generate_password = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    setStaffData({ ...staffData, password: password });
  };

  const clearImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImage(null)
    setImagePreview(null)
  }

  const clearCv = () => {
    setCv(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    
    const formData = new FormData();
    
    // Add all fields as individual form fields (not nested in JSON)
    formData.append('name', staffData.name);
    formData.append('email', staffData.email);
    formData.append('password', staffData.password);
    
    // Add optional fields only if they have values
    if (staffData.bio) {
      formData.append('bio', staffData.bio);
    }
    
    if (staffData.role) {
      formData.append('role', staffData.role);
    }
    
    // Add files if they exist
    if (image) {
      formData.append('image', image);
    }
    
    if (cv) {
      formData.append('cv', cv);
    }
    
    try {
      const response = await api.post(
        `/staff/create_staff`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      // Handle success
      setIsSuccess(true);
      setSuccessMessage(response.data?.message || 'Staff created successfully!');
      
      // Reset form
      setStaffData({ name: "", role: "", email: "", password: "", bio: "" });
      clearImage();
      clearCv();
      
      // Refresh parent component if needed
      if (setReload && reload !== undefined) {
        setReload(!reload);
      }
      
      setTimeout(() => {
        setIsSuccess(false);
        setNewStaff(false);
      }, 2000);
      
    } catch (err) {
      console.error('Create staff error:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to create staff. Please try again.';
      setErrorMessage(errorMsg);
      
      setTimeout(() => {
        setErrorMessage('');
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  return (
    <div className="left-0 right-0 absolute flex items-center justify-center top-0 overflow-y-auto z-50">
      <Card className="w-full max-w-2xl">
        <CardHeader className='flex flex-row justify-between items-center'>
          <CardTitle >Create Staff Member</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setNewStaff(false)}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </CardHeader>
        
        {/* Success Message */}
        {isSuccess && (
          <div className="mx-6 mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
            <div className="flex items-center justify-between">
              <span>{successMessage}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSuccess(false)}
                className="h-6 w-6 p-0 hover:bg-green-200"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className='mx-6 mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md'>
            <div className="flex items-center justify-between">
              <p>{errorMessage}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setErrorMessage('')}
                className="h-6 w-6 p-0 hover:bg-red-200"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        
        <CardContent>
          <CardDescription className='pb-4'>Add a new staff member to your organization.</CardDescription>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-4">

            {/* Image Upload */}
            <div>
              <Label className="block mb-1">Profile Image</Label>
              <div className="relative border-2 border-dashed rounded-lg p-4 h-32 flex items-center justify-center">
                {imagePreview ? (
                  <div className="relative w-full h-full">
                    <img src={imagePreview} alt="Preview" className="object-contain h-full mx-auto" />
                    <button 
                      type="button" 
                      onClick={clearImage} 
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-6 w-6 text-gray-400" />
                    <div className="mt-2 text-sm text-gray-500">Click to upload or drag and drop</div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* CV Upload */}
            <div>
              <Label className="block mb-1">CV (PDF)</Label>
              <div className="relative border-2 border-dashed rounded-lg p-4 h-32  flex items-center justify-between">
                {cv ? (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-gray-500" />
                      <span className="text-sm truncate max-w-[70%]">{cv.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {uploadingCv && <Loader2 className="h-4 w-4 animate-spin" />}
                      <button 
                        type="button" 
                        onClick={clearCv} 
                        className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2 w-full">
                    <Upload className="mx-auto h-6 w-6 text-gray-400" />
                    <div className="mt-1 text-sm text-gray-500">Upload CV (PDF only)</div>
                  </div>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleCvChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            </div>
       
            <div>
              <Label className="block mb-1">Full Name</Label>
              <Input
                name="name"
                value={staffData.name}
                onChange={handleInputChange}
                placeholder="John Doe"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label className="block mb-1">Email</Label>
              <Input
                type="email"
                name="email"
                value={staffData.email}
                onChange={handleInputChange}
                placeholder="john.doe@example.com"
                required
                disabled={isSubmitting}
              />
            </div>
 <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={staffData.password}
                    onChange={handleInputChange}
                    placeholder="Enter password"
                    required
                    className="pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={generate_password}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      tabIndex={-1}
                      title="Generate 12-character password"
                    >
                      <Key className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Password must be at least 12 characters with numbers and symbols
                </p>
              </div>

            <div>
              <Label className="block mb-1">Role</Label>
              <Select
                value={staffData.role}
                onValueChange={(value) => setStaffData((prev) => ({ ...prev, role: value }))}
                required
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                  <SelectItem value="sales_attendant">Sales Attendant</SelectItem>
                  <SelectItem value="housekeeper">Housekeeper</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="chef">Chef</SelectItem>
                  <SelectItem value="waiter">Waiter</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block mb-1">Bio (Optional)</Label>
              <textarea
                name="bio"
                value={staffData.bio}
                onChange={handleInputChange}
                placeholder="Brief description about the staff member..."
                className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isSubmitting}
              />
            </div>

            {/* Upload Status */}
            {(uploadingImage || uploadingCv) && (
              <div className="text-sm text-blue-600">
                {uploadingImage && "Uploading image... "}
                {uploadingCv && "Uploading CV... "}
                Please wait before submitting.
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full hover:bg-purple-700 text-white" 
              disabled={isSubmitting || uploadingImage || uploadingCv}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                "Create Staff Member"
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-6">
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              setStaffData({ name: "", role: "", email: "", password: "", bio: "" })
              clearImage()
              clearCv()
            }}
            disabled={isSubmitting}
          >
            Reset Form
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export function UpdateStaff({ setEditStaff, staff_id, data }) {
  const { admin_id } = useMyContext();
  const [staffData, setStaffData] = useState({
    name: data.name,
    role: data.role,
    email: data.email,
    bio: data.bio || "",
  })
  const [password, setPassword] = useState("")
  const [image, setImage] = useState(null)
  const [cv, setCv] = useState(null)
  const [imagePreview, setImagePreview] = useState(data.profile_image || null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false);


  const handleInputChange = (e) => {
    const { name, value } = e.target
    setStaffData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith("image/")) {
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleCvChange = (e) => {
    const file = e.target.files[0]
    if (file && file.name.toLowerCase().endsWith(".pdf")) {
      setCv(file)
    }
  }

  const generate_password = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    setPassword(password)
  };


  const clearImage = () => {
    setImage(null)
    setImagePreview(null)
  }

  const clearCv = () => {
    setCv(null)
  }

  const clearPassword = () => {
    setPassword("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create FormData object for multipart/form-data
      const formData = new FormData();
      
      // Add text fields (only if they have values)
      if (staffData.name && staffData.name !== data.name) formData.append("name", staffData.name);
      if (staffData.email && staffData.email !== data.email) formData.append("email", staffData.email);
      if (password) formData.append("password", password);
      if (staffData.bio && staffData.bio !== data.bio) formData.append("bio", staffData.bio);
      if (staffData.role && staffData.role !== data.role) formData.append("role", staffData.role);
      
      // Add files if they exist
      if (image) formData.append("image", image);
      if (cv) formData.append("cv", cv);

      const response = await api.put(
        `/staff/update_staff/${staff_id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200) {
        // Optionally refresh the staff list or show success message
        setEditStaff(false)
      }
      
    } catch (err) {
      console.error("Error updating staff:", err.response?.data || err.message);
      alert(err.response?.data?.detail || "Failed to update staff member");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute m-auto top-0 left-0 right-0 bg-black/50 flex items-center justify-center z-10 p-4">
      <Card className={'min-w-[500px] max-h-[90vh] overflow-y-auto'}>
        <CardHeader className='flex flex-row justify-between items-center'>
          <CardTitle>Edit Staff Member</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setEditStaff(false)} className="float-end">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </CardHeader>
        <CardContent>
          <CardDescription className='pb-4'>Edit an existing staff member in your organization.</CardDescription>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block mb-1 font-medium">Full Name</label>
              <Input
                name="name"
                value={staffData.name}
                onChange={handleInputChange}
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Role</label>
              <select
                value={staffData.role}
                onChange={(e) => setStaffData((prev) => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="manager">Manager</option>
                <option value="receptionist">Receptionist</option>
                <option value="housekeeper">Housekeeper</option>
                <option value="maintenance">Maintenance</option>
                <option value="chef">Chef</option>
                <option value="waiter">Waiter</option>
                <option value="security">Security</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 font-medium">Email</label>
              <Input
                type="email"
                name="email"
                value={staffData.email}
                onChange={handleInputChange}
                placeholder="john.doe@example.com"
              />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={generate_password}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      tabIndex={-1}
                      title="Generate 12-character password"
                    >
                      <Key className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Password must be at least 12 characters with numbers and symbols
                </p>
              </div>


            <div>
              <label className="block mb-1 font-medium">Bio</label>
              <textarea
                name="bio"
                value={staffData.bio}
                onChange={handleInputChange}
                placeholder="Staff member's biography..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                rows="4"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block mb-1 font-medium">Profile Image</label>
              <div className="relative border-2 border-dashed rounded-lg p-4 h-32 flex items-center justify-center">
                {imagePreview ? (
                  <div className="relative w-full h-full">
                    <img src={imagePreview} alt="Preview" className="object-contain h-full mx-auto" />
                    <button 
                      type="button" 
                      onClick={clearImage} 
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-10 w-10 text-gray-400" />
                    <div className="mt-2 text-sm text-gray-500">Click to upload or drag and drop</div>
                    {data.profile_image && <div className="text-xs text-blue-500 mt-1">Current image will be kept</div>}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* CV Upload */}
            <div>
              <label className="block mb-1 font-medium">CV (PDF)</label>
              <div className="relative border-2 border-dashed rounded-lg p-4 flex items-center justify-between">
                {cv ? (
                  <>
                    <span className="text-sm truncate max-w-[80%]">{cv.name}</span>
                    <button 
                      type="button" 
                      onClick={clearCv} 
                      className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-center py-2 w-full">
                    <Upload className="mx-auto h-6 w-6 text-gray-400" />
                    <div className="mt-1 text-sm text-gray-500">
                      Upload CV (PDF only)
                      {data.cv && <div className="text-xs text-blue-500 mt-1">Current CV will be kept</div>}
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleCvChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                </>
              ) : (
                "Update Staff Member"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              setStaffData({ 
                name: data.name, 
                role: data.role, 
                email: data.email, 
                bio: data.bio || "" 
              })
              setPassword("")
              clearImage()
              clearCv()
            }}
          >
            Reset Form
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
