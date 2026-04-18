import Pagination from "@/components/pagination";
import Sidebar from "@/components/sidebar";
import { getOrgContext } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { getCached } from "@/lib/redis";
import InventoryTable from "@/components/inventory-table";

const cardStyle = {
  background: "rgba(13,13,26,0.8)",
  border: "1px solid rgba(56,189,248,0.15)",
  borderRadius: "12px",
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const ctx = await getOrgContext();
  const { organizationId, role, orgName = "" } = ctx;

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = 10;

  const { totalCount, items } = await getCached(
    `org:${organizationId}:inventory:${q}:${page}`,
    async () => {
      const where = {
        organizationId,
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      };
      const [totalCount, items] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);
      return { totalCount, items };
    },
    30
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f" }}>
      <Sidebar currentPath="/inventory" orgName={orgName} role={role} />
      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "#e2e8f0" }}>Inventory</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(226,232,240,0.5)" }}>
            Manage your products and track inventory levels.
          </p>
        </div>

        <div className="space-y-6">
          <div style={cardStyle} className="p-4">
            <form className="flex gap-3" action="/inventory" method="GET">
              <input
                name="q"
                defaultValue={q}
                placeholder="Search products..."
                className="flex-1 px-4 py-2 rounded-lg text-sm outline-none"
                style={{ background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.2)", color: "#e2e8f0" }}
              />
              <button
                className="px-6 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(90deg, #38bdf8, #7c3aed)", color: "white" }}
              >
                Search
              </button>
            </form>
          </div>

          <div style={{ ...cardStyle, overflow: "hidden" }}>
            <InventoryTable items={items.map(p => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              price: Number(p.price),
              quantity: p.quantity,
              lowStockAt: p.lowStockAt,
            }))} />
          </div>

          {totalPages > 1 && (
            <div style={cardStyle} className="p-4">
              <Pagination currentPage={page} totalPages={totalPages} baseUrl="/inventory" searchParams={{ q, pageSize: String(pageSize) }} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
