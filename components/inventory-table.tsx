"use client";

import { useState } from "react";
import { updateProduct, deleteProduct } from "@/lib/actions/products";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  lowStockAt: number | null;
}

export default function InventoryTable({ items }: { items: Product[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Product>>({});

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditValues({
      name: product.name,
      sku: product.sku ?? "",
      price: product.price,
      quantity: product.quantity,
      lowStockAt: product.lowStockAt ?? undefined,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
  }

  const inputStyle = {
    background: "rgba(56,189,248,0.08)",
    border: "1px solid rgba(56,189,248,0.3)",
    color: "#e2e8f0",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "0.8rem",
    width: "100%",
    outline: "none",
  };

  return (
    <table className="w-full">
      <thead>
        <tr style={{ borderBottom: "1px solid rgba(56,189,248,0.1)" }}>
          {["Name", "SKU", "Price", "Quantity", "Low Stock At", "Actions"].map((h) => (
            <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest"
              style={{ color: "rgba(56,189,248,0.6)" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((product) => {
          const isEditing = editingId === product.id;
          return (
            <tr key={product.id}
              style={{ borderBottom: "1px solid rgba(56,189,248,0.06)" }}
              className="transition-colors hover:bg-[rgba(56,189,248,0.03)]">

              {/* Name */}
              <td className="px-6 py-3 text-sm font-medium" style={{ color: "#e2e8f0" }}>
                {isEditing ? (
                  <input style={inputStyle} value={editValues.name ?? ""} onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))} />
                ) : product.name}
              </td>

              {/* SKU */}
              <td className="px-6 py-3 text-sm" style={{ color: "rgba(226,232,240,0.5)" }}>
                {isEditing ? (
                  <input style={inputStyle} value={editValues.sku ?? ""} onChange={e => setEditValues(v => ({ ...v, sku: e.target.value }))} placeholder="—" />
                ) : (product.sku || "—")}
              </td>

              {/* Price */}
              <td className="px-6 py-3 text-sm font-medium" style={{ color: "#38bdf8" }}>
                {isEditing ? (
                  <input type="number" step="0.01" min="0" style={{ ...inputStyle, width: "80px" }}
                    value={editValues.price ?? ""} onChange={e => setEditValues(v => ({ ...v, price: Number(e.target.value) }))} />
                ) : `$${Number(product.price).toFixed(2)}`}
              </td>

              {/* Quantity */}
              <td className="px-6 py-3 text-sm" style={{ color: "#e2e8f0" }}>
                {isEditing ? (
                  <input type="number" min="0" style={{ ...inputStyle, width: "70px" }}
                    value={editValues.quantity ?? ""} onChange={e => setEditValues(v => ({ ...v, quantity: Number(e.target.value) }))} />
                ) : product.quantity}
              </td>

              {/* Low Stock At */}
              <td className="px-6 py-3 text-sm" style={{ color: "rgba(226,232,240,0.5)" }}>
                {isEditing ? (
                  <input type="number" min="0" style={{ ...inputStyle, width: "70px" }}
                    value={editValues.lowStockAt ?? ""} onChange={e => setEditValues(v => ({ ...v, lowStockAt: e.target.value ? Number(e.target.value) : undefined }))} placeholder="—" />
                ) : (product.lowStockAt || "—")}
              </td>

              {/* Actions */}
              <td className="px-6 py-3 text-sm">
                {isEditing ? (
                  <div className="flex gap-2">
                    <form action={async () => {
                      const fd = new FormData();
                      fd.append("id", product.id);
                      fd.append("name", String(editValues.name ?? product.name));
                      fd.append("price", String(editValues.price ?? product.price));
                      fd.append("quantity", String(editValues.quantity ?? product.quantity));
                      if (editValues.sku) fd.append("sku", editValues.sku);
                      if (editValues.lowStockAt != null) fd.append("lowStockAt", String(editValues.lowStockAt));
                      await updateProduct(fd);
                    }}>
                      <button type="submit"
                        className="text-xs font-semibold px-3 py-1 rounded transition-opacity hover:opacity-80"
                        style={{ color: "#38bdf8", border: "1px solid rgba(56,189,248,0.3)", background: "rgba(56,189,248,0.08)" }}>
                        Save
                      </button>
                    </form>
                    <button onClick={cancelEdit}
                      className="text-xs font-semibold px-3 py-1 rounded transition-opacity hover:opacity-80"
                      style={{ color: "rgba(226,232,240,0.5)", border: "1px solid rgba(226,232,240,0.15)", background: "rgba(226,232,240,0.05)" }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(product)}
                      className="text-xs font-semibold px-3 py-1 rounded transition-opacity hover:opacity-80"
                      style={{ color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.05)" }}>
                      Edit
                    </button>
                    <form action={async (formData: FormData) => {
                      await deleteProduct(formData);
                    }}>
                      <input type="hidden" name="id" value={product.id} />
                      <button type="submit"
                        className="text-xs font-semibold px-3 py-1 rounded transition-opacity hover:opacity-80"
                        style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)" }}>
                        Delete
                      </button>
                    </form>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
        {items.length === 0 && (
          <tr>
            <td colSpan={6} className="px-6 py-12 text-center text-sm" style={{ color: "rgba(226,232,240,0.3)" }}>
              No products found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
