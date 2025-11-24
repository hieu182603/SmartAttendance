import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  MapPin,
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  Briefcase,
  TrendingUp,
  ChevronRight,
  Globe,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../ui/dialog';
import { Label } from '../../ui/label';
import { Separator } from '../../ui/separator';
import { toast } from 'sonner';
import {
  getAllBranches,
  getBranchStats,
  createBranch,
  updateBranch,
  deleteBranch,
  type Branch as BranchType,
} from '../../../services/branchService';
import api from '../../../services/api';

interface Branch {
  id: string;
  _id?: string;
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  managerId: string | { _id: string; name: string; email: string };
  managerName: string;
  employeeCount: number;
  departmentCount: number;
  establishedDate: string;
  status: 'active' | 'inactive';
  timezone: string;
}

interface Manager {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    totalEmployees: 0,
    totalDepartments: 0,
    active: 0,
  });

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    country: 'Việt Nam',
    phone: '',
    email: '',
    managerId: '',
    timezone: 'GMT+7',
  });

  // Load data
  useEffect(() => {
    loadBranches();
    loadManagers();
    loadStats();
  }, []);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const response = await getAllBranches({ limit: 1000 });
      const branchesData = response.branches.map((branch: BranchType) => ({
        id: branch._id || branch.id || '',
        _id: branch._id,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        city: branch.city,
        country: branch.country,
        phone: branch.phone || '',
        email: branch.email || '',
        managerId: typeof branch.managerId === 'object' && branch.managerId ? branch.managerId._id : (typeof branch.managerId === 'string' ? branch.managerId : ''),
        managerName: typeof branch.managerId === 'object' && branch.managerId ? branch.managerId.name : (branch.managerName || ''),
        employeeCount: branch.employeeCount || 0,
        departmentCount: branch.departmentCount || 0,
        establishedDate: branch.establishedDate || new Date().toISOString().split('T')[0],
        status: branch.status,
        timezone: branch.timezone,
      }));
      setBranches(branchesData);
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Không thể tải danh sách chi nhánh');
    } finally {
      setLoading(false);
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
      const statsData = await getBranchStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Filter branches
  const filteredBranches = branches.filter(branch => {
    if (searchQuery && !branch.name.toLowerCase().includes(searchQuery.toLowerCase())
      && !branch.city.toLowerCase().includes(searchQuery.toLowerCase())
      && !branch.code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleOpenDialog = (mode: 'create' | 'edit', branch?: Branch) => {
    setDialogMode(mode);
    if (mode === 'edit' && branch) {
      setSelectedBranch(branch);
      setFormData({
        name: branch.name,
        code: branch.code,
        address: branch.address,
        city: branch.city,
        country: branch.country,
        phone: branch.phone || '',
        email: branch.email || '',
        managerId: typeof branch.managerId === 'string' ? branch.managerId : (branch.managerId as any)?._id || '',
        timezone: branch.timezone,
      });
    } else {
      setSelectedBranch(null);
      setFormData({
        name: '',
        code: '',
        address: '',
        city: '',
        country: 'Việt Nam',
        phone: '',
        email: '',
        managerId: '',
        timezone: 'GMT+7',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code || !formData.address || !formData.city || !formData.managerId) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      if (dialogMode === 'create') {
        await createBranch({
          name: formData.name,
          code: formData.code,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          managerId: formData.managerId,
          timezone: formData.timezone,
        });
        toast.success(`Đã tạo chi nhánh ${formData.name}`);
      } else if (selectedBranch) {
        await updateBranch(selectedBranch._id || selectedBranch.id, {
          name: formData.name,
          code: formData.code,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          managerId: formData.managerId,
          timezone: formData.timezone,
        });
        toast.success(`Đã cập nhật chi nhánh ${formData.name}`);
      }
      setIsDialogOpen(false);
      await loadBranches();
      await loadStats();
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (branch.code === 'HQ') {
      toast.error('Không thể xóa trụ sở chính');
      return;
    }
    if (confirm(`Bạn có chắc muốn xóa chi nhánh "${branch.name}"?`)) {
      try {
        await deleteBranch(branch._id || branch.id);
        toast.success(`Đã xóa chi nhánh ${branch.name}`);
        await loadBranches();
        await loadStats();
      } catch (error: any) {
        toast.error(error.message || 'Có lỗi xảy ra');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
            Quản lý chi nhánh
          </h1>
          <p className="text-[var(--text-sub)] mt-2">
            Quản lý các chi nhánh trên toàn quốc
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog('create')}
          className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Thêm chi nhánh
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
                  <p className="text-sm text-[var(--text-sub)]">Tổng chi nhánh</p>
                  <p className="text-3xl text-[var(--primary)] mt-2">{stats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-[var(--primary)]" />
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
                  <p className="text-sm text-[var(--text-sub)]">Phòng ban</p>
                  <p className="text-3xl text-[var(--warning)] mt-2">{stats.totalDepartments}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[var(--warning)]/20 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-[var(--warning)]" />
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
                  <p className="text-sm text-[var(--text-sub)]">Hoạt động</p>
                  <p className="text-3xl text-[var(--success)] mt-2">{stats.active}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[var(--success)]/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-[var(--success)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="p-6 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-sub)]" />
            <Input
              placeholder="Tìm kiếm chi nhánh theo tên, mã hoặc thành phố..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredBranches.map((branch, index) => (
          <motion.div
            key={branch.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)] transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] flex items-center justify-center text-white">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-[var(--text-main)]">{branch.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="border-[var(--border)] text-[var(--text-sub)]">
                            {branch.code}
                          </Badge>
                          <Badge className="bg-[var(--success)]/20 text-[var(--success)]">
                            {branch.status === 'active' ? 'Hoạt động' : 'Ngừng'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog('edit', branch)}
                      className="h-8 w-8 text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {branch.id !== 'HQ' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(branch)}
                        className="h-8 w-8 text-[var(--error)] hover:bg-[var(--error)]/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-[var(--accent-cyan)] mt-0.5 flex-shrink-0" />
                    <span className="text-[var(--text-sub)]">
                      {branch.address}, {branch.city}, {branch.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-[var(--accent-cyan)]" />
                    <span className="text-[var(--text-main)]">{branch.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-[var(--accent-cyan)]" />
                    <span className="text-[var(--text-main)]">{branch.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-[var(--accent-cyan)]" />
                    <span className="text-[var(--text-sub)]">Múi giờ: {branch.timezone}</span>
                  </div>
                </div>

                <Separator className="bg-[var(--border)]" />

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-[var(--text-sub)] text-xs mb-1">
                      <Users className="h-3 w-3" />
                      Nhân viên
                    </div>
                    <p className="text-xl text-[var(--accent-cyan)]">{branch.employeeCount}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-[var(--text-sub)] text-xs mb-1">
                      <Briefcase className="h-3 w-3" />
                      Phòng ban
                    </div>
                    <p className="text-xl text-[var(--warning)]">{branch.departmentCount}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-[var(--text-sub)] text-xs mb-1">
                      <Clock className="h-3 w-3" />
                      Thành lập
                    </div>
                    <p className="text-sm text-[var(--text-main)]">
                      {new Date(branch.establishedDate).getFullYear()}
                    </p>
                  </div>
                </div>

                <Separator className="bg-[var(--border)]" />

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <p className="text-[var(--text-sub)]">Giám đốc chi nhánh</p>
                    <p className="text-[var(--text-main)]">{branch.managerName}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--shell)]"
                    size="sm"
                    onClick={() => {
                      setSelectedBranch(branch);
                      setIsViewDialogOpen(true);
                    }}
                  >
                    Chi tiết
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
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
              {dialogMode === 'create' ? 'Thêm chi nhánh mới' : 'Chỉnh sửa chi nhánh'}
            </DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              {dialogMode === 'create' ? 'Điền thông tin chi nhánh mới' : 'Cập nhật thông tin chi nhánh'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[var(--text-main)]">Tên chi nhánh *</Label>
              <Input
                placeholder="Ví dụ: Chi nhánh Hà Nội"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[var(--text-main)]">Mã chi nhánh *</Label>
              <Input
                placeholder="Ví dụ: HN"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="text-[var(--text-main)]">Địa chỉ *</Label>
              <Input
                placeholder="Số nhà, tên đường, quận/huyện"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[var(--text-main)]">Thành phố *</Label>
              <Input
                placeholder="Ví dụ: Hà Nội"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[var(--text-main)]">Quốc gia *</Label>
              <Input
                placeholder="Việt Nam"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[var(--text-main)]">Số điện thoại</Label>
              <Input
                placeholder="+84 24 xxxx xxxx"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[var(--text-main)]">Email</Label>
              <Input
                type="email"
                placeholder="branch@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[var(--text-main)]">Giám đốc chi nhánh *</Label>
              <select
                value={formData.managerId}
                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-[var(--shell)] border border-[var(--border)] text-[var(--text-main)]"
              >
                <option value="">Chọn giám đốc</option>
                {managers.map(manager => (
                  <option key={manager.id} value={manager.id}>{manager.name} ({manager.role})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[var(--text-main)]">Múi giờ</Label>
              <Input
                placeholder="GMT+7"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
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
              {dialogMode === 'create' ? 'Tạo chi nhánh' : 'Cập nhật'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] max-w-7xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết chi nhánh</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              Xem đầy đủ thông tin và thống kê chi nhánh
            </DialogDescription>
          </DialogHeader>

          {selectedBranch && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between p-4 rounded-lg bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent-cyan)]/10 border border-[var(--primary)]/30">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl text-[var(--text-main)]">{selectedBranch.name}</h3>
                    <p className="text-sm text-[var(--text-sub)] mt-0.5">Mã: {selectedBranch.code}</p>
                    <Badge className={`mt-1 ${selectedBranch.status === 'active'
                      ? 'bg-[var(--success)]/20 text-[var(--success)]'
                      : 'bg-[var(--error)]/20 text-[var(--error)]'
                      }`}>
                      {selectedBranch.status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator className="bg-[var(--border)]" />

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3">
                <Card className="bg-[var(--shell)] border-[var(--border)]">
                  <CardContent className="p-3 text-center mt-3">
                    <Users className="h-6 w-6 text-[var(--accent-cyan)] mx-auto mb-1" />
                    <p className="text-xs text-[var(--text-sub)]">Nhân viên</p>
                    <p className="text-xl text-[var(--text-main)] mt-1">{selectedBranch.employeeCount}</p>
                  </CardContent>
                </Card>

                <Card className="bg-[var(--shell)] border-[var(--border)]">
                  <CardContent className="p-3 text-center mt-3">
                    <Briefcase className="h-6 w-6 text-[var(--warning)] mx-auto mb-1" />
                    <p className="text-xs text-[var(--text-sub)]">Phòng ban</p>
                    <p className="text-xl text-[var(--text-main)] mt-1">{selectedBranch.departmentCount}</p>
                  </CardContent>
                </Card>

                <Card className="bg-[var(--shell)] border-[var(--border)]">
                  <CardContent className="p-3 text-center mt-3">
                    <Clock className="h-6 w-6 text-[var(--primary)] mx-auto mb-1" />
                    <p className="text-xs text-[var(--text-sub)]">Ngày thành lập</p>
                    <p className="text-sm text-[var(--text-main)] mt-1">
                      {new Date(selectedBranch.establishedDate).toLocaleDateString('vi-VN')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-[var(--shell)] border-[var(--border)]">
                  <CardContent className="p-3 text-center mt-3">
                    <Globe className="h-6 w-6 text-[var(--success)] mx-auto mb-1" />
                    <p className="text-xs text-[var(--text-sub)]">Múi giờ</p>
                    <p className="text-lg text-[var(--text-main)] mt-1">{selectedBranch.timezone}</p>
                  </CardContent>
                </Card>
              </div>

              <Separator className="bg-[var(--border)]" />

              {/* Contact Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-3">
                  <h4 className="text-base text-[var(--text-main)] flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[var(--primary)]" />
                    Thông tin liên hệ
                  </h4>

                  <div className="space-y-2">
                    <div className="flex items-start space-x-2 p-2 rounded-lg bg-[var(--shell)]">
                      <MapPin className="h-4 w-4 text-[var(--accent-cyan)] mt-0.5" />
                      <div>
                        <p className="text-xs text-[var(--text-sub)]">Địa chỉ</p>
                        <p className="text-sm text-[var(--text-main)]">{selectedBranch.address}</p>
                        <p className="text-sm text-[var(--text-main)]">{selectedBranch.city}, {selectedBranch.country}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2 p-2 rounded-lg bg-[var(--shell)]">
                      <Phone className="h-4 w-4 text-[var(--accent-cyan)] mt-0.5" />
                      <div>
                        <p className="text-xs text-[var(--text-sub)]">Số điện thoại</p>
                        <p className="text-sm text-[var(--text-main)]">{selectedBranch.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2 p-2 rounded-lg bg-[var(--shell)]">
                      <Mail className="h-4 w-4 text-[var(--accent-cyan)] mt-0.5" />
                      <div>
                        <p className="text-xs text-[var(--text-sub)]">Email</p>
                        <p className="text-sm text-[var(--text-main)]">{selectedBranch.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-base text-[var(--text-main)] flex items-center gap-2">
                    <Users className="h-4 w-4 text-[var(--primary)]" />
                    Thông tin quản lý
                  </h4>

                  <div className="space-y-2">
                    <div className="flex items-start space-x-2 p-2 rounded-lg bg-[var(--shell)]">
                      <TrendingUp className="h-4 w-4 text-[var(--warning)] mt-0.5" />
                      <div>
                        <p className="text-xs text-[var(--text-sub)]">Giám đốc chi nhánh</p>
                        <p className="text-sm text-[var(--text-main)]">{selectedBranch.managerName}</p>
                        <p className="text-xs text-[var(--text-sub)] truncate">ID: {typeof selectedBranch.managerId === 'string' ? selectedBranch.managerId : (selectedBranch.managerId as any)?._id || ''}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2 p-2 rounded-lg bg-[var(--shell)]">
                      <Building2 className="h-4 w-4 text-[var(--primary)] mt-0.5" />
                      <div>
                        <p className="text-xs text-[var(--text-sub)]">Loại chi nhánh</p>
                        <p className="text-sm text-[var(--text-main)]">
                          {selectedBranch.id === 'HQ' ? 'Trụ sở chính' : 'Chi nhánh'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2 p-2 rounded-lg bg-[var(--shell)]">
                      <CheckCircle2 className="h-4 w-4 text-[var(--success)] mt-0.5" />
                      <div>
                        <p className="text-xs text-[var(--text-sub)]">Trạng thái</p>
                        <p className="text-sm text-[var(--text-main)]">
                          {selectedBranch.status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-base text-[var(--text-main)] flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[var(--primary)]" />
                    Hiệu suất hoạt động
                  </h4>

                  <div className="p-3 rounded-lg bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent-cyan)]/10 border border-[var(--primary)]/30">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-[var(--primary)]" />
                      <p className="text-sm text-[var(--text-main)] font-medium">Tổng quan</p>
                    </div>
                    <p className="text-xs text-[var(--text-sub)]">
                      Chi nhánh đang quản lý {selectedBranch.employeeCount} nhân viên và {selectedBranch.departmentCount} phòng ban
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      handleOpenDialog('edit', selectedBranch);
                    }}
                    className="w-full border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/10"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Chỉnh sửa chi nhánh
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