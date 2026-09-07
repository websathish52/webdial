import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BarChart3,
  Package2,
  LineChart,
  IndianRupee,
  ListChecks,
  UsersRound,
  Search,
  Plus,
  MoreVertical,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Color picker (HSV box + hue slider + hex output)                    */
/* ------------------------------------------------------------------ */

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}
const toHex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
const hsvToHex = (h: number, s: number, v: number) => {
  const { r, g, b } = hsvToRgb(h, s, v);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}FF`;
};
function hexToHsv(hex: string) {
  const clean = hex.replace("#", "").slice(0, 6);
  const r = parseInt(clean.slice(0, 2) || "00", 16) / 255;
  const g = parseInt(clean.slice(2, 4) || "00", 16) / 255;
  const b = parseInt(clean.slice(4, 6) || "00", 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function ColorPicker({ value, onChange }: { value?: string; onChange: (hex: string) => void }) {
  const initial = value ? hexToHsv(value) : { h: 0, s: 1, v: 1 };
  const [hue, setHue] = useState(initial.h);
  const [sat, setSat] = useState(initial.s);
  const [val, setVal] = useState(initial.v);
  const boxRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"sv" | "hue" | null>(null);

  const hex = hsvToHex(hue, sat, val);

  useEffect(() => {
    onChange(hex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex]);

  const updateFromBox = (clientX: number, clientY: number) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1);
    setSat(x);
    setVal(1 - y);
  };

  const updateFromHue = (clientX: number) => {
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    setHue(x * 360);
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (dragging.current === "sv") updateFromBox(e.clientX, e.clientY);
      if (dragging.current === "hue") updateFromHue(e.clientX);
    };
    const up = () => (dragging.current = null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const solidHue = `hsl(${hue}, 100%, 50%)`;

  return (
    <div className="space-y-3">
      <span className="text-sm font-medium">Product Color</span>

      <div
        ref={boxRef}
        onPointerDown={(e) => {
          dragging.current = "sv";
          updateFromBox(e.clientX, e.clientY);
        }}
        className="relative h-40 w-full cursor-crosshair rounded-lg"
        style={{
          backgroundImage: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${solidHue})`,
        }}
      >
        <div
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${sat * 100}%`, top: `${(1 - val) * 100}%`, backgroundColor: hex.slice(0, 7) }}
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="h-6 w-6 shrink-0 rounded-full border" style={{ backgroundColor: hex.slice(0, 7) }} />
        <div
          ref={hueRef}
          onPointerDown={(e) => {
            dragging.current = "hue";
            updateFromHue(e.clientX);
          }}
          className="relative h-3 w-full cursor-pointer rounded-full"
          style={{
            background: "linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)",
          }}
        >
          <div
            className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow"
            style={{ left: `${(hue / 360) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 rounded-md border px-3 py-2">
        <span className="text-sm font-medium tracking-wide">{hex}</span>
        <span className="text-[10px] uppercase text-muted-foreground">Hex</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Products page                                                       */
/* ------------------------------------------------------------------ */

type Product = {
  id: string;
  name: string;
  sku: string;
  price: string;
  color: string;
};

type ContactRow = {
  name: string;
  phone: string;
  disposition: string;
  calledOn: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [contacts] = useState<ContactRow[]>([]);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [color, setColor] = useState("#2563EBFF");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProducts().then((items: any[]) => setProducts((Array.isArray(items) ? items : []).map((item) => ({ id: item._id || item.id, name: item.name, sku: item.sku || "-", price: item.price ? `₹${item.price}` : "-", color: item.color || "#2563EB", description: item.description } as Product)))).catch((err: any) => toast.error(err?.message || "Could not load products")).finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSku("");
    setPrice("");
    setColor("#2563EBFF");
  };

  const addProduct = async () => {
    if (!name.trim()) return;
    try {
      const product = await api.createProduct({ name: name.trim(), description, sku, price: Number(price) || 0, color: color.slice(0, 7) });
      setProducts((prev) => [{ id: product._id || product.id, name: product.name, sku: product.sku || "-", price: product.price ? `₹${product.price}` : "-", color: product.color || "#2563EB" } as Product, ...prev]);
      resetForm(); setOpen(false);
    } catch (err: any) { toast.error(err?.message || "Could not create product"); }
  };

  const removeProduct = async (id: string) => { try { await api.deleteProduct(id); setProducts((prev) => prev.filter((p) => p.id !== id)); toast.success("Product deleted"); } catch (err: any) { toast.error(err?.message || "Could not delete product"); } };

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Product Analytics</h1>
              <p className="text-sm text-white/85">Track products, revenue, and customer engagement</p>
            </div>
          </div>

          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
              <Package2 className="h-3.5 w-3.5" /> Products
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
              <LineChart className="h-3.5 w-3.5" /> Analytics
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
              <IndianRupee className="h-3.5 w-3.5" /> Revenue
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Products panel */}
        <Card className="overflow-hidden rounded-2xl p-0">
          <div className="flex items-center gap-3 bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_100%)] px-5 py-4 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <ListChecks className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Products</p>
              <p className="text-xs text-white/85">Manage your product catalog</p>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="pl-9"
                />
              </div>
              <Button size="icon" className="shrink-0 bg-blue-600 hover:bg-blue-700">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {filtered.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-lg bg-blue-50/60 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: product.color }} />
                    <div>
                      <p className="text-sm font-semibold text-blue-700">{product.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                      <p className="text-xs text-muted-foreground">{product.price}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeProduct(product.id)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-blue-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {!filtered.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">No products found.</p>
              )}
            </div>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="flex w-full items-center justify-center gap-2 bg-blue-600 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </Card>

        {/* Contact details panel */}
        <Card className="overflow-hidden rounded-2xl p-0">
          <div className="flex items-center gap-3 bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_100%)] px-5 py-4 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <UsersRound className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Contact Details</p>
              <p className="text-xs text-white/85">Customer engagement insights</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs font-semibold uppercase text-muted-foreground">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Disposition</th>
                  <th className="px-4 py-3 text-left">calledOn</th>
                </tr>
              </thead>
              <tbody>
                {contacts.length ? (
                  contacts.map((c, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{c.name}</td>
                      <td className="px-4 py-3">{c.phone}</td>
                      <td className="px-4 py-3">{c.disposition}</td>
                      <td className="px-4 py-3">{c.calledOn}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select className="rounded-md border bg-background px-2 py-1 text-xs">
                <option>5</option>
                <option>10</option>
                <option>25</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span>1/{contacts.length} of</span>
              <ChevronLeft className="h-4 w-4" />
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </Card>
      </div>

      {/* New Product modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto p-0">
          <div className="flex items-center justify-between bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] px-6 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                <Plus className="h-4 w-4" />
              </div>
              <DialogHeader className="space-y-0">
                <DialogTitle className="text-white">New Product</DialogTitle>
              </DialogHeader>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/15">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 p-6">
            <Input placeholder="Product Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            <Input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
              <Input placeholder="Price" className="pl-7" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>

            <ColorPicker value={color} onChange={setColor} />
          </div>

          <DialogFooter className="gap-2 border-t px-6 py-4 sm:justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addProduct} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
              <Check className="h-4 w-4" /> Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}