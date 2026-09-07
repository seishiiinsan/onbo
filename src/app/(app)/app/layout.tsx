import { AGENCY_ROLE_LABEL } from "@/lib/access";
import { requireTenant } from "@/lib/tenant";
import { Sidebar } from "./sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireTenant();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        agencyName={ctx.agencyName}
        email={ctx.email}
        roleLabel={AGENCY_ROLE_LABEL[ctx.role]}
      />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 md:px-10 md:py-12">
        {children}
      </main>
    </div>
  );
}
