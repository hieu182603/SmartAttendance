import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Info,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { getAllUsers, getUserById, updateUserByAdmin, createUserByAdmin } from '@/services/userService'
import { getAllDepartments, type Department as DepartmentType } from '@/services/departmentService'
import shiftService, { type Shift } from '@/services/shiftService'
import api from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { UserRole, ROLE_NAMES, canManageRole, type UserRoleType } from '@/utils/roles'
import { Permission } from '@/utils/roles'
import { usePermissions } from '@/hooks/usePermissions'
import RoleGuard from '@/components/RoleGuard'
import UnauthorizedPage from '@/components/UnauthorizedPage'
import type { ErrorWithMessage } from '@/types'

interface RoleConfig {
  value: UserRoleType
  label: string
  color: string
  icon: LucideIcon
}

const ROLES: RoleConfig[] = [
  { value: UserRole.SUPER_ADMIN, label: ROLE_NAMES[UserRole.SUPER_ADMIN], color: 'error', icon: ShieldAlert },
  { value: UserRole.ADMIN, label: ROLE_NAMES[UserRole.ADMIN], color: 'primary', icon: Shield },
  { value: UserRole.HR_MANAGER, label: ROLE_NAMES[UserRole.HR_MANAGER], color: 'warning', icon: ShieldCheck },
  { value: UserRole.MANAGER, label: ROLE_NAMES[UserRole.MANAGER], color: 'accent-cyan', icon: ShieldCheck },
  { value: UserRole.EMPLOYEE, label: ROLE_NAMES[UserRole.EMPLOYEE], color: 'text-sub', icon: Shield },
]

interface User {
  _id?: string
  id?: string
  name?: string
  email?: string
  department?: string | { _id: string; name: string; code?: string }
  role?: UserRoleType
  phone?: string
  isActive?: boolean
  createdAt?: string
  defaultShiftId?: string | { _id: string; name: string; startTime?: string; endTime?: string }
}

interface FormData {
  name: string
  email: string
  department: string
  role: string
  phone: string
  isActive: boolean
  defaultShiftId: string
}

interface CreateFormData {
  name: string
  email: string
  password: string
  department: string
  role: string
  phone: string
  isActive: boolean
  defaultShiftId: string
}

interface ValidationErrors {
  name?: string | null
  email?: string | null
  role?: string | null
  phone?: string | null
  [key: string]: string | null | undefined
}

interface Stats {
  total: number
  active: number
  admin: number
  newThisMonth: number
}

interface GetAllUsersResponse {
  users?: User[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface FieldErrors {
  [field: string]: string[]
}

const getRoleBadge = (role?: UserRoleType): ReactNode => {
  const roleConfig = ROLES.find(r => r.value === role)
  if (!roleConfig) return <Badge className="text-xs">Unknown</Badge>

  const Icon = roleConfig.icon
  return (
    <Badge className={`bg-[var(--${roleConfig.color})]/20 text-[var(--${roleConfig.color})] border-[var(--${roleConfig.color})]/30 text-xs whitespace-nowrap`}>
      <Icon className="h-3 w-3 mr-1" />
      {roleConfig.label}
    </Badge>
  )
}

const getStatusBadge = (status?: boolean | string, t?: (key: string) => string): ReactNode => {
  const activeLabel = t ? t('dashboard:employeeManagement.status.active') : 'Hoạt động'
  const inactiveLabel = t ? t('dashboard:employeeManagement.status.inactive') : 'Ngừng'
  return status === true || status === 'active'
    ? <Badge className="bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30 text-xs whitespace-nowrap">{activeLabel}</Badge>
    : <Badge className="bg-[var(--error)]/20 text-[var(--error)] border-[var(--error)]/30 text-xs whitespace-nowrap">{inactiveLabel}</Badge>
}

// Helper function để lấy tên phòng ban
const getDepartmentName = (department?: string | { _id: string; name: string; code?: string }, t?: (key: string) => string): string => {
  if (!department) return t ? t('dashboard:employeeManagement.editDialog.noDepartment') : 'N/A'
  if (typeof department === 'string') return department
  return department.name || (t ? t('dashboard:employeeManagement.editDialog.noDepartment') : 'N/A')
}

// Helper function để lấy department ID (cho form)
const getDepartmentId = (department?: string | { _id: string; name: string; code?: string }): string => {
  if (!department) return ''
  if (typeof department === 'string') return department
  return department._id || ''
}

// Helper function để lấy tên ca làm việc
const getShiftName = (shift?: string | { _id: string; name: string; startTime?: string; endTime?: string }, t?: (key: string) => string): string => {
  if (!shift) return t ? t('dashboard:employeeManagement.editDialog.noShift') : 'N/A'
  if (typeof shift === 'string') return shift
  return shift.name || (t ? t('dashboard:employeeManagement.editDialog.noShift') : 'N/A')
}

// Helper function để lấy shift ID (cho form)
const getShiftId = (shift?: string | { _id: string; name: string }): string => {
  if (!shift) return ''
  if (typeof shift === 'string') return shift
  return shift._id || ''
}

const EmployeeManagementPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common'])
  const { user: currentUser } = useAuth()
  const { hasPermission } = usePermissions()

  const canView = hasPermission(Permission.USERS_VIEW)
  const canCreate = hasPermission(Permission.USERS_CREATE)
  const canUpdate = hasPermission(Permission.USERS_UPDATE)
  const canDelete = hasPermission(Permission.USERS_DELETE)
  const canManageRolePermission = hasPermission(Permission.USERS_MANAGE_ROLE)
  
  if (!canView) {
    return <UnauthorizedPage />
  }
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [shiftFilter, setShiftFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [usersList, setUsersList] = useState<User[]>([])
  const [departments, setDepartments] = useState<DepartmentType[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    department: '',
    role: '',
    phone: '',
    isActive: true,
    defaultShiftId: '',
  })
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  const [createFormData, setCreateFormData] = useState<CreateFormData>({
    name: '',
    email: '',
    password: '',
    department: '',
    role: '',
    phone: '',
    isActive: true,
    defaultShiftId: '',
  })
  const [createValidationErrors, setCreateValidationErrors] = useState<ValidationErrors>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [pagination, setPagination] = useState<{
    total: number
    page: number
    limit: number
    totalPages: number
  }>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: itemsPerPage
      }
      
      if (searchTerm) params.search = searchTerm
      
      if (roleFilter !== 'all') params.role = roleFilter
      
      if (statusFilter !== 'all') {
        params.isActive = statusFilter === 'active' ? 'true' : 'false'
      }

      if (shiftFilter !== 'all') {
        params.shift = shiftFilter
      }

      const result = await getAllUsers(params) as GetAllUsersResponse
      
      setUsersList(result.users || [])
      if (result.pagination) {
        setPagination(result.pagination)
      }
    } catch (error) {
      console.error('[EmployeeManagement] fetch error:', error)
      const err = error as ErrorWithMessage
      const errorMessage = err.message || (err.response?.data as { message?: string })?.message || t('dashboard:employeeManagement.errors.loadFailed')
      toast.error(errorMessage)
      setUsersList([])
      setPagination({ total: 0, page: 1, limit: 10, totalPages: 0 })
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage, searchTerm, roleFilter, statusFilter, shiftFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    const fetchDepartments = async () => {
      const userRole = currentUser?.role as UserRoleType
      const hasPermission = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN
      
      if (!hasPermission) {
        console.log('[EmployeeManagement] User does not have permission to fetch departments')
        return
      }

      try {
        const response = await getAllDepartments({ status: 'active', limit: 1000 })
        const activeDepartments = (response.departments || []).filter(
          (dept: DepartmentType) => dept.status === 'active'
        )
        setDepartments(activeDepartments)
      } catch (error) {
        const err = error as ErrorWithMessage
        const errorMessage = err.message || ''
        
        if (!errorMessage.includes('Insufficient permissions') && !errorMessage.includes('403')) {
          console.error('[EmployeeManagement] fetch departments error:', error)
          toast.error(t('dashboard:employeeManagement.errors.loadDepartmentsFailed'))
        } else {
          console.log('[EmployeeManagement] No permission to fetch departments')
        }
      }
    }
    fetchDepartments()
  }, [currentUser?.role])

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const shiftsData = await shiftService.getAllShifts()
        setShifts(shiftsData || [])
      } catch (error) {
        console.error('[EmployeeManagement] fetch shifts error:', error)
      }
    }
    fetchShifts()
  }, [])

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, roleFilter, statusFilter, shiftFilter])

  const handleViewUser = async (user: User): Promise<void> => {
    try {
      const userDetail = await getUserById(user._id || user.id || '') as User
      setSelectedUser(userDetail)
      setIsViewDialogOpen(true)
    } catch (error) {
      console.error('[EmployeeManagement] get user error:', error)
      const err = error as ErrorWithMessage
      const errorMessage = err.message || (err.response?.data as { message?: string })?.message || t('dashboard:employeeManagement.errors.loadUserFailed')
      toast.error(errorMessage)
    }
  }

  const handleEditUser = async (user: User): Promise<void> => {
    setSelectedUser(user)
    
    let shiftId = ''
    
    try {
      const userId = user._id || user.id || ''
      const response = await api.get(`/shifts/assignments/user/${userId}`)
      
      if (response.data?.success && response.data?.data) {
        const activeAssignments = response.data.data.filter((a: any) => a.isActive === true) || []
        if (activeAssignments.length > 0) {
          const latestAssignment = activeAssignments.sort((a: any, b: any) => 
            new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
          )[0]
          
          if (latestAssignment.shiftId?._id) {
            shiftId = latestAssignment.shiftId._id
          }
        }
      }
      
      if (!shiftId && user.defaultShiftId) {
        if (typeof user.defaultShiftId === 'string') {
          shiftId = user.defaultShiftId
        } else if (user.defaultShiftId._id) {
          shiftId = user.defaultShiftId._id
        }
      }
    } catch (error) {
      console.error('[EmployeeManagement] Error getting current shift:', error)
      if (user.defaultShiftId) {
        if (typeof user.defaultShiftId === 'string') {
          shiftId = user.defaultShiftId
        } else if (user.defaultShiftId._id) {
          shiftId = user.defaultShiftId._id
        }
      }
    }
    
    setFormData({
      name: user.name || '',
      email: user.email || '',
      department: getDepartmentId(user.department),
      role: user.role || '',
      phone: user.phone || '',
      isActive: user.isActive !== undefined ? user.isActive : true,
      defaultShiftId: shiftId,
    })
    setValidationErrors({})
    setIsEditDialogOpen(true)
  }

  const handleDeleteUser = (user: User): void => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async (): Promise<void> => {
    if (!selectedUser) return

    try {
      await updateUserByAdmin(selectedUser._id || selectedUser.id || '', { isActive: false })
      toast.success(t('dashboard:employeeManagement.success.disableSuccess'))
      setIsDeleteDialogOpen(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (error) {
      console.error('[EmployeeManagement] delete error:', error)
      const err = error as ErrorWithMessage
      const errorMessage = err.message || (err.response?.data as { message?: string })?.message || t('dashboard:employeeManagement.errors.disableError')
      toast.error(errorMessage)
    }
  }

  const handleSubmitEdit = async (): Promise<void> => {
    if (!selectedUser) return

    const errors: ValidationErrors = {}

    if (!formData.name || formData.name.trim().length === 0) {
      errors.name = t('dashboard:employeeManagement.validation.nameRequired')
    } else if (formData.name.trim().length < 2) {
      errors.name = t('dashboard:employeeManagement.validation.nameMinLength')
    }

    if (!formData.email || formData.email.trim().length === 0) {
      errors.email = t('dashboard:employeeManagement.validation.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('dashboard:employeeManagement.validation.emailInvalid')
    }

    if (!formData.role) {
      errors.role = t('dashboard:employeeManagement.validation.roleRequired')
    }

    if (formData.phone && formData.phone.trim().length > 0) {
      if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
        errors.phone = t('dashboard:employeeManagement.validation.phoneInvalid')
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      toast.error(t('dashboard:employeeManagement.validation.checkInfo'))
      return
    }

    try {
      await updateUserByAdmin(selectedUser._id || selectedUser.id || '', formData)
      toast.success(t('dashboard:employeeManagement.success.updateSuccess'))
      setIsEditDialogOpen(false)
      setSelectedUser(null)
      setValidationErrors({})
      fetchUsers()
    } catch (error) {
      console.error('[EmployeeManagement] update error:', error)
      const err = error as ErrorWithMessage & { fieldErrors?: FieldErrors; response?: { status?: number } }
      
      if (err.response?.status === 403 || err.message?.includes('Insufficient permissions') || err.message?.includes('403')) {
        const errorMessage = err.message || (err.response?.data as { message?: string })?.message || t('dashboard:employeeManagement.errors.noPermission')
        toast.error(errorMessage)
        return
      }
      
      if (err.fieldErrors) {
        const backendErrors: ValidationErrors = {}
        Object.keys(err.fieldErrors).forEach(field => {
          if (err.fieldErrors?.[field]?.[0]) {
            backendErrors[field] = err.fieldErrors[field][0]
          }
        })
        if (Object.keys(backendErrors).length > 0) {
          setValidationErrors(backendErrors)
          toast.error(t('dashboard:employeeManagement.validation.checkInfo'))
          return
        }
      }
      
      const errorMessage = err.message || (err.response?.data as { message?: string })?.message || t('dashboard:employeeManagement.errors.updateError')
      toast.error(errorMessage)
    }
  }

  const handleSubmitCreate = async (): Promise<void> => {
    const errors: ValidationErrors = {}

    if (!createFormData.name || createFormData.name.trim().length === 0) {
      errors.name = t('dashboard:employeeManagement.validation.nameRequired')
    } else if (createFormData.name.trim().length < 2) {
      errors.name = t('dashboard:employeeManagement.validation.nameMinLength')
    }

    if (!createFormData.email || createFormData.email.trim().length === 0) {
      errors.email = t('dashboard:employeeManagement.validation.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createFormData.email)) {
      errors.email = t('dashboard:employeeManagement.validation.emailInvalid')
    }

    if (!createFormData.password || createFormData.password.trim().length === 0) {
      errors.password = t('dashboard:employeeManagement.createUser.validation.passwordRequired', 'Mật khẩu là bắt buộc')
    } else if (createFormData.password.length < 6) {
      errors.password = t('dashboard:employeeManagement.createUser.validation.passwordMinLength', 'Mật khẩu phải có ít nhất 6 ký tự')
    }

    if (!createFormData.role) {
      errors.role = t('dashboard:employeeManagement.validation.roleRequired')
    }

    if (createFormData.phone && createFormData.phone.trim().length > 0) {
      if (!/^[0-9]{10,11}$/.test(createFormData.phone.replace(/\s/g, ''))) {
        errors.phone = t('dashboard:employeeManagement.validation.phoneInvalid')
      }
    }

    if (Object.keys(errors).length > 0) {
      setCreateValidationErrors(errors)
      toast.error(t('dashboard:employeeManagement.validation.checkInfo'))
      return
    }

    try {
      await createUserByAdmin(createFormData)
      toast.success(t('dashboard:employeeManagement.createUser.success', 'Tạo tài khoản thành công'))
      setIsCreateDialogOpen(false)
      setCreateFormData({
        name: '',
        email: '',
        password: '',
        department: '',
        role: '',
        phone: '',
        isActive: true,
        defaultShiftId: '',
      })
      setCreateValidationErrors({})
      fetchUsers()
    } catch (error) {
      console.error('[EmployeeManagement] create user error:', error)
      const err = error as ErrorWithMessage & { fieldErrors?: FieldErrors }

      if (err.response?.status === 403 || err.message?.includes('Insufficient permissions') || err.message?.includes('403')) {
        const errorMessage = err.message || (err.response?.data as { message?: string })?.message || t('dashboard:employeeManagement.errors.noPermission')
        toast.error(errorMessage)
        return
      }

      if (err.fieldErrors) {
        const backendErrors: ValidationErrors = {}
        Object.keys(err.fieldErrors).forEach(field => {
          if (err.fieldErrors?.[field]?.[0]) {
            backendErrors[field] = err.fieldErrors[field][0]
          }
        })
        if (Object.keys(backendErrors).length > 0) {
          setCreateValidationErrors(backendErrors)
          toast.error(t('dashboard:employeeManagement.validation.checkInfo'))
          return
        }
      }

      const errorMessage = err.message || (err.response?.data as { message?: string })?.message || t('dashboard:employeeManagement.createUser.error', 'Tạo tài khoản thất bại')
      toast.error(errorMessage)
    }
  }

  const paginatedUsers = usersList

  const getAvatarInitials = (name?: string): string => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 3)
  }

  const canAssignRole = (targetRole: UserRoleType): boolean => {
    if (!currentUser?.role) return false
    return canManageRole(currentUser.role as UserRoleType, targetRole)
  }

  const canUpdateUser = () => canUpdate
  const canChangeRole = () => canManageRolePermission

  const stats: Stats = {
    total: pagination.total,
    active: usersList.filter(u => u.isActive !== false).length,
    admin: usersList.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN).length,
    newThisMonth: usersList.filter(u => {
      if (!u.createdAt) return false
      const created = new Date(u.createdAt)
      const now = new Date()
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
    }).length,
  }

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
            {t('dashboard:employeeManagement.title')}
          </h1>
        </div>
        <RoleGuard permission={Permission.USERS_CREATE}>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:from-[var(--primary)]/90 hover:to-[var(--accent-cyan)]/90 text-white px-4 py-2 h-9"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('dashboard:employeeManagement.createUser.button', 'Tạo tài khoản')}
          </Button>
        </RoleGuard>
      </div>
      {/* Search & Filters */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="p-4 md:p-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-3 md:gap-4">
            {/* Search Bar - Wider */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-sub)]" />
              <Input
                placeholder={t('dashboard:employeeManagement.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                  <SelectValue placeholder={t('dashboard:employeeManagement.filterByRole')} />
                </SelectTrigger>
                <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                  <SelectItem value="all">{t('dashboard:employeeManagement.allRoles')}</SelectItem>
                  {ROLES.map(role => {
                    const RoleIcon = role.icon
                    return (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center gap-2">
                          <RoleIcon className="h-3.5 w-3.5" />
                          {role.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                  <SelectValue placeholder={t('dashboard:employeeManagement.filterByStatus')} />
                </SelectTrigger>
                <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                  <SelectItem value="all">{t('dashboard:employeeManagement.allStatus')}</SelectItem>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      {t('dashboard:employeeManagement.active')}
                    </div>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500"></div>
                      {t('dashboard:employeeManagement.inactive')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Shift Filter */}
            <div className="relative">
              <Select value={shiftFilter} onValueChange={setShiftFilter}>
                <SelectTrigger className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                  <SelectValue placeholder={t('dashboard:employeeManagement.filterByShift') || 'Lọc theo ca'} />
                </SelectTrigger>
                <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                  <SelectItem value="all">{t('dashboard:employeeManagement.allShifts') || 'Tất cả ca'}</SelectItem>
                  <SelectItem value="none">{t('dashboard:employeeManagement.noShift') || 'Chưa có ca'}</SelectItem>
                  {shifts.map(shift => (
                    <SelectItem key={shift._id} value={shift._id}>
                      {shift.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-[var(--text-sub)] pt-4">{t('dashboard:employeeManagement.stats.total')}</p>
              <p className="text-2xl text-[var(--text-main)] mt-1">{stats.total}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-[var(--text-sub)] pt-4">{t('dashboard:employeeManagement.stats.active')}</p>
              <p className="text-2xl text-[var(--success)] mt-1">{stats.active}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-[var(--text-sub)] pt-4">{t('dashboard:employeeManagement.stats.admin')}</p>
              <p className="text-2xl text-[var(--primary)] mt-1">{stats.admin}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-[var(--text-sub)] pt-4">{t('dashboard:employeeManagement.stats.newThisMonth')}</p>
              <p className="text-2xl text-[var(--accent-cyan)] mt-1">{stats.newThisMonth}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Table */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-[var(--text-main)] text-base md:text-lg">{t('dashboard:employeeManagement.table.title')}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-[var(--text-sub)]">{t('dashboard:employeeManagement.table.loading')}</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block w-full overflow-x-auto">
                <table className="w-full">
                <thead>
                  <tr className="bg-[var(--shell)]">
                    <th className="text-left py-2 px-3 text-xs text-[var(--text-sub)] w-[18%]">{t('dashboard:employeeManagement.table.employee')}</th>
                    <th className="text-left py-2 px-3 text-xs text-[var(--text-sub)] w-[20%]">{t('dashboard:employeeManagement.table.email')}</th>
                    <th className="text-left py-2 px-3 text-xs text-[var(--text-sub)] w-[12%]">{t('dashboard:employeeManagement.table.department')}</th>
                    <th className="text-left py-2 px-3 text-xs text-[var(--text-sub)] w-[12%]">{t('dashboard:employeeManagement.table.shift') || 'Ca làm việc'}</th>
                    <th className="text-left py-2 px-3 text-xs text-[var(--text-sub)] w-[12%]">{t('dashboard:employeeManagement.table.role')}</th>
                    <th className="text-left py-2 px-3 text-xs text-[var(--text-sub)] w-[11%]">{t('dashboard:employeeManagement.table.status')}</th>
                    <th className="text-center py-2 px-3 text-xs text-[var(--text-sub)] w-[15%]">{t('dashboard:employeeManagement.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <p className="text-[var(--text-sub)]">{t('dashboard:employeeManagement.table.noEmployees')}</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user, index) => (
                      <tr
                        key={user._id || user.id}
                        className={`border-b border-[var(--border)] hover:bg-[var(--shell)] transition-colors ${index % 2 === 0 ? 'bg-[var(--shell)]/50' : ''
                          }`}
                      >
                        <td className="py-2 px-3">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-7 w-7 flex-shrink-0">
                              <AvatarFallback className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white text-xs">
                                {getAvatarInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-[var(--text-main)] truncate">{user.name || t('dashboard:employeeManagement.viewDialog.notAvailable')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-sm text-[var(--text-main)] truncate">{user.email || t('dashboard:employeeManagement.viewDialog.notAvailable')}</td>
                        <td className="py-2 px-3 text-sm text-[var(--text-main)] truncate">{getDepartmentName(user.department, t)}</td>
                        <td className="py-2 px-3 text-sm text-[var(--text-main)] truncate">{getShiftName(user.defaultShiftId, t)}</td>
                        <td className="py-2 px-3">{getRoleBadge(user.role)}</td>
                        <td className="py-2 px-3">{getStatusBadge(user.isActive, t)}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleViewUser(user)}
                              className="p-1 hover:bg-[var(--shell)] rounded text-[var(--accent-cyan)]"
                              title={t('dashboard:employeeManagement.table.viewDetails')}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <RoleGuard permission={Permission.USERS_UPDATE} showDisabled>
                              <button
                                type="button"
                                onClick={() => handleEditUser(user)}
                                className="p-1 hover:bg-[var(--shell)] rounded text-[var(--primary)]"
                                title={t('dashboard:employeeManagement.table.edit')}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </RoleGuard>
                            <RoleGuard permission={Permission.USERS_DELETE} showDisabled>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user)}
                                className="p-1 hover:bg-[var(--shell)] rounded text-red-500"
                                title={t('dashboard:employeeManagement.table.disable')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </RoleGuard>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {paginatedUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-[var(--text-sub)]">{t('dashboard:employeeManagement.table.noEmployees')}</p>
                  </div>
                ) : (
                  paginatedUsers.map((user, index) => (
                    <Card
                      key={user._id || user.id}
                      className="bg-[var(--shell)] border-[var(--border)]"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarFallback className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white text-xs">
                                {getAvatarInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[var(--text-main)] truncate">{user.name || t('dashboard:employeeManagement.viewDialog.notAvailable')}</p>
                              <p className="text-xs text-[var(--text-sub)] truncate">{user.email || t('dashboard:employeeManagement.viewDialog.notAvailable')}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleViewUser(user)}
                              className="p-1.5 hover:bg-[var(--surface)] rounded text-[var(--accent-cyan)]"
                              title={t('dashboard:employeeManagement.table.viewDetails')}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <RoleGuard permission={Permission.USERS_UPDATE} showDisabled>
                              <button
                                type="button"
                                onClick={() => handleEditUser(user)}
                                className="p-1.5 hover:bg-[var(--surface)] rounded text-[var(--primary)]"
                                title={t('dashboard:employeeManagement.table.edit')}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </RoleGuard>
                            <RoleGuard permission={Permission.USERS_DELETE} showDisabled>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user)}
                                className="p-1.5 hover:bg-[var(--surface)] rounded text-red-500"
                                title={t('dashboard:employeeManagement.table.disable')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </RoleGuard>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--text-sub)]">{t('dashboard:employeeManagement.table.department')}</span>
                            <span className="text-[var(--text-main)]">{getDepartmentName(user.department, t)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--text-sub)]">{t('dashboard:employeeManagement.table.shift') || 'Ca làm việc'}</span>
                            <span className="text-[var(--text-main)]">{getShiftName(user.defaultShiftId, t)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--text-sub)]">{t('dashboard:employeeManagement.table.role')}</span>
                            <div>{getRoleBadge(user.role)}</div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--text-sub)]">{t('dashboard:employeeManagement.table.status')}</span>
                            <div>{getStatusBadge(user.isActive, t)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {paginatedUsers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4 px-2 py-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>
                  {t('dashboard:employeeManagement.pagination.showing')} {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, pagination.total)} {t('dashboard:employeeManagement.pagination.of')} {pagination.total}
                </span>
                <span className="hidden sm:inline">•</span>
                <div className="flex items-center gap-2">
                  <span>{t('dashboard:employeeManagement.pagination.rowsPerPage')}</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(v) => {
                    setItemsPerPage(Number(v))
                    setCurrentPage(1)
                  }}>
                    <SelectTrigger className="w-20 h-8 bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="top">
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="px-4 text-sm text-gray-900 dark:text-gray-100">
                  {t('dashboard:employeeManagement.pagination.page')} {currentPage} / {pagination.totalPages || 1}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(pagination.totalPages || 1, p + 1))}
                  disabled={currentPage >= (pagination.totalPages || 1)}
                  className="h-8 w-8 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(pagination.totalPages || 1)}
                  disabled={currentPage >= (pagination.totalPages || 1)}
                  className="h-8 w-8 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">{t('dashboard:employeeManagement.viewDialog.title')}</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)] text-sm">
              {t('dashboard:employeeManagement.viewDialog.description')}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 md:space-y-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                  <AvatarFallback className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white text-lg sm:text-xl">
                    {getAvatarInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left flex-1">
                  <h3 className="text-lg sm:text-xl text-[var(--text-main)]">{selectedUser.name || t('dashboard:employeeManagement.viewDialog.notAvailable')}</h3>
                  <p className="text-xs sm:text-sm text-[var(--text-sub)] mt-1">{t('dashboard:employeeManagement.viewDialog.id')} {selectedUser._id || selectedUser.id}</p>
                  <div className="mt-2 flex justify-center sm:justify-start">{getStatusBadge(selectedUser.isActive, t)}</div>
                </div>
              </div>

              <Separator className="bg-[var(--border)]" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label className="text-[var(--text-sub)]">{t('dashboard:employeeManagement.viewDialog.email')}</Label>
                  <p className="text-[var(--text-main)] mt-1">{selectedUser.email || t('dashboard:employeeManagement.viewDialog.notAvailable')}</p>
                </div>
                <div>
                  <Label className="text-[var(--text-sub)]">{t('dashboard:employeeManagement.viewDialog.department')}</Label>
                  <p className="text-[var(--text-main)] mt-1">{getDepartmentName(selectedUser.department, t)}</p>
                </div>
                <div>
                  <Label className="text-[var(--text-sub)]">{t('dashboard:employeeManagement.viewDialog.shift') || 'Ca làm việc'}</Label>
                  <p className="text-[var(--text-main)] mt-1">{getShiftName(selectedUser.defaultShiftId, t)}</p>
                </div>
                <div>
                  <Label className="text-[var(--text-sub)]">{t('dashboard:employeeManagement.viewDialog.role')}</Label>
                  <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
                </div>
                <div>
                  <Label className="text-[var(--text-sub)]">{t('dashboard:employeeManagement.viewDialog.phone')}</Label>
                  <p className="text-[var(--text-main)] mt-1">{selectedUser.phone || t('dashboard:employeeManagement.viewDialog.notAvailable')}</p>
                </div>
                <div>
                  <Label className="text-[var(--text-sub)]">{t('dashboard:employeeManagement.viewDialog.createdAt')}</Label>
                  <p className="text-[var(--text-main)] mt-1">
                    {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('vi-VN') : t('dashboard:employeeManagement.viewDialog.notAvailable')}
                  </p>
                </div>
                <div>
                  <Label className="text-[var(--text-sub)]">{t('dashboard:employeeManagement.viewDialog.status')}</Label>
                  <div className="mt-1">{getStatusBadge(selectedUser.isActive, t)}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
              className="border-[var(--border)] text-[var(--text-main)]"
            >
              {t('dashboard:employeeManagement.viewDialog.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">{t('dashboard:employeeManagement.editDialog.title')}</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)] text-sm">
              {t('dashboard:employeeManagement.editDialog.description')} <strong className="text-[var(--text-main)]">{selectedUser?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 pt-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                <Users className="h-4 w-4 text-[var(--primary)]" />
                <h3 className="text-sm font-semibold text-[var(--text-main)]">{t('dashboard:employeeManagement.editDialog.personalInfo')}</h3>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('dashboard:employeeManagement.editDialog.fullName')} <span className="text-red-500">*</span></Label>
                <Input
                  placeholder={t('dashboard:employeeManagement.form.namePlaceholder')}
                  className={`bg-[var(--shell)] border-[var(--border)] h-9 ${validationErrors.name ? 'border-red-500' : ''}`}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value })
                    if (validationErrors.name) {
                      setValidationErrors({ ...validationErrors, name: null })
                    }
                  }}
                />
                {validationErrors.name && (
                  <p className="text-xs text-red-500">{validationErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('dashboard:employeeManagement.editDialog.email')} <span className="text-red-500">*</span></Label>
                <Input
                  type="email"
                  placeholder={t('dashboard:employeeManagement.form.emailPlaceholder')}
                  className={`bg-[var(--shell)] border-[var(--border)] h-9 ${validationErrors.email ? 'border-red-500' : ''}`}
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value })
                    if (validationErrors.email) {
                      setValidationErrors({ ...validationErrors, email: null })
                    }
                  }}
                />
                {validationErrors.email && (
                  <p className="text-xs text-red-500">{validationErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('dashboard:employeeManagement.editDialog.phone')}</Label>
                <Input
                  placeholder={t('dashboard:employeeManagement.form.phonePlaceholder')}
                  className={`bg-[var(--shell)] border-[var(--border)] h-9 ${validationErrors.phone ? 'border-red-500' : ''}`}
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value })
                    if (validationErrors.phone) {
                      setValidationErrors({ ...validationErrors, phone: null })
                    }
                  }}
                />
                {validationErrors.phone && (
                  <p className="text-xs text-red-500">{validationErrors.phone}</p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                <Shield className="h-4 w-4 text-[var(--primary)]" />
                <h3 className="text-sm font-semibold text-[var(--text-main)]">{t('dashboard:employeeManagement.editDialog.workInfo')}</h3>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('dashboard:employeeManagement.editDialog.department')}</Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                  <SelectTrigger className="bg-[var(--shell)] border-[var(--border)] h-9">
                    <SelectValue placeholder={t('dashboard:employeeManagement.editDialog.selectDepartment')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                    <SelectItem value="">{t('dashboard:employeeManagement.editDialog.noDepartment')}</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept._id} value={dept._id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('dashboard:employeeManagement.editDialog.shift') || 'Ca làm việc'}</Label>
                <Select value={formData.defaultShiftId} onValueChange={(v) => setFormData({ ...formData, defaultShiftId: v })}>
                  <SelectTrigger className="bg-[var(--shell)] border-[var(--border)] h-9">
                    <SelectValue placeholder={t('dashboard:employeeManagement.editDialog.selectShift') || 'Chọn ca làm việc'} />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                    <SelectItem value="">{t('dashboard:employeeManagement.editDialog.noShift') || 'Không có ca'}</SelectItem>
                    {shifts.filter(s => s.isActive !== false).map((shift) => (
                      <SelectItem key={shift._id} value={shift._id}>
                        {shift.name} ({shift.startTime} - {shift.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('dashboard:employeeManagement.editDialog.role')} <span className="text-red-500">*</span></Label>
                <RoleGuard permission={Permission.USERS_MANAGE_ROLE} showDisabled>
                  <Select
                    value={formData.role}
                    onValueChange={(v) => {
                      setFormData({ ...formData, role: v })
                      if (validationErrors.role) {
                        setValidationErrors({ ...validationErrors, role: null })
                      }
                    }}
                    disabled={!canChangeRole()}
                  >
                    <SelectTrigger 
                      className={`bg-[var(--shell)] border-[var(--border)] h-9 ${validationErrors.role ? 'border-red-500' : ''}`}
                      disabled={!canChangeRole()}
                    >
                      <SelectValue placeholder={t('dashboard:employeeManagement.editDialog.selectRole')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                      {ROLES.filter(role => canAssignRole(role.value)).map(role => {
                        const RoleIcon = role.icon
                        return (
                          <SelectItem key={role.value} value={role.value}>
                            <div className="flex items-center gap-2">
                              <RoleIcon className="h-3.5 w-3.5" />
                              {role.label}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </RoleGuard>
                {!canChangeRole() && (
                  <p className="text-xs text-[var(--text-sub)]">
                    {t('dashboard:employeeManagement.editDialog.roleChangeWarning')}
                  </p>
                )}
                {validationErrors.role && (
                  <p className="text-xs text-red-500">{validationErrors.role}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('dashboard:employeeManagement.editDialog.accountStatus')}</Label>
                <Select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onValueChange={(v) => setFormData({ ...formData, isActive: v === 'active' })}
                >
                  <SelectTrigger className="bg-[var(--shell)] border-[var(--border)] h-9">
                    <SelectValue placeholder={t('dashboard:employeeManagement.editDialog.selectStatus')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        {t('dashboard:employeeManagement.active')}
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                        {t('dashboard:employeeManagement.inactive')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {!formData.isActive && (
                  <p className="text-xs text-red-500 mt-1">
                    {t('dashboard:employeeManagement.editDialog.inactiveWarning')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 pt-4 border-t border-[var(--border)]">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setValidationErrors({})
              }}
              className="border-[var(--border)] text-[var(--text-main)] h-9"
            >
              {t('dashboard:employeeManagement.editDialog.cancel')}
            </Button>
            <Button
              onClick={handleSubmitEdit}
              className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] h-9 px-6"
            >
              💾 {t('dashboard:employeeManagement.editDialog.update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">{t('dashboard:employeeManagement.createUser.title', 'Tạo tài khoản mới')}</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)] text-sm">
              {t('dashboard:employeeManagement.createUser.description', 'Nhập thông tin để tạo tài khoản nhân viên mới')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 pt-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                <Users className="h-4 w-4 text-[var(--primary)]" />
                <h3 className="text-sm font-semibold text-[var(--text-main)]">{t('dashboard:employeeManagement.editDialog.personalInfo')}</h3>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('dashboard:employeeManagement.editDialog.fullName')} <span className="text-red-500">*</span></Label>
                <Input
                  placeholder={t('dashboard:employeeManagement.form.namePlaceholder')}
                  className={`bg-[var(--shell)] border-[var(--border)] h-9 ${createValidationErrors.name ? 'border-red-500' : ''}`}
                  value={createFormData.name}
                  onChange={(e) => {
                    setCreateFormData({ ...createFormData, name: e.target.value })
                    if (createValidationErrors.name) {
                      setCreateValidationErrors({ ...createValidationErrors, name: null })
                    }
                  }}
                />
                {createValidationErrors.name && (
                  <p className="text-xs text-red-500">{createValidationErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('dashboard:employeeManagement.editDialog.email')} <span className="text-red-500">*</span></Label>
                <Input
                  type="email"
                  placeholder={t('dashboard:employeeManagement.form.emailPlaceholder')}
                  className={`bg-[var(--shell)] border-[var(--border)] h-9 ${createValidationErrors.email ? 'border-red-500' : ''}`}
                  value={createFormData.email}
                  onChange={(e) => {
                    setCreateFormData({ ...createFormData, email: e.target.value })
                    if (createValidationErrors.email) {
                      setCreateValidationErrors({ ...createValidationErrors, email: null })
                    }
                  }}
                />
                {createValidationErrors.email && (
                  <p className="text-xs text-red-500">{createValidationErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('dashboard:employeeManagement.createUser.password', 'Mật khẩu')} <span className="text-red-500">*</span></Label>
                <Input
                  type="password"
                  placeholder={t('dashboard:employeeManagement.createUser.passwordPlaceholder', 'Nhập mật khẩu')}
                  className={`bg-[var(--shell)] border-[var(--border)] h-9 ${createValidationErrors.password ? 'border-red-500' : ''}`}
                  value={createFormData.password}
                  onChange={(e) => {
                    setCreateFormData({ ...createFormData, password: e.target.value })
                    if (createValidationErrors.password) {
                      setCreateValidationErrors({ ...createValidationErrors, password: null })
                    }
                  }}
                />
                {createValidationErrors.password && (
                  <p className="text-xs text-red-500">{createValidationErrors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('dashboard:employeeManagement.editDialog.phone')}</Label>
                <Input
                  placeholder={t('dashboard:employeeManagement.form.phonePlaceholder')}
                  className={`bg-[var(--shell)] border-[var(--border)] h-9 ${createValidationErrors.phone ? 'border-red-500' : ''}`}
                  value={createFormData.phone}
                  onChange={(e) => {
                    setCreateFormData({ ...createFormData, phone: e.target.value })
                    if (createValidationErrors.phone) {
                      setCreateValidationErrors({ ...createValidationErrors, phone: null })
                    }
                  }}
                />
                {createValidationErrors.phone && (
                  <p className="text-xs text-red-500">{createValidationErrors.phone}</p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                <Shield className="h-4 w-4 text-[var(--primary)]" />
                <h3 className="text-sm font-semibold text-[var(--text-main)]">{t('dashboard:employeeManagement.editDialog.workInfo')}</h3>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('dashboard:employeeManagement.editDialog.department')}</Label>
                <Select value={createFormData.department} onValueChange={(v) => setCreateFormData({ ...createFormData, department: v })}>
                  <SelectTrigger className="bg-[var(--shell)] border-[var(--border)] h-9">
                    <SelectValue placeholder={t('dashboard:employeeManagement.editDialog.selectDepartment')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                    <SelectItem value="">{t('dashboard:employeeManagement.editDialog.noDepartment')}</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept._id} value={dept._id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('dashboard:employeeManagement.editDialog.shift') || 'Ca làm việc'}</Label>
                <Select value={createFormData.defaultShiftId} onValueChange={(v) => setCreateFormData({ ...createFormData, defaultShiftId: v })}>
                  <SelectTrigger className="bg-[var(--shell)] border-[var(--border)] h-9">
                    <SelectValue placeholder={t('dashboard:employeeManagement.editDialog.selectShift') || 'Chọn ca làm việc'} />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                    <SelectItem value="">{t('dashboard:employeeManagement.editDialog.noShift') || 'Không có ca'}</SelectItem>
                    {shifts.filter(s => s.isActive !== false).map((shift) => (
                      <SelectItem key={shift._id} value={shift._id}>
                        {shift.name} ({shift.startTime} - {shift.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('dashboard:employeeManagement.editDialog.role')} <span className="text-red-500">*</span></Label>
                <Select
                  value={createFormData.role}
                  onValueChange={(v) => {
                    setCreateFormData({ ...createFormData, role: v })
                    if (createValidationErrors.role) {
                      setCreateValidationErrors({ ...createValidationErrors, role: null })
                    }
                  }}
                >
                  <SelectTrigger
                    className={`bg-[var(--shell)] border-[var(--border)] h-9 ${createValidationErrors.role ? 'border-red-500' : ''}`}
                  >
                    <SelectValue placeholder={t('dashboard:employeeManagement.editDialog.selectRole')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                    {ROLES.filter(role => canAssignRole(role.value)).map(role => {
                      const RoleIcon = role.icon
                      return (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center gap-2">
                            <RoleIcon className="h-3.5 w-3.5" />
                            {role.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {createValidationErrors.role && (
                  <p className="text-xs text-red-500">{createValidationErrors.role}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('dashboard:employeeManagement.editDialog.accountStatus')}</Label>
                <Select
                  value={createFormData.isActive ? 'active' : 'inactive'}
                  onValueChange={(v) => setCreateFormData({ ...createFormData, isActive: v === 'active' })}
                >
                  <SelectTrigger className="bg-[var(--shell)] border-[var(--border)] h-9">
                    <SelectValue placeholder={t('dashboard:employeeManagement.editDialog.selectStatus')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        {t('dashboard:employeeManagement.active')}
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                        {t('dashboard:employeeManagement.inactive')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {!createFormData.isActive && (
                  <p className="text-xs text-red-500 mt-1">
                    {t('dashboard:employeeManagement.editDialog.inactiveWarning')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 pt-4 border-t border-[var(--border)]">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setCreateValidationErrors({})
                setCreateFormData({
                  name: '',
                  email: '',
                  password: '',
                  department: '',
                  role: '',
                  phone: '',
                  isActive: true,
                  defaultShiftId: '',
                })
              }}
              className="border-[var(--border)] text-[var(--text-main)] h-9"
            >
              {t('dashboard:employeeManagement.editDialog.cancel')}
            </Button>
            <Button
              onClick={handleSubmitCreate}
              className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] h-9 px-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard:employeeManagement.createUser.create', 'Tạo tài khoản')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] mx-4 max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dashboard:employeeManagement.deleteDialog.title')}</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              {t('dashboard:employeeManagement.deleteDialog.description')}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4">
              <div className="flex items-center space-x-3 p-4 bg-[var(--shell)] rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-red-500 text-white">
                    {getAvatarInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[var(--text-main)]">{selectedUser.name || t('dashboard:employeeManagement.viewDialog.notAvailable')}</p>
                  <p className="text-sm text-[var(--text-sub)]">{selectedUser.email || t('dashboard:employeeManagement.viewDialog.notAvailable')}</p>
                  <p className="text-xs text-[var(--text-sub)]">{getDepartmentName(selectedUser.department, t)}</p>
                </div>
              </div>
              <p className="text-red-500 text-sm mt-4">
                {t('dashboard:employeeManagement.deleteDialog.warning')}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-[var(--border)] text-[var(--text-main)]"
            >
              {t('dashboard:employeeManagement.deleteDialog.cancel')}
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {t('dashboard:employeeManagement.deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  )
}

export default EmployeeManagementPage




