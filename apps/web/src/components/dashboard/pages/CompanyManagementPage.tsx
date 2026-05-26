import { useState, useEffect, useCallback } from 'react'
import { Building2, Search, Pencil, Eye, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { companyService, type Company, type UpdateCompanyPayload } from '@/services/companyService'

const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial',
  starter: 'Starter',
  standard: 'Standard',
  premium: 'Premium',
}

const PLAN_COLORS: Record<string, string> = {
  trial: 'bg-zinc-500/20 text-zinc-400',
  starter: 'bg-blue-500/20 text-blue-400',
  standard: 'bg-purple-500/20 text-purple-400',
  premium: 'bg-yellow-500/20 text-yellow-400',
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-1.5 border-b border-[var(--border)] last:border-0">
      <span className="text-[var(--muted-foreground)] shrink-0">{label}</span>
      <span className="text-[var(--text-main)] text-right font-medium break-all">{value}</span>
    </div>
  )
}

export default function CompanyManagementPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const limit = 20

  const [viewing, setViewing] = useState<Company | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [editForm, setEditForm] = useState<UpdateCompanyPayload>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true)
      const params: {
        page: number
        limit: number
        search?: string
        plan?: string
        isActive?: string
      } = { page, limit }
      if (search.trim()) params.search = search.trim()
      if (planFilter !== 'all') params.plan = planFilter
      if (statusFilter === 'active') params.isActive = 'true'
      if (statusFilter === 'inactive') params.isActive = 'false'

      const result = await companyService.list(params)
      setCompanies(result.data)
      setTotal(result.total)
    } catch {
      toast.error('Không thể tải danh sách công ty')
    } finally {
      setLoading(false)
    }
  }, [page, search, planFilter, statusFilter])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  async function openView(company: Company) {
    setViewing(company)
    setViewLoading(true)
    try {
      const detail = await companyService.get(company._id)
      setViewing(detail)
    } catch {
      toast.error('Không tải được chi tiết công ty')
      setViewing(null)
    } finally {
      setViewLoading(false)
    }
  }

  function openEdit(company: Company) {
    setEditing(company)
    setEditForm({
      name: company.name,
      email: company.email ?? '',
      phone: company.phone ?? '',
      plan: company.plan,
      isActive: company.isActive,
      maxUsers: company.maxUsers,
    })
  }

  async function handleSave() {
    if (!editing) return
    try {
      setSaving(true)
      const updated = await companyService.update(editing._id, editForm)
      setCompanies(prev => prev.map(c => (c._id === updated._id ? { ...c, ...updated } : c)))
      toast.success('Cập nhật công ty thành công')
      setEditing(null)
      if (viewing?._id === updated._id) setViewing(prev => (prev ? { ...prev, ...updated } : prev))
    } catch {
      toast.error('Cập nhật thất bại')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await companyService.remove(deleteTarget._id)
      toast.success('Đã xóa công ty')
      setDeleteTarget(null)
      if (viewing?._id === deleteTarget._id) setViewing(null)
      if (companies.length === 1 && page > 1) setPage(p => p - 1)
      else fetchCompanies()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg || 'Không xóa được công ty')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-[var(--primary)]" />
        <div>
          <h1 className="text-2xl font-bold">Quản lý công ty</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Danh sách tenant — {total} công ty
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={planFilter}
          onValueChange={v => {
            setPlanFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Gói" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả gói</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={v => {
            setStatusFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="inactive">Tạm khóa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3 mt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-lg animate-pulse bg-[var(--border)]" />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-3 mt-4">
            {companies.map(company => (
              <Card key={company._id}>
                <CardContent className="!p-4 flex items-center justify-between gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent-cyan)]/20 border border-[var(--border)]"
                    aria-hidden
                  >
                    <Building2 className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{company.name}</span>
                      <Badge className={`text-xs ${PLAN_COLORS[company.plan]}`}>
                        {PLAN_LABELS[company.plan]}
                      </Badge>
                      <Badge
                        className={`text-xs ${company.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                      >
                        {company.isActive ? 'Hoạt động' : 'Tạm khóa'}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-4 text-sm text-[var(--muted-foreground)] flex-wrap">
                      {company.email && <span>{company.email}</span>}
                      <span>Tối đa {company.maxUsers} users</span>
                      {company.userCount !== undefined && (
                        <span>{company.userCount} users hiện tại</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Xem chi tiết"
                      onClick={() => openView(company)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Chỉnh sửa"
                      onClick={() => openEdit(company)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Xóa"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => setDeleteTarget(company)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {companies.length === 0 && (
              <div className="text-center py-12 text-[var(--muted-foreground)]">
                Không tìm thấy công ty nào
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Trước
              </Button>
              <span className="text-sm text-[var(--muted-foreground)]">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Sau
              </Button>
            </div>
          )}
        </>
      )}

      {/* View detail */}
      <Dialog open={!!viewing} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chi tiết công ty</DialogTitle>
            <DialogDescription>Thông tin tenant trên hệ thống</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-1">
              {viewLoading ? (
                <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">Đang tải...</p>
              ) : (
                <>
                  <DetailRow label="Tên công ty" value={viewing.name} />
                  <DetailRow label="Slug" value={viewing.slug} />
                  <DetailRow
                    label="Gói"
                    value={
                      <Badge className={`text-xs ${PLAN_COLORS[viewing.plan]}`}>
                        {PLAN_LABELS[viewing.plan]}
                      </Badge>
                    }
                  />
                  <DetailRow
                    label="Trạng thái"
                    value={viewing.isActive ? 'Hoạt động' : 'Tạm khóa'}
                  />
                  <DetailRow label="Email" value={viewing.email || '—'} />
                  <DetailRow label="Điện thoại" value={viewing.phone || '—'} />
                  <DetailRow label="Giới hạn users" value={viewing.maxUsers} />
                  <DetailRow label="Users hiện tại" value={viewing.userCount ?? 0} />
                  <DetailRow label="Ngày tạo" value={formatDate(viewing.createdAt)} />
                  <DetailRow label="Cập nhật" value={formatDate(viewing.updatedAt)} />
                </>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {viewing && !viewLoading && (
              <Button variant="outline" onClick={() => { openEdit(viewing); setViewing(null) }}>
                Chỉnh sửa
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewing(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa công ty</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 mt-2">
              <div>
                <Label>Tên công ty</Label>
                <Input
                  value={editForm.name ?? ''}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={editForm.email ?? ''}
                  onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Số điện thoại</Label>
                <Input
                  value={editForm.phone ?? ''}
                  onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Gói dịch vụ</Label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {(['trial', 'starter', 'standard', 'premium'] as const).map(p => (
                    <Button
                      key={p}
                      size="sm"
                      variant={editForm.plan === p ? 'default' : 'outline'}
                      onClick={() => setEditForm(prev => ({ ...prev, plan: p }))}
                    >
                      {PLAN_LABELS[p]}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Giới hạn users</Label>
                <Input
                  type="number"
                  min={1}
                  value={editForm.maxUsers ?? ''}
                  onChange={e =>
                    setEditForm(p => ({ ...p, maxUsers: parseInt(e.target.value, 10) || 1 }))
                  }
                  className="mt-1 w-32"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={editForm.isActive ?? true}
                  onCheckedChange={val => setEditForm(p => ({ ...p, isActive: val }))}
                />
                <Label>Đang hoạt động</Label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </Button>
                <Button variant="outline" onClick={() => setEditing(null)} className="flex-1">
                  Hủy
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa công ty</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa <strong>{deleteTarget?.name}</strong>?
              {deleteTarget && (deleteTarget.userCount ?? 0) > 0 && (
                <span className="block mt-2 text-red-500">
                  Công ty còn {deleteTarget.userCount} tài khoản — không thể xóa cho đến khi gỡ hết
                  users.
                </span>
              )}
              {(deleteTarget?.userCount ?? 0) === 0 && (
                <span className="block mt-2">Hành động này không thể hoàn tác.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={deleting || (deleteTarget?.userCount ?? 0) > 0}
              onClick={handleDelete}
            >
              {deleting ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
