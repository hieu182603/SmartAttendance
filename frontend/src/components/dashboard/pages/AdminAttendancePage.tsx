import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Download,
  Eye,
  Edit,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  UserRole,
  type UserRoleType,
  ROLE_NAMES,
} from "@/utils/roles";
import { useAuth } from "@/context/AuthContext";
import {
  getAllAttendance,
  updateAttendanceRecord as updateAttendanceRecordApi,
} from "@/services/attendanceService";
import { getAllLocations } from "@/services/locationService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AttendanceStatus = "ontime" | "late" | "absent" | "overtime" | "weekend";

interface AttendanceRecordItem {
  id: string;
  userId: string | number;
  name: string;
  role: string;
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
const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];
// STATUS_FILTER_OPTIONS will be created inside component to use translation

type StatusFilterValue = (typeof STATUS_FILTER_OPTIONS)[number]["value"];

const adminRoleOrder = [
  UserRole.MANAGER,
  UserRole.HR_MANAGER,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
] as const;

type AdminRoleType = (typeof adminRoleOrder)[number];

type RoleAccessEntry = {
  scope: string;
  description: string;
  actions: string[];
  limitations: string[];
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
};

const buildRoleAccessConfig = (
  t: (key: string) => string
): Record<AdminRoleType, RoleAccessEntry> => ({
  [UserRole.MANAGER]: {
    scope: t("dashboard:adminAttendance.roles.manager.scope"),
    description: t("dashboard:adminAttendance.roles.manager.description"),
    actions: [
      t("dashboard:adminAttendance.roles.manager.actions.0"),
      t("dashboard:adminAttendance.roles.manager.actions.1"),
      t("dashboard:adminAttendance.roles.manager.actions.2"),
    ],
    limitations: [
      t("dashboard:adminAttendance.roles.manager.limitations.0"),
      t("dashboard:adminAttendance.roles.manager.limitations.1"),
    ],
    canEdit: false,
    canDelete: false,
    canExport: true,
  },
  [UserRole.HR_MANAGER]: {
    scope: t("dashboard:adminAttendance.roles.hr.scope"),
    description: t("dashboard:adminAttendance.roles.hr.description"),
    actions: [
      t("dashboard:adminAttendance.roles.hr.actions.0"),
      t("dashboard:adminAttendance.roles.hr.actions.1"),
      t("dashboard:adminAttendance.roles.hr.actions.2"),
    ],
    limitations: [t("dashboard:adminAttendance.roles.hr.limitations.0")],
    canEdit: true,
    canDelete: false,
    canExport: true,
  },
  [UserRole.ADMIN]: {
    scope: t("dashboard:adminAttendance.roles.admin.scope"),
    description: t("dashboard:adminAttendance.roles.admin.description"),
    actions: [
      t("dashboard:adminAttendance.roles.admin.actions.0"),
      t("dashboard:adminAttendance.roles.admin.actions.1"),
      t("dashboard:adminAttendance.roles.admin.actions.2"),
    ],
    limitations: [t("dashboard:adminAttendance.roles.admin.limitations.0")],
    canEdit: true,
    canDelete: true,
    canExport: true,
  },
  [UserRole.SUPER_ADMIN]: {
    scope: t("dashboard:adminAttendance.roles.super.scope"),
    description: t("dashboard:adminAttendance.roles.super.description"),
    actions: [
      t("dashboard:adminAttendance.roles.super.actions.0"),
      t("dashboard:adminAttendance.roles.super.actions.1"),
      t("dashboard:adminAttendance.roles.super.actions.2"),
    ],
    limitations: [t("dashboard:adminAttendance.roles.super.limitations.0")],
    canEdit: true,
    canDelete: true,
    canExport: true,
  },
});

const getStatusBadge = (status: string, t: (key: string) => string) => {
  switch (status) {
    case "ontime":
      return (
        <Badge className="bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30">
          {t('dashboard:adminAttendance.filters.ontime')}
        </Badge>
      );
    case "late":
      return (
        <Badge className="bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30">
          {t('dashboard:adminAttendance.filters.late')}
        </Badge>
      );
    case "absent":
      return (
        <Badge className="bg-[var(--error)]/20 text-[var(--error)] border-[var(--error)]/30">
          {t('dashboard:adminAttendance.filters.absent')}
        </Badge>
      );
    case "overtime":
      return (
        <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">
          {t('dashboard:adminAttendance.filters.overtime')}
        </Badge>
      );
    case "weekend":
      return (
        <Badge className="bg-[var(--text-sub)]/20 text-[var(--text-sub)] border-[var(--text-sub)]/30">
          {t('dashboard:adminAttendance.filters.weekend')}
        </Badge>
      );
    default:
      return null;
  }
};

export default function AdminAttendancePage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuth();
  
  const STATUS_FILTER_OPTIONS = [
    { label: t('dashboard:adminAttendance.filters.allStatus'), value: "all" },
    { label: t('dashboard:adminAttendance.filters.ontime'), value: "ontime" },
    { label: t('dashboard:adminAttendance.filters.late'), value: "late" },
    { label: t('dashboard:adminAttendance.filters.absent'), value: "absent" },
    { label: t('dashboard:adminAttendance.filters.overtime'), value: "overtime" },
    { label: t('dashboard:adminAttendance.filters.weekend'), value: "weekend" },
  ] as const;
  const resolvedRole = useMemo<UserRoleType>(() => {
    return (user?.role as UserRoleType) || UserRole.MANAGER;
  }, [user?.role]);
  const roleAccessConfig = useMemo(
    () => buildRoleAccessConfig(t),
    [t]
  );

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
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
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
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecordItem | null>(null);
  const [formData, setFormData] = useState({
    checkIn: "",
    checkOut: "",
    locationId: "",
  });
  const [locations, setLocations] = useState<Array<{ _id: string; name: string }>>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const checkInInputRef = useRef<HTMLInputElement>(null);
  const checkOutInputRef = useRef<HTMLInputElement>(null);

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
        status: statusFilter === "all" ? undefined : statusFilter,
      });

      const fallbackName = t('dashboard:adminAttendance.fallbackName');
      const normalized: AttendanceRecordItem[] = (response?.records ?? []).map(
        (item: Record<string, unknown>, index: number) => {
          const safeName =
            pickString(item.name) ??
            pickString(item.userName) ??
            pickString(item.employeeName) ??
            fallbackName;
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
            role: pickString(item.role) ?? pickString(item.userRole) ?? "N/A",
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
      setFetchError(t('dashboard:adminAttendance.error'));
      setRecords([]);
      toast.error(t('dashboard:adminAttendance.error'));
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
  }, [debouncedSearchTerm, page, pageSize, selectedDate, statusFilter]);

  useEffect(() => {
    void fetchAttendance();
  }, [fetchAttendance]);

  // Lắng nghe sự kiện realtime khi attendance được cập nhật
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAttendanceUpdated = ((event: Event) => {
      const customEvent = event as CustomEvent<any>;
      const data = customEvent.detail;

      // Refetch danh sách attendance để cập nhật mà không cần F5
      fetchAttendance();
    }) as EventListener;

    window.addEventListener('attendance-updated', handleAttendanceUpdated);

    return () => {
      window.removeEventListener('attendance-updated', handleAttendanceUpdated);
    };
  }, [fetchAttendance]);

  // Fetch locations when component mounts
  useEffect(() => {
    const loadLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const locationList = await getAllLocations();
        setLocations(locationList.map((loc) => ({ _id: loc._id, name: loc.name })));
      } catch (error) {
        console.error("[AdminAttendance] Failed to load locations", error);
        toast.error(t('dashboard:adminAttendance.error'));
      } finally {
        setIsLoadingLocations(false);
      }
    };
    void loadLocations();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const handleViewRecord = (record: AttendanceRecordItem) => {
    setSelectedRecord(record);
    setIsViewDialogOpen(true);
  };

  const handleEditRecord = (record: AttendanceRecordItem) => {
    setSelectedRecord(record);
    // Tìm locationId từ location name
    const matchedLocation = locations.find((loc) => loc.name === record.location);
    setFormData({
      checkIn: record.checkIn === "-" ? "" : record.checkIn,
      checkOut: record.checkOut === "-" ? "" : record.checkOut,
      locationId: matchedLocation?._id || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmitEdit = async () => {
    if (!selectedRecord) return;
    setIsSaving(true);
    try {
      // Nếu là record vắng (ID bắt đầu bằng "absent-"), cần gửi thêm date
      const updatePayload: {
        checkIn?: string | null;
        checkOut?: string | null;
        locationId?: string | null;
        locationName?: string | null;
        date?: string;
      } = {
        checkIn: formData.checkIn ? formData.checkIn : null,
        checkOut: formData.checkOut ? formData.checkOut : null,
        locationId: formData.locationId ? formData.locationId : null,
      };

      // Nếu là record vắng, gửi thêm date để backend có thể tạo record mới
      if (selectedRecord.id.startsWith("absent-")) {
        // Ưu tiên dùng selectedDate (format: YYYY-MM-DD)
        if (selectedDate) {
          updatePayload.date = selectedDate;
        } else {
          // Parse date từ selectedRecord.date (format: DD/MM/YYYY)
          const dateParts = selectedRecord.date.split("/");
          if (dateParts.length === 3) {
            const [day, month, year] = dateParts;
            updatePayload.date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          } else {
            // Fallback: dùng ngày hôm nay
            const today = new Date();
            updatePayload.date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          }
        }
      }

      await updateAttendanceRecordApi(selectedRecord.id, updatePayload);
      toast.success(t('dashboard:adminAttendance.editDialog.success'));
      setIsEditDialogOpen(false);
      setSelectedRecord(null);
      await fetchAttendance();
    } catch (error: unknown) {
      console.error("[AdminAttendance] update error", error);
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error.response as { data?: { message?: string } })?.data?.message ||
          t('dashboard:adminAttendance.editDialog.error')
          : t('dashboard:adminAttendance.editDialog.error');
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const adminRole = (resolvedRole === UserRole.EMPLOYEE ? UserRole.MANAGER : resolvedRole) as AdminRoleType;
  const roleConfig = roleAccessConfig[adminRole];

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

  const openCheckInPicker = () => {
    if (!checkInInputRef.current) return;
    if (checkInInputRef.current.showPicker) {
      checkInInputRef.current.showPicker();
    } else {
      checkInInputRef.current.focus();
    }
  };

  const openCheckOutPicker = () => {
    if (!checkOutInputRef.current) return;
    if (checkOutInputRef.current.showPicker) {
      checkOutInputRef.current.showPicker();
    } else {
      checkOutInputRef.current.focus();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl text-[var(--text-main)]">{t('dashboard:adminAttendance.title')}</h1>
        <p className="text-sm text-[var(--text-sub)]">
          {t('dashboard:adminAttendance.currentRole')}{" "}
          <span className="font-semibold text-[var(--text-main)]">{ROLE_NAMES[resolvedRole]}</span>
        </p>
      </div>
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="mt-4 flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-sub)]" />
              <Input
                placeholder={t('dashboard:adminAttendance.searchPlaceholder')}
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
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilterValue)}
            >
              <SelectTrigger className="md:w-48 bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]">
                <SelectValue placeholder={t('dashboard:adminAttendance.table.status')} />
              </SelectTrigger>
              <SelectContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={!roleConfig.canExport}
              className="border-[var(--border)] text-[var(--text-main)] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() =>
                toast.success(
                  roleConfig.canExport
                    ? t('dashboard:adminAttendance.toasts.exporting')
                    : t('dashboard:adminAttendance.toasts.noPermission')
                )
              }
            >
              <Download className="h-4 w-4 mr-2" />
              {t('dashboard:adminAttendance.export')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center mt-4">
            <p className="text-sm text-[var(--text-sub)]">{t('dashboard:adminAttendance.totalEmployees')}</p>
            <p className="text-2xl text-[var(--text-main)] mt-1">
              {summaryCounts.total}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center mt-4">
            <p className="text-sm text-[var(--text-sub)]">{t('dashboard:adminAttendance.stats.present')}</p>
            <p className="text-2xl text-[var(--success)] mt-1">
              {summaryCounts.present}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center mt-4">
            <p className="text-sm text-[var(--text-sub)]">{t('dashboard:adminAttendance.stats.late')}</p>
            <p className="text-2xl text-[var(--warning)] mt-1">
              {summaryCounts.late}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center mt-4">
            <p className="text-sm text-[var(--text-sub)]">{t('dashboard:adminAttendance.stats.absent')}</p>
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
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--shell)]">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--text-main)] first:rounded-tl-lg w-[22%]">
                    {t('dashboard:adminAttendance.table.employee')}
                  </th>
                  <th className="text-left py-4 px-3 text-sm font-semibold text-[var(--text-main)] whitespace-nowrap w-[11%]">
                    {t('dashboard:adminAttendance.table.date')}
                  </th>
                  <th className="text-left py-4 px-3 text-sm font-semibold text-[var(--text-main)] whitespace-nowrap w-[9%]">
                    {t('dashboard:adminAttendance.table.checkIn')}
                  </th>
                  <th className="text-left py-4 px-3 text-sm font-semibold text-[var(--text-main)] whitespace-nowrap w-[9%]">
                    {t('dashboard:adminAttendance.table.checkOut')}
                  </th>
                  <th className="text-left py-4 px-3 text-sm font-semibold text-[var(--text-main)] whitespace-nowrap w-[9%]">
                    {t('dashboard:adminAttendance.table.hours')}
                  </th>
                  <th className="text-left py-4 px-3 text-sm font-semibold text-[var(--text-main)] w-[18%]">
                    {t('dashboard:adminAttendance.table.location')}
                  </th>
                  <th className="text-left py-4 px-3 text-sm font-semibold text-[var(--text-main)] w-[12%]">
                    {t('dashboard:adminAttendance.table.status')}
                  </th>
                  <th className="text-center py-4 px-4 text-sm font-semibold text-[var(--text-main)] last:rounded-tr-lg whitespace-nowrap w-[10%]">
                    {t('dashboard:adminAttendance.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[var(--text-sub)]">
                      {t('dashboard:adminAttendance.table.loading')}
                    </td>
                  </tr>
                ) : fetchError ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[var(--error)]">
                      {fetchError}
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[var(--text-sub)]">
                      {t('dashboard:adminAttendance.table.noData')}
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--shell)]/70 transition-all duration-150"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-cyan)] text-white text-xs font-semibold">
                              {record.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-main)]">
                              {record.name}
                            </p>
                            <p className="text-xs text-[var(--text-sub)]">
                              Role: {record.role}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-sm text-[var(--text-main)] whitespace-nowrap">
                        {record.date}
                      </td>
                      <td className="py-4 px-3 text-sm font-medium text-[var(--text-main)] whitespace-nowrap">
                        {record.checkIn}
                      </td>
                      <td className="py-4 px-3 text-sm font-medium text-[var(--text-main)] whitespace-nowrap">
                        {record.checkOut}
                      </td>
                      <td className="py-4 px-3 text-sm font-medium text-[var(--text-main)] whitespace-nowrap">
                        {record.hours}
                      </td>
                      <td className="py-4 px-3 text-sm text-[var(--text-sub)]">
                        {record.location}
                      </td>
                      <td className="py-4 px-3">
                        {getStatusBadge(record.status, t)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleViewRecord(record)}
                            className="rounded-md p-2 text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 transition-colors"
                            title={t('dashboard:adminAttendance.table.view')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditRecord(record)}
                            disabled={!roleConfig.canEdit}
                            className="rounded-md p-2 text-[var(--primary)] hover:bg-[var(--primary)]/10 disabled:cursor-not-allowed disabled:text-[var(--text-sub)] disabled:opacity-40 transition-colors"
                            title={t('dashboard:adminAttendance.table.edit')}
                          >
                            <Edit className="h-4 w-4" />
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
                {t('dashboard:adminAttendance.pagination.showing')} {paginationStart} - {paginationEnd} {t('dashboard:adminAttendance.pagination.of')}{" "}
                {paginationInfo.total.toLocaleString("vi-VN")}
              </span>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-2">
                <span>{t('dashboard:adminAttendance.pagination.rowsPerPage')}</span>
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
                {t('dashboard:adminAttendance.pagination.page')} {paginationInfo.page} / {paginationInfo.totalPages}
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
            <DialogTitle className="text-xl font-semibold">{t('dashboard:adminAttendance.viewDialog.title')}</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              {t('dashboard:adminAttendance.viewDialog.title')}
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
                    {t('dashboard:adminAttendance.details.employeeCode')} {selectedRecord.userId}
                  </p>
                </div>
                <div>
                  {getStatusBadge(selectedRecord.status, t)}
                </div>
              </div>

              <Separator className="bg-[var(--border)]" />

              {/* Attendance Details */}
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-sub)] uppercase tracking-wide mb-3">
                  {t('dashboard:adminAttendance.details.attendanceInfo')}
                </h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-[var(--text-sub)]">{t('dashboard:adminAttendance.details.workDate')}</Label>
                    <p className="text-[var(--text-main)] font-medium">
                      {selectedRecord.date}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[var(--text-sub)]">{t('dashboard:adminAttendance.details.totalHours')}</Label>
                    <p className="text-[var(--text-main)] font-medium">
                      {selectedRecord.hours}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[var(--text-sub)]">{t('dashboard:adminAttendance.editDialog.checkIn')}</Label>
                    <p className="text-[var(--text-main)] font-medium">
                      {selectedRecord.checkIn}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[var(--text-sub)]">{t('dashboard:adminAttendance.editDialog.checkOut')}</Label>
                    <p className="text-[var(--text-main)] font-medium">
                      {selectedRecord.checkOut}
                    </p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs text-[var(--text-sub)] flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {t('dashboard:adminAttendance.details.workLocation')}
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
              {t('dashboard:adminAttendance.details.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
          <DialogHeader>
            <DialogTitle>{t('dashboard:adminAttendance.editDialog.title')}</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              {t('dashboard:adminAttendance.editDialog.title')} {selectedRecord?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('dashboard:adminAttendance.editDialog.checkIn')}</Label>
                <div className="relative">
                  <Input
                    ref={checkInInputRef}
                    type="time"
                    className="time-input bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] pl-4 pr-10"
                    value={formData.checkIn}
                    onChange={(e) =>
                      setFormData({ ...formData, checkIn: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={openCheckInPicker}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors"
                    aria-label={t('dashboard:adminAttendance.aria.pickCheckIn')}
                  >
                    <Clock className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('dashboard:adminAttendance.editDialog.checkOut')}</Label>
                <div className="relative">
                  <Input
                    ref={checkOutInputRef}
                    type="time"
                    className="time-input bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] pl-4 pr-10"
                    value={formData.checkOut}
                    onChange={(e) =>
                      setFormData({ ...formData, checkOut: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={openCheckOutPicker}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors"
                    aria-label={t('dashboard:adminAttendance.aria.pickCheckOut')}
                  >
                    <Clock className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('dashboard:adminAttendance.editDialog.location')}</Label>
              <Select
                value={formData.locationId}
                onValueChange={(value) =>
                  setFormData({ ...formData, locationId: value })
                }
                disabled={isLoadingLocations}
              >
                <SelectTrigger className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]">
                  <SelectValue placeholder={isLoadingLocations ? t('common:loading') : t('dashboard:adminAttendance.editDialog.selectLocation')} />
                </SelectTrigger>
                <SelectContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
                  {isLoadingLocations ? (
                    <div className="px-2 py-1.5 text-sm text-[var(--text-sub)]">
                      {t('dashboard:adminAttendance.locations.loading')}
                    </div>
                  ) : locations.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-[var(--text-sub)]">
                      {t('dashboard:adminAttendance.locations.empty')}
                    </div>
                  ) : (
                    locations.map((location) => (
                      <SelectItem key={location._id} value={location._id}>
                        {location.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="border-[var(--border)] text-[var(--text-main)]"
              >
                {t('dashboard:adminAttendance.editDialog.cancel')}
              </Button>
              <Button
                onClick={handleSubmitEdit}
                disabled={isSaving}
                className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] disabled:opacity-60"
              >
                {isSaving ? t('dashboard:adminAttendance.editDialog.saving') : t('dashboard:adminAttendance.editDialog.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
