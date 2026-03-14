import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '@/services/api';
import shiftService from '@/services/shiftService';
import { getDepartmentsList, type DepartmentListResponse } from '@/services/departmentService';
import { getAllUsers } from '@/services/userService';

interface Shift {
  _id?: string;
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  isFlexible?: boolean;
  description?: string;
  isActive?: boolean;
  employees?: number;
  color?: string;
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
}

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
  const [isAssignSubmitting, setIsAssignSubmitting] = useState(false);

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

        const userList = (usersRes.users || []).map((u) => ({
          _id: u._id as string,
          name: u.name,
          email: u.email,
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
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tải danh sách ca làm việc';
      toast.error(errorMessage);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.startTime || !formData.endTime || !formData.breakDuration) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        startTime: formData.startTime,
        endTime: formData.endTime,
        breakDuration: parseInt(formData.breakDuration),
        description: formData.description || undefined,
      };

      await api.post('/shifts', payload);
      toast.success(`✅ Đã tạo ca làm việc ${formData.name}`);
      setIsDialogOpen(false);
      setFormData({ name: '', startTime: '', endTime: '', breakDuration: '', description: '' });
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
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenAssign = (shift: Shift) => {
    setAssignShift(shift);
    setAssignForm({
      departmentIds: [],
      userIds: [],
      pattern: "weekdays",
      daysOfWeek: [1, 2, 3, 4, 5],
      effectiveFrom: "",
      effectiveTo: "",
      specificDatesText: "",
    });
    setIsAssignDialogOpen(true);
  };

  const toggleArrayValue = (current: string[], value: string): string[] => {
    if (current.includes(value)) {
      return current.filter((v) => v !== value);
    }
    return [...current, value];
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
      departmentIds: assignForm.departmentIds,
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
        breakDuration: parseInt(formData.breakDuration),
        description: formData.description || undefined,
      };

      await api.put(`/shifts/${shiftId}`, payload);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-[var(--text-main)]">Quản lý ca làm việc</h1>
          <p className="text-[var(--text-sub)]">Tạo và quản lý các ca làm việc</p>
        </div>

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
                {shifts.map((shift) => (
                  <tr key={shift.id || shift._id} className="border-b border-[var(--border)] hover:bg-[var(--shell)]">
                    <td className="py-3 px-4 text-[var(--text-main)]">{shift.name}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-sub)]">{shift.employees || 0}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-sub)]">{shift.employees || 0}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-sub)]">{shift.employees || 0}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-sub)]">{shift.employees || 0}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-sub)]">{shift.employees || 0}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-sub)]">{shift.employees || 0}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-sub)]">-</td>
                  </tr>
                ))}
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
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Gán ca làm việc</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              Chọn phòng ban / nhân viên và khoảng ngày áp dụng cho ca{" "}
              <span className="font-semibold">{assignShift?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 max-h-[480px] overflow-y-auto">
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
                    const checked = assignForm.departmentIds.includes(dept._id);
                    return (
                      <label
                        key={dept._id}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--surface)] cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          className="accent-[var(--accent-cyan)]"
                          checked={checked}
                          onChange={() =>
                            setAssignForm((prev) => ({
                              ...prev,
                              departmentIds: toggleArrayValue(prev.departmentIds, dept._id),
                            }))
                          }
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
                  <Label>Kiểu lặp</Label>
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

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
              className="border-[var(--border)] text-[var(--text-main)]"
              disabled={isAssignSubmitting}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmitAssign}
              className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]"
              disabled={isAssignSubmitting}
            >
              {isAssignSubmitting ? "Đang gán..." : "Gán ca"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

