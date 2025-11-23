import { useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Separator } from '../../ui/separator';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { toast } from 'sonner';

interface AuditLog {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    userRole: string;
    action: 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout' | 'approve' | 'reject';
    category: 'auth' | 'user' | 'attendance' | 'request' | 'system' | 'settings';
    resource: string;
    description: string;
    ipAddress: string;
    status: 'success' | 'failed' | 'warning';
    metadata?: Record<string, any>;
}

const mockLogs: AuditLog[] = [
    {
        id: 'LOG001',
        timestamp: '2025-11-23 00:30:25',
        userId: 'USR001',
        userName: 'Nguyễn Văn A',
        userRole: 'SUPER_ADMIN',
        action: 'update',
        category: 'settings',
        resource: 'SystemSettings',
        description: 'Cập nhật cài đặt hệ thống - Bật MFA',
        ipAddress: '192.168.1.100',
        status: 'success',
        metadata: { section: 'security', field: 'mfaEnabled', value: true },
    },
    {
        id: 'LOG002',
        timestamp: '2025-11-23 00:25:10',
        userId: 'USR005',
        userName: 'Hoàng Văn E',
        userRole: 'MANAGER',
        action: 'approve',
        category: 'request',
        resource: 'LeaveRequest',
        description: 'Phê duyệt yêu cầu nghỉ phép cho Nguyễn Văn K',
        ipAddress: '192.168.1.105',
        status: 'success',
        metadata: { requestId: 'REQ001', employeeId: 'EMP001' },
    },
    {
        id: 'LOG003',
        timestamp: '2025-11-23 00:20:45',
        userId: 'USR002',
        userName: 'Trần Thị B',
        userRole: 'ADMIN',
        action: 'create',
        category: 'user',
        resource: 'Employee',
        description: 'Tạo nhân viên mới - Vũ Văn H',
        ipAddress: '192.168.1.102',
        status: 'success',
        metadata: { employeeId: 'EMP010', department: 'IT' },
    },
    {
        id: 'LOG004',
        timestamp: '2025-11-22 23:15:30',
        userId: 'USR007',
        userName: 'Vũ Văn G',
        userRole: 'EMPLOYEE',
        action: 'login',
        category: 'auth',
        resource: 'Authentication',
        description: 'Đăng nhập thành công',
        ipAddress: '192.168.1.107',
        status: 'success',
    },
    {
        id: 'LOG005',
        timestamp: '2025-11-22 23:10:15',
        userId: 'UNKNOWN',
        userName: 'Unknown User',
        userRole: 'NONE',
        action: 'login',
        category: 'auth',
        resource: 'Authentication',
        description: 'Đăng nhập thất bại - Sai mật khẩu',
        ipAddress: '192.168.1.200',
        status: 'failed',
        metadata: { attempts: 3, email: 'hacker@evil.com' },
    },
    {
        id: 'LOG006',
        timestamp: '2025-11-22 22:05:00',
        userId: 'USR003',
        userName: 'Lê Văn C',
        userRole: 'HR_MANAGER',
        action: 'delete',
        category: 'user',
        resource: 'Employee',
        description: 'Xóa nhân viên - Nguyễn Văn X',
        ipAddress: '192.168.1.103',
        status: 'warning',
        metadata: { employeeId: 'EMP999', reason: 'Nghỉ việc' },
    },
    {
        id: 'LOG007',
        timestamp: '2025-11-22 21:00:00',
        userId: 'USR004',
        userName: 'Phạm Thị D',
        userRole: 'BRANCH_MANAGER',
        action: 'update',
        category: 'attendance',
        resource: 'AttendanceRecord',
        description: 'Chỉnh sửa bản ghi chấm công',
        ipAddress: '192.168.1.104',
        status: 'success',
        metadata: { recordId: 'ATT001', field: 'checkOut', oldValue: '17:00', newValue: '18:00' },
    },
    {
        id: 'LOG008',
        timestamp: '2025-11-22 20:55:30',
        userId: 'USR001',
        userName: 'Nguyễn Văn A',
        userRole: 'SUPER_ADMIN',
        action: 'create',
        category: 'system',
        resource: 'Branch',
        description: 'Tạo chi nhánh mới - Chi nhánh Cần Thơ',
        ipAddress: '192.168.1.100',
        status: 'success',
        metadata: { branchId: 'CT', branchName: 'Chi nhánh Cần Thơ' },
    },
];

export default function AuditLogsPage() {
    const [logs] = useState<AuditLog[]>(mockLogs);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAction, setFilterAction] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [selectedTab, setSelectedTab] = useState<'all' | 'success' | 'failed' | 'warning'>('all');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Auto-refresh state
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Details modal state
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const filteredLogs = logs.filter(log => {
        if (selectedTab !== 'all' && log.status !== selectedTab) return false;
        if (searchQuery && !log.userName.toLowerCase().includes(searchQuery.toLowerCase())
            && !log.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterAction !== 'all' && log.action !== filterAction) return false;
        if (filterCategory !== 'all' && log.category !== filterCategory) return false;
        return true;
    });

    // Pagination
    const totalPages = Math.ceil(filteredLogs.length / pageSize);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const stats = {
        total: logs.length,
        success: logs.filter(l => l.status === 'success').length,
        failed: logs.filter(l => l.status === 'failed').length,
        warning: logs.filter(l => l.status === 'warning').length,
    };

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

    const handleViewDetails = (log: AuditLog) => {
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
                                <SelectItem value="create">Tạo mới</SelectItem>
                                <SelectItem value="update">Cập nhật</SelectItem>
                                <SelectItem value="delete">Xóa</SelectItem>
                                <SelectItem value="login">Đăng nhập</SelectItem>
                                <SelectItem value="approve">Phê duyệt</SelectItem>
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
                                            <TableHead className="text-gray-600 dark:text-gray-400">Danh mục</TableHead>
                                            <TableHead className="text-gray-600 dark:text-gray-400">Mô tả</TableHead>
                                            <TableHead className="text-gray-600 dark:text-gray-400">IP</TableHead>
                                            <TableHead className="text-gray-600 dark:text-gray-400">Trạng thái</TableHead>
                                            <TableHead className="text-gray-600 dark:text-gray-400 text-center">Chi tiết</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedLogs.map((log, index) => (
                                            <motion.tr
                                                key={log.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
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
                                                <TableCell>
                                                    <Badge variant="outline" className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                                                        {log.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-gray-900 dark:text-gray-100 max-w-xs truncate">
                                                    {log.description}
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                                                    {log.ipAddress}
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
                                                        className="h-8 w-8 text-cyan-500"
                                                    >
                                                        <Info className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </motion.tr>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 mt-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <span>
                                        Hiển thị {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredLogs.length)} của {filteredLogs.length}
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
                                                <SelectItem value="25">25</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                                <SelectItem value="100">100</SelectItem>
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
                                        Trang {currentPage} / {totalPages}
                                    </span>

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="h-8 w-8 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handlePageChange(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="h-8 w-8 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Log Details Modal */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5 text-cyan-500" />
                            Chi tiết nhật ký
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-400">
                            Thông tin đầy đủ về hoạt động được ghi lại
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-600 dark:text-gray-400">ID</Label>
                                    <p className="text-gray-900 dark:text-gray-100 font-mono mt-1">{selectedLog.id}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-600 dark:text-gray-400">Thời gian</Label>
                                    <p className="text-gray-900 dark:text-gray-100 mt-1">{selectedLog.timestamp}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-600 dark:text-gray-400">Người dùng</Label>
                                    <p className="text-gray-900 dark:text-gray-100 mt-1">{selectedLog.userName}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">({selectedLog.userRole})</p>
                                </div>
                                <div>
                                    <Label className="text-gray-600 dark:text-gray-400">User ID</Label>
                                    <p className="text-gray-900 dark:text-gray-100 font-mono mt-1">{selectedLog.userId}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-600 dark:text-gray-400">Hành động</Label>
                                    <div className="mt-1">
                                        <Badge className={getActionColor(selectedLog.action)}>
                                            {getActionIcon(selectedLog.action)}
                                            <span className="ml-1">{selectedLog.action}</span>
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-gray-600 dark:text-gray-400">Trạng thái</Label>
                                    <div className="mt-1">
                                        <Badge className={getStatusColor(selectedLog.status)}>
                                            {selectedLog.status}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-gray-600 dark:text-gray-400">Danh mục</Label>
                                    <p className="text-gray-900 dark:text-gray-100 mt-1">{selectedLog.category}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-600 dark:text-gray-400">Resource</Label>
                                    <p className="text-gray-900 dark:text-gray-100 mt-1">{selectedLog.resource}</p>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-gray-600 dark:text-gray-400">IP Address</Label>
                                    <p className="text-gray-900 dark:text-gray-100 font-mono mt-1">{selectedLog.ipAddress}</p>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-gray-600 dark:text-gray-400">Mô tả</Label>
                                    <p className="text-gray-900 dark:text-gray-100 mt-1">{selectedLog.description}</p>
                                </div>
                            </div>

                            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                <>
                                    <Separator className="bg-gray-200 dark:bg-gray-700" />
                                    <div>
                                        <Label className="text-gray-600 dark:text-gray-400">Metadata</Label>
                                        <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <pre className="text-sm text-gray-900 dark:text-gray-100 font-mono overflow-x-auto">
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
                            className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                        >
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
