import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Calendar } from "@/components/ui/calendar";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import {
  Calendar as CalendarIcon,
  Search,
  X,
  Loader2,
} from "lucide-react";
import api from '@/lib/api';

const RenderAttendance = () => {
  const [attendanceList, setAttendanceList] = useState([]);
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [viewType, setViewType] = useState("daily");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const { toast } = useToast();

  const getTodayDate = () => {
    const today = new Date();
    return format(today, "yyyy-MM-dd");
  };

  const getCurrentMonth = () => {
    const today = new Date();
    return format(today, "yyyy-MM");
  };

  const getAttendance = async (type = "daily", param = null) => {
    setIsLoading(true);

    try {
      let response;

      const today = getTodayDate();
      const currentMonth = getCurrentMonth();

      switch (type) {
        case "monthly":
          if (!param) param = currentMonth;
          response = await api.get(`/attendance/monthly/${param}`);
          break;

        case "daily":
        default:
          if (!param) param = today;
          response = await api.get(`/attendance/period/${param}`);
          break;
      }

      const data = Array.isArray(response.data)
        ? response.data
        : [];

      setAttendanceList(data);
      setFilteredAttendance(data);
      setCurrentPage(1);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch attendance records",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getAttendance("daily");
  }, []);

  useEffect(() => {
    let filtered = [...attendanceList];

    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          record.staff_id
            ?.toString()
            .includes(searchTerm)
      );
    }

    if (
      statusFilter &&
      statusFilter.toLowerCase() !== "all"
    ) {
      filtered = filtered.filter(
        (record) =>
          record.status?.toLowerCase() ===
          statusFilter.toLowerCase()
      );
    }

    setFilteredAttendance(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, attendanceList]);

  const handleDateSelect = (date) => {
    if (date) {
      const formattedDate = format(date, "yyyy-MM-dd");

      setSelectedDate(date);
      setSelectedMonth(null);
      setViewType("daily");

      getAttendance("daily", formattedDate);
    }
  };

  const handleMonthSelect = (month) => {
    if (month) {
      const formattedMonth = format(month, "yyyy-MM");

      setSelectedMonth(month);
      setSelectedDate(null);
      setViewType("monthly");

      getAttendance("monthly", formattedMonth);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setSelectedDate(null);
    setSelectedMonth(null);
    setViewType("daily");

    getAttendance("daily");
  };

  const totalPages = Math.ceil(
    filteredAttendance.length / itemsPerPage
  );

  const startIndex =
    (currentPage - 1) * itemsPerPage;

  const endIndex = startIndex + itemsPerPage;

  const currentAttendance =
    filteredAttendance.slice(startIndex, endIndex);

  const getStatusBadge = (status) => {
    const statusColors = {
      check_in: "bg-green-100 text-green-700",
      check_out: "bg-blue-100 text-blue-700",
    };

    const statusLabels = {
      check_in: "Check In",
      check_out: "Check Out",
    };

    const normalizedStatus = status?.toLowerCase();

    return (
      <Badge className={statusColors[normalizedStatus] || ""}>
        {statusLabels[normalizedStatus] || status || "N/A"}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Attendance Log
        </h1>

        <Button
          variant="outline"
          onClick={clearFilters}
        >
          <X className="mr-2 h-4 w-4" />
          Clear All Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div>
              <Label>Search by Staff Name / ID</Label>

              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />

                <Input
                  placeholder="Search staff name, staff id..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>

              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    All
                  </SelectItem>

                  <SelectItem value="check_in">
                    Check In
                  </SelectItem>

                  <SelectItem value="check_out">
                    Check Out
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Label className="mb-2 block">
              Select Date (Daily View)
            </Label>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${
                    !selectedDate
                      ? "text-muted-foreground"
                      : ""
                  }`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />

                  {selectedDate
                    ? format(selectedDate, "PPP")
                    : "Pick a date"}
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

        <Card>
          <CardContent className="pt-6">
            <Label className="mb-2 block">
              Select Month (Monthly View)
            </Label>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${
                    !selectedMonth
                      ? "text-muted-foreground"
                      : ""
                  }`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />

                  {selectedMonth
                    ? format(selectedMonth, "MMMM yyyy")
                    : "Pick a month"}
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
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center"
                    >
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentAttendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {record.id}
                      </TableCell>

                      <TableCell>
                        {record.staff_id || "N/A"}
                      </TableCell>

                      <TableCell className="font-medium">
                        {record.name || "N/A"}
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(record.status)}
                      </TableCell>

                      <TableCell>
                        {record.created_at
                          ? format(
                              new Date(record.created_at),
                              "PPP"
                            )
                          : "N/A"}
                      </TableCell>

                      <TableCell>
                        {record.created_at
                          ? format(
                              new Date(record.created_at),
                              "p"
                            )
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();

                        if (currentPage > 1) {
                          setCurrentPage(
                            currentPage - 1
                          );
                        }
                      }}
                    />
                  </PaginationItem>

                  {Array.from(
                    {
                      length: Math.min(5, totalPages),
                    },
                    (_, i) => {
                      let pageNum;

                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (
                        currentPage >=
                        totalPages - 2
                      ) {
                        pageNum =
                          totalPages - 4 + i;
                      } else {
                        pageNum =
                          currentPage - 2 + i;
                      }

                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            isActive={
                              currentPage === pageNum
                            }
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNum);
                            }}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                  )}

                  {totalPages > 5 &&
                    currentPage <
                      totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();

                        if (
                          currentPage < totalPages
                        ) {
                          setCurrentPage(
                            currentPage + 1
                          );
                        }
                      }}
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

export default RenderAttendance;
