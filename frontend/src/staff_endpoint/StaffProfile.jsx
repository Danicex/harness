import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  User,
  Mail,
  Calendar,
  Edit,
  Download,
  FileText,
  UserCircle,
  Clock,
  Shield,
  Loader2,
  LogOut,
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useMyContext } from '@/Context/AppContext';

const ProfilePage = () => {
  const [staffData, setStaffData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const { toast } = useToast();
  const {logout} = useMyContext()
  const navigate  =useNavigate()
  // Fetch staff data
  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const response = await api.get('/staff/profile');
      
      setStaffData(response.data);
      setEditedBio(response.data.bio || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

 const handleLogout = () => {
    logout()
    navigate('/')
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!staffData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-center">Profile Not Found</CardTitle>
            <CardDescription className="text-center">
              Unable to load profile data
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRoleBadgeColor = (role) => {
    if (!role) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    const roleColors = {
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      manager: 'bg-blue-100 text-blue-800 border-blue-200',
      staff: 'bg-green-100 text-green-800 border-green-200',
      sales_attendant: 'bg-orange-100 text-orange-800 border-orange-200',
      default: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return roleColors[role.toLowerCase()] || roleColors.default;
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Section */}
        <Button onClick={handleLogout} variant="outline" className="text-red-400">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold ">My Profile</h1>
         
        </div>

        {/* Main Profile Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left Column - Avatar & Basic Info */}
              <div className="lg:w-1/3 space-y-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-32 w-32 ring-4 ring-primary/10 ring-offset-2">
                    <AvatarImage src={staffData.image_url} alt={staffData.name} />
                    <AvatarFallback className="text-4xl bg-primary/5">
                      {getInitials(staffData.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="mt-4">
                    <h2 className="text-2xl font-bold">{staffData.name}</h2>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <Badge className={getRoleBadgeColor(staffData.role)}>
                        {staffData.role || 'Staff Member'}
                      </Badge>
                    </div>
                  </div>

                  <div className="w-full mt-4 space-y-3 text-left">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>{staffData.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {formatDate(staffData.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Shield className="h-4 w-4" />
                      <span>Staff ID: #{staffData.id}</span>
                    </div>
                  </div>
                </div>

                {staffData.cv_url && (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => window.open(staffData.cv_url, '_blank')}
                  >
                    <FileText className="h-4 w-4" />
                    View CV / Resume
                  </Button>
                )}
              </div>

              {/* Right Column - Details & Bio */}
              <div className="lg:w-2/3 space-y-6">
                {/* Bio Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <UserCircle className="h-5 w-5" />
                    About Me
                  </h3>
                 
                </div>

                <Separator />

                {/* Tabs Section */}
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="details" className="gap-2">
                      <User className="h-4 w-4" />
                      Details
                    </TabsTrigger>
                    
                  </TabsList>

                  <TabsContent value="details" className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-sm">Full Name</Label>
                        <p className="font-medium">{staffData.name}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-sm">Email</Label>
                        <p className="font-medium">{staffData.email}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-sm">Role</Label>
                        <p className="font-medium capitalize">{staffData.role || 'Not specified'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-sm">Staff ID</Label>
                        <p className="font-medium">#{staffData.id}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-sm">Admin ID</Label>
                        <p className="font-medium">#{staffData.admin_id}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-sm">Member Since</Label>
                        <p className="font-medium">{formatDate(staffData.created_at)}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="space-y-4 pt-4">
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p>Activity tracking coming soon</p>
                      <p className="text-sm">Recent actions and performance metrics will appear here</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="settings" className="space-y-4 pt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Account Settings</CardTitle>
                        <CardDescription>
                          Manage your account preferences
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Email Notifications</p>
                            <p className="text-sm text-gray-500">Receive updates via email</p>
                          </div>
                          <Button variant="outline">Configure</Button>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Change Password</p>
                            <p className="text-sm text-gray-500">Update your password regularly</p>
                          </div>
                          <Button variant="outline">Change</Button>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Session Management</p>
                            <p className="text-sm text-gray-500">View active sessions</p>
                          </div>
                          <Button variant="outline">Manage</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;