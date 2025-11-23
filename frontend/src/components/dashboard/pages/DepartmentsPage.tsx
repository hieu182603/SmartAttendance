import { useState } from 'react';
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
    ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../ui/dialog';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Separator } from '../../ui/separator';
import { toast } from 'sonner';
import { Textarea } from '../../ui/textarea';


interface Department {
    id: string;
    name: string;
    code: string;
    description: string;
    branchId: string;
    branchName: string;
    managerId: string;
    managerName: string;
    employeeCount: number;
    activeEmployees: number;
    budget: number;
    createdAt: string;
    status: 'active' | 'inactive';
}

export function DepartmentsPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBranch, setFilterBranch] = useState('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        branchId: '',
        managerId: '',
        budget: '',
    });

    // Filter departments
    const filteredDepartments = departments.filter(dept => {
        if (searchQuery && !dept.name.toLowerCase().includes(searchQuery.toLowerCase())
            && !dept.code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterBranch !== 'all' && dept.branchId !== filterBranch) return false;
        return true;
    });

    // Stats
    const stats = {
        total: departments.length,
        totalEmployees: departments.reduce((sum, d) => sum + d.employeeCount, 0),
        activeEmployees: departments.reduce((sum, d) => sum + d.activeEmployees, 0),
        totalBudget: departments.reduce((sum, d) => sum + d.budget, 0),
    };

    const handleOpenDialog = (mode: 'create' | 'edit', department?: Department) => {
        setDialogMode(mode);
        if (mode === 'edit' && department) {
            setSelectedDepartment(department);
            setFormData({
                name: department.name,
                code: department.code,
                description: department.description,
                branchId: department.branchId,
                managerId: department.managerId,
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

    const handleSubmit = () => {
        if (!formData.name || !formData.code || !formData.branchId || !formData.managerId) {
            toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        // TODO: Replace with API calls to get branch and manager names
        // const branch = mockBranches.find(b => b.id === formData.branchId);
        // const manager = mockManagers.find(m => m.id === formData.managerId);

        if (dialogMode === 'create') {
            const newDepartment: Department = {
                id: `DEPT${String(departments.length + 1).padStart(3, '0')} `,
                name: formData.name,
                code: formData.code,
                description: formData.description,
                branchId: formData.branchId,
                branchName: formData.branchId, // TODO: Get from API
                managerId: formData.managerId,
                managerName: formData.managerId, // TODO: Get from API
                employeeCount: 0,
                activeEmployees: 0,
                budget: parseInt(formData.budget) || 0,
                createdAt: new Date().toISOString().split('T')[0],
                status: 'active',
            };
            setDepartments([...departments, newDepartment]);
            toast.success(`Đã tạo phòng ban ${formData.name} `);
        } else if (selectedDepartment) {
            const updatedDepartments = departments.map(dept =>
                dept.id === selectedDepartment.id
                    ? {
                        ...dept,
                        name: formData.name,
                        code: formData.code,
                        description: formData.description,
                        branchId: formData.branchId,
                        branchName: formData.branchId, // TODO: Get from API
                        managerId: formData.managerId,
                        managerName: formData.managerId, // TODO: Get from API
                        budget: parseInt(formData.budget) || dept.budget,
                    }
                    : dept
            );
            setDepartments(updatedDepartments);
            toast.success(`Đã cập nhật phòng ban ${formData.name} `);
        }

        setIsDialogOpen(false);
    };

    const handleDelete = (department: Department) => {
        if (confirm(`Bạn có chắc muốn xóa phòng ban "${department.name}" ? `)) {
            setDepartments(departments.filter(d => d.id !== department.id));
            toast.success(`🗑️ Đã xóa phòng ban ${department.name} `);
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
                        Quản lý phòng ban
                    </h1>
                    <p className="text-[var(--text-sub)] mt-2">
                        Quản lý các phòng ban trong công ty
                    </p>
                </div>
                <Button
                    onClick={() => handleOpenDialog('create')}
                    className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm phòng ban
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
                                    <p className="text-sm text-[var(--text-sub)]">Tổng phòng ban</p>
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
                                    <p className="text-sm text-[var(--text-sub)]">Tổng nhân viên</p>
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
                                    <p className="text-sm text-[var(--text-sub)]">Tổng ngân sách</p>
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
                                    placeholder="Tìm kiếm phòng ban..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
                                />
                            </div>
                        </div>
                        <Select value={filterBranch} onValueChange={setFilterBranch}>
                            <SelectTrigger className="w-full md:w-[200px] bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                                <SelectValue placeholder="Chi nhánh" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả chi nhánh</SelectItem>
                                {/* TODO: Replace with API call to get branches */}
                                {/* {mockBranches.map(branch => (
                                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                                ))} */}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Departments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDepartments.map((department, index) => (
                    <motion.div
                        key={department.id}
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

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {dialogMode === 'create' ? 'Thêm phòng ban mới' : 'Chỉnh sửa phòng ban'}
                        </DialogTitle>
                        <DialogDescription className="text-[var(--text-sub)]">
                            {dialogMode === 'create' ? 'Điền thông tin phòng ban mới' : 'Cập nhật thông tin phòng ban'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[var(--text-main)]">Tên phòng ban *</Label>
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
                            <Label className="text-[var(--text-main)]">Chi nhánh *</Label>
                            <Select value={formData.branchId} onValueChange={(v) => setFormData({ ...formData, branchId: v })}>
                                <SelectTrigger className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                                    <SelectValue placeholder="Chọn chi nhánh" />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* TODO: Replace with API call to get branches */}
                                    {/* {mockBranches.map(branch => (
                                        <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                                    ))} */}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[var(--text-main)]">Trưởng phòng *</Label>
                            <Select value={formData.managerId} onValueChange={(v) => setFormData({ ...formData, managerId: v })}>
                                <SelectTrigger className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                                    <SelectValue placeholder="Chọn trưởng phòng" />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* TODO: Replace with API call to get managers */}
                                    {/* {mockManagers.map(manager => (
                                        <SelectItem key={manager.id} value={manager.id}>{manager.name}</SelectItem>
                                    ))} */}
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
                            Hủy
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
                        >
                            {dialogMode === 'create' ? 'Tạo phòng ban' : 'Cập nhật'}
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
                                            {selectedDepartment.status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động'}
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
                                        <p className="text-sm text-[var(--text-sub)]">Tổng nhân viên</p>
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
                                    <p className="text-sm text-[var(--text-sub)]">Quản lý</p>
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