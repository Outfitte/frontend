import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateOutfit } from '@/hooks/use-outfits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const schema = z.strictObject({
  name: z.string().max(200, { error: 'Name must be 200 characters or fewer' }).or(z.literal('')).optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function CreateOutfitPage() {
  const navigate = useNavigate()
  const { mutateAsync: createOutfit } = useCreateOutfit()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', notes: '' },
  })

  async function onSubmit(values: FormValues) {
    try {
      const outfit = await createOutfit({
        name: values.name || '',
        notes: values.notes || undefined,
      })
      navigate(`/outfits/${outfit.id}/edit`)
    } catch {
      // hook's onError already shows toast; stay on form
    }
  }

  return (
    <div data-testid="create-outfit-page">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Outfit</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 max-w-lg">
        <div className="space-y-1">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register('name')} placeholder="e.g. Casual Friday" />
          {errors.name && (
            <p className="text-destructive text-xs">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" {...register('notes')} placeholder="Optional notes about this outfit" />
        </div>

        <div className="flex gap-2">
          <Button type="submit">Save</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/outfits')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
