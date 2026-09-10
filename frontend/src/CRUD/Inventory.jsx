"use client"

import { useMyContext } from '@/Context/AppContext';
import api from '@/lib/api';
import React, { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, X } from 'lucide-react';

export function CreateInventory({ setNewInventory, setReload, reload}) {
  const { admin_id } = useMyContext();
  const [success, setSuccess] = useState(null);
  const [image, setImage] = useState(null);
  const [productData, setProductData] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
    quantity: '',
  });
  const [isSuccess, setIsSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [uploading, setUploading] = useState(false)


  const handleChange = (e) => {
    const { name, value } = e.target;
    setProductData(prev => ({ ...prev, [name]: value }));
  };



  const handlePost = async (e) => {
    e.preventDefault();
    setUploading(true);

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


    try {

      const formData = new FormData();
      formData.append('name', productData.name);
      formData.append('price', parseFloat(productData.price).toString()); // Convert to string for FormData
      if (productData.description) {
        formData.append('description', productData.description);
      }
      if (productData.category) {
        formData.append('category', productData.category);
      }
      if (productData.quantity) {
        formData.append('quantity', productData.quantity.toString());
      }

      // Add image if present
      if (image) {
        formData.append('image', image); 
      }

      // Send to backend
      const res = await api.post(`/product/create_product`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });


      // Show success
      setIsSuccess(true);
      setSuccessMessage(image ? 'Product created with image successfully!' : 'Product created successfully!');

      // Reset form
      setProductData({
        name: '',
        price: '',
        category: '',
        description: '',
        quantity: '',
      });
      setImage(null);

      setTimeout(() => {
        setIsSuccess(false);
        setNewInventory(false);
      }, 1000);
      setReload(!reload)
    } catch (err) {
      console.error('Error creating product:', err);
      setSuccess('Action was unsuccessful');
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } finally {
      setUploading(false);
    }
  };


  // Cleanup effect
  useEffect(() => {
    return () => {
      setIsSuccess(false);
      setSuccessMessage('');
      setSuccess(null);
    }
  }, []);

  return (
    <div className='absolute z-20  m-auto left-0  right-0 top-0'>
      {/* Success Message */}
      {isSuccess && (
        <div className="max-w-md mx-auto mt-10 mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
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
      {success && success.includes('unsuccessful') && (
        <div className='max-w-md mx-auto mt-10 mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md'>
          <p>{success}</p>
        </div>
      )}

      {/*form */}
      <Card className="max-w-md mx-auto mt-10 shadow-xl">
        <div className="flex justify-between items-center p-6 pb-0">
          <CardTitle>Add New Product</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNewInventory(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardContent className="pt-6">
          <form onSubmit={handlePost} className="space-y-4">
            <div>
              <Label htmlFor="image" className={"py-3"}>Image</Label>
              <Input name="image" onChange={(e) => setImage(e.target.files[0])} type="file" />
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input name="name" value={productData.name} onChange={handleChange} required placeholder='Pie' />
            </div>

            <div>
              <Label htmlFor="price">Price</Label>
              <Input type="number" name="price" value={productData.price} onChange={handleChange} required placeholder='$20' />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input name="category" value={productData.category} onChange={handleChange} required placeholder='category' />
            </div>

            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input type="number" name="quantity" value={productData.quantity} onChange={handleChange} required placeholder='1' />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea name="description" value={productData.description} onChange={handleChange} required placeholder='a good meal for the family' />
            </div>


            <Button type="submit" className="w-full">Create Product</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export function UpdateInventory({ setEditInventory, id, data, setReload, reload }) {
  const { api_endpoint, admin_id } = useMyContext();
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  
  const [productData, setProductData] = useState({
    name: data?.name || '',
    price: data?.price || '',
    category: data?.category || '',
    description: data?.description || '',
    quantity: data?.quantity || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProductData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    
    // Create FormData for multipart/form-data upload
    const formData = new FormData();
    
    // Add fields only if they have values
    if (productData.name) formData.append('name', productData.name);
    if (productData.price) formData.append('price', productData.price.toString());
    if (productData.description) formData.append('description', productData.description);
    if (productData.category) formData.append('category', productData.category);
    if (productData.quantity) formData.append('quantity', productData.quantity.toString());
    if (imageFile) formData.append('image', imageFile);
    
    try {
      const response = await api.put(
        `/product/update_product/${id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      // Success handling
      setIsSuccess(true);
      setSuccessMessage(response.data?.message || 'Product updated successfully!');
      
   
      setReload(!reload);
      
      // Auto close after 2 seconds
      setTimeout(() => {
        setIsSuccess(false);
        setEditInventory(false);
      }, 2000);
      
    } catch (err) {
      console.error('Update error:', err);
      const errorMsg = err.response?.data?.detail || 'Action was unsuccessful. Please try again.';
      setErrorMessage(errorMsg);
      
      // Auto clear error after 3 seconds
      setTimeout(() => {
        setErrorMessage('');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup image preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='w-full max-w-md mx-4'>
        {/* Success Message */}
        {isSuccess && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md animate-in fade-in duration-300">
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
          <div className='mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md animate-in fade-in duration-300'>
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

        {/* Form Card */}
        <Card className="shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 pb-0">
            <CardTitle>Edit Product</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditInventory(false)}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <CardContent className="pt-6">
            <form onSubmit={handlePost} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name"
                  name="name" 
                  value={productData.name} 
                  onChange={handleChange} 
                  required 
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="price">Price</Label>
                <Input 
                  id="price"
                  type="number" 
                  step="0.01"
                  name="price" 
                  value={productData.price} 
                  onChange={handleChange} 
                  required 
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input 
                  id="category"
                  name="category" 
                  value={productData.category} 
                  onChange={handleChange} 
                  required 
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input 
                  id="quantity"
                  type="number" 
                  name="quantity" 
                  value={productData.quantity} 
                  onChange={handleChange} 
                  required 
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  name="description" 
                  value={productData.description} 
                  onChange={handleChange} 
                  required 
                  disabled={loading}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="image">Image</Label>
                <div className="mt-1 flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-20 h-20 object-cover rounded-md border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : data?.image_url && (
                    <div className="relative">
                      <img 
                        src={`${api_endpoint}/${data.image_url}`} 
                        alt={data.name} 
                        className="w-20 h-20 object-cover rounded-md border"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input 
                      id="image"
                      name="image" 
                      onChange={handleImageChange} 
                      type="file" 
                      accept="image/*"
                      disabled={loading}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to keep current image
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Product'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
