import React, { useEffect, useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Download, Trash2, Edit, Plus, Loader2, Mail, MessageSquareText, Search, History } from 'lucide-react'

import api from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import DataPagination from '@/components/DataPagination'
import SendMessageDialog from './SendMessageDialog'

const INITIAL_FORM_STATE = {
  id: '',
  customer_name: '',
  email: '',
  phone: '',
}

const ITEMS_PER_PAGE = 10

export default function CustomerList({ onNavigate }) {
  const [showCreate, setShowCreate] = useState(false)
  const [showUpdate, setShowUpdate] = useState({
    state: false,
    id: null,
    data: null
  })
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)
  const [file, setFile] = useState(null)
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, name: '' })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Selection state for the bulk mail/sms action
  const [selectedIds, setSelectedIds] = useState([])
  const [sendDialog, setSendDialog] = useState({ open: false, mode: 'mail' })

  const { toast } = useToast()

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile)
      toast({ title: 'File selected', description: selectedFile.name })
    } else {
      toast({ title: 'Invalid file', description: 'Please select a valid CSV file', variant: 'destructive' })
      e.target.value = ''
      setFile(null)
    }
  }

  const getCustomerList = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/customer/get_customers`)
      setCustomers(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast({ title: 'Error', description: 'Failed to load customers', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const createCustomerList = async () => {
    setLoading(true)
    try {
      const formDataObj = new FormData()
      formDataObj.append('customer_name', formData.customer_name)
      if (formData.email) formDataObj.append('email', formData.email)
      if (formData.phone) formDataObj.append('phone', formData.phone)

      await api.post(`/customer/create_customer`, formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      toast({ title: 'Success', description: 'Customer created successfully' })
      setShowCreate(false)
      setFormData(INITIAL_FORM_STATE)
      getCustomerList()
    } catch (error) {
      console.error('Error creating customer:', error)
      toast({ title: 'Error', description: error.response?.data?.detail || 'Failed to create customer', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const updateCustomer = async (id, data) => {
    setLoading(true)
    try {
      const formDataObj = new FormData()
      formDataObj.append('customer_name', data.customer_name)
      if (data.email) formDataObj.append('email', data.email)
      if (data.phone) formDataObj.append('phone', data.phone)

      await api.put(`/customer/update_customer/${id}`, formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      toast({ title: 'Success', description: 'Customer updated successfully' })
      getCustomerList()
    } catch (error) {
      console.error('Error updating customer:', error)
      toast({ title: 'Error', description: error.response?.data?.detail || 'Failed to update customer', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const deleteCustomer = async (id) => {
    setLoading(true)
    try {
      await api.delete(`/customer/delete_customer/${id}`)
      toast({ title: 'Success', description: 'Customer deleted successfully' })
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id))
      getCustomerList()
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast({ title: 'Error', description: error.response?.data?.detail || 'Failed to delete customer', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkCreate = async () => {
    if (!file) {
      toast({ title: 'No file selected', description: 'Please select a CSV file first', variant: 'destructive' })
      return
    }

    setBulkUploading(true)
    const formDataObj = new FormData()
    formDataObj.append("file", file)

    try {
     console.log("sending csv....")
      const response = await api.post(`/customer/bulk_upload_customers`, formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      toast({ title: 'Success', description: response.data.message || `Successfully uploaded customers` })

      setFile(null)
      const fileInput = document.getElementById('csvFileInput')
      if (fileInput) fileInput.value = ''
      getCustomerList()

      return response.data
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: error.response?.data?.detail || 'Failed to upload customers', variant: 'destructive' })
      throw error;
    } finally {
      setBulkUploading(false)
    }
  }

  useEffect(() => {
    getCustomerList()
  }, [])

  // Search + pagination
  const filtered = useMemo(() => {
    if (!search) return customers
    const q = search.toLowerCase()
    return customers.filter((c) =>
      c.customer_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    )
  }, [customers, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Selection helpers — only the rows currently visible on this page are
  // affected by "select all", which matches what the user can see.
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((c) => selectedIds.includes(c.id))

  const toggleSelectAllOnPage = (checked) => {
    const pageIds = pageItems.map((c) => c.id)
    if (checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])])
    } else {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    }
  }

  const toggleSelectOne = (id, checked) => {
    setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)))
  }

  const selectedCustomers = useMemo(
    () => customers.filter((c) => selectedIds.includes(c.id)),
    [customers, selectedIds]
  )

  const openSendDialog = (mode) => setSendDialog({ open: true, mode })

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-3xl font-bold">Customer Management</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => onNavigate?.('campaign_history')}
          >
            <History className="mr-2 h-4 w-4" />
            Campaign History
          </Button>

          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <CreateCustomer
                formData={formData}
                setFormData={setFormData}
                onSubmit={createCustomerList}
                loading={loading}
              />
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Bulk Upload CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Customers from CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csvFileInput">CSV File</Label>
                  <Input
                    id="csvFileInput"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Required columns: customer_name, email (optional), phone (optional)
                    <br />
                    <a href="#" className="text-blue-500 hover:underline" onClick={(e) => {
                      e.preventDefault()
                      const sampleData = "customer_name,email,phone\nJohn Doe,john@example.com,1234567890\nJane Smith,jane@example.com,0987654321"
                      const blob = new Blob([sampleData], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'sample_customers.csv'
                      a.click()
                      URL.revokeObjectURL(url)
                    }}>
                      Download sample CSV template
                    </a>
                  </p>
                </div>

                <Button
                  onClick={handleBulkCreate}
                  disabled={!file || bulkUploading}
                  className="w-full"
                >
                  {bulkUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload CSV
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Customer List</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or phone..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Bulk action bar — appears once at least one customer is selected */}
          {selectedIds.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-accent/40 px-4 py-3">
              <p className="text-sm font-medium">
                {selectedIds.length} customer{selectedIds.length !== 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openSendDialog('mail')} className="gap-2">
                  <Mail className="h-4 w-4" />
                  Send Mail
                </Button>
                <Button size="sm" variant="outline" onClick={() => openSendDialog('sms')} className="gap-2">
                  <MessageSquareText className="h-4 w-4" />
                  Send SMS
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          {loading && customers.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {customers.length === 0
                ? 'No customers found. Click "Add Customer" to create one.'
                : 'No customers match your search.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allOnPageSelected}
                          onCheckedChange={(checked) => toggleSelectAllOnPage(!!checked)}
                          aria-label="Select all customers on this page"
                        />
                      </TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.map((customer) => (
                      <TableRow key={customer.id} data-state={selectedIds.includes(customer.id) ? 'selected' : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(customer.id)}
                            onCheckedChange={(checked) => toggleSelectOne(customer.id, !!checked)}
                            aria-label={`Select ${customer.customer_name}`}
                          />
                        </TableCell>
                        <TableCell>{customer.id}</TableCell>
                        <TableCell>{customer.customer_name}</TableCell>
                        <TableCell>{customer.email || '-'}</TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Send mail"
                            disabled={!customer.email}
                            onClick={() => {
                              setSelectedIds([customer.id])
                              openSendDialog('mail')
                            }}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Send SMS"
                            disabled={!customer.phone}
                            onClick={() => {
                              setSelectedIds([customer.id])
                              openSendDialog('sms')
                            }}
                          >
                            <MessageSquareText className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Edit"
                                onClick={() => setShowUpdate({
                                  state: true,
                                  id: customer.id,
                                  data: customer
                                })}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <UpdateCustomer
                                id={customer.id}
                                initialData={customer}
                                onUpdate={(data) => updateCustomer(customer.id, data)}
                                loading={loading}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => setDeleteDialog({
                              open: true,
                              id: customer.id,
                              name: customer.customer_name
                            })}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <DataPagination
                page={page}
                totalItems={filtered.length}
                perPage={ITEMS_PER_PAGE}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete customer "{deleteDialog.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              deleteCustomer(deleteDialog.id)
              setDeleteDialog({ open: false, id: null, name: '' })
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SendMessageDialog
        open={sendDialog.open}
        onOpenChange={(open) => setSendDialog((prev) => ({ ...prev, open }))}
        mode={sendDialog.mode}
        recipients={selectedCustomers}
      />
    </div>
  )
}

function CreateCustomer({ formData, setFormData, onSubmit, loading }) {
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Customer</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="customer_name">Customer Name *</Label>
          <Input
            id="customer_name"
            name="customer_name"
            value={formData.customer_name}
            onChange={handleChange}
            required
            placeholder="Enter customer name"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email address"
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter phone number"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create Customer
        </Button>
      </form>
    </>
  )
}

function UpdateCustomer({ id, initialData, onUpdate, loading }) {
  const [formData, setFormData] = useState({
    customer_name: initialData?.customer_name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onUpdate(formData)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Update Customer</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="customer_name">Customer Name *</Label>
          <Input
            id="customer_name"
            name="customer_name"
            value={formData.customer_name}
            onChange={handleChange}
            required
            placeholder="Enter customer name"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email address"
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter phone number"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Update Customer
        </Button>
      </form>
    </>
  )
}
