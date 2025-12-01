import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FileText,
    Search,
    Download,
    User,
    Activity,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Eye,
    Trash2,
    Edit,
    Plus,
    RefreshCw,
    Shield,
    Clock,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getAllLogs, getLogStats, type AuditLog } from '@/services/logService';

interface AuditLogPage extends AuditLog {
    action: string;
    category: string;
    status: 'success' | 'failed' | 'warning';
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLogPage[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAction, setFilterAction] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [selectedTab, setSelectedTab] = useState<'all' | 'success' | 'failed' | 'warning'>('all');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
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

    // Stats state
    const [stats, setStats] = useState({
        total: 0,
        success: 0,
        failed: 0,
        warning: 0,
    });

    // Auto-refresh state
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Details modal state
    const [selectedLog, setSelectedLog] = useState<AuditLogPage | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Load stats (separate call, not paginated)
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const statsData = await getLogStats();
                setStats(statsData);
            } catch (error) {
                console.error('[AuditLogsPage] Fetch stats error:', error);
            }
        };
        fetchStats();
    }, []);

    // Load logs with filters and pagination
    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const params: {
                    page?: number;
                    limit?: number;
                    search?: string;
                    action?: string;
                    status?: string;
                    category?: string;
                } = {
                    page: currentPage,
                    limit: pageSize,
                };

                if (searchQuery) {
                    params.search = searchQuery;
                }

                if (selectedTab !== 'all') {
                    params.status = selectedTab;
                }

                if (filterAction !== 'all') {
                    params.action = filterAction;
                }

                if (filterCategory !== 'all') {
                    params.category = filterCategory;
                }

                const result = await getAllLogs(params);
                setLogs(result.logs as AuditLogPage[]);
                setPagination(result.pagination);
            } catch (error) {
                console.error('[AuditLogsPage] Fetch logs error:', error);
                toast.error('Không thể tải nhật ký hệ thống');
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [currentPage, pageSize, searchQuery, selectedTab, filterAction, filterCategory]);

    // Auto-refresh functionality
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            const fetchLogs = async () => {
                try {
                    const params: {
                        page?: number;
                        limit?: number;
                        search?: string;
                        action?: string;
                        status?: string;
                        category?: string;
                    } = {
                        page: currentPage,
                        limit: pageSize,
                    };

                    if (searchQuery) params.search = searchQuery;
                    if (selectedTab !== 'all') params.status = selectedTab;
                    if (filterAction !== 'all') params.action = filterAction;
                    if (filterCategory !== 'all') params.category = filterCategory;

                    const result = await getAllLogs(params);
                    setLogs(result.logs as AuditLogPage[]);
                    setPagination(result.pagination);

                    // Refresh stats too
                    const statsData = await getLogStats();
                    setStats(statsData);
                } catch (error) {
                    console.error('[AuditLogsPage] Auto-refresh error:', error);
                }
            };
            fetchLogs();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [autoRefresh, currentPage, pageSize, searchQuery, selectedTab, filterAction, filterCategory]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedTab, filterAction, filterCategory]);

    // Server-side filtering - no client-side filtering needed
    const filteredLogs = logs;

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'create': return <Plus className="h-4 w-4" />;
            case 'update': return <Edit className="h-4 w-4" />;
            case 'delete': return <Trash2 className="h-4 w-4" />;
            case 'view': return <Eye className="h-4 w-4" />;
            case 'login': return <User className="h-4 w-4" />;
            case 'logout': return <User className="h-4 w-4" />;
            case 'approve': return <CheckCircle2 className="h-4 w-4" />;
            case 'reject': return <XCircle className="h-4 w-4" />;
            default: return <Activity className="h-4 w-4" />;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'create': return 'bg-green-500/20 text-green-500';
            case 'update': return 'bg-blue-500/20 text-blue-500';
            case 'delete': return 'bg-red-500/20 text-red-500';
            case 'view': return 'bg-gray-500/20 text-gray-500';
            case 'login': return 'bg-purple-500/20 text-purple-500';
            case 'logout': return 'bg-purple-500/20 text-purple-500';
            case 'approve': return 'bg-green-500/20 text-green-500';
            case 'reject': return 'bg-red-500/20 text-red-500';
            default: return 'bg-gray-500/20 text-gray-500';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'bg-green-500/20 text-green-500';
            case 'failed': return 'bg-red-500/20 text-red-500';
            case 'warning': return 'bg-yellow-500/20 text-yellow-500';
            default: return 'bg-gray-500/20 text-gray-500';
        }
    };

    const handleExportCSV = () => {
        const headers = ['ID', 'Timestamp', 'User', 'Role', 'Action', 'Category', 'Description', 'IP', 'Status'];
        const csvData = filteredLogs.map(log => [
            log.id,
            log.timestamp,
            log.userName,
            log.userRole,
            log.action,
            log.category,
            log.description,
            log.ipAddress,
            log.status
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `audit_logs_${new Date().toISOString()}.csv`;
        link.click();

        toast.success('📥 Đã xuất file CSV thành công!');
    };

    const handleExportJSON = () => {
        const jsonContent = JSON.stringify(filteredLogs, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `audit_logs_${new Date().toISOString()}.json`;
        link.click();

        toast.success('📥 Đã xuất file JSON thành công!');
    };

    const handleViewDetails = (log: AuditLogPage) => {
        setSelectedLog(log);
        setIsDetailsOpen(true);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setCurrentPage(1); // Reset to first page
    };

    const handleRefresh = async () => {
        setLoading(true);
        try {
            const params: {
                page?: number;
                limit?: number;
                search?: string;
                action?: string;
                status?: string;
                category?: string;
            } = {
                page: currentPage,
                limit: pageSize,
            };

            if (searchQuery) params.search = searchQuery;
            if (selectedTab !== 'all') params.status = selectedTab;
            if (filterAction !== 'all') params.action = filterAction;
            if (filterCategory !== 'all') params.category = filterCategory;

            const [result, statsData] = await Promise.all([
                getAllLogs(params),
                getLogStats(),
            ]);

            setLogs(result.logs as AuditLogPage[]);
            setPagination(result.pagination);
            setStats(statsData);
            toast.success('Đã làm mới dữ liệu');
        } catch (error) {
            console.error('[AuditLogsPage] Refresh error:', error);
            toast.error('Không thể làm mới dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2">
                        <Shield className="h-8 w-8 text-blue-600" />
                        Nhật ký hệ thống
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Theo dõi tất cả hoạt động trong hệ thống
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={loading}
                        className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Làm mới
                    </Button>
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                        <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${autoRefresh ? 'animate-spin' : ''}`} />
                        <Label htmlFor="auto-refresh" className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer">
                            Tự động làm mới
                        </Label>
                        <Switch
                            id="auto-refresh"
                            checked={autoRefresh}
                            onCheckedChange={setAutoRefresh}
                        />
                    </div>
                    <Select onValueChange={(value) => {
                        if (value === 'csv') handleExportCSV();
                        if (value === 'json') handleExportJSON();
                    }}>
                        <SelectTrigger className="w-[180px] bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-none">
                            <Download className="h-4 w-4 mr-2" />
                            <span>Xuất nhật ký</span>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="csv">Xuất CSV</SelectItem>
                            <SelectItem value="json">Xuất JSON</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <CardContent className="p-6 mt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Tổng số</p>
                                    <p className="text-3xl text-cyan-500 mt-2">{stats.total}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-cyan-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <CardContent className="p-6 mt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Thành công</p>
                                    <p className="text-3xl text-green-500 mt-2">{stats.success}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <CardContent className="p-6 mt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Thất bại</p>
                                    <p className="text-3xl text-red-500 mt-2">{stats.failed}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <XCircle className="h-6 w-6 text-red-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <CardContent className="p-6 mt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Cảnh báo</p>
                                    <p className="text-3xl text-yellow-500 mt-2">{stats.warning}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                    <AlertCircle className="h-6 w-6 text-yellow-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Filters */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6 mt-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600 dark:text-gray-400" />
                                <Input
                                    placeholder="Tìm kiếm theo người dùng hoặc mô tả..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                        </div>
                        <Select value={filterAction} onValueChange={setFilterAction}>
                            <SelectTrigger className="w-full md:w-[180px] bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                                <SelectValue placeholder="Hành động" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="login">Đăng nhập</SelectItem>
                                <SelectItem value="register">Đăng ký</SelectItem>
                                <SelectItem value="update_user">Cập nhật user</SelectItem>
                                <SelectItem value="create_user">Tạo user</SelectItem>
                                <SelectItem value="checkin">Check in</SelectItem>
                                <SelectItem value="checkout">Check out</SelectItem>
                                <SelectItem value="create_request">Tạo yêu cầu</SelectItem>
                                <SelectItem value="approve_request">Duyệt yêu cầu</SelectItem>
                                <SelectItem value="reject_request">Từ chối yêu cầu</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="w-full md:w-[180px] bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                                <SelectValue placeholder="Danh mục" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="auth">Xác thực</SelectItem>
                                <SelectItem value="user">Người dùng</SelectItem>
                                <SelectItem value="attendance">Chấm công</SelectItem>
                                <SelectItem value="request">Yêu cầu</SelectItem>
                                <SelectItem value="system">Hệ thống</SelectItem>
                                <SelectItem value="settings">Cài đặt</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Logs Table */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-gray-100">Danh sách nhật ký</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
                        <TabsList className="grid w-full grid-cols-4 mb-6">
                            <TabsTrigger value="all">Tất cả ({stats.total})</TabsTrigger>
                            <TabsTrigger value="success">Thành công ({stats.success})</TabsTrigger>
                            <TabsTrigger value="failed">Thất bại ({stats.failed})</TabsTrigger>
                            <TabsTrigger value="warning">Cảnh báo ({stats.warning})</TabsTrigger>
                        </TabsList>

                        <TabsContent value={selectedTab}>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-gray-200 dark:border-gray-700">
                                            <TableHead className="text-gray-600 dark:text-gray-400">Thời gian</TableHead>
                                            <TableHead className="text-gray-600 dark:text-gray-400">Người dùng</TableHead>
                                            <TableHead className="text-gray-600 dark:text-gray-400">Hành động</TableHead>
                                            <TableHead className="text-gray-600 dark:text-gray-400">Mô tả</TableHead>
                                            <TableHead className="text-gray-600 dark:text-gray-400">Trạng thái</TableHead>
                                            <TableHead className="text-gray-600 dark:text-gray-400 text-center">Chi tiết</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-gray-600 dark:text-gray-400">
                                                    Đang tải dữ liệu...
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredLogs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-gray-600 dark:text-gray-400">
                                                    Không tìm thấy nhật ký nào
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredLogs.map((log, index) => (
                                                <TableRow
                                                    key={log.id}
                                                    className={`border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900/50 cursor-pointer ${log.status === 'failed' ? 'bg-red-500/5' :
                                                        log.status === 'warning' ? 'bg-yellow-500/5' : ''
                                                        }`}
                                                    onClick={() => handleViewDetails(log)}
                                                >
                                                    <TableCell className="text-gray-900 dark:text-gray-100">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                                            <span className="text-sm">{log.timestamp}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p className="text-gray-900 dark:text-gray-100">{log.userName}</p>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">{log.userRole}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={getActionColor(log.action)}>
                                                            <span className="mr-1">{getActionIcon(log.action)}</span>
                                                            {log.action}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-gray-900 dark:text-gray-100 max-w-md truncate">
                                                        {log.description}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={getStatusColor(log.status)}>
                                                            {log.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewDetails(log);
                                                            }}
                                                            className="h-8 w-8 text-cyan-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 mt-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <span>
                                            Hiển thị {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, pagination.total)} của {pagination.total}
                                        </span>
                                        <span className="hidden sm:inline">•</span>
                                        <div className="flex items-center gap-2">
                                            <span>Số dòng:</span>
                                            <Select value={pageSize.toString()} onValueChange={(v) => handlePageSizeChange(Number(v))}>
                                                <SelectTrigger className="w-20 h-8 bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent side="top">
                                                    <SelectItem value="10">10</SelectItem>
                                                    <SelectItem value="15">15</SelectItem>
                                                    <SelectItem value="20">20</SelectItem>
                                                    <SelectItem value="25">25</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handlePageChange(1)}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>

                                        <span className="px-4 text-sm text-gray-900 dark:text-gray-100">
                                            Trang {currentPage} / {pagination.totalPages}
                                        </span>

                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage >= pagination.totalPages}
                                            className="h-8 w-8 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handlePageChange(pagination.totalPages)}
                                            disabled={currentPage >= pagination.totalPages}
                                            className="h-8 w-8 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                                        >
                                            <ChevronsRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Log Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-3xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Chi tiết nhật ký hệ thống</DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            Thông tin chi tiết về hoạt động này
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-5 py-2">
                            {/* Status Banner */}
                            <div className={`p-4 rounded-xl border-2 ${selectedLog.status === 'success' ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' :
                                    selectedLog.status === 'failed' ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900' :
                                        'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <Badge className={getActionColor(selectedLog.action)}>
                                                <span className="mr-1">{getActionIcon(selectedLog.action)}</span>
                                                {selectedLog.action}
                                            </Badge>
                                            <Badge className={getStatusColor(selectedLog.status)}>
                                                {selectedLog.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Clock className="h-4 w-4" />
                                        {selectedLog.timestamp}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* User Information */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
                                    Thông tin người dùng
                                </h4>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-gray-600 dark:text-gray-400">Tên người dùng</Label>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedLog.userName}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-gray-600 dark:text-gray-400">Vai trò</Label>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedLog.userRole}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-gray-600 dark:text-gray-400">Địa chỉ IP</Label>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">{selectedLog.ipAddress || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Action Details */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
                                    Chi tiết hoạt động
                                </h4>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-gray-600 dark:text-gray-400">Mô tả</Label>
                                        <p className="text-sm text-gray-900 dark:text-gray-100 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                            {selectedLog.description}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Metadata Section - Only show if exists */}
                            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                <>
                                    <Separator />
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                            <Info className="h-4 w-4" />
                                            Dữ liệu bổ sung
                                        </h4>
                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-auto max-h-64">
                                            <pre className="text-xs text-gray-900 dark:text-gray-100 font-mono">
                                                {JSON.stringify(selectedLog.metadata, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDetailsOpen(false)}
                            className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
