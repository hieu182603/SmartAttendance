import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '@/services/api';

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
  
  // Handle overnight shifts
  if (endTotal < startTotal) {
    endTotal += 24 * 60;
  }
  
  const workMinutes = endTotal - startTotal - breakMinutes;
  const hours = Math.floor(workMinutes / 60);
  const minutes = workMinutes % 60;
  
  return `${hours}h ${minutes}m`;
}

export function ShiftsPage() {
  const { t } = useTranslation('dashboard');
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

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/shifts');
      console.log('Shifts API response:', response.data);
      
      // Backend trả về format: { success: true, data: [...] }
      const shiftsData = response.data.data || response.data.shifts || response.data || [];
      console.log('Parsed shifts data:', shiftsData);
      
      // Map backend data to frontend format with colors
      const mappedShifts = shiftsData.map((shift: any, index: number) => ({
        ...shift,
        id: shift._id || shift.id,
        employees: shift.employeeCount || 0,
        color: ['success', 'warning', 'error', 'primary'][index % 4],
      }));
      
      setShifts(mappedShifts);
    } catch (error: any) {
      console.error('Error loading shifts:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || t('shifts.loadError');
      toast.error(errorMessage);
      // Không set mock data nữa, để hiển thị danh sách rỗng
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.startTime || !formData.endTime || !formData.breakDuration) {
      toast.error(t('shifts.fillAllFields'));
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
      toast.success(`✅ ${t('shifts.createSuccess', { name: formData.name })}`);
      setIsDialogOpen(false);
      setFormData({ name: '', startTime: '', endTime: '', breakDuration: '', description: '' });
      await loadShifts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || t('shifts.createError');
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

  const handleSubmitEdit = async () => {
    if (!selectedShift) return;

    if (!formData.name || !formData.startTime || !formData.endTime || !formData.breakDuration) {
      toast.error(t('shifts.fillAllFields'));
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
      toast.success(`✅ ${t('shifts.updateSuccess', { name: formData.name })}`);
      setIsEditDialogOpen(false);
      setSelectedShift(null);
      await loadShifts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || t('shifts.updateError');
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
      toast.success(`🗑️ ${t('shifts.deleteSuccess', { name: selectedShift.name })}`);
      setIsDeleteDialogOpen(false);
      setSelectedShift(null);
      await loadShifts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || t('shifts.deleteError');
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--text-sub)]">{t('shifts.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-[var(--text-main)]">{t('shifts.title')}</h1>
          <p className="text-[var(--text-sub)]">{t('shifts.description')}</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              {t('shifts.createNew')}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
            <DialogHeader>
              <DialogTitle>{t('shifts.dialog.create.title')}</DialogTitle>
              <DialogDescription className="text-[var(--text-sub)]">
                {t('shifts.dialog.create.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{t('shifts.form.shiftName')}</Label>
                <Input 
                  placeholder={t('shifts.form.shiftNamePlaceholder')} 
                  className="bg-[var(--input-bg)] border-[var(--border)]"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('shifts.form.startTime')}</Label>
                  <Input 
                    type="time" 
                    className="bg-[var(--input-bg)] border-[var(--border)]"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('shifts.form.endTime')}</Label>
                  <Input 
                    type="time" 
                    className="bg-[var(--input-bg)] border-[var(--border)]"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('shifts.form.breakDuration')}</Label>
                <Input 
                  type="number" 
                  placeholder={t('shifts.form.breakPlaceholder')} 
                  className="bg-[var(--input-bg)] border-[var(--border)]"
                  value={formData.breakDuration}
                  onChange={(e) => setFormData({ ...formData, breakDuration: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('shifts.form.description')}</Label>
                <Input 
                  placeholder={t('shifts.form.descriptionPlaceholder')} 
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
                  {t('shifts.dialog.cancel')}
                </Button>
                <Button 
                  onClick={handleCreate}
                  className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]"
                >
                  {t('shifts.dialog.create')}
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
                    onClick={() => handleEditShift(shift)}
                    className="p-2 hover:bg-[var(--shell)] rounded text-[var(--primary)]"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
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
                  <p className="text-sm text-[var(--text-sub)]">{t('shifts.card.workingHours')}</p>
                  <p className="text-lg text-[var(--text-main)]">
                    {calculateWorkHours(shift.startTime, shift.endTime, shift.breakDuration || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-sub)]">{t('shifts.card.breakTime')}</p>
                  <p className="text-lg text-[var(--text-main)]">{shift.breakDuration || 0} {t('shifts.card.minutes')}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-sub)]">{t('shifts.card.employees')}</p>
                  <p className="text-lg text-[var(--text-main)]">{t('shifts.card.employeeCount', { count: shift.employees || 0 })}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-sub)]">{t('shifts.card.status')}</p>
                  <Badge className={shift.isActive !== false ? "bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30" : "bg-[var(--error)]/20 text-[var(--error)] border-[var(--error)]/30"}>
                    {shift.isActive !== false ? t('shifts.status.active') : t('shifts.status.inactive')}
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
          <CardTitle className="text-[var(--text-main)]">{t('shifts.weekSchedule.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--shell)]">
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">{t('shifts.weekSchedule.shiftColumn')}</th>
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">{t('shifts.weekSchedule.monday')}</th>
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">{t('shifts.weekSchedule.tuesday')}</th>
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">{t('shifts.weekSchedule.wednesday')}</th>
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">{t('shifts.weekSchedule.thursday')}</th>
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">{t('shifts.weekSchedule.friday')}</th>
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">{t('shifts.weekSchedule.saturday')}</th>
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">{t('shifts.weekSchedule.sunday')}</th>
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
            <DialogTitle>{t('shifts.dialog.edit.title')}</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              {t('shifts.dialog.edit.description', { name: selectedShift?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t('shifts.form.shiftName')}</Label>
              <Input 
                placeholder={t('shifts.form.shiftNamePlaceholder')} 
                className="bg-[var(--input-bg)] border-[var(--border)]"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('shifts.form.startTime')}</Label>
                <Input 
                  type="time" 
                  className="bg-[var(--input-bg)] border-[var(--border)]"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('shifts.form.endTime')}</Label>
                <Input 
                  type="time" 
                  className="bg-[var(--input-bg)] border-[var(--border)]"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('shifts.form.breakDuration')}</Label>
              <Input 
                type="number" 
                placeholder={t('shifts.form.breakPlaceholder')} 
                className="bg-[var(--input-bg)] border-[var(--border)]"
                value={formData.breakDuration}
                onChange={(e) => setFormData({ ...formData, breakDuration: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('shifts.form.description')}</Label>
              <Input 
                placeholder={t('shifts.form.descriptionPlaceholder')} 
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
                {t('shifts.dialog.cancel')}
              </Button>
              <Button 
                onClick={handleSubmitEdit}
                className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]"
              >
                {t('shifts.dialog.update')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
          <DialogHeader>
            <DialogTitle>{t('shifts.dialog.delete.title')}</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              {t('shifts.dialog.delete.description')}
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
                      {t('shifts.card.employeeCount', { count: selectedShift.employees || 0 })}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[var(--error)] text-sm mt-4">
                ⚠️ {t('shifts.dialog.delete.warning', { count: selectedShift.employees || 0 })}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-[var(--border)] text-[var(--text-main)]"
            >
              {t('shifts.dialog.cancel')}
            </Button>
            <Button 
              onClick={confirmDelete}
              className="bg-[var(--error)] hover:bg-[var(--error)]/90 text-white"
            >
              {t('shifts.dialog.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

