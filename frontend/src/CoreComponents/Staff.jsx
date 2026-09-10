import React, { useEffect, useMemo, useState } from 'react';
import { CreateStaff, UpdateStaff } from '@/CRUD/Staff';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoaderCircle, Trash2, Edit, Eye, EyeOff, Search, Download, RefreshCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import DataPagination from '@/components/DataPagination';

const ITEMS_PER_PAGE = 10;

export default function Staff() {
  const [newStaff, setNewStaff] = useState(false);
  const [reload, setReload] = useState(false);
  const [editStaff, setEditStaff] = useState(false);
  const [staff_id, setStaff_id] = useState('');
  const [staffData, setStaffData] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  useEffect(() => {
    fetchStaffs();
  }, [reload]);

  const fetchStaffs = () => {
    setLoading(true);
    api
      .get(`/staff/get_staff`)
      .then((res) => {
        if (Array.isArray(res.data)) {
          setStaffData(res.data);
        } else {
          setStaffData([]);
        }
        setError(false);
      })
      .catch((err) => {
        console.error('Error fetching staff:', err);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleDelete = (id) => {
    setLoading(true);
    api
      .delete(`/staff/delete_staff/${id}`)
      .then(() => {
        setStaffData((prev) => prev.filter((staff) => staff.id !== id));
      })
      .catch((err) => {
        console.error('Error deleting staff:', err);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const togglePasswordVisibility = (index) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const filtered = useMemo(
    () => staffData.filter((item) => item.name?.toLowerCase().includes(search.toLowerCase())),
    [staffData, search]
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div>
      <div className="header mb-4">
        <Button
          onClick={() => setNewStaff(true)}
          className=" text-white"
        >
          Create Staff
        </Button>
      </div>
<div className='flex items-center'>
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
                <Button onClick={fetchStaffs}>
                  <RefreshCcw />Refresh</Button>

</div>

      {newStaff && <CreateStaff setNewStaff={setNewStaff} setReload={setReload} reload={reload} />}
      {editStaff && (
        <UpdateStaff
          staff_id={staff_id}
          setEditStaff={setEditStaff}
          data={staffData.find(item => item.id === staff_id)}
        />
      )}

      <div className="render-table-data">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length > 0 ? (
          <>
          <Table className="w-full overflow-x-scroll">
            <TableHeader>
              <TableRow>
                <TableHead  className='text-nowrap'>Staff ID</TableHead>
                <TableHead  className='text-nowrap'>Staff Name</TableHead>
                <TableHead  className='text-nowrap'>Role</TableHead>
                <TableHead  className='text-nowrap'>Email</TableHead>
                <TableHead  className='text-nowrap'>Password</TableHead>
                <TableHead  className='text-nowrap'>Image</TableHead>
                <TableHead  className='text-nowrap'>CV</TableHead>
                <TableHead className="text-right">Delete</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className='text-nowrap'>{item.id}</TableCell>
                  <TableCell className='text-nowrap'>{item.name}</TableCell>
                  <TableCell className='text-nowrap'>{item.role}</TableCell>
                  <TableCell className='text-nowrap'>{item.email}</TableCell>
                  <TableCell className="">
                    <input
                      type={visiblePasswords[index] ? 'text' : 'password'}
                      value={item.prev_password}
                      readOnly
                      className="ring-0 bg-transparent border-none"
                    />
                    <button
                      className="ml-2"
                      onClick={() => togglePasswordVisibility(index)}
                    >
                      {visiblePasswords[index] ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </TableCell>


                  <TableCell className='text-nowrap'>
                    <img src={item.image_url} alt="" className="w-20 rounded-md" />
                  </TableCell>
                  <TableCell className='text-nowrap'>
                    <a href={item.cv_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setStaff_id(item.id);
                        setEditStaff(true);
                      }}
                    >
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
          <div className="text-center py-8 text-muted-foreground">
            No staff found. Add some to get started.
          </div>
        )}
      </div>
    </div>
  );
}
