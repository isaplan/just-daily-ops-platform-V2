export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Just Daily Ops V2</h1>
        <p className="text-lg text-muted-foreground mb-8">
          MongoDB + GraphQL Backend
        </p>
        
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">GraphQL API</h2>
            <p className="text-sm text-muted-foreground mb-2">
              Access the GraphQL endpoint at:
            </p>
            <code className="text-sm bg-muted p-2 rounded block">
              /api/graphql
            </code>
          </div>

          <div className="p-4 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Status</h2>
            <p className="text-sm text-muted-foreground">
              ✅ V2 backend is ready. Frontend migration in progress.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
