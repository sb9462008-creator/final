"use server";

import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { invalidateCache } from "@/lib/redis";
import { z } from "zod";

const ProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.coerce.number().nonnegative("Price must be non-negative"),
  quantity: z.coerce.number().int().min(0, "Quantity must be non-negative"),
  sku: z.string().optional(),
  lowStockAt: z.coerce.number().int().min(0).optional(),
});

export async function deleteProduct(formData: FormData) {
  const ctx = await getOrgContext();
  const id = String(formData.get("id") || "");

  await prisma.product.deleteMany({
    where: { id, organizationId: ctx.organizationId },
  });

  await invalidateCache([
    `org:${ctx.organizationId}:dashboard`,
    `org:${ctx.organizationId}:inventory:*`,
  ]);
}

export async function createProduct(formData: FormData) {
  const ctx = await getOrgContext();

  const parsed = ProductSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
    quantity: formData.get("quantity"),
    sku: formData.get("sku") || undefined,
    lowStockAt: formData.get("lowStockAt") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Validation failed");
  }

  await prisma.product.create({
    data: { ...parsed.data, organizationId: ctx.organizationId },
  });

  await invalidateCache([
    `org:${ctx.organizationId}:dashboard`,
    `org:${ctx.organizationId}:inventory:*`,
  ]);

  redirect("/inventory");
}

export async function updateProduct(formData: FormData) {
  const ctx = await getOrgContext();
  const id = String(formData.get("id") || "");

  // Verify product belongs to this org
  const existing = await prisma.product.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });
  if (!existing) throw new Error("Product not found.");

  const parsed = ProductSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
    quantity: formData.get("quantity"),
    sku: formData.get("sku") || undefined,
    lowStockAt: formData.get("lowStockAt") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Validation failed");
  }

  await prisma.product.update({
    where: { id },
    data: parsed.data,
  });

  await invalidateCache([
    `org:${ctx.organizationId}:dashboard`,
    `org:${ctx.organizationId}:inventory:*`,
  ]);

  redirect("/inventory");
}
