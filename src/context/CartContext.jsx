import { createContext, useContext, useMemo, useState } from "react";

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    const raw = localStorage.getItem("cart");
    return raw ? JSON.parse(raw) : [];
  });

  const sync = (next) => {
    setItems(next);
    localStorage.setItem("cart", JSON.stringify(next));
  };

  const addToCart = (product, quantity = 1) => {
    const exists = items.find((x) => x.id === product.id);
    if (exists) return sync(items.map((x) => (x.id === product.id ? { ...x, quantity: x.quantity + quantity } : x)));
    sync([...items, { ...product, quantity }]);
  };

  const removeFromCart = (id) => sync(items.filter((x) => x.id !== id));
  const clear = () => sync([]);
  const total = items.reduce((acc, x) => acc + x.price * x.quantity, 0);
  const payloadItems = items.map((x) => ({ productId: x.id, quantity: x.quantity }));
  const value = useMemo(() => ({ items, addToCart, removeFromCart, clear, total, payloadItems }), [items, total]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
