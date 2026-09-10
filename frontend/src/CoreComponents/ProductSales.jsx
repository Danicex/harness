// React Core
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { format } from "date-fns";

// Local utilities
import { cn } from "@/lib/utils";
// Hooks
import { useToast } from '@/hooks/use-toast';

// Shadcn UI Components - Badge & Button
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Shadcn UI Components - Calendar & Popover
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Shadcn UI Components - Card
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Shadcn UI Components - Dialog
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Shadcn UI Components - Form inputs
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Shadcn UI Components - Select
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Shadcn UI Components - Table
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Shadcn UI Components - Tabs
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateSale from './CreateSale';
// Shadcn UI Components - Pagination
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Icons (merged all into one import)
import {
  Calendar as CalendarIcon,
  Edit,
  ListTodo,
  Loader2,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  X
} from 'lucide-react';
import { printReceipt } from './PrintReceipt'; 
import Receipt from './ReceiptTemplate'; 
import api from '@/lib/api';



const user_role = localStorage.getItem('user_role');

const RenderSales = () => {
  const [saleList, setSaleList] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [viewType, setViewType] = useState('all'); // 'all', 'daily', 'monthly'
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSale, setSelectedSale] = useState(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const getTodayDate = () => {
    const today = new Date();
    return format(today, 'yyyy-MM-dd');
  };

  const getCurrentMonth = () => {
    const today = new Date();
    return format(today, 'yyyy-MM');
  };

  const getSales = async (type = 'all', param = null) => {
    setIsLoading(true);
    try {
      let response;
      const today = getTodayDate();
      const currentMonth = getCurrentMonth();

      switch (type) {
        case 'daily':
          if (!param) param = today;
          response = await api.get(`/sales/period/${param}`);
          break;
        case 'monthly':
          if (!param) param = currentMonth;
          response = await api.get(`/sales/monthly/${param}`);
          break;
        default:
          response = await api.get(`/sales/period/${today}`);
          break;
      }

      setSaleList(Array.isArray(response.data) ? response.data : []);
      console.log(response.data)
      setFilteredSales(Array.isArray(response.data) ? response.data : []);
      setCurrentPage(1);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch sales',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getSales('all');
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...saleList];

    if (searchTerm) {
      filtered = filtered.filter(
        (sale) =>
          sale.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sale.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (paymentMethodFilter && paymentMethodFilter.toLowerCase() !== 'all') {
      filtered = filtered.filter(
        (sale) =>
          sale.payment_method?.toLowerCase() === paymentMethodFilter.toLowerCase()
      );
    }

    setFilteredSales(filtered);
    setCurrentPage(1);
  }, [searchTerm, paymentMethodFilter, saleList]);

  const handleDateSelect = (date) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setSelectedDate(date);
      setViewType('daily');
      getSales('daily', formattedDate);
    }
  };

  const handleMonthSelect = (month) => {
    if (month) {
      const formattedMonth = format(month, 'yyyy-MM');
      setSelectedMonth(month);
      setViewType('monthly');
      getSales('monthly', formattedMonth);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPaymentMethodFilter('');
    setSelectedDate(null);
    setSelectedMonth(null);
    setViewType('all');
    getSales('all');
  };

  const handleEditClick = (sale) => {
    setSelectedSale(sale);
    setIsUpdateDialogOpen(true);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSales = filteredSales.slice(startIndex, endIndex);

  const getPaymentBadge = (method) => {
    const methodColors = {
      cash: 'bg-green-100 text-green-700',
      card: 'bg-blue-100 text-blue-700',
      bank_transfer: 'bg-purple-100 text-purple-700',
      mobile_money: 'bg-orange-100 text-orange-700',
    };
    return (
      <Badge className={methodColors[method?.toLowerCase()] || 'bg-gray-100'}>
        {method || 'N/A'}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales Management</h1>
        <Button variant="outline" onClick={clearFilters}>
          <X className="mr-2 h-4 w-4" />
          Clear All Filters
        </Button>
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div>
              <Label>Search by Customer or Product</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Daily Date Picker */}
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

        {/* Monthly Picker */}
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

      {/* Sales Table */}
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
                  <TableHead>Product List</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No sales found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{sale.id}</TableCell>
                      <TableCell className="font-medium">{sale.customer_name || 'N/A'}</TableCell>
                      <TableCell className="font-medium relative">
                        <div className="truncate-overflow">
                          {sale.products_data?.map((i, index) => (
                            <span key={index}>
                              {i.product_name}
                              {index < sale.products_data.length - 1 && ', '}
                            </span>
                          )) || 'N/A'}
                        </div>
                      </TableCell>

                      <TableCell>₦{parseFloat(sale.total_amount || 0).toLocaleString()}</TableCell>
                      <TableCell>{getPaymentBadge(sale.payment_method)}</TableCell>
                      <TableCell>
                        {sale.created_at
                          ? format(new Date(sale.created_at), 'PPP')
                          : 'N/A'}
                      </TableCell>

                      <TableCell>

                        {user_role === "admin" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(sale)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        )}

                        <Button
                          onClick={() => {
                            const sale_data = {
                              id: `INV-${sale.id}`,
                              date: format(new Date(sale.created_at), 'PPP'),
                              total: sale.total_amount,
                              items: sale.products_data.map(item => ({
                                id: item.id,
                                name: item.name,
                                quantity: item.quantity,
                                price: item.price
                              }))
                            };
                            printReceipt(<Receipt sale={sale_data} />, {
                              width: 80,
                              title: "Receipt",
                            });
                          }}
                        >
                          <Printer className="h-2 w-2" />
                        </Button>
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

      {/* Update Sale Dialog */}
      {selectedSale && (
        <UpdateSale
          sale={selectedSale}
          open={isUpdateDialogOpen}
          onOpenChange={setIsUpdateDialogOpen}
          onUpdate={() => {
            getSales(
              viewType,
              viewType === 'daily'
                ? format(selectedDate, 'yyyy-MM-dd')
                : viewType === 'monthly'
                  ? format(selectedMonth, 'yyyy-MM')
                  : null
            );
          }}
        />
      )}
    </div>
  );
};

// UpdateSale Component
const UpdateSale = ({ sale, open, onOpenChange, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: '',
    product_id: '',
    staff_id: '',
    price: '',
    quantity: '',
    payment_method: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (sale) {
      setFormData({
        name: sale.name || '',
        product_id: sale.product_id?.toString() || '',
        staff_id: sale.staff_id?.toString() || '',
        price: sale.price || '',
        quantity: sale.quantity || '',
        payment_method: sale.payment_method || '',
      });
    }
  }, [sale]);

  const handleUpdateSale = async () => {
    setIsSubmitting(true);
    try {
      const updateData = new FormData();
      if (formData.name) updateData.append('name', formData.name);
      if (formData.product_id) updateData.append('product_id', formData.product_id);
      if (formData.staff_id) updateData.append('staff_id', formData.staff_id);
      if (formData.price) updateData.append('price', formData.price);
      if (formData.quantity) updateData.append('quantity', formData.quantity);
      if (formData.payment_method) updateData.append('payment_method', formData.payment_method);

      await api.put(`/sales/update_sale/${sale.id}`, updateData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast({
        title: 'Success',
        description: 'Sale updated successfully!',
      });

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update sale',
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
          <DialogTitle>Update Sale #{sale?.id}</DialogTitle>
          <DialogDescription>Edit the sale details below</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sale Info Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Sale Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span>Product:</span>
              <span>{sale?.product_name || 'N/A'}</span>
              <span>Date:</span>
              <span>
                {sale?.created_at ? format(new Date(sale.created_at), 'PPP') : 'N/A'}
              </span>
            </div>
          </div>

          {/* Customer Name */}
          <div>
            <Label htmlFor="edit_name">Customer Name</Label>
            <Input
              id="edit_name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Product ID and Staff ID */}
           {user_role === "admin" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_product_id">Product ID</Label>
              <Input
                id="edit_product_id"
                type="number"
                value={formData.product_id}
                onChange={(e) =>
                  setFormData({ ...formData, product_id: e.target.value })
                }
              />
            </div>
               {user_role == "admin" && (
            <div>
              <Label htmlFor="edit_staff_id">Staff ID</Label>
              <Input
                id="edit_staff_id"
                type="number"
                value={formData.staff_id}
                onChange={(e) =>
                  setFormData({ ...formData, staff_id: e.target.value })
                }
              />
            </div>
               )}
          </div>
           )}

          {/* Price and Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_price">Price (₦)</Label>
              <Input
                id="edit_price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_quantity">Quantity</Label>
              <Input
                id="edit_quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <Label>Payment Method</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) =>
                setFormData({ ...formData, payment_method: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Total Preview */}
          {formData.price && formData.quantity && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <span className="font-semibold">Total: </span>₦
              {(parseFloat(formData.price) * parseFloat(formData.quantity)).toLocaleString()}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleUpdateSale} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};




export default function SalesList() {
  const [activeTab, setActiveTab] = useState('create');

  return (
    <div className="">
      <div className="border-none shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-3xl font-bold">Sales Management</CardTitle>
          <CardDescription>
            Manage your sales transactions efficiently
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
              <TabsTrigger value="create" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Create Sale
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <ListTodo className="w-4 h-4" />
                Sales List
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="mt-0">
              <CreateSale />
            </TabsContent>

            <TabsContent value="list" className="mt-0">
              <RenderSales />
            </TabsContent>
          </Tabs>
        </CardContent>
      </div>
    </div>
  );
}
