"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type Product = {
  id: string;
  sku: string;
  name: string;
  stock: number;
  min_stock: number;
  image_url: string | null;
  created_at: string;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*");

    if (error) {
      console.error("Error fetching products:", error.message);
      return;
    }

    if (data) {
      setProducts(data as Product[]);
    }
  };

  // 3. ระบุ Type ให้ parameter (id และ delta)
  const updateStock = async (id: string | number, delta: number) => {
    const product = products.find((p) => p.id === id);

    // ป้องกันกรณีหา product ไม่เจอ
    if (!product) return;

    const newStock = product.stock + delta;

    // อัปเดต Stock
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", id);

    if (updateError) {
      console.error("Update error:", updateError.message);
      return;
    }

    // บันทึก Log
    await supabase.from("stock_logs").insert({
      product_id: id,
      change: delta,
    });

    fetchProducts();
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const { data, error } = await supabase.from("products").select("*");

      if (!ignore && data) {
        setProducts(data as Product[]);
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Stock Management</h1>

      {products.map((p) => (
        <div
          key={p.id}
          style={{
            marginBottom: 10,
            borderBottom: "1px solid #ccc",
            padding: "10px 0",
          }}
        >
          <strong>{p.name}</strong> | คงเหลือ: {p.stock}
          <div style={{ marginTop: 5 }}>
            <button
              onClick={() => updateStock(p.id, 1)}
              style={{ marginRight: 5 }}
            >
              +
            </button>
            <button onClick={() => updateStock(p.id, -1)}>-</button>

            {p.stock <= p.min_stock && (
              <span style={{ color: "red", marginLeft: 10 }}>
                {" "}
                ⚠️ สินค้าใกล้หมด!
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
