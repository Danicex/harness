"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import api from "@/lib/api"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useMyContext } from "@/Context/AppContext"

export function CreateRoom({ setNewRoom, setError , setReload, reload}) {
  const { admin_id } = useMyContext()
  const [roomData, setRoomData] = useState({
    number: '',
    price: '',
    room_type: '',
    description: '',
    status: 'available',
  })
  const [isSuccess, setIsSuccess] = useState(false)
  const [image, setImage] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e) => {
    const file = e.target.files[0]

    if (!file) return

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      e.target.value = '' // Clear input
      return
    }

    // Check file size (5MB = 5 * 1024 * 1024 bytes)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image is too large (max 5MB)')
      e.target.value = '' // Clear input
      return
    }

    setImage(file)
  }

  const removeImage = () => {
    setImage(null)
    document.getElementById("image-upload").value = ''
  }


  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData();
      try {
      // Validate required fields
      if (!roomData.number || !roomData.price) {
        alert('Please fill in all required fields');
        setUploading(false);
        return;
      }

      // Validate image
      if (image) {
        formData.append('image', image)
      }
      formData.append('number', roomData.number);
      formData.append('price', roomData.price.toString());
      formData.append('description', roomData.description || '');
      formData.append('room_type', roomData.room_type || '');
      formData.append('room_status', roomData.status || 'available');

      const response = await api.post(`/room/create_room`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status >= 200 && response.status < 300) {
        setIsSuccess(true);
        setSuccessMessage("Room created successfully!");

        // Reset form
        setRoomData({
          number: "",
          price: "",
          description: "",
          status: "available",
        });
      setReload(!reload)
        setImage(null);
        document.getElementById("image-upload").value = "";

        // Auto hide after 3 seconds
        setTimeout(() => {
          setIsSuccess(false);
          setNewRoom(false);
        }, 1000);
      } else {
        setError("Failed to create room. Please try again.");
      }

    } catch (error) {
      console.error("An error occurred:", error);
      setError(error.response?.data?.detail || "Failed to create room. Please try again.");
    } finally {
      setUploading(false);
    }
  };


  // Clear success message when component unmounts or when closing manually
  useEffect(() => {
    return () => {
      setIsSuccess(false)
      setSuccessMessage('')
    }
  }, [])

  return (
    <div className="absolute m-auto top-0 left-0 right-0 bg-black/50 flex items-center justify-center z-10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Room Details</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setNewRoom(false)} >
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

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-upload">Room Image *</Label>
              <div className="grid gap-4">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("image-upload")?.click()}
                    disabled={uploading}
                  >
                    Choose Image
                  </Button>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                  />
                  <span className="text-sm text-muted-foreground">
                    {image ? "1 image selected" : "No image selected"}
                  </span>
                </div>

                {/* Selected image preview */}
                {image && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Selected Image:</p>
                    <div className="relative group max-w-xs">
                      <div className="aspect-square rounded-md border overflow-hidden">
                        <img
                          src={URL.createObjectURL(image)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={removeImage}
                        disabled={uploading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <div className="text-xs truncate mt-1 px-1">
                        {image.name}
                      </div>
                      <div className="text-xs text-muted-foreground px-1">
                        {(image.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Maximum 1 image, 5MB. Click X to remove.
                    </p>
                  </div>
                )}
              </div>
            </div>

           

            <div className="space-y-2">
              <Label htmlFor="number">Room Number *</Label>
              <Input
                id="number"
                value={roomData.number}
                onChange={(e) => setRoomData({ ...roomData, number: e.target.value })}
                placeholder="Enter room number"
                required
              />
            </div>

 <div className="space-y-2">
              <Label htmlFor="room_type">Room Type *</Label>
              <Input
                id="room_type"
                value={roomData.room_type}
                onChange={(e) => setRoomData({ ...roomData, room_type: e.target.value })}
                placeholder="Enter room type"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                value={roomData.price}
                onChange={(e) =>
                  setRoomData({ ...roomData, price: e.target.value })
                }
                placeholder="Enter price"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={roomData.description}
                onChange={(e) =>
                  setRoomData({ ...roomData, description: e.target.value })
                }
                placeholder="Enter room description"
                rows={3}
              />
            </div>


          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewRoom(false);
                setRoomData({
                  number: '',
                  price: '',
                  description: '',
                  status: 'available',
                })
                setImage(null)
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Save Room'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}


export function UpdateRoom({ roomId, setEditRoom, data ,  setReload, reload}) {
  const { admin_id } = useMyContext();
  const [roomData, setRoomData] = useState({
    number: data.number,
    price: data.price,
    description: data.description,
    status: data.status,
  });
  
  // State for image uploads
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(data.image || null);
  const [uploading, setUploading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    
    const formData = new FormData();
    
    // Add all fields as individual form fields (not JSON)
    formData.append('number', roomData.number);
      formData.append('price', roomData.price.toString());
      formData.append('description', roomData.description || '');
      formData.append('room_status', roomData.status || 'available');
      formData.append('room_type', roomData.room_type || 'standard romm');
      formData.append('admin_id', admin_id.toString());
      
      // Add image if a new one was selected
      if (image) {
        formData.append('image', image);
      }
      
      try {
      const response = await api.put(
        `/room/update_room/${roomId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      // Clean up preview URL
      if (imagePreview && imagePreview !== data.image) {
        URL.revokeObjectURL(imagePreview);
      }
      setEditRoom(false);
      setReload(!reload)
    } catch (err) {
      console.error("Error updating room:", err.response?.data || err.message);
      // Handle error (show toast notification, etc.)
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="absolute m-auto top-0 left-0 right-0 bg-black/50 flex items-center justify-center z-10 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Update Room</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setEditRoom(false)}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </CardHeader>
        <form onSubmit={handleUpdateSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="number">Room Number</Label>
              <Input
                id="number"
                value={roomData.number}
                onChange={(e) => setRoomData({ ...roomData, number: e.target.value })}
                placeholder="Enter room number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                value={roomData.price}
                onChange={(e) => setRoomData({ ...roomData, price: e.target.value })}
                placeholder="Enter price"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room_type">Room Type</Label>
              <Input
                id="room_type"
                type="text"
                value={roomData.room_type}
                onChange={(e) => setRoomData({ ...roomData, room_type: e.target.value })}
                placeholder="Enter Room Type"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={roomData.status}
                onChange={(e) => setRoomData({ ...roomData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
                <option value="booked">Booked</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={roomData.description}
                onChange={(e) => setRoomData({ ...roomData, description: e.target.value })}
                placeholder="Enter room description"
                rows={3}
              />
            </div>

            {/* Image Upload Section */}
            <div className="space-y-2">
              <Label htmlFor="image">Room Image</Label>
              {imagePreview && (
                <div className="mb-2">
                  <img 
                    src={imagePreview} 
                    alt="Room preview" 
                    className="w-full h-32 object-cover rounded-md"
                  />
                </div>
              )}
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="cursor-pointer"
              />
              <p className="text-sm text-gray-500">
                Leave empty to keep current image
              </p>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setEditRoom(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? "Updating..." : "Update Room"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
