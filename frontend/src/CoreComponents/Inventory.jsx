import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, LoaderCircle, Trash2, Edit , Search, RefreshCcw} from 'lucide-react';
import api from '@/lib/api';
import React, { useEffect, useMemo, useState } from 'react'
import { CreateInventory, UpdateInventory } from '@/CRUD/Inventory';
import DataPagination from '@/components/DataPagination';

const ITEMS_PER_PAGE = 10;

export default function Inventory() {
  const [inventoryData, setInventoryData] = useState([]);
  const [editInventory, setEditInventory] = useState(false);
  const [inventory_id, setInventory_id] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newInventory, setNewInventory] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(false);

  useEffect(() => {
    fetchInventory()
  }, [reload])

  const filtered = useMemo(
    () => inventoryData.filter((item) => item.name?.toLowerCase().includes(search.toLowerCase())),
    [inventoryData, search]
  );

  useEffect(() => {
    setPage(1)
  }, [search])

  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const fetchInventory = () => {
    setLoading(true)
    api.get(`/product/get_products`)
      .then((res) => {
        if (Array.isArray(res.data)) {
          setInventoryData(res.data);
        } else {
          setInventoryData([]);
        }
        setError(false)
        setLoading(false)
      })
      .catch((err) => {
        setLoading(false) 
        setTimeout(() => {
          setError(true)
        }, 3000)
      })
  }
  
  const handleDelete = (id) => {
    setLoading(true)
    api
      .delete(`/product/delete_product/${id}`)
      .then(() => {
        setInventoryData(prevData => prevData.filter((inventory) => inventory.id !== id))
        setLoading(false)
      })
      .catch((err) => {
        setError(true)
        setLoading(false)
      })
  }


  return (
    <div className=''>
      {error && (
        <Card className="border-red-200 relative">
          <button className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100" onClick={() => setError(false)}>
            <X className="h-4 w-4" />
          </button>
          <CardHeader>
            <CardTitle className="text-red-400">Unable to perform action.</CardTitle>
          </CardHeader>
          <CardContent>
            <small>Please refresh the page or try again later.</small>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchInventory}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="header mb-3">
        <Button onClick={() => setNewInventory(true)} className={" text-white"}>Add inventory</Button>
      </div>
      <div className="flex items-center">
      <div className="relative py-5">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search items..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        
      </div>
                <Button onClick={fetchInventory}><RefreshCcw/>Refresh</Button>
      </div>

      <div className='absolute top-10 right-0 left-0'>
        {newInventory && (
          <CreateInventory setNewInventory={setNewInventory} setError={setError} setReload={setReload} reload={reload}/>
        )}
      </div>
      <div className='absolute top-10 right-0 left-0'>
        {editInventory && (
          <UpdateInventory 
          setEditInventory={setEditInventory}
          id={inventory_id} 
          data={inventoryData.find(item => item.id === inventory_id)}
          setReload={setReload}
          reload={reload}/>
        )}
      </div>

      <div className="render-table-data">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pageItems.length > 0 ? (
          <>
          <Table className='w-full overflow-x-scroll'>
            <TableHeader>
              <TableRow>
                <TableHead className="text-nowrap
                ">inventory name</TableHead>
                <TableHead className="text-nowrap
                ">Price</TableHead>
                <TableHead className="text-nowrap
                ">image</TableHead>
                <TableHead className="text-nowrap
                ">quantity</TableHead>
                <TableHead className="text-right">delete</TableHead>
                <TableHead className="text-right">edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((inventory) => (
                <TableRow key={inventory.id}>
                  <TableCell className="font-medium">{inventory.name}</TableCell>
                  <TableCell>${inventory.price || "0.00"}</TableCell>
                  <TableCell>
                    <img src={inventory.image_url} alt={inventory.name} className='w-20'/>
                  </TableCell>
                  <TableCell>
                  <p>{inventory.quantity}</p>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(inventory.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setInventory_id(inventory.id);
                      setEditInventory(true);
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DataPagination
            page={page}
            totalItems={filtered.length}
            perPage={ITEMS_PER_PAGE}
            onPageChange={setPage}
          />
          </>
        )  : (
          <div className="text-center py-8 text-muted-foreground">No inventorys found. Add some inventorys to get started.</div>
        ) }
      </div>
    </div>
  )
}
