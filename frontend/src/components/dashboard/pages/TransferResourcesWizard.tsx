import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Users,
  Briefcase,
  Building2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getBranchesList, getBranchResources, type BranchResources } from '@/services/branchService';
import { toast } from 'sonner';

interface TransferResourcesWizardProps {
  isOpen: boolean;
  onClose: () => void;
  sourceBranchId: string;
  sourceBranchName: string;
  onTransfer: (targetBranchId: string) => Promise<void>;
}

type WizardStep = 'select' | 'preview' | 'confirm';

export function TransferResourcesWizard({
  isOpen,
  onClose,
  sourceBranchId,
  sourceBranchName,
  onTransfer,
}: TransferResourcesWizardProps) {
  const [step, setStep] = useState<WizardStep>('select');
  const [targetBranchId, setTargetBranchId] = useState('');
  const [branches, setBranches] = useState<Array<{ _id: string; name: string; code: string }>>([]);
  const [resources, setResources] = useState<BranchResources | null>(null);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBranches();
      loadResources();
      setStep('select');
      setTargetBranchId('');
    }
  }, [isOpen, sourceBranchId]);

  const loadBranches = async () => {
    try {
      const response = await getBranchesList();
      // Lọc bỏ chi nhánh nguồn
      const filtered = response.branches.filter((b) => b._id !== sourceBranchId);
      setBranches(filtered);
    } catch (error: any) {
      toast.error('Không thể tải danh sách chi nhánh');
    }
  };

  const loadResources = async () => {
    try {
      setLoading(true);
      const data = await getBranchResources(sourceBranchId);
      setResources(data);
    } catch (error: any) {
      toast.error('Không thể tải thông tin tài nguyên');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 'select' && targetBranchId) {
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
    if (!targetBranchId) return;

    try {
      setTransferring(true);
      await onTransfer(targetBranchId);
      toast.success('Đã chuyển tài nguyên thành công');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Không thể chuyển tài nguyên');
    } finally {
      setTransferring(false);
    }
  };

  const selectedTargetBranch = branches.find((b) => b._id === targetBranchId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[var(--surface)] border-[var(--border)] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-main)] flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-[var(--primary)]" />
            Chuyển tài nguyên
          </DialogTitle>
          <DialogDescription className="text-[var(--text-sub)]">
            Chuyển nhân viên và phòng ban từ <strong>{sourceBranchName}</strong> sang chi nhánh khác
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
                    {s === 'select' ? 'Chọn chi nhánh' : s === 'preview' ? 'Xem trước' : 'Xác nhận'}
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
            {/* Step 1: Select Target Branch */}
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
                    Chọn chi nhánh đích
                  </Label>
                  <Select value={targetBranchId} onValueChange={setTargetBranchId}>
                    <SelectTrigger className="bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                      <SelectValue placeholder="Chọn chi nhánh để chuyển tài nguyên..." />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch._id} value={branch._id}>
                          {branch.name} ({branch.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {targetBranchId && (
                  <Card className="bg-[var(--shell)] border-[var(--border)]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-[var(--primary)]" />
                        <div>
                          <p className="font-semibold text-[var(--text-main)]">
                            {selectedTargetBranch?.name}
                          </p>
                          <p className="text-sm text-[var(--text-sub)]">
                            Mã: {selectedTargetBranch?.code}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {/* Step 2: Preview Resources */}
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
                ) : resources ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-[var(--accent-cyan)]" />
                          <div>
                            <p className="font-semibold text-[var(--text-main)]">Nhân viên</p>
                            <p className="text-sm text-[var(--text-sub)]">
                              {resources.counts.totalEmployees} nhân viên
                              {resources.counts.activeEmployees > 0 && (
                                <span className="ml-1">
                                  ({resources.counts.activeEmployees} đang hoạt động)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]">
                          {resources.counts.totalEmployees}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
                        <div className="flex items-center gap-3">
                          <Briefcase className="h-5 w-5 text-[var(--warning)]" />
                          <div>
                            <p className="font-semibold text-[var(--text-main)]">Phòng ban</p>
                            <p className="text-sm text-[var(--text-sub)]">
                              {resources.counts.totalDepartments} phòng ban
                              {resources.counts.activeDepartments > 0 && (
                                <span className="ml-1">
                                  ({resources.counts.activeDepartments} đang hoạt động)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-[var(--warning)]/20 text-[var(--warning)]">
                          {resources.counts.totalDepartments}
                        </Badge>
                      </div>
                    </div>

                    {resources.employees.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-[var(--text-main)]">Danh sách nhân viên sẽ chuyển:</Label>
                        <div className="max-h-40 overflow-y-auto space-y-1 p-3 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
                          {resources.employees.map((emp) => (
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

                    {resources.departments.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-[var(--text-main)]">Danh sách phòng ban sẽ chuyển:</Label>
                        <div className="max-h-40 overflow-y-auto space-y-1 p-3 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
                          {resources.departments.map((dept) => (
                            <div
                              key={dept._id}
                              className="flex items-center justify-between py-1 text-sm"
                            >
                              <span className="text-[var(--text-main)]">{dept.name}</span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  dept.status === 'active'
                                    ? 'border-[var(--success)] text-[var(--success)]'
                                    : 'border-[var(--text-sub)] text-[var(--text-sub)]'
                                }`}
                              >
                                {dept.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
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
                        Xác nhận chuyển tài nguyên
                      </p>
                      <div className="space-y-2 text-sm text-[var(--text-sub)]">
                        <p>
                          • Tất cả nhân viên và phòng ban từ{' '}
                          <strong className="text-[var(--text-main)]">{sourceBranchName}</strong> sẽ được
                          chuyển sang{' '}
                          <strong className="text-[var(--text-main)]">
                            {selectedTargetBranch?.name}
                          </strong>
                        </p>
                        <p>
                          • Chi nhánh nguồn sẽ không bị xóa, bạn có thể vô hiệu hóa sau nếu cần
                        </p>
                        <p>• Lịch sử chấm công sẽ được giữ nguyên</p>
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
                disabled={!targetBranchId || loading}
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

