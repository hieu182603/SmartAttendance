import { useState, useEffect, useCallback } from 'react'
import { CreditCard, CheckCircle, XCircle, Eye, Plus, TrendingUp, Clock, DollarSign, Building2, Sparkles } from 'lucide-react'
import { PLAN_CONFIG, type PlanId } from '@smartattendance/shared'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { ticketService, type AdminOrder, type AdminStats } from '@/services/ticketService'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
  failed: 'Thất bại',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  paid: 'bg-green-500/20 text-green-500',
  cancelled: 'bg-gray-500/20 text-gray-500',
  failed: 'bg-red-500/20 text-red-500',
}

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  standard: 'Standard',
  premium: 'Premium',
}

const METHOD_LABELS: Record<string, string> = {
  payos: 'PayOS',
  bank_transfer: 'Chuyển khoản',
  manual: 'Thủ công',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getCompanyName(order: AdminOrder): string {
  if (typeof order.companyId === 'object' && order.companyId !== null) return order.companyId.name
  return '—'
}

function getPaymentMethod(order: AdminOrder): string {
  // Existing orders created before the paymentMethod field was added default to 'payos'
  return METHOD_LABELS[order.paymentMethod ?? 'payos'] ?? 'PayOS'
}

export default function TicketManagementPage() {
  const { token, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [newOrder, setNewOrder] = useState({ companyName: '', plan: 'starter', billingCycle: 'monthly', notes: '', customerEmail: '', customerPhone: '' })

  const emptyManualOrder = () => ({
    companyName: '',
    plan: 'starter',
    billingCycle: 'monthly',
    notes: '',
    customerEmail: '',
    customerPhone: '',
  })

  const previewAmount = (() => {
    const cfg = PLAN_CONFIG[newOrder.plan as PlanId]
    if (!cfg) return null
    return newOrder.billingCycle === 'yearly' ? cfg.yearly : cfg.monthly
  })()

  const LIMIT = 20

  const fetchOrders = useCallback(async () => {
    if (!token) return
    try {
      setLoadingOrders(true)
      const params: Record<string, unknown> = { page, limit: LIMIT }
      if (statusFilter !== 'all') params.status = statusFilter
      if (planFilter !== 'all') params.plan = planFilter
      const result = await ticketService.getAdminOrders(params)
      setOrders(result.orders)
      setTotal(result.total)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err && typeof (err as Error).message === 'string'
          ? (err as Error).message
          : 'Không thể tải danh sách đơn hàng'
      toast.error(msg)
      setOrders([])
      setTotal(0)
    } finally {
      setLoadingOrders(false)
    }
  }, [page, statusFilter, planFilter, token])

  useEffect(() => {
    if (authLoading || !token) return
    fetchOrders()
  }, [authLoading, token, fetchOrders])

  useEffect(() => {
    if (authLoading || !token) return
    ticketService.getAdminStats().then(setStats).catch(() => null)
  }, [authLoading, token])

  async function handleConfirm(order: AdminOrder) {
    if (!window.confirm(`Xác nhận thanh toán đơn #${order.orderCode}?`)) return
    try {
      const updated = await ticketService.confirmPayment(order._id)
      setOrders(prev => prev.map(o => o._id === updated._id ? updated : o))
      toast.success('Xác nhận thanh toán thành công — gói đã được kích hoạt')
      ticketService.getAdminStats().then(setStats).catch(() => null)
    } catch {
      toast.error('Xác nhận thất bại')
    }
  }

  async function handleReject(order: AdminOrder) {
    const reason = window.prompt('Lý do từ chối (tùy chọn):')
    if (reason === null) return // cancelled
    try {
      const updated = await ticketService.rejectOrder(order._id, reason || undefined)
      setOrders(prev => prev.map(o => o._id === updated._id ? updated : o))
      toast.success('Đã từ chối đơn hàng')
    } catch {
      toast.error('Từ chối thất bại')
    }
  }

  async function handleCreateManual() {
    const companyName = newOrder.companyName.trim()
    if (!companyName || !newOrder.plan || !newOrder.billingCycle) {
      toast.error('Tên công ty, gói và chu kỳ là bắt buộc')
      return
    }
    setCreatingOrder(true)
    try {
      const created = await ticketService.createManualOrder({ ...newOrder, companyName })
      toast.success(`Đã tạo đơn #${created.orderCode} và kích hoạt gói`)
      setCreateDialogOpen(false)
      setNewOrder(emptyManualOrder())
      fetchOrders()
      ticketService.getAdminStats().then(setStats).catch(() => null)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg || 'Tạo đơn thất bại')
    } finally {
      setCreatingOrder(false)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-[var(--primary)]" />
          <div>
            <h1 className="text-2xl font-bold">Quản lý thanh toán</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Xem và xử lý đơn hàng, xác nhận chuyển khoản</p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Tạo đơn thủ công
        </Button>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders" className="whitespace-nowrap">Đơn hàng</TabsTrigger>
          <TabsTrigger value="stats" className="whitespace-nowrap">Thống kê</TabsTrigger>
        </TabsList>

        {/* ── Tab đơn hàng ──────────────────────────────── */}
        <TabsContent value="orders" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="pending">Chờ xử lý</SelectItem>
                <SelectItem value="paid">Đã thanh toán</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
                <SelectItem value="failed">Thất bại</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={v => { setPlanFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Gói" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả gói</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loadingOrders ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded animate-pulse bg-[var(--border)]" />)}
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--border)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Mã đơn</th>
                    <th className="text-left px-4 py-3 font-medium">Công ty</th>
                    <th className="text-left px-4 py-3 font-medium">Gói</th>
                    <th className="text-right px-4 py-3 font-medium">Số tiền</th>
                    <th className="text-left px-4 py-3 font-medium">Phương thức</th>
                    <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                    <th className="text-left px-4 py-3 font-medium">Ngày tạo</th>
                    <th className="text-center px-4 py-3 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, idx) => (
                    <tr key={order._id} className={idx % 2 === 0 ? '' : 'bg-[var(--muted)]/30'}>
                      <td className="px-4 py-3 font-mono text-xs">{order.orderCode}</td>
                      <td className="px-4 py-3 max-w-[140px] truncate">{getCompanyName(order)}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{PLAN_LABELS[order.plan] ?? order.plan}</span>
                        <span className="text-xs text-[var(--muted-foreground)] ml-1">
                          /{order.billingCycle === 'monthly' ? 'tháng' : 'năm'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(order.amount)}</td>
                      <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{getPaymentMethod(order)}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${STATUS_COLORS[order.status] ?? ''}`}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{formatDate(order.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailOrder(order)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {order.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500 hover:text-green-600" onClick={() => handleConfirm(order)}>
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleReject(order)}>
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-[var(--muted-foreground)]">Không có đơn hàng nào</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Tổng {total} đơn</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
                <span className="flex items-center px-2">{page}/{totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Tiếp</Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Tab thống kê ──────────────────────────────── */}
        <TabsContent value="stats" className="mt-4">
          {stats ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-5 pt-5 flex items-center gap-4">
                    <div className="p-3 bg-green-500/20 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-[var(--muted-foreground)]">Tổng doanh thu</p>
                      <p className="text-xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5 pt-5 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-[var(--muted-foreground)]">Đơn tháng này</p>
                      <p className="text-xl font-bold">{stats.monthCount}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5 pt-5 flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/20 rounded-lg">
                      <Clock className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-sm text-[var(--muted-foreground)]">Chờ xử lý</p>
                      <p className="text-xl font-bold">{stats.pendingCount}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Card>
                  <CardContent className="p-5 pt-5">
                    <p className="font-semibold mb-3">Doanh thu theo gói</p>
                    <div className="space-y-2">
                      {stats.planStats.map(s => (
                        <div key={s._id} className="flex items-center justify-between">
                          <span className="text-sm">{PLAN_LABELS[s._id] ?? s._id}</span>
                          <div className="text-right">
                            <span className="text-sm font-medium">{formatCurrency(s.revenue)}</span>
                            <span className="text-xs text-[var(--muted-foreground)] ml-2">({s.count} đơn)</span>
                          </div>
                        </div>
                      ))}
                      {stats.planStats.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">Chưa có dữ liệu</p>}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5 pt-5">
                    <p className="font-semibold mb-3">Doanh thu 12 tháng gần đây</p>
                    <div className="space-y-2">
                      {stats.monthlyStats.slice(0, 6).map(s => (
                        <div key={`${s._id.year}-${s._id.month}`} className="flex items-center justify-between">
                          <span className="text-sm">{String(s._id.month).padStart(2, '0')}/{s._id.year}</span>
                          <div className="text-right">
                            <span className="text-sm font-medium">{formatCurrency(s.revenue)}</span>
                            <span className="text-xs text-[var(--muted-foreground)] ml-2">({s.count} đơn)</span>
                          </div>
                        </div>
                      ))}
                      {stats.monthlyStats.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">Chưa có dữ liệu</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-0">
              {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse bg-[var(--border)]" />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      {detailOrder && (
        <Dialog open onOpenChange={() => setDetailOrder(null)}>
          <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] p-0 overflow-hidden gap-0 bg-[var(--surface)]">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 pr-12">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-white/20 rounded-lg shrink-0">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Đơn hàng</p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <p className="text-white font-bold text-lg">#{detailOrder.orderCode}</p>
                    <Badge className={`text-xs font-semibold px-2.5 py-0.5 ${STATUS_COLORS[detailOrder.status] ?? ''}`}>
                      {STATUS_LABELS[detailOrder.status] ?? detailOrder.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 text-sm bg-[var(--surface)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-3 md:pr-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-4 py-3">
                      <p className="text-xs text-purple-400 font-medium mb-1">Gói dịch vụ</p>
                      <p className="font-semibold">{PLAN_LABELS[detailOrder.plan] ?? detailOrder.plan}</p>
                      <p className="text-xs text-[var(--text-sub)]">
                        {detailOrder.billingCycle === 'monthly' ? 'Thanh toán tháng' : 'Thanh toán năm'}
                      </p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3">
                      <p className="text-xs text-blue-400 font-medium mb-1">Phương thức</p>
                      <p className="font-semibold">{getPaymentMethod(detailOrder)}</p>
                      <p className="text-xs text-[var(--text-sub)]">
                        {detailOrder.paidAt ? `Thanh toán: ${formatDate(detailOrder.paidAt)}` : 'Chưa thanh toán'}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-green-500/25 bg-green-500/10 px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">Số tiền</span>
                    <span className="font-bold text-lg text-[var(--text-main)]">{formatCurrency(detailOrder.amount)}</span>
                  </div>
                  {detailOrder.notes && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3">
                      <p className="text-xs text-yellow-500 font-medium mb-1">Ghi chú</p>
                      <p className="text-sm leading-relaxed">{detailOrder.notes}</p>
                    </div>
                  )}
                </div>

                <div className="md:border-l md:border-[var(--border)] md:pl-8">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-sub)] mb-3">
                    Thông tin chi tiết
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {[
                      ['Công ty', getCompanyName(detailOrder)],
                      ['Mã PayOS', detailOrder.payosPaymentLinkId || '—'],
                      ['Ngày tạo', formatDate(detailOrder.createdAt)],
                      ['Thanh toán lúc', formatDate(detailOrder.paidAt)],
                      ['Xử lý lúc', formatDate(detailOrder.processedAt)],
                      ['Xử lý bởi', typeof detailOrder.processedBy === 'object' && detailOrder.processedBy
                        ? detailOrder.processedBy.name
                        : '—'],
                      ['Email KH', detailOrder.customerEmail || '—'],
                      ['SĐT KH', detailOrder.customerPhone || '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="py-1.5 min-w-0">
                        <p className="text-xs text-[var(--text-sub)]">{label}</p>
                        <p className="font-medium text-sm truncate" title={String(value)}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {detailOrder.status === 'pending' && (
              <div className="flex gap-2 px-6 py-3 border-t border-[var(--border)] bg-[var(--surface)]">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                  onClick={() => { handleConfirm(detailOrder); setDetailOrder(null) }}
                >
                  <CheckCircle className="h-4 w-4" />
                  Xác nhận thanh toán
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-500/50 text-red-500 hover:bg-red-500/10 gap-2"
                  onClick={() => { handleReject(detailOrder); setDetailOrder(null) }}
                >
                  <XCircle className="h-4 w-4" />
                  Từ chối
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Create manual order dialog */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={open => {
          if (!open) setNewOrder(emptyManualOrder())
          setCreateDialogOpen(open)
        }}
      >
        <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] p-0 overflow-hidden gap-0 bg-[var(--surface)]">
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4 pr-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <DialogHeader className="space-y-1 text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg shrink-0">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-white text-lg font-bold leading-tight">
                      Tạo đơn hàng thủ công
                    </DialogTitle>
                    <DialogDescription className="text-white/80 text-sm mt-0.5">
                      Ghi nhận thanh toán ngoài PayOS và kích hoạt gói ngay.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              {previewAmount != null && (
                <div className="shrink-0 bg-white/10 rounded-xl px-4 py-2.5 flex items-center gap-4 sm:min-w-[220px] sm:justify-between">
                  <span className="text-white/80 text-sm whitespace-nowrap">Số tiền dự kiến</span>
                  <span className="text-white font-bold text-lg whitespace-nowrap">{formatCurrency(previewAmount)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 bg-[var(--surface)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-4 md:pr-2">
                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-sub)]">
                    Công ty
                  </p>
                  <div className="space-y-1">
                    <Label htmlFor="manual-company-name" className="text-sm">
                      Tên công ty <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="manual-company-name"
                      placeholder="VD: SmartAttendance Demo Corp"
                      value={newOrder.companyName}
                      onChange={e => setNewOrder(p => ({ ...p, companyName: e.target.value }))}
                      autoComplete="organization"
                    />
                  </div>
                </section>

                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-sub)]">
                    Gói dịch vụ
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Gói <span className="text-red-500">*</span></Label>
                      <Select value={newOrder.plan} onValueChange={v => setNewOrder(p => ({ ...p, plan: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starter">Starter</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Chu kỳ <span className="text-red-500">*</span></Label>
                      <Select value={newOrder.billingCycle} onValueChange={v => setNewOrder(p => ({ ...p, billingCycle: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Thanh toán tháng</SelectItem>
                          <SelectItem value="yearly">Thanh toán năm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {previewAmount != null && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--shell)] px-3 py-2 text-sm">
                      <Building2 className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                      <span className="text-[var(--text-sub)]">Trạng thái sau tạo:</span>
                      <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 text-xs">Đã thanh toán + kích hoạt</Badge>
                    </div>
                  )}
                </section>
              </div>

              <div className="space-y-4 md:border-l md:border-[var(--border)] md:pl-8">
                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-sub)]">
                    Liên hệ khách hàng <span className="font-normal normal-case">(tùy chọn)</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <Label htmlFor="manual-email" className="text-sm">Email</Label>
                      <Input
                        id="manual-email"
                        type="email"
                        placeholder="khachhang@congty.vn"
                        value={newOrder.customerEmail}
                        onChange={e => setNewOrder(p => ({ ...p, customerEmail: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <Label htmlFor="manual-phone" className="text-sm">Số điện thoại</Label>
                      <Input
                        id="manual-phone"
                        type="tel"
                        placeholder="0901234567"
                        value={newOrder.customerPhone}
                        onChange={e => setNewOrder(p => ({ ...p, customerPhone: e.target.value }))}
                      />
                    </div>
                  </div>
                </section>

                <div className="space-y-1.5">
                  <Label htmlFor="manual-notes" className="text-sm">Ghi chú</Label>
                  <Textarea
                    id="manual-notes"
                    placeholder="VD: Chuyển khoản Vietcombank ngày 20/05/2026, mã tham chiếu..."
                    value={newOrder.notes}
                    onChange={e => setNewOrder(p => ({ ...p, notes: e.target.value }))}
                    rows={4}
                    maxLength={500}
                    className="resize-none min-h-[100px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-3 border-t border-[var(--border)] bg-[var(--surface)] sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creatingOrder}
            >
              Hủy
            </Button>
            <Button
              onClick={handleCreateManual}
              disabled={creatingOrder}
              className="gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white border-0"
            >
              <Sparkles className="h-4 w-4" />
              {creatingOrder ? 'Đang xử lý...' : 'Tạo & kích hoạt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
