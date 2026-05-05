import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import API from "./api";
import { useAuth } from "./context/AuthContext";
import { useCart } from "./context/CartContext";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

const resolveImageUrl = (url) => {
  if (!url) return "https://placehold.co/600x400";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api").replace('/api', '');
  return `${baseUrl}${url}`;
};

function Layout({ children }) {
  const { user, logout } = useAuth();
  const { items } = useCart();
  return (
    <div>
      <header className="border-b bg-white">
        <nav className="container-app flex items-center justify-between py-4">
          <Link to="/" className="text-xl font-bold">Prodnet Store</Link>
          <div className="flex gap-4 text-sm">
            <Link to="/cart">Cart ({items.length})</Link>
            {user ? (
              <>
                <Link to="/profile">Profile</Link>
                {user.role === "Admin" && <Link to="/admin">Admin</Link>}
                <button onClick={logout}>Logout</button>
              </>
            ) : (
              <Link to="/login">Login</Link>
            )}
          </div>
        </nav>
      </header>
      <main className="container-app py-6">{children}</main>
    </div>
  );
}

const Card = ({ p, onAdd }) => (
  <div className="rounded-xl border bg-white p-4 shadow-sm">
    <img src={resolveImageUrl(p.mainImageUrl)} alt={p.name} className="h-48 w-full rounded-lg object-cover" />
    <h3 className="mt-3 text-lg font-semibold">{p.name}</h3>
    <p className="line-clamp-2 text-sm text-slate-600">{p.description}</p>
    <div className="mt-3 flex items-center justify-between">
      <span className="font-semibold">${p.price}</span>
      <div className="flex gap-2">
        <Link className="rounded bg-slate-200 px-3 py-1 text-sm" to={`/products/${p.id}`}>View</Link>
        <button className="rounded bg-slate-900 px-3 py-1 text-sm text-white" onClick={() => onAdd(p)}>Add</button>
      </div>
    </div>
  </div>
);

function HomePage() {
  const [data, setData] = useState({ items: [], page: 1, totalItems: 0, pageSize: 12 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const { addToCart } = useCart();

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        API.get("/products", { params: { page, pageSize: 8, categoryId: categoryId || undefined } }),
        API.get("/categories"),
      ]);
      setData(p.data);
      setCategories(c.data);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(1); }, [categoryId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Published Products</h1>
        <select className="rounded border px-3 py-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {error && <p className="rounded bg-red-100 p-3 text-red-600">{error}</p>}
      {loading ? <p>Loading products...</p> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.items.map((p) => <Card key={p.id} p={p} onAdd={addToCart} />)}
          </div>
          <div className="flex items-center justify-center gap-3">
            <button className="rounded border px-3 py-1" disabled={data.page <= 1} onClick={() => load(data.page - 1)}>Prev</button>
            <span>Page {data.page}</span>
            <button className="rounded border px-3 py-1" disabled={data.page * data.pageSize >= data.totalItems} onClick={() => load(data.page + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}

function ProductDetailsPage() {
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const { addToCart } = useCart();
  const id = window.location.pathname.split("/").pop();
  useEffect(() => {
    API.get(`/products/${id}`).then((r) => setProduct(r.data)).catch((e) => setError(e?.response?.data?.message || "Not found."));
  }, [id]);
  if (error) return <p className="rounded bg-red-100 p-3 text-red-600">{error}</p>;
  if (!product) return <p>Loading product...</p>;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <img src={resolveImageUrl(product.mainImageUrl)} alt={product.name} className="h-96 w-full rounded-xl object-cover" />
        <div className="mt-3 grid grid-cols-4 gap-2">
          {product.gallery?.map((g) => <img key={g.id} src={resolveImageUrl(g.imageUrl)} alt="gallery" className="h-20 w-full rounded object-cover" />)}
        </div>
      </div>
      <div>
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <p className="mt-2 text-slate-600">{product.description}</p>
        <p className="mt-4 text-2xl font-semibold">${product.price}</p>
        <button className="mt-4 rounded bg-slate-900 px-4 py-2 text-white" onClick={() => addToCart(product)}>Add to cart</button>
      </div>
    </div>
  );
}

function CartPage() {
  const { items, removeFromCart, total } = useCart();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Cart</h1>
      <div className="space-y-3">
        {items.map((x) => (
          <div key={x.id} className="flex items-center justify-between rounded border bg-white p-3">
            <div>{x.name} x{x.quantity}</div>
            <div className="flex items-center gap-4">
              <span>${(x.price * x.quantity).toFixed(2)}</span>
              <button className="text-red-600" onClick={() => removeFromCart(x.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between rounded bg-white p-4">
        <p className="font-semibold">Total: ${total.toFixed(2)}</p>
        <Link className="rounded bg-slate-900 px-4 py-2 text-white" to="/checkout">Checkout</Link>
      </div>
    </div>
  );
}

function LoginPage() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [isRegister, setRegisterMode] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "", address: "", age: 18 });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
      nav("/");
    } catch (ex) {
      setError(ex?.response?.data?.message || ex?.response?.data?.errors?.Age?.[0] || "Authentication failed.");
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3 rounded-xl border bg-white p-6">
      <h1 className="text-xl font-bold">{isRegister ? "Register" : "Login"}</h1>
      {error && <p className="rounded bg-red-100 p-2 text-red-600">{error}</p>}
      {isRegister && <input className="w-full rounded border p-2" placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />}
      <input className="w-full rounded border p-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input className="w-full rounded border p-2" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      {isRegister && (
        <>
          <input className="w-full rounded border p-2" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="w-full rounded border p-2" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input className="w-full rounded border p-2" type="number" placeholder="Age" value={form.age} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} />
        </>
      )}
      <button className="w-full rounded bg-slate-900 p-2 text-white">{isRegister ? "Create account" : "Sign in"}</button>
      <button type="button" className="w-full text-sm underline" onClick={() => setRegisterMode(!isRegister)}>
        {isRegister ? "Already have an account? Login" : "No account? Register"}
      </button>
    </form>
  );
}

function CheckoutPage() {
  const { user } = useAuth();
  const { payloadItems } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!user) return <Navigate to="/login" replace />;

  const pay = async () => {
    setLoading(true);
    try {
      const origin = window.location.origin;
      const { data } = await API.post("/payments/create-checkout-session", {
        items: payloadItems,
        successUrl: `${origin}/checkout/success`,
        cancelUrl: `${origin}/checkout`,
      });
      const stripe = await stripePromise;
      await stripe.redirectToCheckout({ sessionId: data.sessionId });
    } catch (e) {
      setError(e?.response?.data?.message || "Checkout failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-white p-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      {error && <p className="mt-3 rounded bg-red-100 p-2 text-red-600">{error}</p>}
      <button disabled={loading || payloadItems.length === 0} onClick={pay} className="mt-4 rounded bg-emerald-600 px-4 py-2 text-white">
        {loading ? "Redirecting..." : "Pay with Stripe"}
      </button>
    </div>
  );
}

function CheckoutSuccessPage() {
  const [search] = useSearchParams();
  const [msg, setMsg] = useState("Verifying payment...");
  const { payloadItems, clear } = useCart();
  useEffect(() => {
    const sessionId = search.get("session_id");
    if (!sessionId) return setMsg("Session id missing.");
    API.post("/payments/verify-and-create-order", { sessionId, items: payloadItems })
      .then(() => { setMsg("Payment successful and order created."); clear(); })
      .catch(() => setMsg("Payment could not be verified."));
  }, []);
  return <p className="rounded bg-white p-6">{msg}</p>;
}

function ProfilePage() {
  const [profile, setProfile] = useState(null);
  useEffect(() => { API.get("/profile").then((r) => setProfile(r.data)); }, []);
  if (!profile) return <p>Loading profile...</p>;
  return (
    <div className="space-y-5">
      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-bold">{profile.fullName}</h1>
        <p>{profile.email}</p><p>{profile.phone}</p><p>{profile.address}</p><p>Age: {profile.age}</p>
      </div>
      <div className="rounded border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Order History</h2>
        {profile.orders.map((o) => <div key={o.id} className="mb-2 rounded border p-2">{o.id} - ${o.totalPrice} - {o.status}</div>)}
      </div>
    </div>
  );
}

function AdminPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [name, setName] = useState("");
  const [categoryImage, setCategoryImage] = useState(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: 0,
    mainImageUrl: "",
    categoryId: "",
    galleryUrls: [],
    status: "Pending",
  });
  const [productImage, setProductImage] = useState(null);

  const load = async () => {
    const [c, p, o] = await Promise.all([
      API.get("/categories"),
      API.get("/products/admin", { params: { page: 1, pageSize: 50 } }),
      API.get("/admin/orders"),
    ]);
    setCategories(c.data); setProducts(p.data.items); setOrders(o.data);
  };
  useEffect(() => { if (user?.role === "Admin") load(); }, [user]);
  if (user?.role !== "Admin") return <Navigate to="/" replace />;

  const addCategory = async () => {
    let imageUrl = "https://placehold.co/600x400";
    if (categoryImage) {
      const formData = new FormData();
      formData.append("file", categoryImage);
      const res = await API.post("/categories/upload-image", formData);
      imageUrl = res.data.imageUrl;
    }
    await API.post("/categories", { name, imageUrl });
    setName(""); setCategoryImage(null); load();
  };
  const deleteCategory = async (id) => { await API.delete(`/categories/${id}`); load(); };
  const createProduct = async () => {
    let mainImageUrl = productForm.mainImageUrl || "https://placehold.co/1000x700";
    if (productImage) {
      const formData = new FormData();
      formData.append("file", productImage);
      const res = await API.post("/products/upload-image", formData);
      mainImageUrl = res.data.imageUrl;
    }
    await API.post("/products", { ...productForm, mainImageUrl }); 
    setProductForm({ ...productForm, name: "", description: "", price: 0, mainImageUrl: "" }); 
    setProductImage(null);
    load(); 
  };
  const deleteProduct = async (id) => { await API.delete(`/products/${id}`); load(); };
  const updateProductStatus = async (id, status) => {
    const p = products.find((x) => x.id === id);
    await API.put(`/products/${id}`, {
      name: p.name, description: p.description, price: p.price, mainImageUrl: p.mainImageUrl,
      categoryId: categories[0]?.id || p.categoryId, galleryUrls: p.gallery?.map((g) => g.imageUrl) || [], status
    });
    load();
  };
  const updateOrderStatus = async (id, status) => { await API.patch(`/admin/orders/${id}/status`, { status }); load(); };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <section className="rounded border bg-white p-4">
        <h2 className="font-semibold">Manage Categories</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <input className="rounded border p-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" />
          <input className="rounded border p-2" type="file" accept="image/*" onChange={(e) => setCategoryImage(e.target.files[0])} />
          <button className="rounded bg-slate-900 px-3 py-2 text-white" onClick={addCategory}>Create</button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded border p-2">
              <span>{c.name}</span>
              <button className="text-red-600" onClick={() => deleteCategory(c.id)}>Delete</button>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded border bg-white p-4">
        <h2 className="font-semibold">Manage Products</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input className="rounded border p-2" placeholder="Name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
          <input className="rounded border p-2" placeholder="Description" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
          <input className="rounded border p-2" type="number" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })} />
          <select className="rounded border p-2" value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="rounded border p-2" type="file" accept="image/*" onChange={(e) => setProductImage(e.target.files[0])} />
          <select className="rounded border p-2" value={productForm.status} onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}>
            <option>Pending</option><option>Published</option>
          </select>
          <button className="rounded bg-slate-900 px-3 py-2 text-white sm:col-span-2" onClick={createProduct}>Create Product</button>
        </div>
        {products.map((p) => (
          <div key={p.id} className="mt-2 flex items-center justify-between rounded border p-2">
            <span>{p.name} - {p.status}</span>
            <div className="flex gap-2">
              <button className="rounded border px-2" onClick={() => updateProductStatus(p.id, p.status === "Published" ? "Pending" : "Published")}>Toggle Status</button>
              <button className="text-red-600" onClick={() => deleteProduct(p.id)}>Delete</button>
            </div>
          </div>
        ))}
      </section>
      <section className="rounded border bg-white p-4">
        <h2 className="font-semibold">Orders</h2>
        {orders.map((o) => (
          <div key={o.id} className="mt-2 flex items-center justify-between rounded border p-2">
            <span>{o.id} - {o.status} - ${o.totalPrice}</span>
            <select className="rounded border p-1" value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)}>
              <option>Pending</option><option>Paid</option><option>Shipped</option><option>Cancelled</option>
            </select>
          </div>
        ))}
      </section>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products/:id" element={<ProductDetailsPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      </Routes>
    </Layout>
  );
}
