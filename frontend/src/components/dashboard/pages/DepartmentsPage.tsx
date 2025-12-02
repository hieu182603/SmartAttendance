import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
    Briefcase,
    Users,
    Plus,
    Search,
    Edit,
    Trash2,
    UserCheck,
    Building2,
    TrendingUp,
    Target,
    BarChart3,
    ChevronRight,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import {
    getAllDepartments,
    getDepartmentStats,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    type Department as DepartmentType,
} from '@/services/departmentService';
import { getBranchesList } from '@/services/branchService';
import api from '@/services/api';


interface Department {
    id: string;
    _id?: string;
    name: string;
    code: string;
    description: string;
    branchId: string | { _id: string; name: string; code: string };
    branchName: string;
    managerId: string | { _id: string; name: string; email: string };
    managerName: string;
    employeeCount: number;
    activeEmployees: number;
    budget: number;
    createdAt: string;
    status: 'active' | 'inactive';
}

interface Branch {
    _id: string;
    name: string;
    code: string;
}

interface Manager {
    id: string;
    name: string;
    email: string;
    role: string;
}

export function DepartmentsPage() {
    const { t } = useTranslation(['dashboard', 'common']);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [managers, setManagers] = useState<Manager[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBranch, setFilterBranch] = useState('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [pagination, setPagination] = useState<{
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
    });
    const [stats, setStats] = useState({
        total: 0,
        totalEmployees: 0,
        activeEmployees: 0,
        totalBudget: 0,
    });

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        branchId: '',
        managerId: '',
        budget: '',
    });

    // Load data
    useEffect(() => {
        loadBranches();
        loadManagers();
        loadStats();
    }, []);

    // Load departments when filters or pagination change
    useEffect(() => {
        loadDepartments();
    }, [currentPage, itemsPerPage, searchQuery, filterBranch]);

    // Reset to page 1 when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterBranch]);

    const loadDepartments = async () => {
        try {
            setLoading(true);
            const params: {
                page?: number;
                limit?: number;
                search?: string;
                branchId?: string;
            } = {
                page: currentPage,
                limit: itemsPerPage,
            };
            
            if (searchQuery) {
                params.search = searchQuery;
            }
            
            if (filterBranch !== 'all') {
                params.branchId = filterBranch;
            }
            
            const response = await getAllDepartments(params);
            const departmentsData = response.departments.map((dept: DepartmentType) => ({
                id: dept._id || dept.id || '',
                _id: dept._id,
                name: dept.name,
                code: dept.code,
                description: dept.description || '',
                branchId: typeof dept.branchId === 'object' && dept.branchId ? dept.branchId._id : (typeof dept.branchId === 'string' ? dept.branchId : ''),
                branchName: typeof dept.branchId === 'object' && dept.branchId ? dept.branchId.name : (dept.branchName || ''),
                managerId: typeof dept.managerId === 'object' && dept.managerId ? dept.managerId._id : (typeof dept.managerId === 'string' ? dept.managerId : ''),
                managerName: typeof dept.managerId === 'object' && dept.managerId ? dept.managerId.name : (dept.managerName || ''),
                employeeCount: dept.employeeCount || 0,
                activeEmployees: dept.activeEmployees || 0,
                budget: dept.budget || 0,
                createdAt: dept.createdAt || new Date().toISOString().split('T')[0],
                status: dept.status,
            }));
            setDepartments(departmentsData);
            
            // Update pagination info from backend
            if (response.total !== undefined) {
                setPagination({
                    total: response.total || 0,
                    page: response.page || currentPage,
                    limit: response.limit || itemsPerPage,
                    totalPages: response.totalPages || 1,
                });
            }
        } catch (error) {
            console.error('Error loading departments:', error);
            toast.error(t('dashboard:departments.dialog.error'));
        } finally {
            setLoading(false);
        }
    };

    const loadBranches = async () => {
        try {
            const response = await getBranchesList();
            setBranches(response.branches);
        } catch (error) {
            console.error('Error loading branches:', error);
        }
    };

    const loadManagers = async () => {
        try {
            const response = await api.get('/users/managers');
            setManagers(response.data.managers || []);
        } catch (error) {
            console.error('Error loading managers:', error);
        }
    };

    const loadStats = async () => {
        try {
            const statsData = await getDepartmentStats();
            setStats(statsData);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    // Server-side filtering - no client-side filtering needed
    const filteredDepartments = departments;

    const handleOpenDialog = (mode: 'create' | 'edit', department?: Department) => {
        setDialogMode(mode);
        if (mode === 'edit' && department) {
            setSelectedDepartment(department);
            setFormData({
                name: department.name,
                code: department.code,
                description: department.description,
                branchId: typeof department.branchId === 'string' ? department.branchId : (department.branchId as any)?._id || '',
                managerId: typeof department.managerId === 'string' ? department.managerId : (department.managerId as any)?._id || '',
                budget: department.budget.toString(),
            });
        } else {
            setSelectedDepartment(null);
            setFormData({
                name: '',
                code: '',
                description: '',
                branchId: '',
                managerId: '',
                budget: '',
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.code || !formData.branchId || !formData.managerId) {
            toast.error(t('dashboard:departments.errors.fillRequired'));
            return;
        }

        try {
        if (dialogMode === 'create') {
                await createDepartment({
                name: formData.name,
                code: formData.code,
                    description: formData.description || undefined,
                branchId: formData.branchId,
                managerId: formData.managerId,
                budget: parseInt(formData.budget) || 0,
                });
                toast.success(t('dashboard:departments.dialog.createSuccess'));
        } else if (selectedDepartment) {
                await updateDepartment(selectedDepartment._id || selectedDepartment.id, {
                        name: formData.name,
                        code: formData.code,
                    description: formData.description || undefined,
                        branchId: formData.branchId,
                        managerId: formData.managerId,
                    budget: parseInt(formData.budget) || undefined,
                });
                toast.success(t('dashboard:departments.dialog.updateSuccess'));
        }
        setIsDialogOpen(false);
            await loadDepartments();
            await loadStats();
        } catch (error: any) {
            toast.error(error.message || t('dashboard:departments.errors.generic'));
        }
    };

    const handleDelete = async (department: Department) => {
        if (confirm(`Bạn có chắc muốn xóa phòng ban "${department.name}"?`)) {
            try {
                await deleteDepartment(department._id || department.id);
                toast.success(`Đã xóa phòng ban ${department.name}`);
                await loadDepartments();
                await loadStats();
            } catch (error: any) {
                toast.error(error.message || t('dashboard:departments.errors.generic'));
            }
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
                        {t('dashboard:departments.title')}
                    </h1>
                    <p className="text-[var(--text-sub)] mt-2">
                        {t('dashboard:departments.description')}
                    </p>
                </div>
                <Button
                    onClick={() => handleOpenDialog('create')}
                    className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('dashboard:departments.add')}
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="bg-[var(--surface)] border-[var(--border)]">
                        <CardContent className="p-6 mt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-[var(--text-sub)]">{t('dashboard:departments.stats.total')}</p>
                                    <p className="text-3xl text-[var(--primary)] mt-2">{stats.total}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                                    <Briefcase className="h-6 w-6 text-[var(--primary)]" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="bg-[var(--surface)] border-[var(--border)]">
                        <CardContent className="p-6 mt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-[var(--text-sub)]">{t('dashboard:departments.stats.totalEmployees')}</p>
                                    <p className="text-3xl text-[var(--accent-cyan)] mt-2">{stats.totalEmployees}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-[var(--accent-cyan)]/20 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-[var(--accent-cyan)]" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="bg-[var(--surface)] border-[var(--border)]">
                        <CardContent className="p-6 mt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-[var(--text-sub)]">Đang làm việc</p>
                                    <p className="text-3xl text-[var(--success)] mt-2">{stats.activeEmployees}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-[var(--success)]/20 flex items-center justify-center">
                                    <UserCheck className="h-6 w-6 text-[var(--success)]" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="bg-[var(--surface)] border-[var(--border)]">
                        <CardContent className="p-6 mt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-[var(--text-sub)]">{t('dashboard:departments.stats.totalBudget')}</p>
                                    <p className="text-2xl text-[var(--warning)] mt-2">
                                        {(stats.totalBudget / 1000000000).toFixed(1)}B
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-[var(--warning)]/20 flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-[var(--warning)]" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Filters */}
            <Card className="bg-[var(--surface)] border-[var(--border)]">
                <CardContent className="p-6 mt-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-sub)]" />
                                <Input
                                    placeholder={t('dashboard:departments.searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
                                />
                            </div>
                        </div>
                        <Select value={filterBranch} onValueChange={setFilterBranch}>
                            <SelectTrigger className="w-full md:w-[200px] bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                                <SelectValue placeholder={t('dashboard:departments.dialog.branch')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả chi nhánh</SelectItem>
                                {branches.map(branch => (
                                    <SelectItem key={branch._id} value={branch._id}>{branch.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Departments Grid */}
            {loading ? (
                <div className="text-center py-8 text-[var(--text-sub)]">{t('dashboard:departments.loading')}</div>
            ) : filteredDepartments.length === 0 ? (
                <div className="text-center py-12">
                    <Briefcase className="h-16 w-16 text-[var(--text-sub)] mx-auto mb-4 opacity-50" />
                    <p className="text-[var(--text-sub)]">{t('dashboard:departments.noResults')}</p>
                </div>
            ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDepartments.map((department, index) => (
                    <motion.div
                        key={department._id || department.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <Card className="bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)] transition-all h-full">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] flex items-center justify-center text-white">
                                                <Briefcase className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg text-[var(--text-main)]">{department.name}</CardTitle>
                                                <Badge variant="outline" className="border-[var(--border)] text-[var(--text-sub)] text-xs">
                                                    {department.code}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleOpenDialog('edit', department)}
                                            className="h-8 w-8 text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(department)}
                                            className="h-8 w-8 text-[var(--error)] hover:bg-[var(--error)]/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-[var(--text-sub)] line-clamp-2">{department.description}</p>

                                <Separator className="bg-[var(--border)]" />

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[var(--text-sub)] flex items-center gap-2">
                                            <Building2 className="h-4 w-4" />
                                            Chi nhánh
                                        </span>
                                        <span className="text-[var(--text-main)]">{department.branchName}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[var(--text-sub)] flex items-center gap-2">
                                            <UserCheck className="h-4 w-4" />
                                            Trưởng phòng
                                        </span>
                                        <span className="text-[var(--text-main)]">{department.managerName}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[var(--text-sub)] flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            Nhân viên
                                        </span>
                                        <span className="text-[var(--text-main)]">
                                            <span className="text-[var(--success)]">{department.activeEmployees}</span>
                                            /{department.employeeCount}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[var(--text-sub)] flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4" />
                                            Ngân sách
                                        </span>
                                        <span className="text-[var(--warning)]">{formatCurrency(department.budget)}</span>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    className="w-full border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--shell)]"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedDepartment(department);
                                        setIsViewDialogOpen(true);
                                    }}
                                >
                                    Xem chi tiết
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
            
            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
                <Card className="bg-[var(--surface)] border-[var(--border)]">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-sm text-[var(--text-sub)]">
                                <span>
                                    Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, pagination.total)} của {pagination.total}
                                </span>
                            </div>

                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                <span className="px-4 text-sm text-[var(--text-main)]">
                                    Trang {currentPage} / {pagination.totalPages}
                                </span>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                                    disabled={currentPage >= pagination.totalPages}
                                    className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(pagination.totalPages)}
                                    disabled={currentPage >= pagination.totalPages}
                                    className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
            </>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {dialogMode === 'create' ? t('dashboard:departments.dialog.addTitle') : t('dashboard:departments.dialog.editTitle')}
                        </DialogTitle>
                        <DialogDescription className="text-[var(--text-sub)]">
                            {dialogMode === 'create' ? 'Điền thông tin phòng ban mới' : 'Cập nhật thông tin phòng ban'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[var(--text-main)]">{t('dashboard:departments.dialog.name')} *</Label>
                            <Input
                                placeholder="Ví dụ: Công nghệ thông tin"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[var(--text-main)]">Mã phòng ban *</Label>
                            <Input
                                placeholder="Ví dụ: IT"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label className="text-[var(--text-main)]">Mô tả</Label>
                            <Textarea
                                placeholder="Mô tả về phòng ban..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[var(--text-main)]">{t('dashboard:departments.dialog.branch')} *</Label>
                            <Select value={formData.branchId} onValueChange={(v) => setFormData({ ...formData, branchId: v })}>
                                <SelectTrigger className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                                    <SelectValue placeholder={t('dashboard:departments.dialog.selectBranch')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map(branch => (
                                        <SelectItem key={branch._id} value={branch._id}>{branch.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[var(--text-main)]">{t('dashboard:departments.dialog.manager')} *</Label>
                            <Select value={formData.managerId} onValueChange={(v) => setFormData({ ...formData, managerId: v })}>
                                <SelectTrigger className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                                    <SelectValue placeholder={t('dashboard:departments.dialog.selectManager')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {managers.map(manager => (
                                        <SelectItem key={manager.id} value={manager.id}>{manager.name} ({manager.role})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[var(--text-main)]">Ngân sách (VNĐ)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            className="border-[var(--border)] text-[var(--text-main)]"
                        >
                            {t('dashboard:departments.dialog.cancel')}
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
                        >
                            {dialogMode === 'create' ? t('dashboard:departments.dialog.save') : t('common:update')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Details Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] max-w-6xl">
                    <DialogHeader>
                        <DialogTitle>Chi tiết phòng ban</DialogTitle>
                        <DialogDescription className="text-[var(--text-sub)]">
                            Xem đầy đủ thông tin và thống kê phòng ban
                        </DialogDescription>
                    </DialogHeader>

                    {selectedDepartment && (
                        <div className="space-y-4">
                            {/* Header */}
                            <div className="flex items-start justify-between p-4 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
                                <div className="flex items-center space-x-4">
                                    <div className="h-16 w-16 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] flex items-center justify-center text-white text-xl">
                                        {selectedDepartment.code}
                                    </div>
                                    <div>
                                        <h3 className="text-xl text-[var(--text-main)]">{selectedDepartment.name}</h3>
                                        <p className="text-sm text-[var(--text-sub)] mt-1">{selectedDepartment.description}</p>
                                        <Badge
                                            className={`mt-2 ${selectedDepartment.status === 'active'
                                                    ? 'bg-[var(--success)]/20 text-[var(--success)]'
                                                    : 'bg-[var(--error)]/20 text-[var(--error)]'
                                                }`}
                                        >
                                            {selectedDepartment.status === 'active' ? t('dashboard:departments.status.active') : t('dashboard:departments.status.inactive')}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <Separator className="bg-[var(--border)]" />

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4">
                                <Card className="bg-[var(--shell)] border-[var(--border)]">
                                    <CardContent className="p-4 mt-4 text-center">
                                        <Users className="h-8 w-8 text-[var(--primary)] mx-auto mb-2" />
                                        <p className="text-sm text-[var(--text-sub)]">{t('dashboard:departments.stats.totalEmployees')}</p>
                                        <p className="text-2xl text-[var(--text-main)] mt-1">{selectedDepartment.employeeCount}</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-[var(--shell)] border-[var(--border)]">
                                    <CardContent className="p-4 mt-4 text-center">
                                        <UserCheck className="h-8 w-8 text-[var(--success)] mx-auto mb-2" />
                                        <p className="text-sm text-[var(--text-sub)]">Đang làm việc</p>
                                        <p className="text-2xl text-[var(--success)] mt-1">{selectedDepartment.activeEmployees}</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-[var(--shell)] border-[var(--border)]">
                                    <CardContent className="p-4 mt-4 text-center">
                                        <TrendingUp className="h-8 w-8 text-[var(--accent-cyan)] mx-auto mb-2" />
                                        <p className="text-sm text-[var(--text-sub)]">Ngân sách</p>
                                        <p className="text-2xl text-[var(--accent-cyan)] mt-1">
                                            {selectedDepartment.budget.toLocaleString('vi-VN')}M
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            <Separator className="bg-[var(--border)]" />

                            {/* Details */}
                            <div className="grid grid-cols-4 gap-2">
                                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-[var(--shell)] mt-4">
                                    <Building2 className="h-8 w-8 text-[var(--primary)] mb-2" />
                                    <p className="text-sm text-[var(--text-sub)]">Chi nhánh</p>
                                    <p className="text-[var(--text-main)] font-medium mt-1">{selectedDepartment.branchName}</p>
                                </div>

                                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-[var(--shell)] mt-4">
                                    <Users className="h-8 w-8 text-[var(--accent-cyan)] mb-2" />
                                    <p className="text-sm text-[var(--text-sub)]">{t('dashboard:departments.management')}</p>
                                    <p className="text-[var(--text-main)] font-medium mt-1">{selectedDepartment.managerName}</p>
                                </div>

                                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-[var(--shell)] mt-4">
                                    <Briefcase className="h-8 w-8 text-[var(--warning)] mb-2" />
                                    <p className="text-sm text-[var(--text-sub)]">Mã phòng ban</p>
                                    <p className="text-[var(--text-main)] font-medium mt-1">{selectedDepartment.code}</p>
                                </div>

                                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-[var(--shell)] mt-4">
                                    <BarChart3 className="h-8 w-8 text-[var(--success)] mb-2" />
                                    <p className="text-sm text-[var(--text-sub)]">Ngày thành lập</p>
                                    <p className="text-[var(--text-main)] font-medium mt-1">{selectedDepartment.createdAt}</p>
                                </div>
                            </div>

                            <Separator className="bg-[var(--border)]" />

                            {/* Quick Actions */}
                            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent-cyan)]/10 border border-[var(--primary)]/30">
                                <div className="flex items-center space-x-3">
                                    <Target className="h-6 w-6 text-[var(--primary)]" />
                                    <div>
                                        <p className="text-[var(--text-main)]">Tỷ lệ hoạt động</p>
                                        <p className="text-sm text-[var(--text-sub)]">
                                            {Math.round((selectedDepartment.activeEmployees / selectedDepartment.employeeCount) * 100)}% nhân viên đang làm việc
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setIsViewDialogOpen(false);
                                            handleOpenDialog('edit', selectedDepartment);
                                        }}
                                        className="border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/10"
                                    >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Chỉnh sửa
                                    </Button>
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
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}