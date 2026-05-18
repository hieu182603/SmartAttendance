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
    ChevronsRight,
    MoreVertical,
    Merge,
    ArrowRightLeft,
    PowerOff,
    CheckCircle2,
    RotateCcw
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
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    transferEmployees,
    transferSelectedEmployees,
    mergeDepartments,
    reactivateDepartment,
    getDepartmentsList,
    type Department as DepartmentType,
} from '@/services/departmentService';
import { TransferEmployeesWizard } from './TransferEmployeesWizard';
import { SelectiveTransferEmployeesWizard } from './SelectiveTransferEmployeesWizard';
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
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteDepartmentDetails, setDeleteDepartmentDetails] = useState<Department | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [isTransferWizardOpen, setIsTransferWizardOpen] = useState(false);
    const [transferSourceDepartment, setTransferSourceDepartment] = useState<Department | null>(null);
    const [isSelectiveTransferWizardOpen, setIsSelectiveTransferWizardOpen] = useState(false);
    const [selectiveTransferSourceDepartment, setSelectiveTransferSourceDepartment] = useState<Department | null>(null);
    const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
    const [mergeSourceDepartment, setMergeSourceDepartment] = useState<Department | null>(null);
    const [mergeTargetDepartmentId, setMergeTargetDepartmentId] = useState('');
    const [mergeLoading, setMergeLoading] = useState(false);
    const [availableDepartments, setAvailableDepartments] = useState<Array<{ _id: string; name: string; code: string }>>([]);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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
        try {
            // Fetch chi tiết phòng ban để hiển thị thông tin
            const details = await getDepartmentById(department._id || department.id);
            setDeleteDepartmentDetails({
                ...department,
                employeeCount: details.department.employeeCount || 0,
                activeEmployees: details.department.activeEmployees || 0,
            });
            setIsDeleteDialogOpen(true);
        } catch (error: any) {
            toast.error(error.message || t('dashboard:departments.errors.generic'));
        }
    };

    const confirmDelete = async () => {
        if (!deleteDepartmentDetails) return;

        setDeleteLoading(true);
        try {
            await deleteDepartment(deleteDepartmentDetails._id || deleteDepartmentDetails.id);
            toast.success(t('dashboard:departments.delete.success', { name: deleteDepartmentDetails.name }));
            setIsDeleteDialogOpen(false);
            setDeleteDepartmentDetails(null);
            await loadDepartments();
            await loadStats();
        } catch (error: any) {
            // Hiển thị lỗi chi tiết từ backend
            const errorMessage = error.response?.data?.message || error.message || t('dashboard:departments.errors.generic');
            toast.error(errorMessage, { duration: 5000 });
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleDeactivate = async (department: Department) => {
        try {
            await updateDepartment(department._id || department.id, { status: 'inactive' });
            toast.success(`Đã vô hiệu hóa phòng ban ${department.name}`);
            await loadDepartments();
            await loadStats();
            setOpenMenuId(null);
        } catch (error: any) {
            toast.error(error.message || 'Không thể vô hiệu hóa phòng ban');
        }
    };

    const handleOpenTransferWizard = async (department: Department) => {
        try {
            const details = await getDepartmentById(department._id || department.id);
            // Đảm bảo branchId được lấy đúng từ details
            const branchId = typeof details.department.branchId === 'string' 
                ? details.department.branchId 
                : (details.department.branchId as any)?._id || 
                  (typeof department.branchId === 'string' 
                    ? department.branchId 
                    : (department.branchId as any)?._id || '');
            setTransferSourceDepartment({
                ...department,
                branchId: branchId, // Đảm bảo branchId là string
                employeeCount: details.department.employeeCount || 0,
                activeEmployees: details.department.activeEmployees || 0,
            });
            setIsTransferWizardOpen(true);
            setOpenMenuId(null);
        } catch (error: any) {
            toast.error(error.message || 'Không thể tải thông tin phòng ban');
        }
    };

    const handleTransfer = async (targetDepartmentId: string) => {
        if (!transferSourceDepartment) return;
        await transferEmployees(transferSourceDepartment._id || transferSourceDepartment.id, targetDepartmentId);
        await loadDepartments();
        await loadStats();
        setIsTransferWizardOpen(false);
        setTransferSourceDepartment(null);
    };

    const handleOpenMergeDialog = async (department: Department) => {
        try {
            const details = await getDepartmentById(department._id || department.id);
            // Lấy branchId từ details để đảm bảo chính xác
            const branchId = typeof details.department.branchId === 'string' 
                ? details.department.branchId 
                : (details.department.branchId as any)?._id || 
                  (typeof department.branchId === 'string' 
                    ? department.branchId 
                    : (department.branchId as any)?._id || '');
            setMergeSourceDepartment({
                ...department,
                employeeCount: details.department.employeeCount || 0,
                activeEmployees: details.department.activeEmployees || 0,
            });
            setMergeTargetDepartmentId('');
            setIsMergeDialogOpen(true);
            setOpenMenuId(null);
            // Load available departments for merge
            if (branchId) {
                try {
                    const depts = await getDepartmentsList(branchId);
                    setAvailableDepartments(depts.departments.filter(d => d._id !== (department._id || department.id)));
                } catch (error: any) {
                    console.error('Error loading departments for merge:', error);
                    setAvailableDepartments([]);
                }
            } else {
                setAvailableDepartments([]);
            }
        } catch (error: any) {
            toast.error(error.message || 'Không thể tải thông tin phòng ban');
        }
    };

    const handleMerge = async () => {
        if (!mergeSourceDepartment || !mergeTargetDepartmentId) return;

        setMergeLoading(true);
        try {
            await mergeDepartments(mergeSourceDepartment._id || mergeSourceDepartment.id, mergeTargetDepartmentId);
            toast.success(`Đã sáp nhập ${mergeSourceDepartment.name} thành công`);
            setIsMergeDialogOpen(false);
            setMergeSourceDepartment(null);
            setMergeTargetDepartmentId('');
            await loadDepartments();
            await loadStats();
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message || 'Không thể sáp nhập phòng ban');
        } finally {
            setMergeLoading(false);
        }
    };

    const handleReactivate = async (department: Department) => {
        try {
            await reactivateDepartment(department._id || department.id);
            toast.success(`Đã kích hoạt lại phòng ban ${department.name}`);
            await loadDepartments();
            await loadStats();
            setOpenMenuId(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message || 'Không thể kích hoạt lại phòng ban');
        }
    };

    const handleOpenSelectiveTransferWizard = async (department: Department) => {
        try {
            const details = await getDepartmentById(department._id || department.id);
            const branchId = typeof details.department.branchId === 'string' 
                ? details.department.branchId 
                : (details.department.branchId as any)?._id || 
                  (typeof department.branchId === 'string' 
                    ? department.branchId 
                    : (department.branchId as any)?._id || '');
            setSelectiveTransferSourceDepartment({
                ...department,
                branchId: branchId,
                employeeCount: details.department.employeeCount || 0,
                activeEmployees: details.department.activeEmployees || 0,
            });
            setIsSelectiveTransferWizardOpen(true);
            setOpenMenuId(null);
        } catch (error: any) {
            toast.error(error.message || 'Không thể tải thông tin phòng ban');
        }
    };

    const handleSelectiveTransfer = async (targetDepartmentId: string, employeeIds: string[]) => {
        if (!selectiveTransferSourceDepartment) return;
        await transferSelectedEmployees(
            selectiveTransferSourceDepartment._id || selectiveTransferSourceDepartment.id,
            targetDepartmentId,
            employeeIds
        );
        await loadDepartments();
        await loadStats();
        setIsSelectiveTransferWizardOpen(false);
        setSelectiveTransferSourceDepartment(null);
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
                                <SelectItem value="all">{t('dashboard:departments.filters.allBranches')}</SelectItem>
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
                                        <div className="relative">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setOpenMenuId(openMenuId === (department._id || department.id) ? null : (department._id || department.id))}
                                                className="h-8 w-8 text-[var(--text-sub)] hover:bg-[var(--shell)]"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                            {openMenuId === (department._id || department.id) && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setOpenMenuId(null)}
                                                    />
                                                    <div className="absolute right-0 top-10 z-20 w-56 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-lg py-1">
                                                        {department.status === 'active' ? (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        handleOpenTransferWizard(department);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--shell)] transition-colors"
                                                                >
                                                                    <ArrowRightLeft className="h-4 w-4 text-[var(--primary)]" />
                                                                    Chuyển tất cả nhân viên
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        handleOpenSelectiveTransferWizard(department);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--shell)] transition-colors"
                                                                >
                                                                    <Users className="h-4 w-4 text-[var(--accent-cyan)]" />
                                                                    Chuyển nhân viên
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        handleOpenMergeDialog(department);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--shell)] transition-colors"
                                                                >
                                                                    <Merge className="h-4 w-4 text-[var(--accent-cyan)]" />
                                                                    Sáp nhập phòng ban
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        handleDeactivate(department);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--shell)] transition-colors"
                                                                >
                                                                    <PowerOff className="h-4 w-4 text-[var(--warning)]" />
                                                                    Vô hiệu hóa
                                                                </button>
                                                                <div className="border-t border-[var(--border)] my-1" />
                                                                <button
                                                                    onClick={() => {
                                                                        handleDelete(department);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    Xóa phòng ban
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        handleReactivate(department);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--success)] hover:bg-[var(--success)]/10 transition-colors"
                                                                >
                                                                    <RotateCcw className="h-4 w-4" />
                                                                    Kích hoạt lại
                                                                </button>
                                                                <div className="border-t border-[var(--border)] my-1" />
                                                                <button
                                                                    onClick={() => {
                                                                        handleDelete(department);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    Xóa phòng ban
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
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
                                    className="w-full border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--shell)] h-9 flex items-center justify-center"
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
                            {dialogMode === 'create' ? t('dashboard:departments.dialog.createDescription') : t('dashboard:departments.dialog.editDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[var(--text-main)]">{t('dashboard:departments.dialog.name')} *</Label>
                            <Input
                                placeholder={t('dashboard:departments.dialog.namePlaceholder')}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[var(--text-main)]">{t('dashboard:departments.dialog.code')} *</Label>
                            <Input
                                placeholder={t('dashboard:departments.dialog.codePlaceholder')}
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label className="text-[var(--text-main)]">{t('dashboard:departments.dialog.description')}</Label>
                            <Textarea
                                placeholder={t('dashboard:departments.dialog.descriptionPlaceholder')}
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
                            {dialogMode === 'create' ? t('dashboard:departments.dialog.save') : t('common.update')}
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
                                    <p className="text-sm text-[var(--text-sub)]">{t('dashboard:departments.dialog.code')}</p>
                                    <p className="text-[var(--text-main)] font-medium mt-1">{selectedDepartment.code}</p>
                                </div>

                                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-[var(--shell)] mt-4">
                                    <BarChart3 className="h-8 w-8 text-[var(--success)] mb-2" />
                                    <p className="text-sm text-[var(--text-sub)]">Ngày thành lập</p>
                                    <p className="text-[var(--text-main)] font-medium mt-1">
                                        {selectedDepartment.createdAt 
                                            ? new Date(selectedDepartment.createdAt).toLocaleDateString('vi-VN', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric'
                                            })
                                            : 'N/A'}
                                    </p>
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="bg-[var(--surface)] border-[var(--border)] max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-[var(--text-main)] flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-[var(--error)]" />
                            Xác nhận xóa phòng ban
                        </DialogTitle>
                        <DialogDescription className="text-[var(--text-sub)]">
                            Bạn có chắc chắn muốn vô hiệu hóa phòng ban này?
                        </DialogDescription>
                    </DialogHeader>

                    {deleteDepartmentDetails && (
                        <div className="space-y-4 py-4">
                            <div className="p-4 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
                                <p className="font-semibold text-[var(--text-main)] mb-2">
                                    {deleteDepartmentDetails.name}
                                </p>
                                <p className="text-sm text-[var(--text-sub)]">
                                    Mã: {deleteDepartmentDetails.code}
                                </p>
                            </div>

                            {(deleteDepartmentDetails.employeeCount || 0) > 0 && (
                                <div className="p-4 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/30">
                                    <div className="flex items-start gap-3">
                                        <Users className="h-5 w-5 text-[var(--warning)] mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-medium text-[var(--warning)] mb-1">
                                                Cảnh báo: Phòng ban này còn nhân viên
                                            </p>
                                            <p className="text-sm text-[var(--text-sub)]">
                                                • Tổng số nhân viên: <span className="font-semibold text-[var(--text-main)]">
                                                    {deleteDepartmentDetails.employeeCount}
                                                </span>
                                            </p>
                                            <p className="text-sm text-[var(--text-sub)]">
                                                • Nhân viên đang hoạt động: <span className="font-semibold text-[var(--text-main)]">
                                                    {deleteDepartmentDetails.activeEmployees || 0}
                                                </span>
                                            </p>
                                            <p className="text-sm text-[var(--warning)] mt-2">
                                                Vui lòng chuyển nhân viên sang phòng ban khác trước khi xóa.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(deleteDepartmentDetails.employeeCount || 0) === 0 && (
                                <div className="p-4 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/30">
                                    <div className="flex items-center gap-2">
                                        <UserCheck className="h-5 w-5 text-[var(--success)]" />
                                        <p className="text-sm text-[var(--success)]">
                                            Phòng ban này không có nhân viên. Có thể xóa an toàn.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        {(deleteDepartmentDetails?.employeeCount || 0) > 0 ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsDeleteDialogOpen(false);
                                        setDeleteDepartmentDetails(null);
                                    }}
                                    disabled={deleteLoading}
                                    className="border-[var(--border)] text-[var(--text-main)] flex-1"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (deleteDepartmentDetails) {
                                            setIsDeleteDialogOpen(false);
                                            handleOpenTransferWizard(deleteDepartmentDetails);
                                            setDeleteDepartmentDetails(null);
                                        }
                                    }}
                                    disabled={deleteLoading}
                                    className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white flex-1"
                                >
                                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                                    Chuyển nhân viên
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsDeleteDialogOpen(false);
                                        setDeleteDepartmentDetails(null);
                                    }}
                                    disabled={deleteLoading}
                                    className="border-[var(--border)] text-[var(--text-main)]"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={confirmDelete}
                                    disabled={deleteLoading}
                                    className="bg-[var(--error)] hover:bg-[var(--error)]/80 text-white"
                                >
                                    {deleteLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Transfer Employees Wizard */}
            {transferSourceDepartment && (
                <TransferEmployeesWizard
                    isOpen={isTransferWizardOpen}
                    onClose={() => {
                        setIsTransferWizardOpen(false);
                        setTransferSourceDepartment(null);
                    }}
                    sourceDepartmentId={transferSourceDepartment._id || transferSourceDepartment.id}
                    sourceDepartmentName={transferSourceDepartment.name}
                    sourceBranchId={transferSourceDepartment.branchId as string}
                    onTransfer={handleTransfer}
                />
            )}

            {/* Merge Departments Dialog */}
            <Dialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
                <DialogContent className="bg-[var(--surface)] border-[var(--border)] max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-[var(--text-main)] flex items-center gap-2">
                            <Merge className="h-5 w-5 text-[var(--accent-cyan)]" />
                            Sáp nhập phòng ban
                        </DialogTitle>
                        <DialogDescription className="text-[var(--text-sub)]">
                            Sáp nhập <strong>{mergeSourceDepartment?.name}</strong> vào phòng ban khác. Tất cả nhân viên sẽ được chuyển và phòng ban này sẽ bị vô hiệu hóa.
                        </DialogDescription>
                    </DialogHeader>

                    {mergeSourceDepartment && (
                        <div className="space-y-4 py-4">
                            <div className="p-4 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
                                <p className="font-semibold text-[var(--text-main)] mb-2">
                                    {mergeSourceDepartment.name}
                                </p>
                                <p className="text-sm text-[var(--text-sub)]">
                                    Mã: {mergeSourceDepartment.code}
                                </p>
                                {(mergeSourceDepartment.employeeCount || 0) > 0 && (
                                    <p className="text-sm text-[var(--text-sub)] mt-2">
                                        • {mergeSourceDepartment.employeeCount} nhân viên
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label className="text-[var(--text-main)] mb-2 block">
                                    Chọn phòng ban đích để sáp nhập
                                </Label>
                                <Select value={mergeTargetDepartmentId} onValueChange={setMergeTargetDepartmentId}>
                                    <SelectTrigger className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                                        <SelectValue placeholder="Chọn phòng ban đích..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableDepartments.length === 0 ? (
                                            <div className="px-3 py-2 text-sm text-[var(--text-sub)]">
                                                Không có phòng ban nào trong cùng chi nhánh
                                            </div>
                                        ) : (
                                            availableDepartments.map((dept) => (
                                                <SelectItem key={dept._id} value={dept._id}>
                                                    {dept.name} ({dept.code})
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="p-4 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/30">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-[var(--warning)] mt-0.5" />
                                    <div className="flex-1">
                                        <p className="font-medium text-[var(--warning)] mb-1">
                                            Lưu ý quan trọng
                                        </p>
                                        <p className="text-sm text-[var(--text-sub)]">
                                            Sau khi sáp nhập, phòng ban <strong>{mergeSourceDepartment.name}</strong> sẽ bị vô hiệu hóa và không thể hoạt động trở lại.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsMergeDialogOpen(false);
                                setMergeSourceDepartment(null);
                                setMergeTargetDepartmentId('');
                            }}
                            disabled={mergeLoading}
                            className="border-[var(--border)] text-[var(--text-main)]"
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleMerge}
                            disabled={mergeLoading || !mergeTargetDepartmentId}
                            className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
                        >
                            {mergeLoading ? 'Đang sáp nhập...' : 'Xác nhận sáp nhập'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Selective Transfer Employees Wizard */}
            {selectiveTransferSourceDepartment && (
                <SelectiveTransferEmployeesWizard
                    isOpen={isSelectiveTransferWizardOpen}
                    onClose={() => {
                        setIsSelectiveTransferWizardOpen(false);
                        setSelectiveTransferSourceDepartment(null);
                    }}
                    sourceDepartmentId={selectiveTransferSourceDepartment._id || selectiveTransferSourceDepartment.id}
                    sourceDepartmentName={selectiveTransferSourceDepartment.name}
                    sourceBranchId={selectiveTransferSourceDepartment.branchId as string}
                    onTransfer={handleSelectiveTransfer}
                />
            )}
        </div>
    );
}