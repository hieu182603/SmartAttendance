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

interface TransferEmployeesWizardProps {
  isOpen: boolean;
  onClose: () => void;
  sourceDepartmentId: string;
  sourceDepartmentName: string;
  sourceBranchId: string;
  onTransfer: (targetDepartmentId: string) => Promise<void>;
}

type WizardStep = 'select' | 'preview' | 'confirm';

export function TransferEmployeesWizard({
  isOpen,
  onClose,
  sourceDepartmentId,
  sourceDepartmentName,
  sourceBranchId,
  onTransfer,
}: TransferEmployeesWizardProps) {
  const [step, setStep] = useState<WizardStep>('select');
  const [targetDepartmentId, setTargetDepartmentId] = useState('');
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
    }
  }, [isOpen, sourceDepartmentId, sourceBranchId]);

  const loadDepartments = async () => {
    try {
      const response = await getDepartmentsList(sourceBranchId);
      // Lọc bỏ phòng ban nguồn
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

  const handleNext = () => {
    if (step === 'select' && targetDepartmentId) {
      setStep('preview');
    } else if (step === 'preview') {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'preview') {
      setStep('select');
    } else if (step === 'confirm') {
      setStep('preview');
    }
  };

  const handleConfirm = async () => {
    if (!targetDepartmentId) return;

    try {
      setTransferring(true);
      await onTransfer(targetDepartmentId);
      toast.success('Đã chuyển nhân viên thành công');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Không thể chuyển nhân viên');
    } finally {
      setTransferring(false);
    }
  };

  const selectedTargetDepartment = departments.find((d) => d._id === targetDepartmentId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[var(--surface)] border-[var(--border)] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-main)] flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-[var(--primary)]" />
            Chuyển nhân viên
          </DialogTitle>
          <DialogDescription className="text-[var(--text-sub)]">
            Chuyển nhân viên từ <strong>{sourceDepartmentName}</strong> sang phòng ban khác
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {['select', 'preview', 'confirm'].map((s, index) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      step === s
                        ? 'border-[var(--primary)] bg-[var(--primary)]/20 text-[var(--primary)]'
                        : index < ['select', 'preview', 'confirm'].indexOf(step)
                        ? 'border-[var(--success)] bg-[var(--success)]/20 text-[var(--success)]'
                        : 'border-[var(--border)] text-[var(--text-sub)]'
                    }`}
                  >
                    {index < ['select', 'preview', 'confirm'].indexOf(step) ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span className="font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <span className="text-xs mt-2 text-[var(--text-sub)] text-center">
                    {s === 'select' ? 'Chọn phòng ban' : s === 'preview' ? 'Xem trước' : 'Xác nhận'}
                  </span>
                </div>
                {index < 2 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      index < ['select', 'preview', 'confirm'].indexOf(step)
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
                  {departments.length === 0 && (
                    <p className="text-sm text-[var(--warning)] mt-2">
                      Lưu ý: Chỉ có thể chuyển nhân viên giữa các phòng ban trong cùng chi nhánh
                    </p>
                  )}
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

            {/* Step 2: Preview Employees */}
            {step === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
                  </div>
                ) : employees ? (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-[var(--accent-cyan)]" />
                        <div>
                          <p className="font-semibold text-[var(--text-main)]">Nhân viên</p>
                          <p className="text-sm text-[var(--text-sub)]">
                            {employees.counts.totalEmployees} nhân viên
                            {employees.counts.activeEmployees > 0 && (
                              <span className="ml-1">
                                ({employees.counts.activeEmployees} đang hoạt động)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]">
                        {employees.counts.totalEmployees}
                      </Badge>
                    </div>

                    {employees.employees.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-[var(--text-main)]">Danh sách nhân viên sẽ chuyển:</Label>
                        <div className="max-h-60 overflow-y-auto space-y-1 p-3 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
                          {employees.employees.map((emp) => (
                            <div
                              key={emp._id}
                              className="flex items-center justify-between py-1 text-sm"
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
                    )}
                  </>
                ) : null}
              </motion.div>
            )}

            {/* Step 3: Confirm */}
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
                          • Tất cả nhân viên từ{' '}
                          <strong className="text-[var(--text-main)]">{sourceDepartmentName}</strong> sẽ được
                          chuyển sang{' '}
                          <strong className="text-[var(--text-main)]">
                            {selectedTargetDepartment?.name}
                          </strong>
                        </p>
                        <p>
                          • Phòng ban nguồn sẽ không bị xóa, bạn có thể vô hiệu hóa sau nếu cần
                        </p>
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
                disabled={!targetDepartmentId || loading || departments.length === 0}
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

