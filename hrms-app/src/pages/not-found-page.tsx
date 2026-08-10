import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 p-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FileQuestion className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-3xl font-bold">404</h1>
        <p className="mt-1 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/login">Go to login</Link>
        </Button>
      </div>
    </div>
  )
}
