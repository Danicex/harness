// External libraries
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Edit, Loader2, Search, X, Printer, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// shadcn/ui components
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { printReceipt } from './PrintReceipt'; 
import Receipt from './ReceiptTemplate'; 


// Utilities & Hooks
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';


const user_role = localStorage.getItem('user_role');


function CreateBooking() {
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [roomNumberFilter, setRoomNumberFilter] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    check_in: '',
    check_out: '',
    payment_method: '',
  });

  const [bookingForm, setBookingForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    check_in: null,
    check_out: null,
    payment_method: '',
    duration: 0,
    status: '',
    price: 0,
  });

  // Validation functions
  const validateCustomerName = (name) => {
    if (!name || name.trim() === '') {
      return 'Full name is required';
    }
    if (name.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    if (name.trim().length > 100) {
      return 'Name must be less than 100 characters';
    }
    if (!/^[a-zA-Z\s\-']+$/.test(name.trim())) {
      return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }
    return '';
  };

  const validateEmail = (email) => {
    if (!email || email.trim() === '') {
      return 'Email address is required';
    }
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address (e.g., name@example.com)';
    }
    if (email.trim().length > 255) {
      return 'Email must be less than 255 characters';
    }
    return '';
  };

  const validatePhone = (phone) => {
    if (!phone || phone.trim() === '') {
      return 'Phone number is required';
    }
    // Remove common formatting characters for validation
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    if (!/^\d{10,15}$/.test(cleanPhone)) {
      return 'Please enter a valid phone number (10-15 digits)';
    }
    return '';
  };

  const validateCheckIn = (checkIn, checkOut) => {
    if (!checkIn) {
      return 'Check-in date is required';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(checkIn);
    
    if (checkInDate < today) {
      return 'Check-in date cannot be in the past';
    }
    if (checkOut && checkInDate >= new Date(checkOut)) {
      return 'Check-in must be before check-out';
    }
    return '';
  };

  const validateCheckOut = (checkIn, checkOut) => {
    if (!checkOut) {
      return 'Check-out date is required';
    }
    if (!checkIn) {
      return 'Please select check-in date first';
    }
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (checkOutDate <= checkInDate) {
      return 'Check-out must be after check-in';
    }
    const maxStay = 365; // Maximum 1 year stay
    const daysDiff = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > maxStay) {
      return `Stay cannot exceed ${maxStay} days`;
    }
    return '';
  };

  const validatePaymentMethod = (method) => {
    if (!method) {
      return 'Payment method is required';
    }
    return '';
  };

  // Field-specific validation handlers
  const handleFieldChange = (field, value) => {
    setBookingForm({ ...bookingForm, [field]: value });
    
    let error = '';
    switch (field) {
      case 'customer_name':
        error = validateCustomerName(value);
        break;
      case 'customer_email':
        error = validateEmail(value);
        break;
      case 'customer_phone':
        error = validatePhone(value);
        break;
      case 'check_in':
        error = validateCheckIn(value, bookingForm.check_out);
        break;
      case 'check_out':
        error = validateCheckOut(bookingForm.check_in, value);
        break;
      case 'payment_method':
        error = validatePaymentMethod(value);
        break;
    }
    setValidationErrors({ ...validationErrors, [field]: error });
  };

  // Validate all fields before submission
  const validateForm = () => {
    const errors = {
      customer_name: validateCustomerName(bookingForm.customer_name),
      customer_email: validateEmail(bookingForm.customer_email),
      customer_phone: validatePhone(bookingForm.customer_phone),
      check_in: validateCheckIn(bookingForm.check_in, bookingForm.check_out),
      check_out: validateCheckOut(bookingForm.check_in, bookingForm.check_out),
      payment_method: validatePaymentMethod(bookingForm.payment_method),
    };
    
    setValidationErrors(errors);
    
    // Return true if no errors
    return Object.values(errors).every(error => error === '');
  };

  // Get rooms
  const getRoomList = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/room/get_rooms');
      setRooms(Array.isArray(res.data) ? res.data : []);
      setFilteredRooms(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch rooms',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getRoomList();
  }, []);

  // Filter rooms by room number
  useEffect(() => {
    if (roomNumberFilter === '') {
      setFilteredRooms(rooms);
    } else {
      const filtered = rooms.filter((room) =>
        room.number?.toString().toLowerCase().includes(roomNumberFilter)
      );
      setFilteredRooms(filtered);
    }
  }, [roomNumberFilter, rooms]);

  // Calculate number of nights and total price
  const calculateNights = () => {
    if (bookingForm.check_in && bookingForm.check_out) {
      const checkIn = new Date(bookingForm.check_in);
      const checkOut = new Date(bookingForm.check_out);
      const diffTime = Math.abs(checkOut - checkIn);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  const numberOfNights = calculateNights();
  const totalPrice = selectedRoom?.price * numberOfNights || 0;

  // Handle create booking
  const handleCreateBooking = async () => {
    if (!selectedRoom) return;

    // Validate all fields
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('room_id', selectedRoom.id || selectedRoom.room_id);
      formData.append('price', totalPrice.toString());
      formData.append('duration', numberOfNights.toString());
      formData.append('status', bookingForm.status);
      formData.append('customer_name', bookingForm.customer_name.trim());
      formData.append('room_number', selectedRoom.number);
      formData.append('customer_email', bookingForm.customer_email.trim());
      formData.append('customer_phone', bookingForm.customer_phone.trim());
      formData.append('payment_method', bookingForm.payment_method);
      formData.append('check_in', format(bookingForm.check_in, 'yyyy-MM-dd'));
      formData.append('check_out', format(bookingForm.check_out, 'yyyy-MM-dd'));

      await api.post('/booking/create_booking', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast({
        title: 'Success',
        description: 'Booking created successfully!',
      });

      setIsDialogOpen(false);
      setSelectedRoom(null);
      resetForm();
      getRoomList();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to create booking',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setBookingForm({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      check_in: null,
      check_out: null,
      payment_method: '',
      duration: 0,
      price: 0,
    });
    setValidationErrors({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      check_in: '',
      check_out: '',
      payment_method: '',
    });
  };

  const handleRoomClick = (room) => {
    if (room.status === 'occupied') {
      toast({
        title: 'Room Unavailable',
        description: 'This room is currently occupied. Please select another room.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedRoom(room);
    setIsDialogOpen(true);
  };

  return (
    <div className="container mx-auto">
      {/* Filter Section */}
      <div className="mb-6">
        <Label htmlFor="roomFilter">Filter by Room Number</Label>
        <Input
          id="roomFilter"
          type="text"
          placeholder="Enter room number..."
          value={roomNumberFilter}
          onChange={(e) => setRoomNumberFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Rooms Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRooms.map((room) => (
            <Card
              key={room.id || room.room_id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                room.status === 'occupied'
                  ? ' opacity-60 cursor-not-allowed'
                  : 'hover:scale-105'
              }`}
              onClick={() => handleRoomClick(room)}
            >
              <CardHeader>
                <CardTitle className='capitalize'>Room {room.number}</CardTitle>
                <CardDescription>
                  {room.room_type || 'Standard Room'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <img src={room.image_url} alt={room.number} className='mb-2' />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Price:</span>
                    <span>₦{room.price?.toLocaleString()}/night</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Status:</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        room.status === 'available'
                          ? 'bg-green-100 text-green-700'
                          : room.status === 'occupied'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {room.status || 'Available'}
                    </span>
                  </div>
                  {room.capacity && (
                    <div className="flex justify-between">
                      <span className="font-semibold">Capacity:</span>
                      <span>{room.capacity} guests</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={room.status === 'occupied' ? 'secondary' : 'default'}
                  disabled={room.status === 'occupied'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRoomClick(room);
                  }}
                >
                  {room.status === 'occupied' ? 'Not Available' : 'Book Now'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Booking Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book Room {selectedRoom?.room_number}</DialogTitle>
            <DialogDescription>
              Fill in the details to complete your booking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Room Info */}
            <Card className="p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Room Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span>Room Number:</span>
                <span>{selectedRoom?.room_number}</span>
                <span>Price per night:</span>
                <span>₦{selectedRoom?.price?.toLocaleString()}</span>
                <span>Status:</span>
                <span className="text-green-600 font-semibold">Available</span>
              </div>
            </Card>

            {/* Customer Details with Validation */}
            <div>
              <Label htmlFor="customer_name">Full Name *</Label>
              <Input
                id="customer_name"
                className={validationErrors.customer_name ? 'border-red-500 focus:ring-red-500' : ''}
                value={bookingForm.customer_name}
                onChange={(e) => handleFieldChange('customer_name', e.target.value)}
                onBlur={(e) => handleFieldChange('customer_name', e.target.value)}
                placeholder="John Doe"
              />
              {validationErrors.customer_name && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.customer_name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="customer_email">Email Address *</Label>
              <Input
                id="customer_email"
                type="email"
                className={validationErrors.customer_email ? 'border-red-500 focus:ring-red-500' : ''}
                value={bookingForm.customer_email}
                onChange={(e) => handleFieldChange('customer_email', e.target.value)}
                onBlur={(e) => handleFieldChange('customer_email', e.target.value)}
                placeholder="john@example.com"
              />
              {validationErrors.customer_email && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.customer_email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="customer_phone">Phone Number *</Label>
              <Input
                id="customer_phone"
                type="tel"
                className={validationErrors.customer_phone ? 'border-red-500 focus:ring-red-500' : ''}
                value={bookingForm.customer_phone}
                onChange={(e) => handleFieldChange('customer_phone', e.target.value)}
                onBlur={(e) => handleFieldChange('customer_phone', e.target.value)}
                placeholder="+234 123 456 7890"
              />
              {validationErrors.customer_phone && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.customer_phone}</p>
              )}
            </div>
   <div className="space-y-2">
                              <Label htmlFor="status">Status</Label>
                              <select
                                id="status"
                                value={bookingForm.status}
                                onChange={(e) => setRoomData({ ...bookingForm, status: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                              >
                                <option value="checked_in">Check in</option>
                                <option value="pending">Pending</option>
                              </select>
                            </div>
            {/* Date Selection with Validation */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium leading-none">
                  Check-in Date *
                </Label>
                <input
                  type="date"
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2",
                    "text-sm ring-offset-background",
                    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                    "placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "hover:bg-accent hover:text-accent-foreground",
                    "transition-colors",
                    validationErrors.check_in ? "border-red-500 focus:ring-red-500" : ""
                  )}
                  value={bookingForm.check_in || ''}
                  onChange={(e) => handleFieldChange('check_in', e.target.value)}
                />
                {validationErrors.check_in && (
                  <p className="text-red-500 text-sm">{validationErrors.check_in}</p>
                )}
              </div>
                 
              <div className="space-y-2">
                <Label className="text-sm font-medium leading-none">
                  Check-out Date *
                </Label>
                <input
                  type="date"
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2",
                    "text-sm ring-offset-background",
                    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                    "placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "hover:bg-accent hover:text-accent-foreground",
                    "transition-colors",
                    validationErrors.check_out ? "border-red-500 focus:ring-red-500" : ""
                  )}
                  value={bookingForm.check_out || ''}
                  min={bookingForm.check_in || undefined}
                  onChange={(e) => handleFieldChange('check_out', e.target.value)}
                />
                {validationErrors.check_out && (
                  <p className="text-red-500 text-sm">{validationErrors.check_out}</p>
                )}
              </div>
            </div>

            {/* Payment Method with Validation */}
            <div>
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select
                value={bookingForm.payment_method}
                onValueChange={(value) => handleFieldChange('payment_method', value)}
              >
                <SelectTrigger className={validationErrors.payment_method ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.payment_method && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.payment_method}</p>
              )}
            </div>

            {/* Price Summary */}
            {numberOfNights > 0 && (
              <Card className="p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Price Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Number of nights:</span>
                    <span>{numberOfNights}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price per night:</span>
                    <span>₦{selectedRoom?.price?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                    <span>Total Price:</span>
                    <span>₦{totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBooking} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const RenderBookings = () => {
  const [bookingList, setBookingList] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [viewType, setViewType] = useState('all'); // 'all', 'daily', 'monthly'
  const [searchTerm, setSearchTerm] = useState('');
  const [roomNumberFilter, setRoomNumberFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const itemsPerPage = 10;
  const { toast } = useToast();

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return format(today, 'yyyy-MM-dd');
  };

  const getCurrentMonth = () => {
    const today = new Date();
    return format(today, 'yyyy-MM');
  };

  const getBookings = async (type = 'all', param = null) => {
    setIsLoading(true);
    try {
      let response;
      const today = getTodayDate();
      const currentMonth = getCurrentMonth();

      switch (type) {
        case 'daily':
          if (!param) param = today;
          response = await api.get(`/booking/period/${param}`);
          break;
        case 'monthly':
          if (!param) param = currentMonth;
          response = await api.get(`/booking/monthly/${param}`);
          break;
        default:
          // Fetch all bookings - you might need an endpoint for this
          response = await api.get(`/booking/period/${today}`);
          break;
      }

      setBookingList(Array.isArray(response.data) ? response.data : []);
      setFilteredBookings(Array.isArray(response.data) ? response.data : []);
      setCurrentPage(1);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch bookings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getBookings('all');
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...bookingList];

    // Search by customer name
    
if (searchTerm) {
  filtered = filtered.filter(
    (booking) =>
      booking.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.reserve_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

    // Filter by room number
    if (roomNumberFilter) {
      filtered = filtered.filter(booking =>
        booking.number?.toString().includes(roomNumberFilter)
      );
    }



    if (statusFilter && statusFilter.toLowerCase() !== "all") {
  filtered = filtered.filter(booking => 
    booking.status?.toLowerCase() === statusFilter.toLowerCase()
  );
}
    setFilteredBookings(filtered);
    setCurrentPage(1);
  }, [searchTerm, roomNumberFilter, statusFilter, bookingList]);

  const handleDateSelect = (date) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setSelectedDate(date);
      setViewType('daily');
      getBookings('daily', formattedDate);
    }
  };

  const handleMonthSelect = (month) => {
    if (month) {
      const formattedMonth = format(month, 'yyyy-MM');
      setSelectedMonth(month);
      setViewType('monthly');
      getBookings('monthly', formattedMonth);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoomNumberFilter('');
    setStatusFilter('');
    setSelectedDate(null);
    setSelectedMonth(null);
    setViewType('all');
    getBookings('all');
  };

  const handleEditClick = (booking) => {
    setSelectedBooking(booking);
    setIsUpdateDialogOpen(true);
  };

  const update_booking_status = async (booking_id, status)=>{
     const formData = new FormData();
  formData.append("status", status);
    const response = await api.put(
    `/booking/update_booking/${booking_id}`,
    formData
  );
  return response.data;
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBookings = filteredBookings.slice(startIndex, endIndex);

  const getStatusBadge = (status) => {
    const statusColors = {
      confirmed: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-red-100 text-red-700',
      completed: 'bg-blue-100 text-blue-700',
    };
    return (
      <Badge className={statusColors[status?.toLowerCase()] || ''}>
        {status || 'N/A'}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bookings Management</h1>
        <Button variant="outline" onClick={clearFilters}>
          <X className="mr-2 h-4 w-4" />
          Clear All Filters
        </Button>
      </div>

      {/* Calendar and Filters Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Calendar for Date Selection */}

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div>
              <Label>Search by Customer Name</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customer, reserve id..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Room Number</Label>
                <Input
                  placeholder="Room number..."
                  value={roomNumberFilter}
                  onChange={(e) => setRoomNumberFilter(e.target.value)}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Label className="mb-2 block">Select Date (Daily View)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Month Selector */}
        <Card>
          <CardContent className="pt-6">
            <Label className="mb-2 block">Select Month (Monthly View)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedMonth && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedMonth ? format(selectedMonth, 'MMMM yyyy') : 'Pick a month'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedMonth}
                  onSelect={handleMonthSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

      </div>

      {/* Bookings Table */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Room Number</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center">
                      No bookings found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>{booking.id}</TableCell>
                      <TableCell className="font-medium">
                        {booking.customer_name || 'N/A'}
                      </TableCell>
                      <TableCell>{booking.customer_email || 'N/A'}</TableCell>
                      <TableCell>{booking.customer_phone || 'N/A'}</TableCell>
                      <TableCell>{booking.room_number || 'N/A'}</TableCell>
                      <TableCell>{booking.check_in || 'N/A'}</TableCell>
                      <TableCell>{booking.check_out || 'N/A'}</TableCell>
                      <TableCell>{booking.duration || 0} nights</TableCell>
                      <TableCell className="text-green-500">₦{booking.price?.toLocaleString() || 0}</TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell>{booking.payment_method || 'N/A'}</TableCell>
                    <TableCell>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="icon">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end">
      

      {user_role === "admin" && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleEditClick(booking)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Booking
          </DropdownMenuItem>
        </>
      )}

      <DropdownMenuSeparator />

      <DropdownMenuItem
        onClick={() => {
          const receipt_data = {
            id: booking.id,
            date: new Date(booking.created_at).toLocaleString(),
            customer_name: booking.customer_name,
            room_number: booking.room_number,
            room_type: booking.room_type,
            check_in: booking.check_in,
            check_out: booking.check_out,
            duration: booking.duration,
            status: booking.status,
            price: booking.price?.toLocaleString() || 0,
          };

          printReceipt(<Receipt booking={receipt_data} />, {
            width: 80,
            title: "Receipt",
          });
        }}
      >
        <Printer className="mr-2 h-4 w-4" />
        Print Receipt
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          isActive={currentPage === pageNum}
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(pageNum);
                          }}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      {/* Update Booking Dialog */}
      {selectedBooking && (
        <UpdateBooking
          booking={selectedBooking}
          open={isUpdateDialogOpen}
          onOpenChange={setIsUpdateDialogOpen}
          onUpdate={() => {
            getBookings(viewType, viewType === 'daily' ? format(selectedDate, 'yyyy-MM-dd') : 
                        viewType === 'monthly' ? format(selectedMonth, 'yyyy-MM') : null);
          }}
        />
      )}
    </div>
  );
};

// UpdateBooking Component
const UpdateBooking = ({ booking, open, onOpenChange, onUpdate }) => {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    status: '',
    payment_method: '',
    check_in: null,
    check_out: null,
    price: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (booking) {
      setFormData({
        customer_name: booking.customer_name || '',
        customer_email: booking.customer_email || '',
        customer_phone: booking.customer_phone || '',
        status: booking.status || '',
        payment_method: booking.payment_method || '',
        check_in: booking.check_in ? new Date(booking.check_in) : null,
        check_out: booking.check_out ? new Date(booking.check_out) : null,
        price: booking.price || 0,
      });
    }
  }, [booking]);

  const calculateNights = () => {
    if (formData.check_in && formData.check_out) {
      const diffTime = Math.abs(formData.check_out - formData.check_in);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  const handleUpdateBooking = async () => {
    setIsSubmitting(true);
    try {
      const updateData = new FormData();
      updateData.append('customer_name', formData.customer_name);
      updateData.append('customer_email', formData.customer_email);
      updateData.append('customer_phone', formData.customer_phone);
      updateData.append('status', formData.status);
      updateData.append('payment_method', formData.payment_method);
      updateData.append('duration', calculateNights().toString());
      updateData.append('price', formData.price.toString());
      
      if (formData.check_in) {
        updateData.append('check_in', format(formData.check_in, 'yyyy-MM-dd'));
      }
      if (formData.check_out) {
        updateData.append('check_out', format(formData.check_out, 'yyyy-MM-dd'));
      }

      await api.put(`/booking/update_booking/${booking.id}`, updateData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast({
        title: 'Success',
        description: 'Booking updated successfully!',
      });

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update booking',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    setIsSubmitting(true);
    try {
      await api.patch(`/booking/cancel_booking/${booking.id}`);
      
      toast({
        title: 'Success',
        description: 'Booking cancelled successfully!',
      });
      
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to cancel booking',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Booking #{booking?.id}</DialogTitle>
          <DialogDescription>
            Edit the booking details below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Room Info Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Room Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span>Room Number:</span>
              <span>{booking?.room_number}</span>
              <span>Original Price:</span>
              <span>₦{booking?.price?.toLocaleString()}</span>
            </div>
          </div>

          {/* Customer Details */}
          <div>
            <Label htmlFor="edit_customer_name">Full Name *</Label>
            <Input
              id="edit_customer_name"
              value={formData.customer_name}
              onChange={(e) =>
                setFormData({ ...formData, customer_name: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="edit_customer_email">Email Address *</Label>
            <Input
              id="edit_customer_email"
              type="email"
              value={formData.customer_email}
              onChange={(e) =>
                setFormData({ ...formData, customer_email: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="edit_customer_phone">Phone Number *</Label>
            <Input
              id="edit_customer_phone"
              value={formData.customer_phone}
              onChange={(e) =>
                setFormData({ ...formData, customer_phone: e.target.value })
              }
            />
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Check-in Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.check_in && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.check_in ? format(formData.check_in, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.check_in}
                    onSelect={(date) =>
                      setFormData({ ...formData, check_in: date })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Check-out Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.check_out && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.check_out ? format(formData.check_out, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.check_out}
                    onSelect={(date) =>
                      setFormData({ ...formData, check_out: date })
                    }
                    // disabled={!formData.check_in || (date && date <= formData.check_in)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Status and Payment Method */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) =>
                  setFormData({ ...formData, payment_method: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price */}
          <div>
            <Label htmlFor="edit_price">Price (₦)</Label>
            <Input
              id="edit_price"
              type="number"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: parseFloat(e.target.value) })
              }
            />
          </div>

          {/* Duration Display */}
          {calculateNights() > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <span className="font-semibold">Duration:</span> {calculateNights()} nights
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            onClick={handleCancelBooking}
            disabled={isSubmitting}
          >
            Cancel Booking
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleUpdateBooking} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { RenderBookings, UpdateBooking };





export default function BookingList() {
  const [activeTab, setActiveTab] = useState('create');

  return (
    <div className="container mx-auto p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
          <TabsTrigger value="create">Create Booking</TabsTrigger>
          <TabsTrigger value="list">Booking List</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          <CreateBooking />
        </TabsContent>
        
        <TabsContent value="list">
          <RenderBookings />
        </TabsContent>
      </Tabs>
    </div>
  );
}