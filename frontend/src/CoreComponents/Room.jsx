import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge"
import { X, LoaderCircle, Trash2, Edit, Search, Currency, RefreshCcw } from 'lucide-react';
import { useMyContext } from '@/Context/AppContext';
import api from '@/lib/api';
import React, { useEffect, useMemo, useState } from 'react'
import { CreateRoom, UpdateRoom } from '@/CRUD/Room';
import DataPagination from '@/components/DataPagination';

const ITEMS_PER_PAGE = 10;

export default function Room() {
  const [roomData, setRoomData] = useState([]);
  const [editRoom, setEditRoom] = useState(false);
  const [room_id, setRoom_id] = useState('');
  const { currency } = useMyContext()
  const [reload, setReload] = useState(false)
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newRoom, setNewRoom] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);


  useEffect(() => {
    fetchRooms()
  }, [reload])


  const filtered = useMemo(
    () => roomData.filter((item) => item.number?.toLowerCase().includes(search.toLowerCase())),
    [roomData, search]
  );

  useEffect(() => {
    setPage(1)
  }, [search])

  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const fetchRooms = () => {
    setLoading(true)
    api.get(`/room/get_rooms`)
      .then((res) => {
        setRoomData(Array.isArray(res.data) ? res.data : []); setError(false)
        setLoading(false)
        console.log(res.data)
      })
      .catch((err) => {
        setTimeout(() => {
          setError(true)
        }, 3000)
        setLoading(false)
      })
  }

  const handleDelete = (id) => {
    setLoading(true)
    api
      .delete(`/room/delete_room/${id}`)
      .then(() => {
        // Filter out the deleted room from the state
        setRoomData(roomData.filter((room) => room.id !== id))
      })
      .catch((err) => {
        setError(true)
      })
      .finally(() => {
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
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchRooms}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="header mb-3">
        <Button onClick={() => setNewRoom(true)} className={" text-white"}>Add room</Button>
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
        <Button onClick={fetchRooms}><RefreshCcw /> Refresh</Button>
      </div>

      <div className='absolute top-10 right-0 left-0'>
        {newRoom && (
          <CreateRoom setNewRoom={setNewRoom} setError={setError} setReload={setReload} reload={reload} />
        )}
      </div>
      <div className='absolute top-10 right-0 left-0'>
        {editRoom && (
          <UpdateRoom
            roomId={room_id}
            setEditRoom={setEditRoom}
            data={roomData.find(item => item.id === room_id)}
            setReload={setReload}
            reload={reload}
          />
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
                ">Room Number</TableHead>
                <TableHead className="text-nowrap
                ">Image</TableHead>
                <TableHead className="text-nowrap
                ">Price</TableHead>
                <TableHead className="text-nowrap
                ">Description</TableHead>
                <TableHead className="text-nowrap
                ">Status</TableHead>
                <TableHead className="text-right">delete</TableHead>
                <TableHead className="text-right">edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">{room.number}</TableCell>
                  <TableCell className="font-medium"><img src={room.image_url} alt={room.number} className='w-20' /></TableCell>
                  <TableCell className="font-medium">{room.price}</TableCell>
                  <TableCell className="font-medium">{room.description}</TableCell>

                  <TableCell>
                    <Badge>
                      {room.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(room.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setRoom_id(room.id);
                      setEditRoom(true);
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
        ) : (
          <div className="text-center py-8 text-muted-foreground">No rooms found. Add some rooms to get started.</div>
        )}
      </div>
    </div>
  )
}
