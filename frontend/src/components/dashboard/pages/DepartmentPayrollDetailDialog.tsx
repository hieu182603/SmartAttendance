import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, DollarSign, Users, AlertCircle } from 'lucide-react';
import { getPayrollRecords } from '@/services/payrollService';
import { getAllDepartments } from '@/services/departmentService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface DepartmentPayrollDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  departmentName: string;
  stats: {
    employees: number;
    totalSalary: number;
    avgSalary: number;
    percentage: number;
  };
  selectedMonth?: string;
}

interface EmployeePayroll {
  name: string;
  employeeId: string;
  baseSalary: number;
  overtimePay: number;
  bonus: number;
  deductions: number;
  totalSalary: number;
  status: string;
}

export function DepartmentPayrollDetailDialog({
  isOpen,
  onClose,
  departmentName,
  stats,
  selectedMonth,
}: DepartmentPayrollDetailDialogProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [loading, setLoading] = useState(false);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [payrollRecords, setPayrollRecords] = useState<EmployeePayroll[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadDepartmentId();
    }
  }, [isOpen, departmentName]);

  useEffect(() => {
    if (isOpen && departmentId) {
      loadPayrollRecords();
    }
  }, [isOpen, departmentId, selectedMonth]);

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

  const loadPayrollRecords = async () => {
    if (!departmentId) return;
    setLoading(true);
    try {
      const response = await getPayrollRecords({
        department: departmentId,
        month: selectedMonth,
        page: 1,
        limit: 100,
      });

      const records: EmployeePayroll[] = response.records.map((record) => ({
        name: record.userId.name,
        employeeId: record.employeeId || record.userId.employeeId || '-',
        baseSalary: record.baseSalary,
        overtimePay: record.overtimePay,
        bonus: record.bonus,
        deductions: record.deductions,
        totalSalary: record.totalSalary,
        status: record.status,
      }));

      setPayrollRecords(records);
    } catch (error: any) {
      toast.error('Không thể tải dữ liệu lương');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-[var(--success)]/20 text-[var(--success)]">
            Đã thanh toán
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-[var(--primary)]/20 text-[var(--primary)]">
            Đã duyệt
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-[var(--warning)]/20 text-[var(--warning)]">
            Chờ duyệt
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
            <DollarSign className="h-5 w-5 text-[var(--primary)]" />
            Chi tiết lương: {departmentName}
          </DialogTitle>
          <DialogDescription className="text-[var(--text-sub)]">
            Xem chi tiết lương của nhân viên trong phòng ban
            {selectedMonth && ` - Tháng ${selectedMonth}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-[var(--shell)] border-[var(--border)]">
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 text-[var(--primary)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-sub)]">Số nhân viên</p>
                <p className="text-xl font-semibold text-[var(--text-main)] mt-1">{stats.employees}</p>
              </CardContent>
            </Card>

            <Card className="bg-[var(--shell)] border-[var(--border)]">
              <CardContent className="p-4 text-center">
                <DollarSign className="h-6 w-6 text-[var(--accent-cyan)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-sub)]">Tổng quỹ lương</p>
                <p className="text-lg font-semibold text-[var(--accent-cyan)] mt-1">
                  {formatCurrency(stats.totalSalary)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[var(--shell)] border-[var(--border)]">
              <CardContent className="p-4 text-center">
                <DollarSign className="h-6 w-6 text-[var(--success)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-sub)]">Lương TB</p>
                <p className="text-lg font-semibold text-[var(--success)] mt-1">
                  {formatCurrency(stats.avgSalary)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[var(--shell)] border-[var(--border)]">
              <CardContent className="p-4 text-center flex flex-col items-center justify-center">
                <Badge className="bg-[var(--primary)]/20 text-[var(--primary)] text-sm mb-2">
                  {stats.percentage}%
                </Badge>
                <p className="text-xs text-[var(--text-sub)]">Tỷ lệ</p>
              </CardContent>
            </Card>
          </div>

          {/* Payroll Records Table */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-main)] mb-4">Danh sách lương nhân viên</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
              </div>
            ) : payrollRecords.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-sub)]">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có dữ liệu lương</p>
              </div>
            ) : (
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[var(--shell)]">
                      <TableHead className="text-[var(--text-main)]">Nhân viên</TableHead>
                      <TableHead className="text-[var(--text-main)]">Mã NV</TableHead>
                      <TableHead className="text-[var(--text-main)]">Lương cơ bản</TableHead>
                      <TableHead className="text-[var(--text-main)]">Làm thêm</TableHead>
                      <TableHead className="text-[var(--text-main)]">Thưởng</TableHead>
                      <TableHead className="text-[var(--text-main)]">Khấu trừ</TableHead>
                      <TableHead className="text-[var(--text-main)]">Tổng lương</TableHead>
                      <TableHead className="text-[var(--text-main)]">Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRecords.map((record, index) => (
                      <TableRow key={index} className="hover:bg-[var(--shell)]">
                        <TableCell className="text-[var(--text-main)] font-medium">{record.name}</TableCell>
                        <TableCell className="text-[var(--text-sub)]">{record.employeeId}</TableCell>
                        <TableCell className="text-[var(--text-sub)]">{formatCurrency(record.baseSalary)}</TableCell>
                        <TableCell className="text-[var(--success)]">+{formatCurrency(record.overtimePay)}</TableCell>
                        <TableCell className="text-[var(--success)]">+{formatCurrency(record.bonus)}</TableCell>
                        <TableCell className="text-[var(--error)]">-{formatCurrency(record.deductions)}</TableCell>
                        <TableCell className="text-[var(--primary)] font-semibold">
                          {formatCurrency(record.totalSalary)}
                        </TableCell>
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

