import { useState, useEffect, useMemo } from 'react'
import { ToggleRight, Search, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { featureToggleService, type FeatureToggle } from '@/services/featureToggleService'

const ROLE_OPTIONS = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'HR_MANAGER', label: 'HR Manager' },
  { value: 'ADMIN', label: 'Admin' },
]

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  advanced: 'Advanced',
  ai: 'AI',
}

const CATEGORY_COLORS: Record<string, string> = {
  core: 'bg-blue-500/20 text-blue-400',
  advanced: 'bg-purple-500/20 text-purple-400',
  ai: 'bg-green-500/20 text-green-400',
}

export default function FeatureTogglePage() {
  const [features, setFeatures] = useState<FeatureToggle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [creating, setCreating] = useState(false)
  const [newFeature, setNewFeature] = useState({ featureKey: '', name: '', description: '', category: 'core' })

  useEffect(() => {
    fetchFeatures()
  }, [])

  async function fetchFeatures() {
    try {
      setLoading(true)
      const data = await featureToggleService.getAll()
      setFeatures(data)
    } catch {
      toast.error('Không thể tải danh sách chức năng')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleGlobal(feature: FeatureToggle) {
    try {
      const updated = await featureToggleService.update(feature.featureKey, { enabled: !feature.enabled })
      setFeatures(prev => prev.map(f => f.featureKey === updated.featureKey ? updated : f))
      toast.success(`${feature.name}: ${!feature.enabled ? 'Bật' : 'Tắt'} thành công`)
    } catch {
      toast.error('Cập nhật thất bại')
    }
  }

  async function handleRoleDisabled(feature: FeatureToggle, roleValue: string, disabled: boolean) {
    const current = feature.disabledForRoles ?? []
    const next = disabled
      ? [...new Set([...current, roleValue])]
      : current.filter(r => r !== roleValue)
    try {
      const updated = await featureToggleService.update(feature.featureKey, { disabledForRoles: next })
      setFeatures(prev => prev.map(f => (f.featureKey === updated.featureKey ? updated : f)))
    } catch {
      toast.error('Cập nhật quyền thất bại')
    }
  }

  async function handleDelete(feature: FeatureToggle) {
    if (!window.confirm(`Xóa feature "${feature.name}"?`)) return
    try {
      await featureToggleService.remove(feature.featureKey)
      setFeatures(prev => prev.filter(f => f.featureKey !== feature.featureKey))
      toast.success('Đã xóa feature')
    } catch {
      toast.error('Xóa thất bại')
    }
  }

  async function handleCreate() {
    if (!newFeature.featureKey || !newFeature.name) {
      toast.error('featureKey và tên là bắt buộc')
      return
    }
    try {
      const created = await featureToggleService.create(newFeature)
      setFeatures(prev => [...prev, created])
      setCreating(false)
      setNewFeature({ featureKey: '', name: '', description: '', category: 'core' })
      toast.success('Tạo feature thành công')
    } catch {
      toast.error('Tạo feature thất bại')
    }
  }

  const filtered = useMemo(() => {
    return features.filter(f => {
      const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.featureKey.includes(search.toLowerCase())
      const matchCategory = categoryFilter === 'all' || f.category === categoryFilter
      return matchSearch && matchCategory
    })
  }, [features, search, categoryFilter])

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-36 rounded-lg animate-pulse bg-[var(--border)]" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ToggleRight className="h-6 w-6 text-[var(--primary)]" />
          <div>
            <h1 className="text-2xl font-bold">Quản lý chức năng</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Bật/tắt module cho toàn hệ thống hoặc theo role</p>
          </div>
        </div>
        <Button onClick={() => setCreating(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Thêm feature
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Tìm kiếm..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'core', 'advanced', 'ai'].map(cat => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'all' ? 'Tất cả' : CATEGORY_LABELS[cat]}
            </Button>
          ))}
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid gap-4 mt-4">
        {filtered.map(feature => (
          <Card key={feature.featureKey}>
            <CardContent className="p-5 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base">{feature.name}</span>
                    <Badge className={`text-xs ${CATEGORY_COLORS[feature.category] ?? ''}`}>
                      {CATEGORY_LABELS[feature.category] ?? feature.category}
                    </Badge>
                    <code className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] px-1.5 py-0.5 rounded">
                      {feature.featureKey}
                    </code>
                  </div>
                  {feature.description && (
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">{feature.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Global</Label>
                    <Switch
                      checked={feature.enabled}
                      onCheckedChange={() => handleToggleGlobal(feature)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(feature)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <p className="text-xs text-[var(--muted-foreground)] mb-3 font-medium">
                  Tắt cho các role (bật = role không dùng được tính năng này):
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-3">
                  {ROLE_OPTIONS.map(role => (
                    <div key={role.value} className="flex items-center gap-1.5">
                      <Label className="text-sm font-medium whitespace-nowrap">{role.label}</Label>
                      <Switch
                        checked={feature.disabledForRoles?.includes(role.value) ?? false}
                        onCheckedChange={disabled =>
                          handleRoleDisabled(feature, role.value, disabled)
                        }
                        aria-label={`Tắt ${feature.name} cho ${role.label}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[var(--muted-foreground)]">Không tìm thấy feature nào</div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Feature mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Feature Key *</Label>
              <Input
                placeholder="vd: custom_reports"
                value={newFeature.featureKey}
                onChange={e => setNewFeature(p => ({ ...p, featureKey: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tên hiển thị *</Label>
              <Input
                placeholder="vd: Báo cáo tùy chỉnh"
                value={newFeature.name}
                onChange={e => setNewFeature(p => ({ ...p, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Mô tả</Label>
              <Input
                placeholder="Mô tả ngắn về chức năng..."
                value={newFeature.description}
                onChange={e => setNewFeature(p => ({ ...p, description: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              {['core', 'advanced', 'ai'].map(cat => (
                <Button
                  key={cat}
                  variant={newFeature.category === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewFeature(p => ({ ...p, category: cat }))}
                >
                  {CATEGORY_LABELS[cat]}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} className="flex-1">Tạo</Button>
              <Button variant="outline" onClick={() => setCreating(false)} className="flex-1">Hủy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
