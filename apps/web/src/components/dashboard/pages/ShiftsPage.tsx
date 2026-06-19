import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Clock, Users, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '@/services/api';
import shiftService from '@/services/shiftService';
import { getDepartmentsList, type DepartmentListResponse } from '@/services/departmentService';
import { getAllUsers } from '@/services/userService';
import { useTranslation } from 'react-i18next';
import { SuperAdminCompanyFilterSlot } from '@/components/dashboard/SuperAdminCompanyFilterSlot';

interface Shift {
  _id?: string;
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  isActive?: boolean;
  employees?: number;
  color?: string;
  employeeCountByDay?: number[];
  effectiveFrom?: string;
  effectiveTo?: string;
  employeeCount?: number;
  isFlexible?: boolean;
  workDays?: number[];
  description?: string;
}

interface SimpleDepartment {
  _id: string;
  name: string;
  code: string;
}

interface SimpleUser {
  _id: string;
  name?: string;
  email?: string;
  departmentId?: string;
}

const toggleArrayValue = (arr: string[], value: string) => {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
};

const getColorClass = (color: string) => {
  const colors: Record<string, string> = {
    success: 'bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30',
    warning: 'bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30',
    error: 'bg-[var(--error)]/20 text-[var(--error)] border-[var(--error)]/30',
    primary: 'bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/30',
  };
  return colors[color] || colors.primary;
};

function calculateWorkHours(start: string, end: string, breakMinutes: number): string {
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);

  let startTotal = startHour * 60 + startMin;
  let endTotal = endHour * 60 + endMin;

  if (endTotal < startTotal) {
    endTotal += 24 * 60;
  }

  const workMinutes = endTotal - startTotal - breakMinutes;
  const hours = Math.floor(workMinutes / 60);
  const minutes = workMinutes % 60;

  return `${hours}h ${minutes}m`;
}

export function ShiftsPage() {
  const { t } = useTranslation();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    breakDuration: '',
    description: '',
    workDays: [1, 2, 3, 4, 5, 6] as number[],
  });

  // Gán ca
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignShift, setAssignShift] = useState<Shift | null>(null);
  const [departments, setDepartments] = useState<SimpleDepartment[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [assignForm, setAssignForm] = useState({
    departmentIds: [] as string[],
    userIds: [] as string[],
    pattern: "weekdays",
    daysOfWeek: [1, 2, 3, 4, 5] as number[],
    effectiveFrom: "",
    effectiveTo: "",
    specificDatesText: "",
  });
  const [deptSearch, setDeptSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [assignedUserSearch, setAssignedUserSearch] = useState("");
  const [assignedPatternFilter, setAssignedPatternFilter] = useState("all_patterns");
  const [isAssignSubmitting, setIsAssignSubmitting] = useState(false);
  const [assignedEmployees, setAssignedEmployees] = useState<any[]>([]);
  const [selectedUsersToRemove, setSelectedUsersToRemove] = useState<string[]>([]);

  useEffect(() => {
    loadShifts();
  }, []);

  // Load departments & users dùng cho dialog gán ca
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [deptRes, usersRes] = await Promise.all([
          getDepartmentsList(),
          getAllUsers({ page: 1, limit: 500 }) as Promise<{
            users?: SimpleUser[];
          }>,
        ]);

        const deptList =
          (deptRes as DepartmentListResponse).departments?.map((d) => ({
            _id: d._id,
            name: d.name,
            code: d.code,
          })) || [];

        const userList = (usersRes.users || []).map((u: any) => ({
          _id: u._id as string,
          name: u.name,
          email: u.email,
          departmentId: u.department?._id || u.department || null,
        }));

        setDepartments(deptList);
        setUsers(userList);
      } catch (error) {
        console.error("[ShiftsPage] Failed to load departments/users for assignment", error);
      }
    };

    // Chỉ load một lần khi mở dialog lần đầu
    if (isAssignDialogOpen && departments.length === 0 && users.length === 0) {
      loadMeta();
    }
  }, [isAssignDialogOpen, departments.length, users.length]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/shifts');

      const shiftsData = response.data.data || response.data.shifts || response.data || [];

      const mappedShifts = shiftsData.map((shift: any, index: number) => ({
        ...shift,
        id: shift._id || shift.id,
        employees: shift.employeeCount || 0,
        color: ['success', 'warning', 'error', 'primary'][index % 4],
      }));

      setShifts(mappedShifts);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        t('dashboard:shifts.loadError');
      toast.error(errorMessage);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.startTime || !formData.endTime || !formData.breakDuration) {
      toast.error(t('dashboard:shifts.fillAllFields'));
      return;
    }

    try {
      const payload = {
        name: formData.name,
        startTime: formData.startTime,
        endTime: formData.endTime,
        breakDuration: Number(formData.breakDuration),
        description: formData.description,
        workDays: formData.workDays,
      };
      
      const newShift = await shiftService.createShift(payload);
      toast.success(`✅ Đã tạo ca làm việc ${formData.name}`);
      setIsDialogOpen(false);
      setFormData({ name: '', startTime: '', endTime: '', breakDuration: '', description: '', workDays: [1, 2, 3, 4, 5, 6] });
      await loadShifts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi tạo ca làm việc';
      toast.error(errorMessage);
    }
  };

  const handleEditShift = (shift: Shift) => {
    setSelectedShift(shift);
    setFormData({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDuration: shift.breakDuration?.toString() || '0',
      description: shift.description || '',
      workDays: shift.workDays || [1, 2, 3, 4, 5, 6],
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenAssign = async (shift: Shift) => {
    setAssignShift(shift);
    
    try {
      const response = await shiftService.getEmployeesByShift(shift._id || shift.id!, { limit: 500 });
      if (response && response.users) {
        setAssignedEmployees(response.users);
      } else {
        setAssignedEmployees([]);
      }
    } catch (error) {
      console.error("Failed to load existing employees for shift", error);
      setAssignedEmployees([]);
    }

    setAssignForm({
      departmentIds: [],
      userIds: [],
      pattern: "weekdays",
      daysOfWeek: [1, 2, 3, 4, 5],
      effectiveFrom: "",
      effectiveTo: "",
      specificDatesText: "",
    });
    setAssignedUserSearch("");
    setAssignedPatternFilter("all_patterns");
    setSelectedUsersToRemove([]);
    setIsAssignDialogOpen(true);
  };

  const handleRemoveAssignedUser = async (userId: string) => {
    if (!assignShift) return;
    try {
      await shiftService.removeShiftFromEmployee(userId, assignShift._id || assignShift.id!);
      setAssignedEmployees(prev => prev.filter(u => u._id !== userId));
      setSelectedUsersToRemove(prev => prev.filter(id => id !== userId));
      toast.success("Đã gỡ nhân viên khỏi ca");
    } catch (error) {
      toast.error("Lỗi khi gỡ nhân viên");
    }
  };

  const handleBulkRemoveAssignedUsers = async () => {
    if (!assignShift || selectedUsersToRemove.length === 0) return;
    try {
      const loadingToastId = toast.loading("Đang gỡ danh sách nhân viên...");
      await shiftService.bulkRemoveShiftFromEmployees(selectedUsersToRemove, assignShift._id || assignShift.id!);
      setAssignedEmployees(prev => prev.filter(u => !selectedUsersToRemove.includes(u._id)));
      setSelectedUsersToRemove([]);
      toast.dismiss(loadingToastId);
      toast.success("Đã gỡ danh sách nhân viên khỏi ca");
    } catch (error) {
      toast.error("Lỗi khi gỡ nhân viên");
    }
  };

  const handleSubmitAssign = async () => {
    if (!assignShift) return;

    if (
      assignForm.departmentIds.length === 0 &&
      assignForm.userIds.length === 0
    ) {
      toast.error("Vui lòng chọn ít nhất một phòng ban hoặc nhân viên");
      return;
    }

    const payload: any = {
      departmentIds: [],
      userIds: assignForm.userIds,
      pattern: assignForm.pattern,
    };

    if (assignForm.effectiveFrom) payload.effectiveFrom = assignForm.effectiveFrom;
    if (assignForm.effectiveTo) payload.effectiveTo = assignForm.effectiveTo;

    if (assignForm.pattern === "custom") {
      if (assignForm.daysOfWeek.length === 0) {
        toast.error("Vui lòng chọn ít nhất một ngày trong tuần");
        return;
      }
      payload.daysOfWeek = assignForm.daysOfWeek;
    }

    if (assignForm.pattern === "specific") {
      const dates = assignForm.specificDatesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (dates.length === 0) {
        toast.error("Vui lòng nhập ít nhất một ngày cụ thể (YYYY-MM-DD)");
        return;
      }
      payload.pattern = "specific";
      payload.specificDates = dates;
    }

    try {
      setIsAssignSubmitting(true);
      const loadingToastId = toast.loading("Đang gán ca cho nhân viên/phòng ban...");

      await shiftService.assignShiftToDepartments(assignShift._id || assignShift.id!, payload);

      toast.dismiss(loadingToastId);
      toast.success("Đã gán ca làm việc thành công");
      setIsAssignDialogOpen(false);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error.message || "Không thể gán ca làm việc";
      toast.error(errorMessage);
    } finally {
      setIsAssignSubmitting(false);
    }
  };

  const renderPatternBadge = (user: any) => {
    if (!user.assignmentPattern) return <Badge variant="outline" className="text-[var(--text-sub)]">Mặc định</Badge>;
    
    let text = "Tất cả các ngày";
    if (user.assignmentPattern === "weekdays") text = "Thứ 2 - Thứ 6";
    else if (user.assignmentPattern === "weekends") text = "Cuối tuần";
    else if (user.assignmentPattern === "custom") {
      const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      text = user.assignmentDays?.map((d: number) => days[d]).join(", ") || "Tùy chỉnh";
    }

    let dateText = "";
    if (user.effectiveFrom || user.effectiveTo) {
      const from = user.effectiveFrom ? new Date(user.effectiveFrom).toLocaleDateString("vi-VN") : "...";
      const to = user.effectiveTo ? new Date(user.effectiveTo).toLocaleDateString("vi-VN") : "...";
      if (from !== "..." || to !== "...") {
        dateText = `(${from} - ${to})`;
      }
    }

    return (
      <div className="flex flex-col gap-1 items-start">
        <Badge variant="outline" className="bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20 font-medium">
          {text}
        </Badge>
        {dateText && <span className="text-xs text-[var(--text-sub)]">{dateText}</span>}
      </div>
    );
  };

  const handleSubmitEdit = async () => {
    if (!selectedShift) return;

    if (!formData.name || !formData.startTime || !formData.endTime || !formData.breakDuration) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      const shiftId = selectedShift._id || selectedShift.id;
      const payload = {
        name: formData.name,
        startTime: formData.startTime,
        endTime: formData.endTime,
        breakDuration: Number(formData.breakDuration),
        description: formData.description,
        workDays: formData.workDays,
      };

      const updatedShift = await shiftService.updateShift(selectedShift._id!, payload);
      toast.success(`✅ Đã cập nhật ca làm việc ${formData.name}`);
      setIsEditDialogOpen(false);
      setSelectedShift(null);
      await loadShifts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi cập nhật ca làm việc';
      toast.error(errorMessage);
    }
  };

  const handleDeleteShift = (shift: Shift) => {
    setSelectedShift(shift);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedShift) return;

    try {
      const shiftId = selectedShift._id || selectedShift.id;
      await api.delete(`/shifts/${shiftId}`);
      toast.success(`🗑️ Đã xóa ca làm việc ${selectedShift.name}`);
      setIsDeleteDialogOpen(false);
      setSelectedShift(null);
      await loadShifts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi xóa ca làm việc';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--text-sub)]">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl text-[var(--text-main)]">
            {t('dashboard:shifts.title')}
          </h1>
          <p className="text-[var(--text-sub)]">
            {t('dashboard:shifts.description')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:ml-auto">
          <SuperAdminCompanyFilterSlot />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Tạo ca mới
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
            <DialogHeader>
              <DialogTitle>Tạo ca làm việc mới</DialogTitle>
              <DialogDescription className="text-[var(--text-sub)]">
                Nhập thông tin ca làm việc
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Tên ca</Label>
                <Input
                  placeholder="Ca sáng"
                  className="bg-[var(--input-bg)] border-[var(--border)]"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Giờ bắt đầu</Label>
                  <Input
                    type="time"
                    className="bg-[var(--input-bg)] border-[var(--border)]"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giờ kết thúc</Label>
                  <Input
                    type="time"
                    className="bg-[var(--input-bg)] border-[var(--border)]"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Thời gian nghỉ (phút)</Label>
                <Input
                  type="number"
                  placeholder="60"
                  className="bg-[var(--input-bg)] border-[var(--border)]"
                  value={formData.breakDuration}
                  onChange={(e) => setFormData({ ...formData, breakDuration: e.target.value })}
                />
              </div>


              <div className="space-y-2">
                <Label>Mô tả (tùy chọn)</Label>
                <Input
                  placeholder="Mô tả về ca làm việc"
                  className="bg-[var(--input-bg)] border-[var(--border)]"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="border-[var(--border)] text-[var(--text-main)]"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleCreate}
                  className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]"
                >
                  Tạo ca làm
                </Button>
              </div>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Shift Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shifts.map((shift) => (
          <Card key={shift.id || shift._id} className="bg-[var(--surface)] border-[var(--border)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-xl ${getColorClass(shift.color || 'primary')}`}>
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-[var(--text-main)]">{shift.name}</CardTitle>
                    <p className="text-sm text-[var(--text-sub)]">
                      {shift.startTime} - {shift.endTime}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAssign(shift)}
                    className="p-2 hover:bg-[var(--shell)] rounded text-[var(--accent-cyan)]"
                    title="Gán ca cho nhân viên/phòng ban"
                  >
                    <Users className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditShift(shift)}
                    className="p-2 hover:bg-[var(--shell)] rounded text-[var(--primary)]"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteShift(shift)}
                    className="p-2 hover:bg-[var(--shell)] rounded text-[var(--error)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">Thời gian làm việc</p>
                  <p className="text-lg text-[var(--text-main)]">
                    {calculateWorkHours(shift.startTime, shift.endTime, shift.breakDuration || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-sub)]">Thời gian nghỉ</p>
                  <p className="text-lg text-[var(--text-main)]">{shift.breakDuration || 0} phút</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-sub)]">Số nhân viên</p>
                  <p className="text-lg text-[var(--text-main)]">{shift.employees || 0} người</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-sub)]">Trạng thái</p>
                  <Badge className={shift.isActive !== false ? "bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30" : "bg-[var(--error)]/20 text-[var(--error)] border-[var(--error)]/30"}>
                    {shift.isActive !== false ? 'Hoạt động' : 'Ngừng hoạt động'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Schedule */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-main)]">Lịch tuần này</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--shell)]">
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">Ca làm</th>
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">T2</th>
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">T3</th>
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">T4</th>
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">T5</th>
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">T6</th>
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">T7</th>
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">CN</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => {
                  const counts = shift.employeeCountByDay || [0, 0, 0, 0, 0, 0, 0];
                  return (
                    <tr key={shift.id || shift._id} className="border-b border-[var(--border)] hover:bg-[var(--shell)]">
                      <td className="py-3 px-4 text-[var(--text-main)]">{shift.name}</td>
                      <td className="py-3 px-4 text-center text-[var(--text-sub)]">{counts[1] || 0}</td>
                      <td className="py-3 px-4 text-center text-[var(--text-sub)]">{counts[2] || 0}</td>
                      <td className="py-3 px-4 text-center text-[var(--text-sub)]">{counts[3] || 0}</td>
                      <td className="py-3 px-4 text-center text-[var(--text-sub)]">{counts[4] || 0}</td>
                      <td className="py-3 px-4 text-center text-[var(--text-sub)]">{counts[5] || 0}</td>
                      <td className="py-3 px-4 text-center text-[var(--text-sub)]">{counts[6] || 0}</td>
                      <td className="py-3 px-4 text-center text-[var(--text-sub)]">{counts[0] || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa ca làm việc</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              Cập nhật thông tin ca làm việc {selectedShift?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Tên ca</Label>
              <Input
                placeholder="Ca sáng"
                className="bg-[var(--input-bg)] border-[var(--border)]"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Giờ bắt đầu</Label>
                <Input
                  type="time"
                  className="bg-[var(--input-bg)] border-[var(--border)]"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Giờ kết thúc</Label>
                <Input
                  type="time"
                  className="bg-[var(--input-bg)] border-[var(--border)]"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Thời gian nghỉ (phút)</Label>
              <Input
                type="number"
                placeholder="60"
                className="bg-[var(--input-bg)] border-[var(--border)]"
                value={formData.breakDuration}
                onChange={(e) => setFormData({ ...formData, breakDuration: e.target.value })}
              />
            </div>


            <div className="space-y-2">
              <Label>Mô tả (tùy chọn)</Label>
              <Input
                placeholder="Mô tả về ca làm việc"
                className="bg-[var(--input-bg)] border-[var(--border)]"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="border-[var(--border)] text-[var(--text-main)]"
              >
                Hủy
              </Button>
              <Button
                onClick={handleSubmitEdit}
                className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]"
              >
                Cập nhật
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa ca làm việc</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              Bạn có chắc chắn muốn xóa ca làm việc này?
            </DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <div className="py-4">
              <div className="p-4 bg-[var(--shell)] rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-xl ${getColorClass(selectedShift.color || 'primary')}`}>
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[var(--text-main)]">{selectedShift.name}</p>
                    <p className="text-sm text-[var(--text-sub)]">
                      {selectedShift.startTime} - {selectedShift.endTime}
                    </p>
                    <p className="text-xs text-[var(--text-sub)]">
                      {selectedShift.employees || 0} nhân viên
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[var(--error)] text-sm mt-4">
                ⚠️ Hành động này sẽ ảnh hưởng đến {selectedShift.employees || 0} nhân viên đang trong ca này.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-[var(--border)] text-[var(--text-main)]"
            >
              Hủy
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-[var(--error)] hover:bg-[var(--error)]/90 text-white"
            >
              Xóa ca làm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] max-w-4xl">
          <DialogHeader>
            <DialogTitle>Quản lý Thành viên Ca làm việc</DialogTitle>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-[var(--text-sub)]">Xem nhân viên hoặc gán ca cho: </span>
              <select 
                className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] text-sm rounded px-2 py-1 outline-none focus:border-[var(--primary)] transition-colors"
                value={assignShift?._id || assignShift?.id || ""}
                onChange={(e) => {
                  const shift = shifts.find(s => (s._id || s.id) === e.target.value);
                  if (shift) handleOpenAssign(shift);
                }}
              >
                {shifts.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </DialogHeader>

          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-[var(--shell)] border border-[var(--border)]">
              <TabsTrigger value="list" className="data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--primary)] text-[var(--text-main)]">Danh sách đã gán ({assignedEmployees.length})</TabsTrigger>
              <TabsTrigger value="assign" className="data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--primary)] text-[var(--text-main)]">Thêm mới / Cập nhật</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list">
              <div className="mb-4 flex flex-col sm:flex-row items-center gap-3 w-full">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-sub)]" />
                  <Input
                    placeholder="Tìm kiếm theo tên hoặc email..."
                    value={assignedUserSearch}
                    onChange={e => setAssignedUserSearch(e.target.value)}
                    className="pl-9 bg-[var(--input-bg)] border-[var(--border)] w-full h-10"
                  />
                </div>
                <select
                  className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] text-sm rounded-md px-3 h-10 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors w-full sm:w-[220px]"
                  value={assignedPatternFilter}
                  onChange={e => setAssignedPatternFilter(e.target.value)}
                >
                  <option value="all_patterns">Tất cả lịch làm việc</option>
                  <option value="all">Mặc định / Tất cả các ngày</option>
                  <option value="weekdays">Thứ 2 - Thứ 6</option>
                  <option value="weekends">Cuối tuần</option>
                  <option value="custom">Tùy chỉnh</option>
                </select>
                {selectedUsersToRemove.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="ml-auto flex items-center gap-2"
                    onClick={handleBulkRemoveAssignedUsers}
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa {selectedUsersToRemove.length} nhân viên
                  </Button>
                )}
              </div>
              <div className="border border-[var(--border)] rounded-md h-[440px] overflow-y-auto bg-[var(--surface)]">
                {assignedEmployees.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-[var(--shell)]">
                      <TableRow className="border-[var(--border)] hover:bg-transparent">
                        <TableHead className="w-[40px]">
                          <input 
                            type="checkbox"
                            className="rounded border-[var(--border)] bg-transparent checked:bg-[var(--primary)]"
                            checked={
                              assignedEmployees.length > 0 && 
                              selectedUsersToRemove.length === assignedEmployees.filter(u => {
                                let matchesSearch = true;
                                if (assignedUserSearch.trim()) {
                                  const q = assignedUserSearch.toLowerCase();
                                  matchesSearch = (u.name?.toLowerCase() || "").includes(q) || (u.email?.toLowerCase() || "").includes(q);
                                }
                                let matchesPattern = true;
                                if (assignedPatternFilter !== "all_patterns") {
                                  const p = u.assignmentPattern || "all";
                                  matchesPattern = p === assignedPatternFilter;
                                }
                                return matchesSearch && matchesPattern;
                              }).length
                            }
                            onChange={(e) => {
                              const filteredUsers = assignedEmployees.filter(u => {
                                let matchesSearch = true;
                                if (assignedUserSearch.trim()) {
                                  const q = assignedUserSearch.toLowerCase();
                                  matchesSearch = (u.name?.toLowerCase() || "").includes(q) || (u.email?.toLowerCase() || "").includes(q);
                                }
                                let matchesPattern = true;
                                if (assignedPatternFilter !== "all_patterns") {
                                  const p = u.assignmentPattern || "all";
                                  matchesPattern = p === assignedPatternFilter;
                                }
                                return matchesSearch && matchesPattern;
                              });

                              if (e.target.checked) {
                                setSelectedUsersToRemove(filteredUsers.map(u => u._id));
                              } else {
                                setSelectedUsersToRemove([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead className="text-[var(--text-sub)]">Nhân viên</TableHead>
                        <TableHead className="text-[var(--text-sub)]">Email / Tài khoản</TableHead>
                        <TableHead className="text-[var(--text-sub)]">Lịch làm việc & Thời gian</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedEmployees
                        .filter(u => {
                          let matchesSearch = true;
                          if (assignedUserSearch.trim()) {
                            const q = assignedUserSearch.toLowerCase();
                            matchesSearch = (u.name?.toLowerCase() || "").includes(q) || (u.email?.toLowerCase() || "").includes(q);
                          }
                          
                          let matchesPattern = true;
                          if (assignedPatternFilter !== "all_patterns") {
                            const p = u.assignmentPattern || "all";
                            matchesPattern = p === assignedPatternFilter;
                          }
                          
                          return matchesSearch && matchesPattern;
                        })
                        .map((user) => (
                        <TableRow key={user._id} className="border-[var(--border)] hover:bg-[var(--shell)]">
                          <TableCell>
                            <input 
                              type="checkbox"
                              className="rounded border-[var(--border)] bg-transparent checked:bg-[var(--primary)]"
                              checked={selectedUsersToRemove.includes(user._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsersToRemove(prev => [...prev, user._id]);
                                } else {
                                  setSelectedUsersToRemove(prev => prev.filter(id => id !== user._id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-[var(--text-main)]">{user.name}</TableCell>
                          <TableCell className="text-[var(--text-sub)]">{user.email || user.username || '---'}</TableCell>
                          <TableCell>{renderPatternBadge(user)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--text-sub)]">
                    <Users className="h-12 w-12 text-[var(--text-sub)] mb-2 opacity-50" />
                    <p>Chưa có nhân viên nào được gán vào ca này.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="assign">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Departments */}
            <div className="space-y-3">
              <h3 className="font-medium text-[var(--text-main)] flex items-center gap-2">
                Phòng ban
              </h3>
              <Input
                placeholder="Tìm theo tên hoặc mã phòng ban..."
                className="bg-[var(--input-bg)] border-[var(--border)] text-sm"
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
              />
              <div className="border border-[var(--border)] rounded-md h-56 overflow-y-auto p-2 space-y-1 bg-[var(--shell)]">
                {departments
                  .filter((dept) => {
                    if (!deptSearch.trim()) return true;
                    const q = deptSearch.toLowerCase();
                    return (
                      dept.name.toLowerCase().includes(q) ||
                      dept.code.toLowerCase().includes(q)
                    );
                  })
                  .map((dept) => {
                    const deptUsers = users.filter((u) => u.departmentId === dept._id);
                    const checked =
                      deptUsers.length > 0 &&
                      deptUsers.every((u) => assignForm.userIds.includes(u._id));

                    const handleDeptChange = () => {
                      if (checked) {
                        setAssignForm((prev) => ({
                          ...prev,
                          userIds: prev.userIds.filter(
                            (id) => !deptUsers.some((u) => u._id === id)
                          ),
                        }));
                      } else {
                        setAssignForm((prev) => {
                          const newUserIds = [...prev.userIds];
                          deptUsers.forEach((u) => {
                            if (!newUserIds.includes(u._id)) newUserIds.push(u._id);
                          });
                          return { ...prev, userIds: newUserIds };
                        });
                      }
                    };

                    return (
                      <label
                        key={dept._id}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--surface)] cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          className="accent-[var(--accent-cyan)]"
                          checked={checked}
                          onChange={handleDeptChange}
                        />
                        <span className="text-[var(--text-main)]">
                          {dept.name} ({dept.code})
                        </span>
                      </label>
                    );
                  })}
                {departments.length === 0 && (
                  <p className="text-xs text-[var(--text-sub)] px-2 py-1">
                    Không tìm thấy phòng ban.
                  </p>
                )}
              </div>
            </div>

            {/* Users */}
            <div className="space-y-3">
              <h3 className="font-medium text-[var(--text-main)] flex items-center gap-2">
                Nhân viên
              </h3>
              <Input
                placeholder="Tìm theo tên hoặc email nhân viên..."
                className="bg-[var(--input-bg)] border-[var(--border)] text-sm"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <div className="border border-[var(--border)] rounded-md h-56 overflow-y-auto p-2 space-y-1 bg-[var(--shell)]">
                {users
                  .filter((user) => {
                    if (!userSearch.trim()) return true;
                    const q = userSearch.toLowerCase();
                    const name = user.name || "";
                    const email = user.email || "";
                    return (
                      name.toLowerCase().includes(q) ||
                      email.toLowerCase().includes(q)
                    );
                  })
                  .map((user) => {
                    const checked = assignForm.userIds.includes(user._id);
                    return (
                      <label
                        key={user._id}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--surface)] cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          className="accent-[var(--accent-cyan)]"
                          checked={checked}
                          onChange={() =>
                            setAssignForm((prev) => ({
                              ...prev,
                              userIds: toggleArrayValue(prev.userIds, user._id),
                            }))
                          }
                        />
                        <span className="text-[var(--text-main)]">
                          {user.name || user.email || user._id}
                        </span>
                      </label>
                    );
                  })}
                {users.length === 0 && (
                  <p className="text-xs text-[var(--text-sub)] px-2 py-1">
                    Không tìm thấy nhân viên.
                  </p>
                )}
              </div>
            </div>

            {/* Pattern & dates */}
            <div className="space-y-4 md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Lịch làm việc</Label>
                  <select
                    className="w-full bg-[var(--input-bg)] border-[var(--border)] rounded-md px-3 py-2 text-sm"
                    value={assignForm.pattern}
                    onChange={(e) =>
                      setAssignForm((prev) => ({
                        ...prev,
                        pattern: e.target.value,
                      }))
                    }
                  >
                    <option value="weekdays">Thứ 2 - Thứ 6</option>
                    <option value="weekends">Cuối tuần (T7, CN)</option>
                    <option value="all">Tất cả các ngày</option>
                    <option value="custom">Tùy chỉnh ngày</option>
                    <option value="specific">Ngày cụ thể</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Từ ngày</Label>
                  <Input
                    type="date"
                    className="bg-[var(--input-bg)] border-[var(--border)]"
                    value={assignForm.effectiveFrom}
                    onChange={(e) =>
                      setAssignForm((prev) => ({
                        ...prev,
                        effectiveFrom: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Đến ngày</Label>
                  <Input
                    type="date"
                    className="bg-[var(--input-bg)] border-[var(--border)]"
                    value={assignForm.effectiveTo}
                    onChange={(e) =>
                      setAssignForm((prev) => ({
                        ...prev,
                        effectiveTo: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {assignForm.pattern === "custom" && (
                <div className="space-y-2">
                  <Label>Chọn ngày trong tuần</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 1, label: "T2" },
                      { value: 2, label: "T3" },
                      { value: 3, label: "T4" },
                      { value: 4, label: "T5" },
                      { value: 5, label: "T6" },
                      { value: 6, label: "T7" },
                      { value: 0, label: "CN" },
                    ].map((day) => {
                      const isSelected = assignForm.daysOfWeek.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() =>
                            setAssignForm((prev) => ({
                              ...prev,
                              daysOfWeek: isSelected
                                ? prev.daysOfWeek.filter((d) => d !== day.value)
                                : [...prev.daysOfWeek, day.value],
                            }))
                          }
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${isSelected
                              ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                              : "bg-[var(--shell)] text-[var(--text-sub)] border-[var(--border)] hover:bg-[var(--surface)]"
                            }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {assignForm.pattern === "specific" && (
                <div className="space-y-2">
                  <Label>Ngày cụ thể (YYYY-MM-DD, cách nhau bởi dấu phẩy)</Label>
                  <Input
                    placeholder="2026-03-20, 2026-03-27"
                    className="bg-[var(--input-bg)] border-[var(--border)]"
                    value={assignForm.specificDatesText}
                    onChange={(e) =>
                      setAssignForm((prev) => ({
                        ...prev,
                        specificDatesText: e.target.value,
                      }))
                    }
                  />
                </div>
              )}
              </div>
              </div>
              <div className="flex justify-end pt-6 gap-2">
                <Button
                  onClick={handleSubmitAssign}
                  disabled={isAssignSubmitting}
                  className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white"
                >
                  {isAssignSubmitting ? "Đang xử lý..." : "Lưu cài đặt"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-4 border-t border-[var(--border)]">
            <Button
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
              className="bg-[var(--surface)] text-[var(--text-main)] border-[var(--border)] hover:bg-[var(--shell)]"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

