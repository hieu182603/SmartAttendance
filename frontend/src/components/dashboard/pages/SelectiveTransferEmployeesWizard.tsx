import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Users,
  Loader2,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getDepartmentsList, getDepartmentEmployees, type DepartmentEmployees } from '@/services/departmentService';
import { toast } from 'sonner';

interface SelectiveTransferEmployeesWizardProps {
  isOpen: boolean;
  onClose: () => void;
  sourceDepartmentId: string;
  sourceDepartmentName: string;
  sourceBranchId: string;
  onTransfer: (targetDepartmentId: string, employeeIds: string[]) => Promise<void>;
}

type WizardStep = 'select' | 'choose' | 'preview' | 'confirm';

export function SelectiveTransferEmployeesWizard({
  isOpen,
  onClose,
  sourceDepartmentId,
  sourceDepartmentName,
  sourceBranchId,
  onTransfer,
}: SelectiveTransferEmployeesWizardProps) {
  const [step, setStep] = useState<WizardStep>('select');
  const [targetDepartmentId, setTargetDepartmentId] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [departments, setDepartments] = useState<Array<{ _id: string; name: string; code: string }>>([]);
  const [employees, setEmployees] = useState<DepartmentEmployees | null>(null);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
      loadEmployees();
      setStep('select');
      setTargetDepartmentId('');
      setSelectedEmployeeIds([]);
    }
  }, [isOpen, sourceDepartmentId, sourceBranchId]);

  // Tự động load employees khi chuyển sang step choose nếu chưa có
  useEffect(() => {
    if (step === 'choose' && !employees && !loading) {
      loadEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const loadDepartments = async () => {
    try {
      const response = await getDepartmentsList(sourceBranchId);
      const filtered = response.departments.filter((d) => d._id !== sourceDepartmentId);
      setDepartments(filtered);
    } catch (error: any) {
      toast.error('Không thể tải danh sách phòng ban');
    }
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await getDepartmentEmployees(sourceDepartmentId);
      setEmployees(data);
    } catch (error: any) {
      toast.error('Không thể tải thông tin nhân viên');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (step === 'select' && targetDepartmentId) {
      // Khi chuyển sang step choose, đảm bảo đã load employees
      if (!employees) {
        await loadEmployees();
      }
      setStep('choose');
    } else if (step === 'choose' && selectedEmployeeIds.length > 0) {
      setStep('preview');
    } else if (step === 'preview') {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'choose') {
      setStep('select');
    } else if (step === 'preview') {
      setStep('choose');
    } else if (step === 'confirm') {
      setStep('preview');
    }
  };

  const handleToggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    if (employees && employees.employees.length > 0) {
      if (selectedEmployeeIds.length === employees.employees.length) {
        setSelectedEmployeeIds([]);
      } else {
        setSelectedEmployeeIds(employees.employees.map((emp) => emp._id));
      }
    }
  };

  const handleConfirm = async () => {
    if (!targetDepartmentId || selectedEmployeeIds.length === 0) return;

    try {
      setTransferring(true);
      await onTransfer(targetDepartmentId, selectedEmployeeIds);
      toast.success(`Đã chuyển ${selectedEmployeeIds.length} nhân viên thành công`);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Không thể chuyển nhân viên');
    } finally {
      setTransferring(false);
    }
  };

  const selectedTargetDepartment = departments.find((d) => d._id === targetDepartmentId);
  const selectedEmployees = employees?.employees.filter((emp) => selectedEmployeeIds.includes(emp._id)) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[var(--surface)] border-[var(--border)] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-main)] flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-[var(--primary)]" />
            Chuyển nhân viên
          </DialogTitle>
          <DialogDescription className="text-[var(--text-sub)]">
            Chọn nhân viên cụ thể từ <strong>{sourceDepartmentName}</strong> để chuyển sang phòng ban khác
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {['select', 'choose', 'preview', 'confirm'].map((s, index) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      step === s
                        ? 'border-[var(--primary)] bg-[var(--primary)]/20 text-[var(--primary)]'
                        : index < ['select', 'choose', 'preview', 'confirm'].indexOf(step)
                        ? 'border-[var(--success)] bg-[var(--success)]/20 text-[var(--success)]'
                        : 'border-[var(--border)] text-[var(--text-sub)]'
                    }`}
                  >
                    {index < ['select', 'choose', 'preview', 'confirm'].indexOf(step) ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span className="font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <span className="text-xs mt-2 text-[var(--text-sub)] text-center">
                    {s === 'select' ? 'Chọn phòng ban' : s === 'choose' ? 'Chọn nhân viên' : s === 'preview' ? 'Xem trước' : 'Xác nhận'}
                  </span>
                </div>
                {index < 3 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      index < ['select', 'choose', 'preview', 'confirm'].indexOf(step)
                        ? 'bg-[var(--success)]'
                        : 'bg-[var(--border)]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <Separator className="bg-[var(--border)]" />

          <AnimatePresence mode="wait">
            {/* Step 1: Select Target Department */}
            {step === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <Label className="text-[var(--text-main)] mb-2 block">
                    Chọn phòng ban đích
                  </Label>
                  <Select value={targetDepartmentId} onValueChange={setTargetDepartmentId}>
                    <SelectTrigger className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                      <SelectValue placeholder="Chọn phòng ban để chuyển nhân viên..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-[var(--text-sub)]">
                          Không có phòng ban nào trong cùng chi nhánh
                        </div>
                      ) : (
                        departments.map((dept) => (
                          <SelectItem key={dept._id} value={dept._id}>
                            {dept.name} ({dept.code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {targetDepartmentId && (
                  <Card className="bg-[var(--shell)] border-[var(--border)]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-[var(--primary)]" />
                        <div>
                          <p className="font-semibold text-[var(--text-main)]">
                            {selectedTargetDepartment?.name}
                          </p>
                          <p className="text-sm text-[var(--text-sub)]">
                            Mã: {selectedTargetDepartment?.code}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {/* Step 2: Choose Employees */}
            {step === 'choose' && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
                  </div>
                ) : employees && employees.employees.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-[var(--accent-cyan)]" />
                        <div>
                          <p className="font-semibold text-[var(--text-main)]">Chọn nhân viên</p>
                          <p className="text-sm text-[var(--text-sub)]">
                            {selectedEmployeeIds.length} / {employees.employees.length} nhân viên đã chọn
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                        className="border-[var(--border)] text-[var(--text-main)]"
                      >
                        {selectedEmployeeIds.length === employees.employees.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </Button>
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-2 p-3 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
                      {employees.employees.map((emp) => {
                        const isSelected = selectedEmployeeIds.includes(emp._id);
                        return (
                          <div
                            key={emp._id}
                            onClick={() => handleToggleEmployee(emp._id)}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[var(--primary)]/20 border-2 border-[var(--primary)]'
                                : 'bg-[var(--surface)] border-2 border-transparent hover:border-[var(--border)]'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleEmployee(emp._id)}
                                className="h-5 w-5 rounded border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)] cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1">
                                <p className="font-medium text-[var(--text-main)]">{emp.name}</p>
                                <p className="text-sm text-[var(--text-sub)]">{emp.email}</p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                emp.isActive
                                  ? 'border-[var(--success)] text-[var(--success)]'
                                  : 'border-[var(--text-sub)] text-[var(--text-sub)]'
                              }`}
                            >
                              {emp.isActive ? 'Hoạt động' : 'Không hoạt động'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : employees && employees.employees.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-sub)]">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Phòng ban này không có nhân viên</p>
                  </div>
                ) : null}
              </motion.div>
            )}

            {/* Step 3: Preview */}
            {step === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-[var(--accent-cyan)]" />
                    <div>
                      <p className="font-semibold text-[var(--text-main)]">Nhân viên sẽ chuyển</p>
                      <p className="text-sm text-[var(--text-sub)]">
                        {selectedEmployees.length} nhân viên
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]">
                    {selectedEmployees.length}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label className="text-[var(--text-main)]">Danh sách nhân viên:</Label>
                  <div className="max-h-60 overflow-y-auto space-y-1 p-3 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
                    {selectedEmployees.map((emp) => (
                      <div
                        key={emp._id}
                        className="flex items-center justify-between py-2 text-sm border-b border-[var(--border)] last:border-0"
                      >
                        <span className="text-[var(--text-main)]">{emp.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            emp.isActive
                              ? 'border-[var(--success)] text-[var(--success)]'
                              : 'border-[var(--text-sub)] text-[var(--text-sub)]'
                          }`}
                        >
                          {emp.isActive ? 'Hoạt động' : 'Không hoạt động'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30">
                  <p className="text-sm text-[var(--text-main)]">
                    <strong>Từ:</strong> {sourceDepartmentName} → <strong>Đến:</strong>{' '}
                    {selectedTargetDepartment?.name}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 4: Confirm */}
            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/30">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[var(--warning)] mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-[var(--warning)] mb-2">
                        Xác nhận chuyển nhân viên
                      </p>
                      <div className="space-y-2 text-sm text-[var(--text-sub)]">
                        <p>
                          • <strong className="text-[var(--text-main)]">{selectedEmployees.length} nhân viên</strong> từ{' '}
                          <strong className="text-[var(--text-main)]">{sourceDepartmentName}</strong> sẽ được
                          chuyển sang{' '}
                          <strong className="text-[var(--text-main)]">
                            {selectedTargetDepartment?.name}
                          </strong>
                        </p>
                        <p>
                          • Các nhân viên còn lại sẽ ở lại phòng ban hiện tại
                        </p>
                        <p>• Phòng ban nguồn sẽ không bị xóa</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <Button
            variant="outline"
            onClick={step === 'select' ? onClose : handleBack}
            disabled={transferring}
            className="border-[var(--border)] text-[var(--text-main)]"
          >
            {step === 'select' ? 'Hủy' : 'Quay lại'}
          </Button>
          <div className="flex gap-2">
            {step !== 'confirm' && (
              <Button
                onClick={handleNext}
                disabled={
                  (step === 'select' && !targetDepartmentId) ||
                  (step === 'choose' && selectedEmployeeIds.length === 0) ||
                  loading ||
                  departments.length === 0
                }
                className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
              >
                Tiếp theo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {step === 'confirm' && (
              <Button
                onClick={handleConfirm}
                disabled={transferring}
                className="bg-[var(--success)] hover:bg-[var(--success)]/80 text-white"
              >
                {transferring ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang chuyển...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Xác nhận chuyển
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

