"use client"

import React, { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Upload, X, ImageIcon, Film } from "lucide-react"
import { useMyContext } from "@/Context/AppContext"
import api from "@/lib/api"

export function CreateBlogCard({ setNewBlog, onSuccess, setReload, reload }) {
  const { admin_id } = useMyContext()
  const [formData, setFormData] = useState({
    topic: "",
    content: "",
    public: false,
  })

  // Media state
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [video, setVideo] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)

  // Upload states
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)

  // UI state
  const [activeTab, setActiveTab] = useState("image")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Refs for file inputs
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  // Handle toggle change
  const handleToggleChange = (checked) => {
    setFormData({
      ...formData,
      public: checked,
    })
  }

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB")
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError("Please select a valid image file")
      return
    }

    setImage(file)
    setError("")

    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  // Handle video upload
  const handleVideoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Check file size (limit to 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setError("Video size should be less than 20MB")
      return
    }

    // Check file type
    if (!file.type.startsWith('video/')) {
      setError("Please select a valid video file")
      return
    }

    setVideo(file)
    setError("")

    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setVideoPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  // Clear image
  const clearImage = () => {
    setImage(null)
    setImagePreview(null)
    if (imageInputRef.current) {
      imageInputRef.current.value = ""
    }
  }

  // Clear video
  const clearVideo = () => {
    setVideo(null)
    setVideoPreview(null)
    if (videoInputRef.current) {
      videoInputRef.current.value = ""
    }
  }

// Handle form submission
const handleSubmit = async (e) => {
  e.preventDefault()
  setError("")
  setSuccess("")
  
  // Validate form
  if (!formData.topic) {
    setError("Topic is required")
    return
  }

  if (!formData.content) {
    setError("Content is required")
    return
  }

  if (!image && !video) {
    setError("Please upload an image or video")
    return
  }

  setIsSubmitting(true)

  try {
    // Create FormData for submission
    const formDataToSend = new FormData()
    
    // Append text fields directly (not nested in JSON)
    formDataToSend.append('title', formData.topic)
    formDataToSend.append('category', formData.public ? "public" : "private")
    formDataToSend.append('description', formData.content)
    
    // Append files
    if (image) {
      formDataToSend.append('image', image)  // Changed from 'file' to 'image'
    }
    if (video) {
      formDataToSend.append('video', video)
    }

    await api.post(`/blog/create_blog`, formDataToSend, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    setSuccess("Blog created successfully!")
    onSuccess()
    setReload(!reload)
    // Reset form and close after success
    setTimeout(() => {
      setNewBlog(false)
    }, 2000)

  } catch (err) {
    console.error("Error submitting form:", err)
    setError(err.response?.data?.detail || "Failed to create blog. Please try again.")
  } finally {
    setIsSubmitting(false)
  }
}

  // Reset form completely
  const resetForm = () => {
    setFormData({ topic: "", content: "", public: false })
    clearImage()
    clearVideo()
    setError("")
    setSuccess("")
  }

  return (
    <div className="absolute m-auto top-0 left-0 right-0 bg-black/50 flex items-center justify-center z-10 p-4">
      <Card className="max-w-3xl w-[500px] mx-auto">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Create New Blog</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setNewBlog(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Success Message */}
            {success && (
              <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
                {success}
              </div>
            )}

            {/* Topic Input */}
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                name="topic"
                placeholder="Enter blog topic"
                value={formData.topic}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Content Textarea */}
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                name="content"
                placeholder="Write your blog content here..."
                value={formData.content}
                onChange={handleInputChange}
                className="min-h-[200px]"
                required
              />
            </div>

            {/* Media Upload */}
            <div className="space-y-2">
              <Label>Media</Label>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="image">
                    <ImageIcon className="h-4 w-4 mr-2" /> 
                    Image {uploadingImage && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
                  </TabsTrigger>
                  <TabsTrigger value="video">
                    <Film className="h-4 w-4 mr-2" /> 
                    Video {uploadingVideo && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
                  </TabsTrigger>
                </TabsList>

                {/* Image Upload Tab */}
                <TabsContent value="image" className="mt-2">
                  <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center">
                    {imagePreview ? (
                      <div className="relative w-full h-[200px]">
                        <img
                          src={imagePreview || "/placeholder.svg"}
                          alt="Preview"
                          className="w-full h-full object-contain rounded-md"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={clearImage}
                          disabled={uploadingImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        {uploadingImage && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG or GIF (max. 5MB)</p>
                        <Input
                          ref={imageInputRef}
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={uploadingImage}
                        >
                          {uploadingImage ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            "Select Image"
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </TabsContent>

                {/* Video Upload Tab */}
                <TabsContent value="video" className="mt-2">
                  <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center">
                    {videoPreview ? (
                      <div className="relative w-full">
                        <video 
                          src={videoPreview} 
                          controls 
                          className="w-full h-[200px] object-contain rounded-md"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={clearVideo}
                          disabled={uploadingVideo}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        {uploadingVideo && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground">MP4, WebM or AVI (max. 20MB)</p>
                        <Input
                          ref={videoInputRef}
                          id="video-upload"
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={handleVideoChange}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4"
                          onClick={() => videoInputRef.current?.click()}
                          disabled={uploadingVideo}
                        >
                          {uploadingVideo ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            "Select Video"
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Upload Status */}
            {(uploadingImage || uploadingVideo) && (
              <div className="text-sm text-blue-600 p-3 bg-blue-50 rounded-md">
                {uploadingImage && "Uploading image... "}
                {uploadingVideo && "Uploading video... "}
                Please wait before submitting.
              </div>
            )}

            {/* Public/Private Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="public-toggle">Visibility</Label>
                <div className="text-sm text-muted-foreground">
                  {formData.public ? "Anyone can view this blog" : "Only you can view this blog"}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="public-toggle" className="text-sm">
                  {formData.public ? "Public" : "Private"}
                </Label>
                <Switch 
                  id="public-toggle" 
                  checked={formData.public} 
                  onCheckedChange={handleToggleChange} 
                />
              </div>
            </div>

          </CardContent>

          <CardFooter className="flex justify-end space-x-2 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={isSubmitting}
            >
              Reset
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || uploadingImage || uploadingVideo}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                "Create Blog"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}