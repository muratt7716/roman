'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createRoleSchema, type CreateRoleInput } from '@/lib/validations/project'

interface Role extends CreateRoleInput {
  id: string
}

interface RoleFormProps {
  roles: Role[]
  onChange: (roles: Role[]) => void
}

const ROLE_PRESETS = [
  'Baş Yazar', 'Editör', 'Diyalog Yazarı', 'Dünya İnşacısı',
  'Lore Uzmanı', 'Karakter Tasarımcısı', 'Aksiyon Sahnesi Yazarı',
]

export function RoleForm({ roles, onChange }: RoleFormProps) {
  const [showForm, setShowForm] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateRoleInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createRoleSchema) as any,
    defaultValues: { max_members: 1 },
  })

  function addRole(data: CreateRoleInput) {
    const newRole: Role = { ...data, id: crypto.randomUUID() }
    onChange([...roles, newRole])
    reset()
    setShowForm(false)
  }

  function removeRole(id: string) {
    onChange(roles.filter(r => r.id !== id))
  }

  function addPreset(name: string) {
    const exists = roles.find(r => r.name === name)
    if (exists) return
    onChange([...roles, { id: crypto.randomUUID(), name, max_members: 1 }])
  }

  return (
    <div className="space-y-4">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {ROLE_PRESETS.map(preset => (
          <button
            key={preset}
            type="button"
            onClick={() => addPreset(preset)}
            disabled={!!roles.find(r => r.name === preset)}
            className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + {preset}
          </button>
        ))}
      </div>

      {/* Existing roles */}
      {roles.length > 0 && (
        <div className="space-y-2">
          {roles.map(role => (
            <div key={role.id} className="flex items-center justify-between p-3 glass rounded-lg">
              <div>
                <p className="text-sm font-medium">{role.name}</p>
                {role.description && (
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                )}
                <p className="text-xs text-muted-foreground">Maks. {role.max_members} kişi</p>
              </div>
              <button
                type="button"
                onClick={() => removeRole(role.id)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={`${role.name} rolünü kaldır`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add custom role */}
      {showForm ? (
        <div className="glass rounded-lg p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Rol Adı *</Label>
            <Input id="role-name" placeholder="örn. Antagonist Yazarı" className="bg-surface-2 border-border" {...register('name')} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-desc">Açıklama</Label>
            <Input id="role-desc" placeholder="Bu rolün sorumlulukları..." className="bg-surface-2 border-border" {...register('description')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-max">Maksimum Kişi</Label>
            <Input id="role-max" type="number" min={1} max={10} className="bg-surface-2 border-border w-24" {...register('max_members', { valueAsNumber: true })} />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleSubmit(addRole)}>Ekle</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>İptal</Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Özel Rol Ekle
        </button>
      )}
    </div>
  )
}
