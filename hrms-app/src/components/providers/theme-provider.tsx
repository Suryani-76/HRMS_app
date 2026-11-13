import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'maroon' | 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'maroon' | 'dark' | 'light'
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = 'maroon',
  storageKey = 'hrms-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored === 'maroon' || stored === 'light' || stored === 'dark' || stored === 'system') return stored as Theme
    return defaultTheme
  })

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark', 'maroon')
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'maroon' : 'light'
      root.classList.add(systemTheme)
      if (systemTheme === 'maroon') root.classList.add('dark')
    } else {
      root.classList.add(theme)
      if (theme === 'maroon') {
        root.classList.add('dark')
      }
    }
    localStorage.setItem(storageKey, theme)
  }, [theme, storageKey])

  const resolvedTheme: 'maroon' | 'dark' | 'light' =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'maroon'
        : 'light'
      : theme

  return (
    <ThemeProviderContext.Provider {...props} value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeProviderContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
