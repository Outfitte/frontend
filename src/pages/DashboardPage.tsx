import { useAuthStore } from '@/stores/auth'

function StatCard({ label }: { label: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground opacity-50">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">—</p>
    </div>
  )
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div data-testid="dashboard-page">
      <h1 className="text-2xl font-bold">
        Welcome to Outfitte{user?.email ? (
          <>, <span>{user.email}</span></>
        ) : null}
      </h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Total items" />
        <StatCard label="Recent outfits" />
      </div>
    </div>
  )
}
