import React, { useState, useMemo, useEffect } from 'react';
import { useMyContext } from '@/Context/AppContext';
import api from '@/lib/api';
import { RefreshCcw, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Calendar, Percent, CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calendar as CalendarIcon } from "lucide-react";
// import { DateRangePicker } from "@/components/ui/date-range-picker";
// import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Enum replacements
const DASHBOARD_TABS = ['OVERVIEW', 'PRODUCTS', 'ROOMS', 'SALES', 'BOOKINGS'];

const PERIODS = {
  TODAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
};

const DATE_RANGE_TYPES = {
  PRESET: 'preset',
  CUSTOM: 'custom',
  SINGLE: 'single',
};

const MetricCard = ({ label, value, change, isPositive, icon }) => {
  return (
    <Card className="flex flex-row items-start justify-between p-6">
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className="flex items-center gap-1 pt-1">
            <span
              className={`flex items-center text-xs font-semibold ${isPositive ? "text-emerald-500" : "text-rose-500"}`}
            >
              {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
              {change}
            </span>
            <span className="text-xs text-muted-foreground font-normal">vs last period</span>
          </div>
        )}
      </div>
      <div className="p-3 bg-muted rounded-xl text-primary">{icon}</div>
    </Card>
  );
};

const RenderAnalytics = () => {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const { admin_id } = useMyContext();
  const [activePeriod, setActivePeriod] = useState();
  const [dateRangeType, setDateRangeType] = useState(DATE_RANGE_TYPES.PRESET);
  const [singleDate, setSingleDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({
    from: new Date(),
    to: new Date(),
  });
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [activePeriod, dateRangeType, singleDate, dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const currentDate = new Date();

const year = currentDate.getFullYear();
const month = String(currentDate.getMonth() + 1).padStart(2, '0');
const day = String(currentDate.getDate()).padStart(2, '0');
const formattedDate = `${year}-${month}-${day}`;
      // change format to "yyyy-mm-dd"
      let url = `/analytics/dashboard`;
      let params = { date: formattedDate };
      
      // If using custom date range
      if (dateRangeType === DATE_RANGE_TYPES.CUSTOM) {
        url = `/analytics/dashboard/custom-range`;
        params = {
          start_date: format(dateRange.from, 'yyyy-MM-dd'),
          end_date: format(dateRange.to, 'yyyy-MM-dd'),
        };
      } 
      // If using single date
      else if (dateRangeType === DATE_RANGE_TYPES.SINGLE) {
        url = `/analytics/dashboard/single-date`;
        params = {
          date: format(singleDate, 'yyyy-MM-dd'),
        };
      }
      
      const response = await api.get(url, { params });
      
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.response?.data?.detail || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const salesTrendData = useMemo(() => {
    if (!dashboardData?.sales.transactions) return [];
    
    const salesByDate = dashboardData.sales.transactions.reduce((acc, sale) => {
      const date = new Date(sale.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      
      const existing = acc.find((item) => item.date === date);
      if (existing) {
        existing.revenue += parseFloat(sale.price) * parseInt(sale.quantity);
        existing.items += parseInt(sale.quantity);
      } else {
        acc.push({
          date,
          revenue: parseFloat(sale.price) * parseInt(sale.quantity),
          items: parseInt(sale.quantity),
        });
      }
      return acc;
    }, []);
    
    return salesByDate.slice(-14);
  }, [dashboardData]);

  const bookingTrendData = useMemo(() => {
    if (!dashboardData?.bookings.all_bookings) return [];
    
    const bookingsByDate = dashboardData.bookings.all_bookings.reduce((acc, booking) => {
      const date = new Date(booking.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      
      const existing = acc.find((item) => item.date === date);
      if (existing) {
        existing.bookings += 1;
        existing.revenue += parseFloat(booking.price || 0);
      } else {
        acc.push({
          date,
          bookings: 1,
          revenue: parseFloat(booking.price || 0),
        });
      }
      return acc;
    }, []);
    
    return bookingsByDate.slice(-14);
  }, [dashboardData]);

  const paymentMethodData = useMemo(() => {
    if (!dashboardData?.sales.payment_methods) return [];
    return Object.entries(dashboardData.sales.payment_methods).map(([name, value]) => ({
      name: name.replace('_', ' ').toUpperCase(),
      value,
    }));
  }, [dashboardData]);

  const bookingStatusData = useMemo(() => {
    if (!dashboardData?.bookings.booking_status) return [];
    return Object.entries(dashboardData.bookings.booking_status).map(([name, value]) => ({
      name: name.replace('_', ' ').toUpperCase(),
      value,
    }));
  }, [dashboardData]);

  const roomStatusData = useMemo(() => {
    if (!dashboardData?.rooms) return [];
    return [
      { name: 'Available', value: dashboardData.rooms.available_rooms },
      { name: 'Occupied', value: dashboardData.rooms.occupied_rooms },
      { name: 'Maintenance', value: dashboardData.rooms.maintenance_rooms },
    ];
  }, [dashboardData]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'No data available'}</p>
          <Button onClick={fetchDashboardData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="top-0 z-30  border-b">
        <div className="py-4 flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Dashboard Tabs */}
            <div className=" p-1 rounded-lg flex">
              {DASHBOARD_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeTab === tab
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Date Range Type Selector */}
            <Select value={dateRangeType} onValueChange={setDateRangeType}>
              <SelectTrigger className="w-[140px] text-xs font-semibold">
                <SelectValue placeholder="Select date type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DATE_RANGE_TYPES.PRESET}>Preset Periods</SelectItem>
                <SelectItem value={DATE_RANGE_TYPES.SINGLE}>Single Date</SelectItem>
                <SelectItem value={DATE_RANGE_TYPES.CUSTOM}>Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Preset Period Selector */}
            {dateRangeType === DATE_RANGE_TYPES.PRESET && (
              <Select value={activePeriod} onValueChange={setActivePeriod}>
                <SelectTrigger className="w-[140px] text-xs font-semibold">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PERIODS.TODAY}>Today</SelectItem>
                  <SelectItem value={PERIODS.WEEK}>Last 7 Days</SelectItem>
                  <SelectItem value={PERIODS.MONTH}>Last 30 Days</SelectItem>
                  <SelectItem value={PERIODS.YEAR}>Last Year</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Single Date Picker */}
            {dateRangeType === DATE_RANGE_TYPES.SINGLE && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !singleDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {singleDate ? format(singleDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={singleDate}
                    onSelect={setSingleDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Date Range Picker */}
            {dateRangeType === DATE_RANGE_TYPES.CUSTOM && (
              <div className="flex gap-2 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <Button onClick={fetchDashboardData} size="sm">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date(dashboardData.generated_at).toLocaleString()}
          </div>
        </div>
      </header>

      <main className=" mt-8">
        {/* KPI Cards - Always visible */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            label="Total Revenue"
            value={`$${dashboardData.performance.revenue_comparison.total_revenue.toFixed(2)}`}
            icon="💰"
          />
          <MetricCard
            label="Total Transactions"
            value={dashboardData.overview.total_sales_transactions + dashboardData.overview.total_bookings}
            icon="🛒"
          />
          <MetricCard
            label="Occupancy Rate"
            value={`${dashboardData.bookings.occupancy_rate.toFixed(1)}%`}
            icon="🏨"
          />
          <MetricCard
            label="Active Bookings"
            value={dashboardData.bookings.active_bookings}
            icon="📅"
          />
        </div>

        {/* Tab Content */}
        {activeTab === 'OVERVIEW' && (
          <OverviewTab data={dashboardData} salesTrend={salesTrendData} bookingTrend={bookingTrendData} />
        )}
        
        {activeTab === 'PRODUCTS' && (
          <ProductsTab data={dashboardData} />
        )}
        
        {activeTab === 'ROOMS' && (
          <RoomsTab data={dashboardData} roomStatusData={roomStatusData} />
        )}
        
        {activeTab === 'SALES' && (
          <SalesTab 
            data={dashboardData} 
            salesTrend={salesTrendData}
            paymentMethodData={paymentMethodData}
          />
        )}
        
        {activeTab === 'BOOKINGS' && (
          <BookingsTab 
            data={dashboardData}
            bookingTrend={bookingTrendData}
            bookingStatusData={bookingStatusData}
            roomStatusData={roomStatusData}
          />
        )}
      </main>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ data, salesTrend, bookingTrend }) => {
  const revenueData = [
    { name: 'Sales', revenue: data.performance.revenue_comparison.sales_revenue },
    { name: 'Bookings', revenue: data.performance.revenue_comparison.booking_revenue },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Revenue Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: $${entry.revenue.toFixed(2)}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="revenue"
              >
                {revenueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F'][index % 2]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Revenue Trend Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={[...salesTrend, ...bookingTrend]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `$${value}`} />
              <Tooltip formatter={(value) => `$${value}`} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Top Performers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Top Selling Products</h4>
            <div className="space-y-2">
              {data.performance.top_selling_products.slice(0, 5).map((product, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span>{product.name}</span>
                  <span className="font-semibold">${product.total_revenue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-3">Most Booked Rooms</h4>
            <div className="space-y-2">
              {data.performance.most_booked_rooms.slice(0, 5).map((room, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span>Room #{room.room_id}</span>
                  <span className="font-semibold">{room.booking_count} bookings</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Products Tab
const ProductsTab = ({ data }) => {
  return (
    <div className="space-y-8">
      {data.products.low_stock_products.length > 0 && (
        <Card className="p-6 border-red-200 bg-red-50">
          <h3 className="font-semibold mb-3 text-red-800">⚠️ Low Stock Alerts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.products.low_stock_products.map((product, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span>{product.name}</span>
                <Badge variant="destructive">Only {product.quantity} left</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>All Products ({data.products.all_products.length})</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.products.all_products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category || 'N/A'}</TableCell>
                  <TableCell className="text-right">${parseFloat(product.price).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{product.quantity}</TableCell>
                  <TableCell>{new Date(product.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

// Rooms Tab
const RoomsTab = ({ data, roomStatusData }) => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Room Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={roomStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {roomStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#4caf50', '#ff9800', '#f44336'][index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Room Statistics</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Rooms</p>
              <p className="text-3xl font-bold">{data.overview.total_rooms}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Occupancy Rate</p>
              <p className="text-3xl font-bold">{data.bookings.occupancy_rate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Room Revenue</p>
              <p className="text-3xl font-bold">${data.rooms.total_room_revenue.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>All Rooms</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Number</TableHead>
                <TableHead className="text-right">Price/Night</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rooms.all_rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">{room.number}</TableCell>
                  <TableCell className="text-right">${parseFloat(room.price).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        room.status === 'available' ? 'bg-green-500' :
                        room.status === 'occupied' ? 'bg-orange-500' :
                        'bg-red-500'
                      }
                    >
                      {room.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

// Sales Tab
const SalesTab = ({ data, salesTrend, paymentMethodData }) => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `$${value}`} />
              <Tooltip formatter={(value) => `$${value}`} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="Revenue" />
              <Area type="monotone" dataKey="items" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="Items Sold" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentMethodData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentMethodData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index % 4]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Sales Transactions ({data.sales.transactions.length})</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.sales.transactions.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.product_name}</TableCell>
                  <TableCell className="text-right">{sale.quantity}</TableCell>
                  <TableCell className="text-right">${parseFloat(sale.price).toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{sale.payment_method}</TableCell>
                  <TableCell>{new Date(sale.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

// Bookings Tab
const BookingsTab = ({ data, bookingTrend, bookingStatusData, roomStatusData }) => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Booking Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={bookingTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" tickFormatter={(value) => `$${value}`} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="Revenue" />
              <Area yAxisId="right" type="monotone" dataKey="bookings" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="Bookings" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Booking Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={bookingStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {bookingStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#4caf50', '#2196f3', '#ff9800', '#f44336'][index % 4]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Recent Bookings ({data.bookings.all_bookings.length})</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.bookings.all_bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.customer_name}</TableCell>
                  <TableCell>Room #{booking.room_id}</TableCell>
                  <TableCell>{booking.check_in}</TableCell>
                  <TableCell>{booking.check_out}</TableCell>
                  <TableCell className="text-right">${parseFloat(booking.price).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        booking.status === 'confirmed' ? 'bg-green-500' :
                        booking.status === 'checked_in' ? 'bg-blue-500' :
                        booking.status === 'cancelled' ? 'bg-red-500' :
                        'bg-yellow-500'
                      }
                    >
                      {booking.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default RenderAnalytics;