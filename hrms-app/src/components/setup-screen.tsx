import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'

export function SetupScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-4 p-8 text-center">
          <div className="mx-auto flex h-16 items-center justify-center mb-6">
            <Logo size="xl" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Supabase not configured</h1>
          <p className="text-sm text-muted-foreground">
            Create a <span className="font-medium text-foreground">.env</span> file in <code className="rounded bg-muted px-1.5 py-0.5 text-xs">hrms-app/</code> and add
            your Supabase project URL and anon key, then restart the dev server.
          </p>
          <div className="rounded-lg border bg-muted/50 p-4 text-left font-mono text-xs">
            <p>VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co</p>
            <p>VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY</p>
            <p>VITE_APP_URL=http://localhost:5173</p>
          </div>
          <ol className="space-y-2 text-left text-sm text-muted-foreground">
            <li>
              1. Run the migrations in <code className="rounded bg-muted px-1.5 py-0.5 text-xs">supabase/migrations/</code> against your project.
            </li>
            <li>
              2. Sign in with <span className="font-medium text-foreground">ceo@oklut.com</span> /{' '}
              <span className="font-medium text-foreground">1234</span>.
            </li>
          </ol>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
