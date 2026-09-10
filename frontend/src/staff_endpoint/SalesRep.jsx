// React Core
import React, { useEffect, useState } from 'react';
  import { 
  Printer
} from 'lucide-react';
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
  Search, 
  ShoppingCart,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMyContext } from '@/Context/AppContext';
import { printReceipt } from '@/CoreComponents/PrintReceipt';
import Receipt from '@/CoreComponents/ReceiptTemplate';
import api from '@/lib/api';

const CreateSale = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    quantity: 1,
    payment_method: '',
    staff_id: '',
  });
const {user_role} = useMyContext()
  // Get all products
  const getProductList = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/product/get_products');
      setProducts(Array.isArray(res.data) ? res.data : []);
      setFilteredProducts(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch products',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getProductList();
  }, []);

  // Handle create function
  const handleSubmit = async () => {
    if (!selectedProduct) return;
    
    setIsSubmitting(true);
    const formDataToSend = new FormData();
    
    // Append required fields
    formDataToSend.append('product_id', selectedProduct.product_id || selectedProduct.id);
    formDataToSend.append('price', selectedProduct.price);
    formDataToSend.append('quantity', formData.quantity);
    formDataToSend.append('name', selectedProduct.name);
    formDataToSend.append('payment_method', formData.payment_method);
    
    if (formData.staff_id) {
      formDataToSend.append('staff_id', formData.staff_id);
    }

    try {
      const response = await api.post('/sales/create_sale', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast({
        title: 'Success',
        description: 'Sale created successfully!',
        variant: 'default',
      });
      
      setIsDialogOpen(false);
      setSelectedProduct(null);
      setFormData({ quantity: 1, payment_method: '', staff_id: '' });
      
      getProductList();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to create sale',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCardClick = (product) => {
    if (product.quantity <= 0) {
      toast({
        title: 'Out of Stock',
        description: 'This product is currently out of stock',
        variant: 'destructive',
      });
      return;
    }
    setSelectedProduct(product);
    setFormData({
      quantity: 1,
      payment_method: '',
      staff_id: '',
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-8 h-8" />
          Create Sale
        </h1>
        <p className="text-muted-foreground mt-2">Select a product to create a new sale</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
           <Card
  key={product.id || product.product_id}
  className="cursor-pointer transition-all hover:shadow-lg flex flex-col h-full"
  onClick={() => handleCardClick(product)}
>
  <CardHeader className="flex-none">
    <div className="flex justify-between items-start gap-2">
      <CardTitle className="text-lg line-clamp-2 flex-1">{product.name}</CardTitle>
      <Badge
        variant={product.quantity > 0 ? 'default' : 'destructive'}
        className={product.quantity > 0 ? 'bg-green-500 shrink-0' : 'shrink-0'}
      >
        {product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
      </Badge>
    </div>
  </CardHeader>
  
  <CardContent className="flex-1">
    <div className="space-y-3">
      {product.image_url && (
        <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div>
        <p className="text-2xl font-bold text-primary">
          N{parseFloat(product.price).toFixed(2)}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Quantity Available: {product.quantity}
        </p>
      </div>
      {product.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {product.description}
        </p>
      )}
    </div>
  </CardContent>
  
  <CardFooter className="flex-none pt-4">
    <Button
      className="w-full"
      variant={product.quantity > 0 ? 'default' : 'secondary'}
      disabled={product.quantity <= 0}
      onClick={(e) => {
        e.stopPropagation();
        handleCardClick(product);
      }}
    >
      {product.quantity > 0 ? 'Sell Product' : 'Out of Stock'}
    </Button>
  </CardFooter>
</Card>
          ))}
        </div>
      )}

      {/* Create Sale Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Sale</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold">{selectedProduct.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Price: ${parseFloat(selectedProduct.price).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Available: {selectedProduct.quantity}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedProduct.quantity}
                  value={formData.quantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value > 0 && value <= selectedProduct.quantity) {
                      setFormData({ ...formData, quantity: value });
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method *</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) =>
                    setFormData({ ...formData, payment_method: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
{user_role === "sales_attendant" ? (
  <div></div>
) : (
  <div className="space-y-2">
    <Label htmlFor="staff_id">Staff ID (Optional)</Label>
    <Input
      id="staff_id"
      type="number"
      placeholder="Enter staff ID"
      value={formData.staff_id}
      onChange={(e) =>
        setFormData({ ...formData, staff_id: e.target.value })
      }
    />
  </div>
)}              

              <div className="bg-primary/10 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="text-xl font-bold text-primary">
                    ${(parseFloat(selectedProduct.price) * formData.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.payment_method || formData.quantity < 1}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


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
  const [saleSummary, setSaleSummary] = useState({
      total_transactions: 0,
      total_amount: 0,
  })
 
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
      const summary = response.data.reduce((acc, item) => ({
          total_transactions: acc.total_transactions + 1,
          total_amount: acc.total_amount + (parseFloat(item.price) || 0)
        }), { total_transactions: 0, total_amount: 0 });
        
        setSaleSummary(summary);

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

   const mock_receipt = {
  id: "INV-1001",
  date: "18 Jun 2026",
  total: 2400,
  items: [
    { id: 1, name: "Bread", total: 1500 },
    { id: 2, name: "Milk", total: 900 },
  ],
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

 {currentSales != 0 && (
<Card className='mb-2'>
          <CardHeader>
            <h1 className='text-xl bold'>Summary</h1>
  <p>Total Transactions: {saleSummary.total_transactions}</p>
      <p>Total Amount: <span className='text-green-500'>${saleSummary.total_amount.toFixed(2)}</span> </p>
          </CardHeader>
</Card>
)} 
  {/* Filters Section */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
    {/* Search */}
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
     <div className="rounded-md border overflow-x-auto">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>ID</TableHead>
        <TableHead>Customer Name</TableHead>
        <TableHead>Product Name</TableHead>
        <TableHead>Quantity</TableHead>
        <TableHead>Price</TableHead>
        <TableHead>Payment Method</TableHead>
        <TableHead>Date</TableHead>
        <TableHead>Action</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {currentSales.length === 0 ? (
        <TableRow>
          <TableCell colSpan={8} className="text-center py-8">
            No sales found
          </TableCell>
        </TableRow>
      ) : (
        currentSales.map((sale) => (
          <TableRow key={sale.id}>
            <TableCell className="font-medium">{sale.id}</TableCell>
            <TableCell>{sale.name || 'N/A'}</TableCell>
            <TableCell>{sale.product_name || 'N/A'}</TableCell>
            <TableCell>{sale.quantity || 'N/A'}</TableCell>
            <TableCell>₦{parseFloat(sale.price || 0).toLocaleString()}</TableCell>
            <TableCell>{getPaymentBadge(sale.payment_method)}</TableCell>
            <TableCell>
              {sale.created_at
                ? format(new Date(sale.created_at), 'PPP')
                : 'N/A'}
            </TableCell>
            <TableCell>
              <button
                onClick={() => {
                  const sale_data = {
                    id: `INV-${sale.id}`,
                    date: format(new Date(sale.created_at), 'PPP'),
                    total: sale.price,
                    items: sale.product_data.map(item => ({
                      id: item.id,
                      name: item.name,
                      total: item.price
                    }))
                  };
                  printReceipt(<Receipt sale={sale_data} />, {
                    width: 80,
                    title: "Receipt",
                  });
                }}
              >
                <Printer />
              </button>
            </TableCell>
          </TableRow>
        ))
      )}
    </TableBody>
  </Table>
</div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
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
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  )}
</div>
  );
};


// components/ProtectedRoute.jsx
export function ProtectedRoute({ children, allowedRoles }) {
  const { user_role } = useMyContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!allowedRoles.includes(user_role)) {
      navigate('/unauthorized');
    }
  }, [user_role, allowedRoles, navigate]);

  if (!allowedRoles.includes(user_role)) {
    return null;
  }

  return children;
}


export default function StaffSalesList() {
  const [activeTab, setActiveTab] = useState('create');

  return (
     <ProtectedRoute allowedRoles={["sales_attendant"]}>
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
     </ProtectedRoute>
  );
}
