import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Users, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { getAttendanceAnalytics } from '@/services/attendanceService';
import { getAllDepartments, getDepartmentEmployees } from '@/services/departmentService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface DepartmentAttendanceDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  departmentName: string;
  stats: {
    onTime: number;
    late: number;
    absent: number;
  };
}

interface EmployeeAttendance {
  name: string;
  email: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  hours: string;
}

export function DepartmentAttendanceDetailDialog({
  isOpen,
  onClose,
  departmentName,
  stats,
}: DepartmentAttendanceDetailDialogProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [loading, setLoading] = useState(false);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<EmployeeAttendance[]>([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    if (isOpen) {
      loadDepartmentId();
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      setDateRange({
        from: sevenDaysAgo.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      });
    }
  }, [isOpen, departmentName]);

  useEffect(() => {
    if (isOpen && departmentId && dateRange.from && dateRange.to) {
      loadAttendanceRecords();
    }
  }, [isOpen, departmentId, dateRange]);

  const loadDepartmentId = async () => {
    try {
      const response = await getAllDepartments({ page: 1, limit: 1000 });
      const dept = response.departments.find((d) => d.name === departmentName);
      if (dept) {
        setDepartmentId(dept._id || dept.id);
      } else {
        toast.error('Không tìm thấy phòng ban');
      }
    } catch (error: any) {
      toast.error('Không thể tải thông tin phòng ban');
    }
  };

  const loadAttendanceRecords = async () => {
    if (!departmentId) return;
    setLoading(true);
    try {
      // Lấy danh sách nhân viên từ department để có email
      const deptEmployees = await getDepartmentEmployees(departmentId);
      
      // Tạo map email theo tên nhân viên
      const emailMap = new Map<string, string>();
      deptEmployees.employees.forEach((emp) => {
        emailMap.set(emp.name, emp.email);
      });

      const analytics = await getAttendanceAnalytics({
        from: dateRange.from,
        to: dateRange.to,
        department: departmentId,
      });

      // Lấy danh sách nhân viên từ topPerformers
      const records: EmployeeAttendance[] = [];
      
      // Sử dụng topPerformers từ analytics để hiển thị
      if (analytics.topPerformers && analytics.topPerformers.length > 0) {
        analytics.topPerformers.forEach((emp: any) => {
          // Xác định status dựa trên số lần onTime, late, absent
          let status = 'ontime';
          if (emp.absent > 0) {
            status = 'absent';
          } else if (emp.late > 0) {
            status = 'late';
          }

          // Lấy email từ map
          const email = emailMap.get(emp.name) || 'N/A';

          records.push({
            name: emp.name || 'N/A',
            email: email,
            date: dateRange.to, // Sử dụng ngày cuối trong range
            checkIn: emp.avgCheckIn && emp.avgCheckIn !== '-' ? emp.avgCheckIn : '-',
            checkOut: '-',
            status: status,
            hours: '-',
          });
        });
      }

      setAttendanceRecords(records);
    } catch (error: any) {
      toast.error('Không thể tải dữ liệu chấm công');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ontime':
      case 'present':
        return (
          <Badge className="bg-[var(--success)]/20 text-[var(--success)]">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Đúng giờ
          </Badge>
        );
      case 'late':
        return (
          <Badge className="bg-[var(--warning)]/20 text-[var(--warning)]">
            <Clock className="h-3 w-3 mr-1" />
            Đi muộn
          </Badge>
        );
      case 'absent':
        return (
          <Badge className="bg-[var(--error)]/20 text-[var(--error)]">
            <XCircle className="h-3 w-3 mr-1" />
            Vắng
          </Badge>
        );
      default:
        return (
          <Badge className="bg-[var(--text-sub)]/20 text-[var(--text-sub)]">
            {status}
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[var(--surface)] border-[var(--border)] max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-main)] flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--primary)]" />
            Chi tiết chấm công: {departmentName}
          </DialogTitle>
          <DialogDescription className="text-[var(--text-sub)]">
            Xem chi tiết chấm công của nhân viên trong phòng ban
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-[var(--shell)] border-[var(--border)]">
              <CardContent className="p-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--text-sub)]">Đúng giờ</span>
                  <span className="text-lg font-semibold text-[var(--success)]">{stats.onTime}%</span>
                </div>
                <Progress value={stats.onTime} className="h-2 [&>div]:bg-[var(--success)]" />
              </CardContent>
            </Card>

            <Card className="bg-[var(--shell)] border-[var(--border)]">
              <CardContent className="p-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--text-sub)]">Đi muộn</span>
                  <span className="text-lg font-semibold text-[var(--warning)]">{stats.late}%</span>
                </div>
                <Progress value={stats.late} className="h-2 [&>div]:bg-[var(--warning)]" />
              </CardContent>
            </Card>

            <Card className="bg-[var(--shell)] border-[var(--border)]">
              <CardContent className="p-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--text-sub)]">Vắng</span>
                  <span className="text-lg font-semibold text-[var(--error)]">{stats.absent}%</span>
                </div>
                <Progress value={stats.absent} className="h-2 [&>div]:bg-[var(--error)]" />
              </CardContent>
            </Card>
          </div>

          {/* Attendance Records Table */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-main)] mb-4">Danh sách chấm công</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-sub)]">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có dữ liệu chấm công</p>
              </div>
            ) : (
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[var(--shell)]">
                      <TableHead className="text-[var(--text-main)]">Nhân viên</TableHead>
                      <TableHead className="text-[var(--text-main)]">Email</TableHead>
                      <TableHead className="text-[var(--text-main)]">Ngày</TableHead>
                      <TableHead className="text-[var(--text-main)]">Giờ vào</TableHead>
                      <TableHead className="text-[var(--text-main)]">Giờ ra</TableHead>
                      <TableHead className="text-[var(--text-main)]">Giờ làm</TableHead>
                      <TableHead className="text-[var(--text-main)]">Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record, index) => (
                      <TableRow key={index} className="hover:bg-[var(--shell)]">
                        <TableCell className="text-[var(--text-main)]">{record.name}</TableCell>
                        <TableCell className="text-[var(--text-sub)]">{record.email}</TableCell>
                        <TableCell className="text-[var(--text-sub)]">
                          {new Date(record.date).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-[var(--text-sub)]">{record.checkIn}</TableCell>
                        <TableCell className="text-[var(--text-sub)]">{record.checkOut}</TableCell>
                        <TableCell className="text-[var(--text-sub)]">{record.hours}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

