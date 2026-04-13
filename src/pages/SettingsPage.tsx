import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import type { AppSettings } from '@/types'
import type { Theme } from '@/stores/theme'

function useAdminSettings() {
  return useQuery<AppSettings>({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.get('/admin/settings'),
  })
}

function useUpdateAdminSettings() {
  const queryClient = useQueryClient()
  return useMutation<AppSettings, Error, Partial<AppSettings>>({
    mutationFn: (data) => api.patch('/admin/settings', data),
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'settings'] })
      const previous = queryClient.getQueryData<AppSettings>(['admin', 'settings'])
      queryClient.setQueryData<AppSettings>(['admin', 'settings'], (old) =>
        old ? { ...old, ...newSettings } : old
      )
      return { previous }
    },
    onError: (error, _vars, context) => {
      const ctx = context as { previous: AppSettings | undefined } | undefined
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(['admin', 'settings'], ctx.previous)
      }
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
    },
  })
}

function AdminSection() {
  const { data: settings } = useAdminSettings()
  const updateSettings = useUpdateAdminSettings()

  if (!settings) return null

  function handleRegistrationToggle(checked: boolean) {
    updateSettings.mutate({ registration_enabled: checked })
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">Admin</h2>
      <div className="mt-4 flex items-center gap-3">
        <Switch
          id="registration-toggle"
          checked={settings.registration_enabled}
          onCheckedChange={handleRegistrationToggle}
          aria-label="Registration enabled"
        />
        <Label htmlFor="registration-toggle">Allow new user registration</Label>
      </div>
    </section>
  )
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const { theme, setTheme } = useThemeStore()

  return (
    <div data-testid="settings-page">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Account</h2>
        <p className="mt-2 text-sm text-muted-foreground">Email: {user?.email}</p>
        <p className="mt-1 text-sm text-muted-foreground">Role: {user?.role}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <div className="mt-4 flex gap-2">
          {(['light', 'dark', 'system'] as Theme[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              aria-pressed={theme === t}
              className="rounded border px-3 py-1 capitalize"
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {user?.role === 'admin' && (
        <div className="mt-6">
          <AdminSection />
        </div>
      )}
    </div>
  )
}
