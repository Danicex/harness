"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Minus, Trash2, Receipt, GripVertical, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";

/**
 * Premium POS — single page checkout screen with draggable ticket.
 * Enhanced with beautiful product images, modern design, and smooth interactions.
 */

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "transfer", label: "Transfer" },
];

const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);


export default function CreateSale() {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saleId, setSaleId] = useState(null);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]); // Initialize as empty array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const ticketRef = useRef(null);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.get('/product/get_products');
        
        if (response.status != 200) {
          throw new Error(`Failed to fetch products: ${response.status}`);
        }
        
        const data = await response.data;
        
        // Ensure data is an array
        if (Array.isArray(data)) {
          setProducts(data);
        } else if (data && typeof data === 'object' && Array.isArray(data.products)) {
          // If API returns { products: [...] }
          setProducts(data.products);
        } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
          // If API returns { data: [...] }
          setProducts(data.data);
        } else {
          // If data is not an array, try to extract it or default to empty array
          console.warn("Unexpected API response format:", data);
          setProducts([]);
        }
      } catch (err) {
        setError(err.message || "Failed to load products");
        console.error("Error fetching products:", err);
        setProducts([]); // Set to empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Ensure products is always an array before filtering
  const filteredCatalog = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return [];
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.name && p.name.toLowerCase().includes(q));
  }, [search, products]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + parseInt(item.line_total || 0), 0),
    [cart]
  );

  function addToCart(product) {
    if (!product || !product.id) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                line_total: (i.quantity + 1) * (i.unit_price || 0),
              }
            : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name || "Unknown Product",
          unit_price: product.price || 0,
          quantity: 1,
          line_total: product.price || 0,
        },
      ];
    });
  }

  function changeQty(productId, delta) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product_id === productId
            ? {
                ...i,
                quantity: Math.max(0, i.quantity + delta),
                line_total: Math.max(0, (i.quantity + delta) * (i.unit_price || 0)),
              }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  }

  function resetTicket() {
    setCart([]);
    setCustomerName("");
    setPaymentMethod("cash");
    setSaleId(null);
    setStatus(null);
  }

  async function handleSubmit() {
    if (cart.length === 0) {
      setStatus({ type: "error", message: "Add at least one item before charging." });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    const productsData = cart.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.unit_price,
    }));

    try {
      const formData = new FormData();
      formData.append('payment_method', paymentMethod);
      formData.append('customer_name', customerName || '');
      formData.append('product_data', JSON.stringify(productsData));

      console.log("data is:", formData)
      const res = await api.post("/sales/create_sale", formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (res.status != 200) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Request failed (${res.status})`);
      }

      const data = await res.data;
      
      if (data?.sale?.id) {
        setSaleId(data.sale.id);
      }

      setStatus({
        type: "success",
        message: `Sale #${data.sale?.id || ''} created successfully. Total: ${money(data.total_amount || total)}`,
      });

    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-neutral-50 via-white to-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading products...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-neutral-50 via-white to-neutral-100 flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Failed to Load Products</h2>
          <p className="text-neutral-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .font-sans { font-family: 'Inter', system-ui, sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Counter</h1>
            <p className="text-xs text-muted-foreground">Premium POS</p>
          </div>
        </div>
        <div className="text-sm font-mono text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[1.5fr_420px] gap-8">
        {/* Catalog */}
        <section>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-input bg-background text-sm
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
            {Array.isArray(filteredCatalog) && filteredCatalog.map((product) => (
              <motion.button
                key={product.id || Math.random()}
                onClick={() => addToCart(product)}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.95 }}
                className="group text-left bg-card border border-border rounded-2xl overflow-hidden shadow-sm
                           hover:shadow-md hover:border-ring transition-all"
              >
                <div className="relative w-full h-40 bg-muted overflow-hidden">
                  <img
                    src={product.image_url || "/images/placeholder.png"}
                    alt={product.name || "Product"}
                    className="w-[500px] h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = "/images/placeholder.png";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                </div>
                <div className="p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1.5">
                    {product.category || "General"}
                  </p>
                  <p className="text-sm font-semibold text-card-foreground leading-tight mb-2">
                    {product.name || "Unnamed Product"}
                  </p>
                  <p className="font-mono text-base font-bold text-foreground">
                    {money(product.price || 0)}
                  </p>
                </div>
              </motion.button>
            ))}
            {(!Array.isArray(filteredCatalog) || filteredCatalog.length === 0) && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">
                  {search ? `No items match "${search}"` : "No products available"}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Draggable Ticket */}
        <motion.div
          ref={ticketRef}
          drag
          dragMomentum={false}
          dragElastic={0.1}
          className="lg:sticky lg:top-24 self-start cursor-grab active:cursor-grabbing z-50"
        >
          <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            {/* Header */}
            <div className="bg-muted/50 px-6 py-4 border-b border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                    Current ticket{saleId ? ` · #${saleId}` : ""}
                  </h2>
                </div>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={resetTicket}
                  className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                  title="Clear cart"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Line items */}
            <div className="px-6 py-4">
              <div className="space-y-3 min-h-[100px] max-h-[320px] overflow-y-auto pr-2">
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Add items to start
                  </p>
                ) : (
                  cart.map((item) => (
                    <motion.div
                      key={item.product_id || Math.random()}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="font-mono text-sm"
                    >
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-card-foreground font-medium">{item.name || "Product"}</span>
                        <span className="text-card-foreground font-semibold">
                          {money(item.line_total || 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                        <button
                          onClick={() => changeQty(item.product_id, -1)}
                          className="h-6 w-6 flex items-center justify-center rounded border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-ring transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-semibold text-foreground w-5 text-center">
                          {item.quantity || 0}
                        </span>
                        <button
                          onClick={() => changeQty(item.product_id, 1)}
                          className="h-6 w-6 flex items-center justify-center rounded border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-ring transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <span className="text-xs text-muted-foreground">×</span>
                        <span className="text-xs text-muted-foreground">
                          {money(item.unit_price || 0)}
                        </span>
                        <button
                          onClick={() => removeItem(item.product_id)}
                          className="ml-auto h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Customer + Payment */}
            <div className="px-6 py-4 space-y-4">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name (optional)"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input transition-all"
              />

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                  Payment method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm font-medium
                             text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input transition-all
                             appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20fill=%22none%22%20viewBox=%220%200%2020%2020%22%3E%3Cpath%20stroke=%22%236b7280%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20stroke-width=%221.5%22%20d=%22m6%208%204%204%204-4%22/%3E%3C/svg%3E')`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1.25rem',
                    paddingRight: '2.5rem',
                  }}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Total + Submit */}
            <div className="px-6 py-5 bg-muted/30">
              <div className="flex items-baseline justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="font-mono text-3xl font-bold text-foreground">
                  {money(total)}
                </span>
              </div>

              {status && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-xs mb-4 px-3 py-2 rounded-lg font-medium ${
                    status.type === "success"
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {status.message}
                </motion.p>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting || cart.length === 0}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold
                           hover:bg-primary/90 active:scale-95 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
              >
                {submitting
                  ? "Processing…"
                  : saleId
                  ? "Update sale"
                  : `Charge ${money(total)}`}
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}