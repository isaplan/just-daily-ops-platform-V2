export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to Just Daily Ops V2 - MongoDB + GraphQL Backend
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold mb-2">GraphQL API</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Access the GraphQL endpoint at <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/graphql</code>
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <h3 className="font-semibold mb-2">MongoDB</h3>
          <p className="text-sm text-muted-foreground">
            Connected to MongoDB Atlas. Database is ready for data.
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <h3 className="font-semibold mb-2">Status</h3>
          <p className="text-sm text-muted-foreground">
            V2 backend is ready. Features will be added incrementally.
          </p>
        </div>
      </div>
    </div>
  );
}

