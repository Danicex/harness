import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { CreateDatasetForm } from './Dataset';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, MoreHorizontal, Phone, Mail, Clock, PlusCircle } from 'lucide-react';
import { useMyContext } from '@/Context/AppContext';

// This should come from your auth context

export default function AutomatedCalls() {
  const {admin_id} = useMyContext()
  const [callData, setCallData] = useState([]);
  const [addDataSet, setAddDataSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;


const get_data = async () => {
  try {
    setLoading(true);
    const response = await api.get(
      `/call_logs/${admin_id}`,
      {
        params: {
          page: currentPage,
          limit: itemsPerPage
        },
      }
    );
    
    // Handle the response structure
    if (response.data.data) {
      // If API returns paginated structure
      setCallData(response.data.data);
      setTotalPages(response.data.pages || 1);
      setTotalItems(response.data.total || response.data.data.length);
    } else {
      // If API returns array directly
      setCallData(response.data);
      setTotalPages(Math.ceil(response.data.length / itemsPerPage));
      setTotalItems(response.data.length);
    }
    
  } catch (error) {
    console.error('Error fetching call logs:', error);
    // Show user-friendly error message
    if (error.response?.status === 401) {
      // Handle unauthorized - maybe redirect to login
      console.error('Unauthorized access');
    } else if (error.response?.status === 422) {
      console.error('Admin not found');
    } else {
      console.error('Failed to fetch call logs');
    }
  } finally {
    setLoading(false);
  }
};
  useEffect(() => {
    get_data();
  }, [currentPage]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionBadge = (action) => {
    const actionMap = {
      'created': { label: 'Created', variant: 'default' },
      'updated': { label: 'Updated', variant: 'secondary' },
      'deleted': { label: 'Deleted', variant: 'destructive' },
      'completed': { label: 'Completed', variant: 'success' },
      'failed': { label: 'Failed', variant: 'destructive' },
      'pending': { label: 'Pending', variant: 'warning' },
    };
    
    const badge = actionMap[action?.toLowerCase()] || { label: action, variant: 'outline' };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  return (
    <div className="mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        <div>
         
          <p className="text-muted-foreground mt-2">
            Monitor and manage your automated call logs
          </p>
        </div>
        <Button 
          onClick={() => setAddDataSet(!addDataSet)}
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          {addDataSet ? 'Close Dataset' : 'Add Dataset'}
        </Button>
      </div>

      {/* Dataset Modal/Component */}
      {addDataSet && (
        <Card className="border-2 border-primary/20 ">
         <CreateDatasetForm/>
        </Card>
      )}

 {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callData.length}</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Badge variant="success" className="text-xs">98%</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.3%</div>
            <p className="text-xs text-muted-foreground">
              +2.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2:34</div>
            <p className="text-xs text-muted-foreground">
              -0.30 from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Call Logs Table Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Call Logs</CardTitle>
          <Badge variant="outline" className="px-3 py-1">
            {callData.length} logs
          </Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Time
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone Number
                        </div>
                      </TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callData.length > 0 ? (
                      callData.map((log, index) => (
                        <TableRow key={log.id || index}>
                          <TableCell className="font-medium">
                            {formatDateTime(log.timestamp || log.time)}
                          </TableCell>
                          <TableCell>{log.email || 'N/A'}</TableCell>
                          <TableCell>{log.phoneNumber || log.phone || 'N/A'}</TableCell>
                          <TableCell>{log.action || log.what_they_did || 'Call'}</TableCell>
                          <TableCell>{getActionBadge(log.status || log.action)}</TableCell>
                          <TableCell>{log.duration || '2:34'}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => navigator.clipboard.writeText(log.id)}
                                >
                                  Copy log ID
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>View details</DropdownMenuItem>
                                <DropdownMenuItem>Download recording</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No call logs found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

     
    </div>
  );
}