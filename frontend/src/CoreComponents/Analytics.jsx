import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export const MetricCard = ({ label, value, change, isPositive, icon }) => {
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
  )
}

export const SalesChart = ({ data }) => {
  // Group data by date
  const chartData = data
    .reduce((acc, sale) => {
      const date = new Date(sale.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })

      const existing = acc.find((item) => item.date === date)

      if (existing) {
        existing.amount += sale.amount
        existing.count += 1
      } else {
        acc.push({
          date,
          amount: sale.amount,
          count: 1,
        })
      }

      return acc
    }, [])
    .slice(-14)
    .reverse()

  return (
    <Card className=" p-6 rounded-2xl shadow-sm border border-slate-100 h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold">Revenue Trend</h3>

        <div className="flex gap-2">
          <span className="flex items-center text-xs ">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-1" />
            Revenue
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} dy={10} />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={(value) => `$${value}`}
          />

          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
            formatter={(value) => [`$${value}`, "Revenue"]}
          />

          <Area
            type="monotone"
            dataKey="amount"
            stroke="#3b82f6"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}

export const SalesTable = ({ sales }) => {
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 py-4 border-b">
        <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
        <button className="text-sm font-medium text-primary hover:underline">Export CSV</button>
      </CardHeader>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Customer / Item</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-mono text-xs">{sale.id}</TableCell>

                <TableCell>
                  <Badge variant={sale.type === "BOOKING" ? "secondary" : "outline"} className="capitalize">
                    {sale.type.toLowerCase()}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="font-medium">
                    {sale.type === "BOOKING" ? sale.booking?.customerName : sale.items?.[0]?.name || "Multiple Items"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sale.type === "BOOKING" ? sale.booking?.serviceType : sale.items?.[0]?.category}
                  </div>
                </TableCell>

                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {new Date(sale.timestamp).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </TableCell>

                <TableCell className="text-right font-bold">${sale.amount.toFixed(2)}</TableCell>

                <TableCell className="capitalize text-muted-foreground">{sale.paymentMethod}</TableCell>

                <TableCell className="text-right">
                  <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">
                    Completed
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {sales.length === 0 && <div className="py-20 text-center text-muted-foreground">No transactions found.</div>}
    </Card>
  )
}

const generateMockSales = () => {
  const sales = []
  const now = new Date()

  for (let i = 0; i < 100; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - Math.floor(Math.random() * 60))
    date.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60))

    const isBooking = Math.random() > 0.4
    const amount = isBooking ? Math.floor(Math.random() * 200) + 50 : Math.floor(Math.random() * 1000) + 10

    sales.push({
      id: `S-${1000 + i}`,
      type: isBooking ? "BOOKING" : "INVENTORY",
      timestamp: date.toISOString(),
      amount,
      paymentMethod: ["cash", "card", "online"][Math.floor(Math.random() * 3)],
      items: !isBooking
        ? [
            {
              id: "p1",
              name: "Product A",
              quantity: 1,
              price: amount,
              category: "Hardware",
            },
          ]
        : undefined,
      booking: isBooking
        ? {
            customerName: ["John Doe", "Jane Smith", "Alice Cooper", "Bob Wilson"][Math.floor(Math.random() * 4)],
            serviceType: ["Consultation", "Haircut", "Maintenance", "Personal Training"][Math.floor(Math.random() * 4)],
            startTime: date.toISOString(),
            duration: "1h",
            status: "completed",
          }
        : undefined,
    })
  }

  return sales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export const MOCK_SALES = generateMockSales()
