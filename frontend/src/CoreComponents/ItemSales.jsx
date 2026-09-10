import { useMyContext } from '@/Context/AppContext';
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalesItem } from '@/CRUD/Sales';

export default function ItemSales() {
  const [Sales, setSales] = useState([]);
  const { admin_id } = useMyContext();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // removed the TypeScript type annotation

  const filteredSales =
    filter === "all" ? Sales : Sales.filter((sales) => sales.status === filter);

  useEffect(() => {
    getData();
  }, []);

  const getData = () => {
    setLoading(true);
    api
      .get(`/admins/${admin_id}/Sales`)
      .then((res) => {
        setSales(res.data);
        setError(false);
      })
      .catch((err) => {
        setTimeout(() => {
          setError(true);
        }, 3000);
      });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setFilter(value)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
          <div className="text-sm text-muted-foreground">
            {filteredSales.length} sale{filteredSales.length !== 1 ? "s" : ""}
          </div>
        </div>

        {["all", "pending", "confirmed", "cancelled"].map((status) => (
          <TabsContent key={status} value={status} className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSales.map((sales) => (
                <SalesItem key={sales.id} sales={sales} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
