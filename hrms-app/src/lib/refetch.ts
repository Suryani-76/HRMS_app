import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useRefetch(keys: readonly unknown[][]) {
  const queryClient = useQueryClient()
  return () => {
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
  }
}

export { toast }
