import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAttendanceHistory } from "@/services/attendanceService";
import {
  getAttendanceStatusBadgeClass,
  type AttendanceStatus,
} from "@/utils/attendanceStatus";

// ============================================================================
// CONSTANTS
// ============================================================================
const ITEMS_PER_PAGE = 20; // Số records mỗi page
const STATS_LIMIT = 100; // Giảm từ 1000 → 100 để tránh lag

interface AttendanceRecord {
  id?: string;
  date: string;
  day: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  location: string;
  status: AttendanceStatus;
  notes: string;
  checkInPhoto?: string;
  checkOutPhoto?: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type TranslationFunction = ReturnType<
  typeof useTranslation<["dashboard", "common"]>
>["t"];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const getStatusBadge = (
  status: AttendanceStatus,
  t: TranslationFunction
): React.JSX.Element | null => {
  const statusLabels: Record<AttendanceStatus, string> = {
    ontime: t("dashboard:history.statusLabels.ontime"),
    late: t("dashboard:history.statusLabels.late"),
    absent: t("dashboard:history.statusLabels.absent"),
    overtime: t("dashboard:history.statusLabels.overtime"),
    weekend: t("dashboard:history.statusLabels.weekend"),
    on_leave: t("dashboard:history.statusLabels.onLeave", {
      defaultValue: "Nghỉ phép",
    }),
    unknown: t("dashboard:history.statusLabels.unknown", {
      defaultValue: "Không xác định",
    }),
  };

  if (status === "absent") {
    return <Badge variant="error">{statusLabels[status]}</Badge>;
  }

  return (
    <Badge className={getAttendanceStatusBadgeClass(status)}>
      {statusLabels[status]}
    </Badge>
  );
};

const extractPhotoUrl = (
  notes: string,
  location: string,
  type: "checkin" | "checkout"
): string | null => {
  try {
    if (type === "checkin") {
      // Try extracting from notes first
      const checkInMatch = notes?.match(/\[Ảnh:\s*(https?:\/\/[^\]]+)\]/);
      if (checkInMatch) {
        const url = checkInMatch[1].trim();
        // Validate URL before returning
        if (url.startsWith("http")) return url;
      }

      // Fallback to location field
      const locationMatch = location?.match(/https?:\/\/[^\s]+/);
      if (locationMatch) {
        const url = locationMatch[0].trim();
        if (url.startsWith("http")) return url;
      }
    } else {
      const checkOutMatch = notes?.match(
        /\[Ảnh check-out:\s*(https?:\/\/[^\]]+)\]/i
      );
      if (checkOutMatch) {
        const url = checkOutMatch[1].trim();
        if (url.startsWith("http")) return url;
      }
    }
  } catch (error) {
    console.error("[HistoryPage] Error extracting photo URL:", error);
  }
  return null;
};

const formatLocation = (
  location: string | undefined,
  t: TranslationFunction
): string => {
  if (!location) return "-";

  // Check if it's a URL (any URL pattern)
  try {
    const url = new URL(location);
    // If it's a valid URL, assume it's office location
    return t("dashboard:history.office");
  } catch {
    // Not a URL, continue checking
  }

  // Check common URL patterns that might not parse as URL
  const urlPatterns = [
    /^https?:\/\//i, // Standard http(s)
    /cloudinary\.com/i, // Cloudinary CDN
    /s3\.amazonaws\.com/i, // AWS S3
    /firebasestorage/i, // Firebase Storage
    /blob\.core\.windows/i, // Azure Blob
    /attendance/i, // Contains "attendance"
  ];

  for (const pattern of urlPatterns) {
    if (pattern.test(location)) {
      return t("dashboard:history.office");
    }
  }

  // If not URL, return as-is (could be branch name or address)
  return location;
};

// ============================================================================
// COMPONENT
// ============================================================================
const HistoryPage: React.FC = () => {
  const { t } = useTranslation(["dashboard", "common"]);

  // ==========================================================================
  // STATE
  // ==========================================================================
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AttendanceStatus>(
    "all"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"checkin" | "checkout">("checkin");
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 0,
  });

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================
  const summary = useMemo(() => {
    const total = allRecords.length;
    const late = allRecords.filter((item) => item.status === "late").length;
    const absent = allRecords.filter((item) => item.status === "absent").length;
    const overtime = allRecords.filter(
      (item) => item.status === "overtime"
    ).length;
    return { total, late, absent, overtime };
  }, [allRecords]);

  const hasFilters = fromDate || toDate || statusFilter !== "all";

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const baseParams = {
          from: fromDate || undefined,
          to: toDate || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        };

        const [paginatedResult, statsResult] = await Promise.all([
          getAttendanceHistory({
            ...baseParams,
            page: currentPage,
            limit: ITEMS_PER_PAGE,
          }),
          hasFilters
            ? Promise.resolve(null)
            : getAttendanceHistory({ ...baseParams, limit: STATS_LIMIT }),
        ]);

        if (isMounted) {
          setRecords(
            (paginatedResult.records || []) as unknown as AttendanceRecord[]
          );
          setAllRecords(
            (statsResult?.records ||
              paginatedResult.records ||
              []) as unknown as AttendanceRecord[]
          );
          if (paginatedResult.pagination) {
            setPagination(paginatedResult.pagination);
          }
        }
      } catch (err) {
        if (isMounted && !controller.signal.aborted) {
          const error = err as Error;
          setError(error.message || t("dashboard:history.details.loading"));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [fromDate, toDate, statusFilter, currentPage, hasFilters, t]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [fromDate, toDate, statusFilter]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAttendanceUpdated = ((event: Event) => {
      const customEvent = event as CustomEvent<any>;
      const data = customEvent.detail;

      setCurrentPage((prev) => prev);
    }) as EventListener;

    window.addEventListener("attendance-updated", handleAttendanceUpdated);

    return () => {
      window.removeEventListener("attendance-updated", handleAttendanceUpdated);
    };
  }, []);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================
  const handleCloseModal = () => {
    setSelectedRecord(null);
    setActiveTab("checkin");
  };

  const handleRecordClick = (record: AttendanceRecord) => {
    const hasCheckInPhoto =
      record.notes?.includes("http") || record.location?.includes("http");
    if (hasCheckInPhoto) {
      setSelectedRecord(record);
    }
  };

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================
  const renderTableBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={8} className="py-6 text-center text-[var(--text-sub)]">
            {t("dashboard:history.details.loading")}
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan={8} className="py-6 text-center text-[var(--error)]">
            {error}
          </td>
        </tr>
      );
    }

    if (records.length === 0) {
      return (
        <tr>
          <td colSpan={8} className="py-6 text-center text-[var(--text-sub)]">
            {t("dashboard:history.details.noData")}
          </td>
        </tr>
      );
    }

    return records.map((record, index) => {
      const hasPhoto =
        record.notes?.includes("http") || record.location?.includes("http");
      return (
        <tr
          key={record.id || index}
          className={`border-b border-[var(--border)] hover:bg-[var(--shell)] transition-colors ${
            index % 2 === 0 ? "bg-[var(--shell)]/50" : ""
          }`}
        >
          <td className="py-3 px-4 text-[var(--text-main)]">{record.date}</td>
          <td className="py-3 px-4 text-[var(--text-sub)]">{record.day}</td>
          <td className="py-3 px-4 text-[var(--text-main)]">
            {record.checkIn}
          </td>
          <td className="py-3 px-4 text-[var(--text-main)]">
            {record.checkOut}
          </td>
          <td className="py-3 px-4 text-[var(--text-main)]">{record.hours}</td>
          <td className="py-3 px-4 text-[var(--text-sub)]">
            {formatLocation(record.location, t)}
          </td>
          <td className="py-3 px-4">{getStatusBadge(record.status, t)}</td>
          <td className="py-3 px-4 text-center">
            {hasPhoto ? (
              <button
                type="button"
                onClick={() => handleRecordClick(record)}
                className="inline-flex items-center gap-1 text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
                title={t("dashboard:history.photo.viewTitle")}
              >
                <Eye className="h-4 w-4" />
              </button>
            ) : (
              <span className="text-[var(--text-sub)]">-</span>
            )}
          </td>
        </tr>
      );
    });
  };

  const renderImageModal = () => {
    if (!selectedRecord) return null;

    const checkInUrl = extractPhotoUrl(
      selectedRecord.notes || "",
      selectedRecord.location || "",
      "checkin"
    );
    const checkOutUrl = extractPhotoUrl(
      selectedRecord.notes || "",
      selectedRecord.location || "",
      "checkout"
    );
    const currentUrl = activeTab === "checkin" ? checkInUrl : checkOutUrl;
    const currentTime =
      activeTab === "checkin"
        ? selectedRecord.checkIn
        : selectedRecord.checkOut;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={handleCloseModal}
      >
        <div
          className="relative bg-[var(--surface)] rounded-2xl overflow-hidden w-full max-w-3xl shadow-2xl border border-[var(--border)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={handleCloseModal}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[var(--shell)]/80 hover:bg-[var(--border)] text-[var(--text-main)] transition-all hover:scale-110 shadow-lg backdrop-blur-sm"
            title={t("common.close")}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-[var(--primary)]/10 to-[var(--primary)]/5 border-b border-[var(--border)] pr-16">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-main)]">
                  {t("dashboard:history.details.title")}
                </h3>
                <p className="text-sm text-[var(--text-sub)] mt-0.5">
                  {selectedRecord.date} - {selectedRecord.day}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedRecord.status, t)}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--border)] bg-[var(--shell)]/30">
            <button
              type="button"
              onClick={() => setActiveTab("checkin")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all relative ${
                activeTab === "checkin"
                  ? "text-[var(--primary)] bg-[var(--primary)]/8"
                  : "text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--shell)]"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeTab === "checkin"
                      ? "bg-[var(--primary)]"
                      : "bg-[var(--text-sub)]"
                  }`}
                ></span>
                {t("dashboard:history.tabs.checkinLabel")}
              </span>
              {activeTab === "checkin" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("checkout")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all relative ${
                activeTab === "checkout"
                  ? "text-[var(--primary)] bg-[var(--primary)]/8"
                  : "text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--shell)]"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeTab === "checkout"
                      ? "bg-[var(--primary)]"
                      : "bg-[var(--text-sub)]"
                  }`}
                ></span>
                {t("dashboard:history.tabs.checkoutLabel")}
              </span>
              {activeTab === "checkout" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent" />
              )}
            </button>
          </div>

          {/* Image Container */}
          <div
            className="bg-gradient-to-br from-[var(--shell)] to-[var(--shell)]/50 flex items-center justify-center p-6"
            style={{ minHeight: "250px", maxHeight: "350px" }}
          >
            {currentUrl ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={currentUrl}
                  alt={
                    activeTab === "checkin"
                      ? t("dashboard:history.photo.alt.checkin")
                      : t("dashboard:history.photo.alt.checkout")
                  }
                  className="w-full h-auto object-contain rounded-lg shadow-xl border border-[var(--border)]"
                  style={{ maxHeight: "300px" }}
                />
              </div>
            ) : (
              <div className="text-center py-32">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--border)] mb-4">
                  <Eye className="h-8 w-8 text-[var(--text-sub)]" />
                </div>
                <p className="text-[var(--text-sub)] text-base font-medium">
                  {activeTab === "checkin"
                    ? t("dashboard:history.noPhoto.checkin")
                    : t("dashboard:history.noPhoto.checkout")}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-[var(--border)] bg-gradient-to-r from-[var(--shell)]/80 to-[var(--shell)]/50">
            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col">
                <p className="text-xs font-medium text-[var(--text-sub)] mb-2 uppercase tracking-wide">
                  {t("dashboard:history.photo.time")}
                </p>
                <p className="text-lg font-bold text-[var(--text-main)]">
                  {currentTime || "-"}
                </p>
              </div>
              <div className="flex flex-col border-l border-[var(--border)] pl-8">
                <p className="text-xs font-medium text-[var(--text-sub)] mb-2 uppercase tracking-wide">
                  {t("dashboard:history.photo.location")}
                </p>
                <p className="text-lg font-bold text-[var(--text-main)] truncate">
                  {formatLocation(selectedRecord.location, t)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl text-[var(--text-main)]">
          {t("dashboard:history.title")}
        </h1>
        <p className="text-[var(--text-sub)]">
          {t("dashboard:history.description", {
            defaultValue: "Xem và xuất báo cáo chấm công của bạn",
          })}
        </p>
      </div>

      {/* Filters */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="p-6 mt-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Date Range */}
            <div className="flex gap-2 flex-1">
              <div className="flex-1">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  placeholder="Từ ngày"
                  className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
                />
              </div>
              <div className="flex items-center px-2 text-[var(--text-sub)]">
                →
              </div>
              <div className="flex-1">
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  placeholder="Đến ngày"
                  className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as "all" | AttendanceStatus)
              }
            >
              <SelectTrigger className="md:w-48 bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]">
                <SelectValue
                  placeholder={t("dashboard:history.filters.statusPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
                <SelectItem value="all">
                  {t("dashboard:history.filters.allStatus")}
                </SelectItem>
                <SelectItem value="ontime">
                  {t("dashboard:history.statusLabels.ontime")}
                </SelectItem>
                <SelectItem value="late">
                  {t("dashboard:history.statusLabels.late")}
                </SelectItem>
                <SelectItem value="absent">
                  {t("dashboard:history.statusLabels.absent")}
                </SelectItem>
                <SelectItem value="overtime">
                  {t("dashboard:history.statusLabels.overtime")}
                </SelectItem>
                <SelectItem value="weekend">
                  {t("dashboard:history.filters.weekend")}
                </SelectItem>
                <SelectItem value="on_leave">
                  {t("dashboard:history.statusLabels.onLeave", {
                    defaultValue: "Nghỉ phép",
                  })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)] mt-2">
              {t("dashboard:history.summary.totalDays")}
            </p>
            <p className="text-2xl text-[var(--text-main)] mt-1">
              {summary.total}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)] mt-2">
              {t("dashboard:history.summary.late")}
            </p>
            <p className="text-2xl text-[var(--warning)] mt-1">
              {summary.late}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)] mt-2">
              {t("dashboard:history.summary.absent")}
            </p>
            <p className="text-2xl text-[var(--error)] mt-1">
              {summary.absent}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)] mt-2">
              {t("dashboard:history.summary.overtime")}
            </p>
            <p className="text-2xl text-[var(--primary)] mt-1">
              {summary.overtime}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-main)]">
            {t("dashboard:history.details.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--shell)]">
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                    {t("dashboard:history.date")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                    {t("dashboard:history.day")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                    {t("dashboard:history.checkIn")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                    {t("dashboard:history.checkOut")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                    {t("dashboard:history.totalHours")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                    {t("dashboard:history.location")}
                  </th>
                  <th className="text-left py-3 px-4 text-sm text-[var(--text-sub)]">
                    {t("dashboard:history.status")}
                  </th>
                  <th className="text-center py-3 px-4 text-sm text-[var(--text-sub)]">
                    {t("dashboard:history.viewPhoto")}
                  </th>
                </tr>
              </thead>
              <tbody>{renderTableBody()}</tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-[var(--text-sub)]">
                  {t("dashboard:history.details.loading")}
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-[var(--error)]">{error}</p>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--text-sub)]">
                  {t("dashboard:history.details.noData")}
                </p>
              </div>
            ) : (
              records.map((record, index) => {
                const hasPhoto =
                  record.notes?.includes("http") ||
                  record.location?.includes("http");
                return (
                  <Card
                    key={record.id || index}
                    className="bg-[var(--shell)] border-[var(--border)]"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm font-semibold text-[var(--text-main)]">
                              {record.date}
                            </p>
                            <span className="text-xs text-[var(--text-sub)]">
                              ({record.day})
                            </span>
                            {getStatusBadge(record.status, t)}
                          </div>
                        </div>
                        {hasPhoto && (
                          <button
                            type="button"
                            onClick={() => handleRecordClick(record)}
                            className="p-1.5 hover:bg-[var(--surface)] rounded text-[var(--primary)]"
                            title={t("dashboard:history.photo.viewTitle")}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-sub)]">
                            {t("dashboard:history.checkIn")}
                          </span>
                          <span className="text-[var(--text-main)] font-medium">
                            {record.checkIn}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-sub)]">
                            {t("dashboard:history.checkOut")}
                          </span>
                          <span className="text-[var(--text-main)] font-medium">
                            {record.checkOut || "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-sub)]">
                            {t("dashboard:history.totalHours")}
                          </span>
                          <span className="text-[var(--text-main)] font-medium">
                            {record.hours}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-sub)]">
                            {t("dashboard:history.location")}
                          </span>
                          <span className="text-[var(--text-sub)] text-right flex-1 ml-2 truncate">
                            {formatLocation(record.location, t)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-[var(--border)]">
              <div className="flex items-center gap-2 text-sm text-[var(--text-sub)]">
                <span>
                  {t("dashboard:employeeManagement.pagination.showing")}{" "}
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)}{" "}
                  {t("dashboard:employeeManagement.pagination.of")}{" "}
                  {pagination.total}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                >
                  «
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                >
                  ‹
                </Button>

                <span className="px-4 text-sm text-[var(--text-main)]">
                  {t("dashboard:employeeManagement.pagination.page")}{" "}
                  {currentPage} / {pagination.totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(pagination.totalPages, p + 1)
                    )
                  }
                  disabled={currentPage >= pagination.totalPages}
                  className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                >
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(pagination.totalPages)}
                  disabled={currentPage >= pagination.totalPages}
                  className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                >
                  »
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Modal */}
      {renderImageModal()}
    </div>
  );
};

export default HistoryPage;
