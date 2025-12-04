import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Clock,
  Calendar,
  Search,
  Briefcase,
  Moon,
  Sun,
  AlertCircle,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";



import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,

} from "@/components/ui/select";
import { getMyRequests, createRequest as createRequestApi } from "@/services/requestService";
import type { ErrorWithMessage } from "@/types";
import { getRequestTypes } from "@/services/requestService";
import type {
  RequestType as RequestTypeOption,
} from "@/services/requestService";


type RequestStatus = "pending" | "approved" | "rejected";
type RequestType = string;
type Urgency = "high" | "medium" | "low";

interface Request {
  id: string;
  status: RequestStatus;
  type: RequestType;
  employeeName?: string;
  title?: string;
  description?: string;
  reason?: string;
  department?: string;
  branch?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  duration?: string;
  urgency?: Urgency;
  submittedAt?: string;
  createdAt?: string;
  approver?: string;
  approvedAt?: string;
  comments?: string;
}

interface DateRange {
  start: string;
  end: string;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface TypeIconLabel {
  icon: ReactNode;
  label: string;
}

// FALLBACK_REQUEST_TYPES will be created with i18n in component

const RequestsPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [allRequests, setAllRequests] = useState<Request[]>([]); // Store all requests for stats calculation
  const [requests, setRequests] = useState<Request[]>([]); // Current page requests
  const [selectedTab, setSelectedTab] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState<string>("");
  const [requestReason, setRequestReason] = useState("");
  const [requestDateRange, setRequestDateRange] = useState<DateRange>({
    start: "",
    end: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [requestTypes, setRequestTypes] = useState<RequestTypeOption[]>([]);
  const [departments, setDepartments] = useState<Array<{ value: string; label: string }>>([]);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  // Fallback request types with i18n
  const FALLBACK_REQUEST_TYPES: RequestTypeOption[] = [
    { value: "leave", label: t('dashboard:requests.types.leave') },
    { value: "overtime", label: t('dashboard:requests.types.overtime') },
    { value: "remote", label: t('dashboard:requests.types.remote') },
    { value: "correction", label: t('dashboard:requests.types.correction') },
  ];

  // Fetch request types only (no need for departments API - will extract from requests)
  useEffect(() => {
    let isMounted = true;
    const fetchOptions = async () => {
      try {
        const typesResult = await getRequestTypes();
        if (isMounted) {
          setRequestTypes(typesResult.types || []);
        }
      } catch (error) {
        console.error('[RequestsPage] Options fetch error:', error);
      }
    };
    fetchOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Extract unique departments from allRequests for filter dropdown
  useEffect(() => {
    const uniqueDepartments = Array.from(
      new Set(
        allRequests
          .map(req => req.department)
          .filter((dept): dept is string => Boolean(dept) && dept !== 'N/A')
      )
    ).sort();

    setDepartments(
      uniqueDepartments.map(dept => ({
        value: dept,
        label: dept
      }))
    );
  }, [allRequests]);

  // Fetch stats (all requests without pagination for accurate stats)
  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        // Fetch all requests in parallel for better performance
        const [pendingResult, approvedResult, rejectedResult] = await Promise.all([
          getMyRequests({ status: 'pending', limit: 1000 }),
          getMyRequests({ status: 'approved', limit: 1000 }),
          getMyRequests({ status: 'rejected', limit: 1000 }),
        ]);

        if (isMounted) {
          const allRequestsData = [
            ...(pendingResult.requests || []),
            ...(approvedResult.requests || []),
            ...(rejectedResult.requests || []),
          ] as unknown as Request[];
          setAllRequests(allRequestsData);
        }
      } catch (error) {
        console.error('[RequestsPage] Stats fetch error:', error);
      }
    };
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  // Hàm fetch dữ liệu tách riêng để có thể gọi lại khi nhận realtime notification
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
        type?: string;
      } = {
        page: currentPage,
        limit: itemsPerPage,
      };

      // Status filter based on selected tab
      if (selectedTab !== "all") {
        params.status = selectedTab;
      }

      // Type filter
      if (filterType !== "all") {
        params.type = filterType;
      }

      // Search filter (using debounced value)
      if (debouncedSearchQuery) {
        params.search = debouncedSearchQuery;
      }

      const result = await getMyRequests(params);
      let filteredRequests = (result.requests || []) as unknown as Request[];

      // Client-side department filter (since getMyRequests only returns user's own requests)
      if (filterDepartment !== "all") {
        filteredRequests = filteredRequests.filter(req => req.department === filterDepartment);
      }

      setRequests(filteredRequests);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (error) {
      const err = error as ErrorWithMessage;
      toast.error(err.message || t('dashboard:requests.success.loadError'));
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    selectedTab,
    debouncedSearchQuery,
    filterType,
    filterDepartment,
    itemsPerPage,
    t,
  ]);

  // Fetch paginated requests based on selected tab and filters
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Reset to page 1 when tab, search, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTab, debouncedSearchQuery, filterType, filterDepartment]);

  // Lắng nghe sự kiện realtime khi yêu cầu được duyệt / từ chối (Socket.io → useNotifications → CustomEvent)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStatusChanged = ((event: Event) => {
      const customEvent = event as CustomEvent<any>;
      const notification = customEvent.detail;

      // Chỉ xử lý các notification liên quan đến request
      if (!notification || notification.relatedEntityType !== 'request') {
        return;
      }

      // Hiển thị toast thân thiện cho người dùng
      if (notification.type === 'request_approved') {
        toast.success(notification.title || 'Yêu cầu của bạn đã được phê duyệt');
      } else if (notification.type === 'request_rejected') {
        toast.error(notification.title || 'Yêu cầu của bạn đã bị từ chối');
      }

      // Refetch danh sách yêu cầu để cập nhật trạng thái mà không cần F5
      fetchRequests();
    }) as EventListener;

    window.addEventListener('request-status-changed', handleStatusChanged);

    return () => {
      window.removeEventListener('request-status-changed', handleStatusChanged);
    };
  }, [fetchRequests]);

  // Calculate stats from allRequests
  const stats = useMemo<Stats>(() => {
    return {
      pending: allRequests.filter((r) => r.status === "pending").length,
      approved: allRequests.filter((r) => r.status === "approved").length,
      rejected: allRequests.filter((r) => r.status === "rejected").length,
      total: allRequests.length,
    };
  }, [allRequests]);

  // Filtering is now done in the fetch effect, but we keep this for rendering
  const applyFilters = (_tabValue: string): Request[] => {
    // Filtering is already done in the fetch effect
    return requests;
  };

  const handleCreateRequest = async (): Promise<void> => {
    if (!requestType || !requestReason || !requestDateRange.start) {
      toast.error(t('dashboard:requests.errors.fillAllFields'));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type: requestType,
        startDate: requestDateRange.start,
        endDate: requestDateRange.end || requestDateRange.start,
        reason: requestReason.trim(),
      };
      const newRequest = await createRequestApi(payload) as Request;

      // The response from createRequest should already have all needed fields
      // Add to allRequests for stats
      setAllRequests((prev) => [newRequest, ...prev]);

      // Add to current requests list if on pending tab or all tab
      if (selectedTab === 'pending' || selectedTab === 'all') {
        setRequests((prev) => [newRequest, ...prev]);
      }

      // Switch to pending tab if not already there
      if (selectedTab !== 'pending') {
        setSelectedTab('pending');
      }

      setIsCreateDialogOpen(false);
      setRequestType("");
      setRequestReason("");
      setRequestDateRange({ start: "", end: "" });
      toast.success(t('dashboard:requests.success.createSuccess'));
    } catch (error) {
      const err = error as ErrorWithMessage;
      toast.error(err.message || t('dashboard:requests.success.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  // Note: RequestsPage is for users to view their own requests only
  // To approve/reject requests of others, use ApproveRequestsPage
  // Removed approve/reject functionality from this page to prevent confusion

  const getTypeIconLabel = (type: RequestType): TypeIconLabel => {
    switch (type) {
      case "leave":
        return { icon: <Moon className="h-4 w-4" />, label: t('dashboard:requests.types.leave') };
      case "overtime":
        return { icon: <Sun className="h-4 w-4" />, label: t('dashboard:requests.types.overtime') };
      case "remote":
        return { icon: <Briefcase className="h-4 w-4" />, label: t('dashboard:requests.types.remote') };
      case "correction":
      default:
        return { icon: <Clock className="h-4 w-4" />, label: t('dashboard:requests.types.correction') };
    }
  };

  const getBadgeColor = (type: RequestType): string => {
    switch (type) {
      case "leave":
        return "bg-blue-500/20 text-blue-500";
      case "overtime":
        return "bg-orange-500/20 text-orange-500";
      case "remote":
        return "bg-purple-500/20 text-purple-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  const getUrgencyColor = (urgency?: Urgency): string => {
    switch (urgency) {
      case "high":
        return "bg-red-500/20 text-red-500";
      case "medium":
        return "bg-yellow-500/20 text-yellow-500";
      case "low":
        return "bg-green-500/20 text-green-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  const renderRequests = (tabValue: string): ReactNode => {
    const data = applyFilters(tabValue);

    if (loading) {
      return (
        <div className="py-12 text-center">
          <p className="text-[var(--text-sub)]">{t('dashboard:requests.loading')}</p>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[var(--text-sub)]" />
          <p className="text-[var(--text-sub)]">{t('dashboard:requests.noRequests')}</p>
        </div>
      );
    }

    return data.map((request) => {
      const { icon, label } = getTypeIconLabel(request.type);
      return (
        <Card
          key={request.id}
          className="bg-[var(--shell)] border border-[var(--border)] transition-all hover:border-[var(--accent-cyan)]"
        >
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-start md:justify-between mt-4">
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white flex items-center justify-center">
                  {request.employeeName?.charAt(0) || "U"}
                </div>
                <div>
                  <h3 className="text-[var(--text-main)]">{request.employeeName || "N/A"}</h3>
                  <p className="text-xs text-[var(--text-sub)]">
                    {request.department || "N/A"} • {request.branch || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className={getBadgeColor(request.type)}>
                  <span className="mr-1">{icon}</span>
                  {label}
                </Badge>
                {request.urgency && (
                  <Badge className={getUrgencyColor(request.urgency)}>
                    {request.urgency === "high"
                      ? t('dashboard:requests.urgency.high')
                      : request.urgency === "medium"
                        ? t('dashboard:requests.urgency.medium')
                        : t('dashboard:requests.urgency.low')}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="border-[var(--border)] text-[var(--text-sub)]"
                >
                  <Calendar className="mr-1 h-3 w-3" />
                  {request.startDate || request.date}
                  {request.endDate && request.endDate !== request.startDate
                    ? ` → ${request.endDate}`
                    : ""}
                </Badge>
                {request.duration && (
                  <Badge
                    variant="outline"
                    className="border-[var(--border)] text-[var(--text-sub)]"
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    {request.duration}
                  </Badge>
                )}
              </div>

              <div>
                <h4 className="text-[var(--text-main)]">{request.title || request.type}</h4>
                <p className="text-sm text-[var(--text-sub)]">
                  {request.description || request.reason}
                </p>
              </div>

              <div className="text-xs text-[var(--text-sub)]">
                Gửi lúc: {request.submittedAt || request.createdAt || "N/A"}
              </div>

              {request.approver && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 p-3 text-sm text-[var(--text-main)]">
                  <p className="text-xs text-[var(--text-sub)]">
                    {request.approver} • {request.approvedAt}
                  </p>
                  {request.comments && <p>{request.comments}</p>}
                </div>
              )}
            </div>

            <div className="flex w-full flex-col gap-2 md:w-auto">
              {/* RequestsPage chỉ hiển thị trạng thái, không có nút approve/reject */}
              {/* Để approve/reject requests của người khác, sử dụng ApproveRequestsPage */}
              <Badge
                className={
                  request.status === "pending"
                    ? "bg-[var(--warning)]/20 text-[var(--warning)]"
                    : request.status === "approved"
                      ? "bg-[var(--success)]/20 text-[var(--success)]"
                      : "bg-[var(--error)]/20 text-[var(--error)]"
                }
              >
                {request.status === "pending" ? (
                  <>
                    <Clock className="mr-1 h-3 w-3" />
                    Chờ duyệt
                  </>
                ) : request.status === "approved" ? (
                  "✓ Đã duyệt"
                ) : (
                  "✗ Đã từ chối"
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl text-[var(--text-main)]">{t('dashboard:requests.title')}</h1>
          <p className="text-[var(--text-sub)]">
            {t('dashboard:requests.description')}
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard:requests.create')}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
            <DialogHeader>
              <DialogTitle>{t('dashboard:requests.dialog.title')}</DialogTitle>
              <DialogDescription className="text-[var(--text-sub)]">
                {t('dashboard:requests.dialog.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{t('dashboard:requests.type')}</Label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger className="border-[var(--border)] bg-[var(--input-bg)]">
                    <SelectValue placeholder={t('dashboard:requests.dialog.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(requestTypes.length
                      ? requestTypes
                      : FALLBACK_REQUEST_TYPES
                    ).map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('dashboard:requests.dialog.startDate')}</Label>
                  <Input
                    type="date"
                    value={requestDateRange.start}
                    onChange={(e) =>
                      setRequestDateRange((prev) => ({
                        ...prev,
                        start: e.target.value,
                      }))
                    }
                    className="border-[var(--border)] bg-[var(--input-bg)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('dashboard:requests.dialog.endDate')}</Label>
                  <Input
                    type="date"
                    value={requestDateRange.end}
                    onChange={(e) =>
                      setRequestDateRange((prev) => ({
                        ...prev,
                        end: e.target.value,
                      }))
                    }
                    className="border-[var(--border)] bg-[var(--input-bg)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('dashboard:requests.reason')}</Label>
                <Textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder={t('dashboard:requests.dialog.reasonPlaceholder')}
                  className="min-h-[120px] border-[var(--border)] bg-[var(--input-bg)]"
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                className="border-[var(--border)] text-[var(--text-main)]"
              >
                Hủy
              </Button>
              <Button
                onClick={handleCreateRequest}
                disabled={submitting}
                className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]"
              >
                {submitting ? t('dashboard:requests.dialog.submitting') : t('dashboard:requests.dialog.submit')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)] pt-4">Chờ duyệt</p>
            <p className="mt-1 text-2xl text-[var(--warning)]">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)] pt-4">Đã duyệt</p>
            <p className="mt-1 text-2xl text-[var(--success)]">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)] pt-4">Từ chối</p>
            <p className="mt-1 text-2xl text-[var(--error)]">{stats.rejected}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--text-sub)] pt-4">{t('dashboard:requests.totalRequests')}</p>
            <p className="mt-1 text-2xl text-[var(--accent-cyan)]">{stats.total}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-4 md:flex-row pt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-sub)]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('dashboard:requests.filters.searchPlaceholder')}
                  className="border-[var(--border)] bg-[var(--shell)] pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full border-[var(--border)] bg-[var(--shell)] text-left md:w-[200px]">
                <SelectValue placeholder={t('dashboard:requests.filters.typePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard:requests.filters.allTypes')}</SelectItem>
                {(requestTypes.length
                  ? requestTypes
                  : FALLBACK_REQUEST_TYPES
                ).map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-full border-[var(--border)] bg-[var(--shell)] text-left md:w-[200px]">
                <SelectValue placeholder={t('dashboard:requests.filters.departmentPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard:requests.filters.allDepartments')}</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.value} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">Tất cả ({stats.total})</TabsTrigger>
              <TabsTrigger value="pending">
                Chờ duyệt ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Đã duyệt ({stats.approved})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Từ chối ({stats.rejected})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6 space-y-4">
              {renderRequests("all")}
            </TabsContent>
            <TabsContent value="pending" className="mt-6 space-y-4">
              {renderRequests("pending")}
            </TabsContent>
            <TabsContent value="approved" className="mt-6 space-y-4">
              {renderRequests("approved")}
            </TabsContent>
            <TabsContent value="rejected" className="mt-6 space-y-4">
              {renderRequests("rejected")}
            </TabsContent>
          </Tabs>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-[var(--border)]">
              <div className="flex items-center gap-2 text-sm text-[var(--text-sub)]">
                <span>
                  Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, pagination.total)} của {pagination.total}
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
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                >
                  ‹
                </Button>

                <span className="px-4 text-sm text-[var(--text-main)]">
                  Trang {currentPage} / {pagination.totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
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

    </div>
  );
};

export default RequestsPage;




