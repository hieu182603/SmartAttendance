import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Search, Calendar, Download, Eye, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  getDepartmentAttendance,
  exportAttendanceAnalytics,
} from "@/services/attendanceService";

interface AttendanceRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  employeeId?: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  status: "ontime" | "late" | "absent" | "overtime" | "weekend";
  location: string;
}

interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
}

const DepartmentAttendancePage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDepartmentAttendance({
        date: selectedDate,
        search: searchTerm || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });

      setRecords(result.records || []);
      setSummary(
        result.summary || { total: 0, present: 0, late: 0, absent: 0 }
      );
      setPagination(
        result.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }
      );
    } catch (error) {
      console.error("[DepartmentAttendance] fetch error:", error);
      toast.error(t('dashboard:adminAttendance.error'));
    } finally {
      setLoading(false);
    }
  }, [selectedDate, searchTerm, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    try {
      await exportAttendanceAnalytics({
        from: selectedDate,
        to: selectedDate,
      });
      toast.success(t('dashboard:adminAttendance.export') + ' ' + t('common:success'));
    } catch (error) {
      console.error("[DepartmentAttendance] export error:", error);
      toast.error(t('dashboard:departmentAttendance.export') + ' ' + t('common:error'));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ontime":
        return (
          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
            {t('dashboard:adminAttendance.filters.ontime')}
          </Badge>
        );
      case "late":
        return (
          <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">
            {t('dashboard:adminAttendance.filters.late')}
          </Badge>
        );
      case "absent":
        return (
          <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
            {t('dashboard:adminAttendance.filters.absent')}
          </Badge>
        );
      case "overtime":
        return (
          <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
            {t('dashboard:adminAttendance.filters.overtime')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold text-[var(--text-main)]">
          {t('dashboard:departmentAttendance.title')}
        </h1>
        <p className="text-[var(--text-sub)]">
          {t('dashboard:departmentAttendance.description')}
        </p>
      </motion.div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-sub)]" />
              <Input
                placeholder={t('dashboard:departmentAttendance.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-sub)]" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="pl-10"
              />
            </div>
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              {t('dashboard:departmentAttendance.export')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 mt-4">
            <div className="space-y-2">
              <p className="text-sm text-[var(--text-sub)]">{t('dashboard:departmentAttendance.stats.total')}</p>
              <p className="text-2xl font-bold text-[var(--text-main)]">
                {summary.total}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 mt-4">
            <div className="space-y-2">
              <p className="text-sm text-[var(--text-sub)]">{t('dashboard:departmentAttendance.stats.present')}</p>
              <p className="text-2xl font-bold text-green-500">
                {summary.present}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 mt-4">
            <div className="space-y-2">
              <p className="text-sm text-[var(--text-sub)]">{t('dashboard:departmentAttendance.stats.late')}</p>
              <p className="text-2xl font-bold text-orange-500">
                {summary.late}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 mt-4">
            <div className="space-y-2">
              <p className="text-sm text-[var(--text-sub)]">{t('dashboard:departmentAttendance.stats.absent')}</p>
              <p className="text-2xl font-bold text-red-500">
                {summary.absent}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard:departmentAttendance.todayList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-[var(--text-sub)]">
              {t('dashboard:departmentAttendance.table.loading')}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-sub)]">
              {t('dashboard:departmentAttendance.table.noData')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('dashboard:departmentAttendance.table.employee')}</TableHead>
                    <TableHead>{t('dashboard:departmentAttendance.table.date')}</TableHead>
                    <TableHead>{t('dashboard:departmentAttendance.table.checkIn')}</TableHead>
                    <TableHead>{t('dashboard:departmentAttendance.table.checkOut')}</TableHead>
                    <TableHead>{t('dashboard:departmentAttendance.table.hours')}</TableHead>
                    <TableHead>{t('dashboard:departmentAttendance.table.location')}</TableHead>
                    <TableHead>{t('dashboard:departmentAttendance.table.status')}</TableHead>
                    <TableHead>{t('dashboard:adminAttendance.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {getInitials(record.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-[var(--text-main)]">
                              {record.name}
                            </p>
                            <p className="text-sm text-[var(--text-sub)]">
                              ID: {record.employeeId || record.userId.slice(-3)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.checkIn || "-"}</TableCell>
                      <TableCell>{record.checkOut || "-"}</TableCell>
                      <TableCell>{record.hours}</TableCell>
                      <TableCell>{record.location}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-[var(--text-sub)]">
                Trang {pagination.page} / {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1),
                    }))
                  }
                  disabled={pagination.page === 1}
                >
                  {t('dashboard:departmentAttendance.pagination.prev')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.totalPages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                >
                  {t('dashboard:departmentAttendance.pagination.next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DepartmentAttendancePage;
