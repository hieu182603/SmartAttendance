import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { Label } from "../../ui/label";
import { Separator } from "../../ui/separator";
import { toast } from "sonner";
import {
  UserRole,
  type UserRoleType,
  ROLE_NAMES,
} from "../../../utils/roles";
import { useAuth } from "../../../context/AuthContext";
import {
  getAllAttendance,
  updateAttendanceRecord as updateAttendanceRecordApi,
  deleteAttendanceRecord as deleteAttendanceRecordApi,
} from "../../../services/attendanceService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

type AttendanceStatus = "ontime" | "late" | "absent" | string;

interface AttendanceRecordItem {
  id: string;
  userId: string | number;
  name: string;
  avatar: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  status: AttendanceStatus;
  location: string;
}

interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
}

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 15, 20, 25, 50];

const adminRoleOrder = [
  UserRole.MANAGER,
  UserRole.HR_MANAGER,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
] as const;

type AdminRoleType = (typeof adminRoleOrder)[number];

const ROLE_ACCESS_CONFIG: Record<
  AdminRoleType,
  {
    scope: string;
    description: string;
    actions: string[];
    limitations: string[];
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
  }
> = {
  [UserRole.MANAGER]: {
    scope: "Phòng ban phụ trách",
    description: "Theo dõi và xác nhận chấm công cho đội nhóm trực thuộc.",
    actions: [
      "Xem trạng thái chấm công phòng ban",
      "Gửi nhắc nhở đi muộn",
      "Xuất báo cáo bộ phận",
    ],
    limitations: [
      "Không chỉnh sửa thủ công bản ghi hệ thống",
      "Không xóa lịch sử chấm công",
    ],
    canEdit: false,
    canDelete: false,
    canExport: true,
  },
  [UserRole.HR_MANAGER]: {
    scope: "Toàn công ty",
    description:
      "Điều phối chính sách chấm công & hỗ trợ cập nhật thông tin cho nhân sự.",
    actions: [
      "Chỉnh sửa thời gian vào/ra thủ công",
      "Đăng ký chấm công hộ cho nhân viên",
      "Xuất Excel tổng hợp",
    ],
    limitations: ["Không xóa bản ghi đã khóa bởi Admin"],
    canEdit: true,
    canDelete: false,
    canExport: true,
  },
  [UserRole.ADMIN]: {
    scope: "Toàn bộ tổ chức",
    description:
      "Đảm bảo dữ liệu chấm công chính xác, đồng bộ với bảng lương & báo cáo.",
    actions: [
      "Quản trị trạng thái chấm công",
      "Khóa/mở khóa bản ghi",
      "Tích hợp báo cáo với payroll",
    ],
    limitations: ["Xóa bản ghi cần xác nhận từ Super Admin"],
    canEdit: true,
    canDelete: true,
    canExport: true,
  },
  [UserRole.SUPER_ADMIN]: {
    scope: "Toàn hệ thống",
    description:
      "Kiểm soát bảo mật & tuân thủ, xử lý sự cố hoặc override dữ liệu.",
    actions: [
      "Xóa/khôi phục bản ghi",
      "Quản lý phân quyền truy cập",
      "Đồng bộ dữ liệu đa chi nhánh",
    ],
    limitations: ["Cần ghi nhật ký hoạt động khi thao tác đặc biệt"],
    canEdit: true,
    canDelete: true,
    canExport: true,
  },
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "ontime":
      return (
        <Badge className="bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30">
          Đúng giờ
        </Badge>
      );
    case "late":
      return (
        <Badge className="bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30">
          Đi muộn
        </Badge>
      );
    case "absent":
      return (
        <Badge className="bg-[var(--error)]/20 text-[var(--error)] border-[var(--error)]/30">
          Vắng
        </Badge>
      );
    case "weekend":
      return (
        <Badge className="bg-[var(--shell)] text-[var(--text-main)] border-[var(--border)]">
          Cuối tuần
        </Badge>
      );
    default:
      return null;
  }
};

export default function AdminAttendancePage() {
  const { user } = useAuth();
  const resolvedRole = useMemo<UserRoleType>(() => {
    return (user?.role as UserRoleType) || UserRole.MANAGER;
  }, [user?.role]);

  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [summaryCounts, setSummaryCounts] = useState<AttendanceSummary>({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecordItem | null>(null);
  const [formData, setFormData] = useState({
    checkIn: "",
    checkOut: "",
    location: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [selectedDate, debouncedSearchTerm]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const calculateHours = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut || checkIn === "-" || checkOut === "-")
      return "-";

    const [inH, inM] = checkIn.split(":").map(Number);
    const [outH, outM] = checkOut.split(":").map(Number);

    let totalMinutes = outH * 60 + outM - (inH * 60 + inM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  };

  const formatTimeValue = (value: unknown): string => {
    if (!value) return "-";
    if (typeof value === "string" && value.includes(":")) return value;
    const date = new Date(value as string);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatHoursValue = (value: unknown, checkIn: string, checkOut: string): string => {
    if (typeof value === "string" && value.trim().length > 0) return value;
    if (typeof value === "number" && Number.isFinite(value)) {
      const hours = Math.floor(value);
      const minutes = Math.round((value - hours) * 60);
      return `${hours}h ${minutes}m`;
    }
    if (checkIn !== "-" && checkOut !== "-") {
      return calculateHours(checkIn, checkOut);
    }
    return "-";
  };

  const buildAvatar = (name: string) => {
    if (!name) return "NA";
    const initials = name
      .split(" ")
      .filter(Boolean)
      .map((segment) => segment[0])
      .join("")
      .slice(-2);
    return initials.toUpperCase() || "NA";
  };

  const pickString = (value: unknown): string | undefined => {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    return undefined;
  };

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await getAllAttendance({
        page,
        limit: pageSize,
        date: selectedDate || undefined,
        search: debouncedSearchTerm || undefined,
      });

      const normalized: AttendanceRecordItem[] = (response?.records ?? []).map(
        (item: Record<string, unknown>, index: number) => {
          const safeName =
            pickString(item.name) ??
            pickString(item.userName) ??
            pickString(item.employeeName) ??
            "Không rõ";
          const checkInValue = formatTimeValue(item.checkIn);
          const checkOutValue = formatTimeValue(item.checkOut);
          const statusValue =
            typeof item.status === "string"
              ? (item.status as AttendanceStatus)
              : "ontime";

          return {
            id: (item.id as string) ?? `attendance-${index}`,
            userId:
              pickString(item.userId) ??
              pickString(item.employeeId) ??
              pickString(item.employeeCode) ??
              "N/A",
            name: safeName,
            avatar: buildAvatar(safeName),
            date: pickString(item.date) ?? "-",
            checkIn: checkInValue,
            checkOut: checkOutValue,
            hours: formatHoursValue(item.hours, checkInValue, checkOutValue),
            status: statusValue,
            location: pickString(item.location) ?? "-",
          };
        }
      );

      setRecords(normalized);

      const fallbackSummary = {
        total: normalized.length,
        present: normalized.filter((r) => r.status === "ontime").length,
        late: normalized.filter((r) => r.status === "late").length,
        absent: normalized.filter((r) => r.status === "absent").length,
      };

      setSummaryCounts({
        total: response?.summary?.total ?? fallbackSummary.total,
        present: response?.summary?.present ?? fallbackSummary.present,
        late: response?.summary?.late ?? fallbackSummary.late,
        absent: response?.summary?.absent ?? fallbackSummary.absent,
      });

      setPaginationInfo({
        page: response?.pagination?.page ?? page,
        limit: response?.pagination?.limit ?? pageSize,
        total: response?.pagination?.total ?? normalized.length,
        totalPages: response?.pagination?.totalPages ?? 1,
      });
    } catch (error) {
      console.warn("[AdminAttendance] getAllAttendance failed", error);
      setFetchError("Không thể tải dữ liệu chấm công");
      setRecords([]);
      toast.error("Không thể tải dữ liệu chấm công");
      setSummaryCounts({ total: 0, present: 0, late: 0, absent: 0 });
      setPaginationInfo({
        page: 1,
        limit: pageSize,
        total: 0,
        totalPages: 1,
      });
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm, page, pageSize, selectedDate]);

  useEffect(() => {
    void fetchAttendance();
  }, [fetchAttendance]);

  const handleViewRecord = (record: AttendanceRecordItem) => {
    setSelectedRecord(record);
    setIsViewDialogOpen(true);
  };

  const handleEditRecord = (record: AttendanceRecordItem) => {
    setSelectedRecord(record);
    setFormData({
      checkIn: record.checkIn === "-" ? "" : record.checkIn,
      checkOut: record.checkOut === "-" ? "" : record.checkOut,
      location: record.location === "-" ? "" : record.location,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteRecord = (record: AttendanceRecordItem) => {
    setSelectedRecord(record);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitEdit = async () => {
    if (!selectedRecord) return;
    setIsSaving(true);
    try {
      await updateAttendanceRecordApi(selectedRecord.id, {
        checkIn: formData.checkIn ? formData.checkIn : null,
        checkOut: formData.checkOut ? formData.checkOut : null,
        locationName: formData.location.trim() ? formData.location.trim() : null,
      });
      toast.success("✅ Đã cập nhật thông tin chấm công");
      setIsEditDialogOpen(false);
      setSelectedRecord(null);
      await fetchAttendance();
    } catch (error) {
      console.error("[AdminAttendance] update error", error);
      toast.error("Không thể cập nhật bản ghi");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    setIsDeleting(true);
    try {
      await deleteAttendanceRecordApi(selectedRecord.id);
      toast.success("🗑️ Đã xóa bản ghi chấm công");
      setIsDeleteDialogOpen(false);
      setSelectedRecord(null);
      await fetchAttendance();
    } catch (error) {
      console.error("[AdminAttendance] delete error", error);
      toast.error("Không thể xóa bản ghi");
    } finally {
      setIsDeleting(false);
    }
  };

  const adminRole = (resolvedRole === UserRole.EMPLOYEE ? UserRole.MANAGER : resolvedRole) as AdminRoleType;
  const roleConfig = ROLE_ACCESS_CONFIG[adminRole];

  const hasRecords = paginationInfo.total > 0;
  const paginationStart = hasRecords
    ? (paginationInfo.page - 1) * paginationInfo.limit + 1
    : 0;
  const paginationEnd = hasRecords
    ? Math.min(paginationInfo.page * paginationInfo.limit, paginationInfo.total)
    : 0;

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > (paginationInfo?.totalPages ?? 1)) {
      return;
    }
    setPage(nextPage);
  };

  const handlePageSizeChange = (value: number) => {
    if (value === pageSize) return;
    setPageSize(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl text-[var(--text-main)]">Quản lý chấm công</h1>
        <p className="text-sm text-[var(--text-sub)]">
          Vai trò hiện tại:{" "}
          <span className="font-semibold text-[var(--text-main)]">{ROLE_NAMES[resolvedRole]}</span>
        </p>
      </div>
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="mt-4 flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-sub)]" />
              <Input
                placeholder="Tìm theo tên nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
              />
            </div>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="md:w-48 bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
            />
            <Button
              variant="outline"
              disabled={!roleConfig.canExport}
              className="border-[var(--border)] text-[var(--text-main)] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() =>
                toast.success(
                  roleConfig.canExport
                    ? "📊 Đang xuất file Excel..."
                    : "⚠️ Vai trò hiện tại không được phép xuất Excel"
                )
              }
            >
              <Download className="h-4 w-4 mr-2" />
              Xuất Excel
            </Button>
          </div>
        </CardContent>
      </Card>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-4 text-center mt-4">
              <p className="text-sm text-[var(--text-sub)]">Tổng NV</p>
              <p className="text-2xl text-[var(--text-main)] mt-1">
                {summaryCounts.total}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-4 text-center mt-4">
              <p className="text-sm text-[var(--text-sub)]">Có mặt</p>
              <p className="text-2xl text-[var(--success)] mt-1">
                {summaryCounts.present}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-4 text-center mt-4">
              <p className="text-sm text-[var(--text-sub)]">Đi muộn</p>
              <p className="text-2xl text-[var(--warning)] mt-1">
                {summaryCounts.late}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-4 text-center mt-4">
              <p className="text-sm text-[var(--text-sub)]">Vắng</p>
              <p className="text-2xl text-[var(--error)] mt-1">
                {summaryCounts.absent}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-main)]">
              Danh sách chấm công hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--shell)]">
                    <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                      Nhân viên
                    </th>
                    <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                      Ngày
                    </th>
                    <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                      Giờ vào
                    </th>
                    <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                      Giờ ra
                    </th>
                    <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                      Tổng giờ
                    </th>
                    <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                      Địa điểm
                    </th>
                    <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                      Trạng thái
                    </th>
                    <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[var(--text-sub)]">
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  ) : fetchError ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[var(--error)]">
                        {fetchError}
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[var(--text-sub)]">
                        Không có bản ghi nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    records.map((record, index) => (
                      <tr
                        key={record.id}
                        className={`border-b border-[var(--border)] hover:bg-[var(--shell)] transition-colors ${index % 2 === 0 ? "bg-[var(--shell)]/50" : ""
                          }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-[var(--primary)] text-white text-xs">
                                {record.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-[var(--text-main)]">
                                {record.name}
                              </p>
                              <p className="text-xs text-[var(--text-sub)]">
                                ID: {record.userId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[var(--text-main)]">
                          {record.date}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-main)]">
                          {record.checkIn}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-main)]">
                          {record.checkOut}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-main)]">
                          {record.hours}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-sub)]">
                          {record.location}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleViewRecord(record)}
                              className="rounded p-1 text-[var(--accent-cyan)] hover:bg-[var(--shell)]"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditRecord(record)}
                              disabled={!roleConfig.canEdit}
                              className="rounded p-1 text-[var(--primary)] hover:bg-[var(--shell)] disabled:cursor-not-allowed disabled:text-[var(--text-sub)] disabled:opacity-40"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(record)}
                              disabled={!roleConfig.canDelete}
                              className="rounded p-1 text-[var(--error)] hover:bg-[var(--shell)] disabled:cursor-not-allowed disabled:text-[var(--text-sub)] disabled:opacity-40"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 mt-4 text-[var(--text-sub)]">
            <div className="flex items-center gap-2 text-sm">
              <span>
                Hiển thị {paginationStart} - {paginationEnd} /{" "}
                {paginationInfo.total.toLocaleString("vi-VN")}
              </span>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-2">
                <span>Số dòng:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(v) => handlePageSizeChange(Number(v))}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-24 h-9 bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="top" className="bg-[var(--surface)] border-[var(--border)]">
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option.toString()}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-[var(--border)] text-[var(--text-main)]"
                disabled={paginationInfo.page === 1 || isLoading}
                onClick={() => handlePageChange(1)}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-[var(--border)] text-[var(--text-main)]"
                disabled={paginationInfo.page === 1 || isLoading}
                onClick={() => handlePageChange(paginationInfo.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-4 text-sm text-[var(--text-main)]">
                Trang {paginationInfo.page} / {paginationInfo.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-[var(--border)] text-[var(--text-main)]"
                disabled={
                  paginationInfo.page >= paginationInfo.totalPages || isLoading
                }
                onClick={() => handlePageChange(paginationInfo.page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-[var(--border)] text-[var(--text-main)]"
                disabled={
                  paginationInfo.page >= paginationInfo.totalPages || isLoading
                }
                onClick={() => handlePageChange(paginationInfo.totalPages)}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Chi tiết chấm công</DialogTitle>
              <DialogDescription className="text-[var(--text-sub)]">
                Thông tin chi tiết về bản ghi chấm công
              </DialogDescription>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-5 py-2">
                {/* Employee Info Section */}
                <div className="flex items-center space-x-4 p-4 bg-[var(--shell)] rounded-xl">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white text-lg font-semibold">
                      {selectedRecord.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[var(--text-main)]">
                      {selectedRecord.name}
                    </h3>
                    <p className="text-sm text-[var(--text-sub)]">
                      Mã nhân viên: {selectedRecord.userId}
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(selectedRecord.status)}
                  </div>
                </div>

                <Separator className="bg-[var(--border)]" />

                {/* Attendance Details */}
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-sub)] uppercase tracking-wide mb-3">
                    Thông tin chấm công
                  </h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-[var(--text-sub)]">Ngày làm việc</Label>
                      <p className="text-[var(--text-main)] font-medium">
                        {selectedRecord.date}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[var(--text-sub)]">Tổng giờ làm</Label>
                      <p className="text-[var(--text-main)] font-medium">
                        {selectedRecord.hours}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[var(--text-sub)]">Giờ vào</Label>
                      <p className="text-[var(--text-main)] font-medium">
                        {selectedRecord.checkIn}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[var(--text-sub)]">Giờ ra</Label>
                      <p className="text-[var(--text-main)] font-medium">
                        {selectedRecord.checkOut}
                      </p>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-[var(--text-sub)] flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        Địa điểm làm việc
                      </Label>
                      <p className="text-[var(--text-main)] font-medium">
                        {selectedRecord.location}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsViewDialogOpen(false)}
                className="border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--shell)]"
              >
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa bản ghi chấm công</DialogTitle>
              <DialogDescription className="text-[var(--text-sub)]">
                Cập nhật thông tin chấm công cho {selectedRecord?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Giờ vào</Label>
                  <Input
                    type="time"
                    className="bg-[var(--input-bg)] border-[var(--border)]"
                    value={formData.checkIn}
                    onChange={(e) =>
                      setFormData({ ...formData, checkIn: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giờ ra</Label>
                  <Input
                    type="time"
                    className="bg-[var(--input-bg)] border-[var(--border)]"
                    value={formData.checkOut}
                    onChange={(e) =>
                      setFormData({ ...formData, checkOut: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Địa điểm</Label>
                <Input
                  placeholder="Văn phòng HN"
                  className="bg-[var(--input-bg)] border-[var(--border)]"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
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
                disabled={isSaving}
                className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] disabled:opacity-60"
                >
                {isSaving ? "Đang lưu..." : "Cập nhật"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
            <DialogHeader>
              <DialogTitle>Xác nhận xóa bản ghi</DialogTitle>
              <DialogDescription className="text-[var(--text-sub)]">
                Bạn có chắc chắn muốn xóa bản ghi chấm công này?
              </DialogDescription>
            </DialogHeader>
            {selectedRecord && (
              <div className="py-4">
                <div className="flex items-center space-x-3 p-4 bg-[var(--shell)] rounded-lg">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-[var(--error)] text-white">
                      {selectedRecord.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[var(--text-main)]">
                      {selectedRecord.name}
                    </p>
                    <p className="text-sm text-[var(--text-sub)]">
                      {selectedRecord.date}
                    </p>
                    <p className="text-xs text-[var(--text-sub)]">
                      {selectedRecord.checkIn} - {selectedRecord.checkOut}
                    </p>
                  </div>
                </div>
                <p className="text-[var(--error)] text-sm mt-4">
                  ⚠️ Hành động này không thể hoàn tác. Bản ghi chấm công sẽ bị xóa
                  vĩnh viễn.
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
              disabled={isDeleting}
              className="bg-[var(--error)] hover:bg-[var(--error)]/90 text-white disabled:opacity-60"
              >
              {isDeleting ? "Đang xóa..." : "Xóa bản ghi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
