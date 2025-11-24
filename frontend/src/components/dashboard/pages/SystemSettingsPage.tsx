import { useState } from 'react';
import {
    Settings,
    Shield,
    Bell,
    Globe,
    Database,
    Mail,
    Clock,
    Smartphone,
    Key,
    Save,
    RefreshCw,
    AlertTriangle,
    Lock,
    Download,
    Upload
} from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Separator } from '../../ui/separator';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';

interface SystemConfig {
    general: {
        companyName: string;
        timezone: string;
        dateFormat: string;
        language: string;
        currency: string;
    };
    attendance: {
        checkInWindow: number;
        checkOutWindow: number;
        autoCheckOut: boolean;
        requireGPS: boolean;
        requirePhoto: boolean;
        maxDistance: number;
    };
    notifications: {
        emailEnabled: boolean;
        smsEnabled: boolean;
        pushEnabled: boolean;
        lateNotification: boolean;
        overtimeNotification: boolean;
        leaveApproval: boolean;
    };
    security: {
        sessionTimeout: number;
        passwordExpiry: number;
        mfaEnabled: boolean;
        ipWhitelist: boolean;
        apiRateLimit: number;
    };
    integration: {
        smtpServer: string;
        smtpPort: string;
        smtpUser: string;
        smsProvider: string;
        backupEnabled: boolean;
        backupFrequency: string;
    };
}

export default function SystemSettingsPage() {
    const [activeTab, setActiveTab] = useState('general');
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [config, setConfig] = useState<SystemConfig>({
        general: {
            companyName: 'Công ty TNHH ABC',
            timezone: 'Asia/Ho_Chi_Minh',
            dateFormat: 'DD/MM/YYYY',
            language: 'vi',
            currency: 'VND',
        },
        attendance: {
            checkInWindow: 30,
            checkOutWindow: 30,
            autoCheckOut: true,
            requireGPS: true,
            requirePhoto: false,
            maxDistance: 100,
        },
        notifications: {
            emailEnabled: true,
            smsEnabled: false,
            pushEnabled: true,
            lateNotification: true,
            overtimeNotification: true,
            leaveApproval: true,
        },
        security: {
            sessionTimeout: 60,
            passwordExpiry: 90,
            mfaEnabled: false,
            ipWhitelist: false,
            apiRateLimit: 100,
        },
        integration: {
            smtpServer: 'smtp.gmail.com',
            smtpPort: '587',
            smtpUser: 'noreply@company.com',
            smsProvider: 'Twilio',
            backupEnabled: true,
            backupFrequency: 'daily',
        },
    });

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            setHasChanges(false);
            toast.success('Đã lưu cài đặt hệ thống');
        }, 1500);
    };

    const handleReset = () => {
        if (confirm('Bạn có chắc muốn khôi phục cài đặt mặc định?')) {
            toast.success('Đã khôi phục cài đặt mặc định');
            setHasChanges(false);
        }
    };

    const handleExport = () => {
        const jsonContent = JSON.stringify(config, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `system_config_${new Date().toISOString()}.json`;
        link.click();
        toast.success('📥 Đang xuất cấu hình hệ thống...');
    };

    const handleImport = () => {
        toast.success('📤 Đang nhập cấu hình hệ thống...');
    };

    const updateConfig = (section: keyof SystemConfig, key: string, value: any) => {
        setConfig(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value,
            },
        }));
        setHasChanges(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
                        <Settings className="h-6 w-6 text-cyan-400" />
                        Cài đặt hệ thống
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm">
                        Quản lý cấu hình và tùy chọn hệ thống
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        className="border-gray-700 hover:border-gray-600 text-gray-300 hover:text-gray-100 bg-transparent"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Xuất
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleImport}
                        className="border-gray-700 hover:border-gray-600 text-gray-300 hover:text-gray-100 bg-transparent"
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Nhập
                    </Button>
                    {hasChanges && (
                        <Badge className="bg-yellow-500/20 text-yellow-500 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Chưa lưu
                        </Badge>
                    )}
                </div>
            </div>

            {/* Main Settings */}
            <Card className="bg-[#1a2332] border-gray-700">
                <CardContent className="p-6 mt-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-5 bg-[#0f1621] border-gray-700">
                            <TabsTrigger value="general" className="data-[state=active]:bg-[#1a2332] data-[state=active]:text-cyan-400">
                                <Globe className="h-4 w-4 mr-2" />
                                Chung
                            </TabsTrigger>
                            <TabsTrigger value="attendance" className="data-[state=active]:bg-[#1a2332] data-[state=active]:text-cyan-400">
                                <Clock className="h-4 w-4 mr-2" />
                                Chấm công
                            </TabsTrigger>
                            <TabsTrigger value="notifications" className="data-[state=active]:bg-[#1a2332] data-[state=active]:text-cyan-400">
                                <Bell className="h-4 w-4 mr-2" />
                                Thông báo
                            </TabsTrigger>
                            <TabsTrigger value="security" className="data-[state=active]:bg-[#1a2332] data-[state=active]:text-cyan-400">
                                <Shield className="h-4 w-4 mr-2" />
                                Bảo mật
                            </TabsTrigger>
                            <TabsTrigger value="integration" className="data-[state=active]:bg-[#1a2332] data-[state=active]:text-cyan-400">
                                <Database className="h-4 w-4 mr-2" />
                                Tích hợp
                            </TabsTrigger>
                        </TabsList>

                        {/* General Settings */}
                        <TabsContent value="general" className="space-y-6 mt-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Tên công ty</Label>
                                    <Input
                                        value={config.general.companyName}
                                        onChange={(e) => updateConfig('general', 'companyName', e.target.value)}
                                        className="bg-[#0f1621] border-gray-700 text-gray-100 focus:border-cyan-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Múi giờ</Label>
                                    <Select
                                        value={config.general.timezone}
                                        onValueChange={(v) => updateConfig('general', 'timezone', v)}
                                    >
                                        <SelectTrigger className="bg-[#0f1621] border-gray-700 text-gray-100">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Asia/Ho_Chi_Minh">GMT+7 (Việt Nam)</SelectItem>
                                            <SelectItem value="Asia/Bangkok">GMT+7 (Bangkok)</SelectItem>
                                            <SelectItem value="Asia/Singapore">GMT+8 (Singapore)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Định dạng ngày</Label>
                                    <Select
                                        value={config.general.dateFormat}
                                        onValueChange={(v) => updateConfig('general', 'dateFormat', v)}
                                    >
                                        <SelectTrigger className="bg-[#0f1621] border-gray-700 text-gray-100">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Ngôn ngữ</Label>
                                    <Select
                                        value={config.general.language}
                                        onValueChange={(v) => updateConfig('general', 'language', v)}
                                    >
                                        <SelectTrigger className="bg-[#0f1621] border-gray-700 text-gray-100">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="vi">Tiếng Việt</SelectItem>
                                            <SelectItem value="en">English</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Đơn vị tiền tệ</Label>
                                    <Select
                                        value={config.general.currency}
                                        onValueChange={(v) => updateConfig('general', 'currency', v)}
                                    >
                                        <SelectTrigger className="bg-[#0f1621] border-gray-700 text-gray-100">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="VND">VND (₫)</SelectItem>
                                            <SelectItem value="USD">USD ($)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Attendance Settings */}
                        <TabsContent value="attendance" className="space-y-6 mt-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Thời gian check-in sớm (phút)</Label>
                                    <Input
                                        type="number"
                                        value={config.attendance.checkInWindow}
                                        onChange={(e) => updateConfig('attendance', 'checkInWindow', parseInt(e.target.value))}
                                        className="bg-[#0f1621] border-gray-700 text-gray-100 focus:border-cyan-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Thời gian check-out muộn (phút)</Label>
                                    <Input
                                        type="number"
                                        value={config.attendance.checkOutWindow}
                                        onChange={(e) => updateConfig('attendance', 'checkOutWindow', parseInt(e.target.value))}
                                        className="bg-[#0f1621] border-gray-700 text-gray-100 focus:border-cyan-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Khoảng cách tối đa (mét)</Label>
                                    <Input
                                        type="number"
                                        value={config.attendance.maxDistance}
                                        onChange={(e) => updateConfig('attendance', 'maxDistance', parseInt(e.target.value))}
                                        className="bg-[#0f1621] border-gray-700 text-gray-100 focus:border-cyan-500"
                                    />
                                </div>
                            </div>

                            <Separator className="bg-gray-700" />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-gray-300">Tự động check-out</Label>
                                        <p className="text-sm text-gray-400">Tự động check-out khi hết ca</p>
                                    </div>
                                    <Switch
                                        checked={config.attendance.autoCheckOut}
                                        onCheckedChange={(v) => updateConfig('attendance', 'autoCheckOut', v)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-gray-300">Bắt buộc GPS</Label>
                                        <p className="text-sm text-gray-400">Yêu cầu vị trí GPS khi chấm công</p>
                                    </div>
                                    <Switch
                                        checked={config.attendance.requireGPS}
                                        onCheckedChange={(v) => updateConfig('attendance', 'requireGPS', v)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-gray-300">Bắt buộc ảnh</Label>
                                        <p className="text-sm text-gray-400">Yêu cầu chụp ảnh khi chấm công</p>
                                    </div>
                                    <Switch
                                        checked={config.attendance.requirePhoto}
                                        onCheckedChange={(v) => updateConfig('attendance', 'requirePhoto', v)}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* Notification Settings */}
                        <TabsContent value="notifications" className="space-y-6 mt-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-5 w-5 text-cyan-500" />
                                        <div>
                                            <Label>Email</Label>
                                            <p className="text-sm text-gray-400">Gửi thông báo qua email</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={config.notifications.emailEnabled}
                                        onCheckedChange={(v) => updateConfig('notifications', 'emailEnabled', v)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Smartphone className="h-5 w-5 text-cyan-500" />
                                        <div>
                                            <Label>SMS</Label>
                                            <p className="text-sm text-gray-400">Gửi thông báo qua SMS</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={config.notifications.smsEnabled}
                                        onCheckedChange={(v) => updateConfig('notifications', 'smsEnabled', v)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Bell className="h-5 w-5 text-cyan-500" />
                                        <div>
                                            <Label>Push Notification</Label>
                                            <p className="text-sm text-gray-400">Gửi thông báo đẩy</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={config.notifications.pushEnabled}
                                        onCheckedChange={(v) => updateConfig('notifications', 'pushEnabled', v)}
                                    />
                                </div>

                                <Separator className="bg-gray-700" />

                                <h3 className="text-gray-100 font-medium">Loại thông báo</h3>

                                <div className="flex items-center justify-between">
                                    <Label className="text-gray-300">Thông báo đi muộn</Label>
                                    <Switch
                                        checked={config.notifications.lateNotification}
                                        onCheckedChange={(v) => updateConfig('notifications', 'lateNotification', v)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-gray-300">Thông báo tăng ca</Label>
                                    <Switch
                                        checked={config.notifications.overtimeNotification}
                                        onCheckedChange={(v) => updateConfig('notifications', 'overtimeNotification', v)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-gray-300">Phê duyệt nghỉ phép</Label>
                                    <Switch
                                        checked={config.notifications.leaveApproval}
                                        onCheckedChange={(v) => updateConfig('notifications', 'leaveApproval', v)}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* Security Settings */}
                        <TabsContent value="security" className="space-y-6 mt-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Thời gian hết phiên (phút)</Label>
                                    <Input
                                        type="number"
                                        value={config.security.sessionTimeout}
                                        onChange={(e) => updateConfig('security', 'sessionTimeout', parseInt(e.target.value))}
                                        className="bg-[#0f1621] border-gray-700 text-gray-100 focus:border-cyan-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Thời hạn mật khẩu (ngày)</Label>
                                    <Input
                                        type="number"
                                        value={config.security.passwordExpiry}
                                        onChange={(e) => updateConfig('security', 'passwordExpiry', parseInt(e.target.value))}
                                        className="bg-[#0f1621] border-gray-700 text-gray-100 focus:border-cyan-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Giới hạn API (requests/min)</Label>
                                    <Input
                                        type="number"
                                        value={config.security.apiRateLimit}
                                        onChange={(e) => updateConfig('security', 'apiRateLimit', parseInt(e.target.value))}
                                        className="bg-[#0f1621] border-gray-700 text-gray-100 focus:border-cyan-500"
                                    />
                                </div>
                            </div>

                            <Separator className="bg-gray-700" />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Key className="h-5 w-5 text-cyan-500" />
                                        <div>
                                            <Label className="text-gray-300">Xác thực 2 yếu tố (MFA)</Label>
                                            <p className="text-sm text-gray-400">Bắt buộc MFA cho tất cả người dùng</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={config.security.mfaEnabled}
                                        onCheckedChange={(v) => updateConfig('security', 'mfaEnabled', v)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Lock className="h-5 w-5 text-cyan-500" />
                                        <div>
                                            <Label className="text-gray-300">IP Whitelist</Label>
                                            <p className="text-sm text-gray-400">Chỉ cho phép IP trong danh sách</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={config.security.ipWhitelist}
                                        onCheckedChange={(v) => updateConfig('security', 'ipWhitelist', v)}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* Integration Settings */}
                        <TabsContent value="integration" className="space-y-6 mt-6">
                            <div>
                                <h3 className="text-gray-100 font-medium mb-4">Cấu hình SMTP</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">SMTP Server</Label>
                                        <Input
                                            value={config.integration.smtpServer}
                                            onChange={(e) => updateConfig('integration', 'smtpServer', e.target.value)}
                                            className="bg-[#0f1621] border-gray-700 text-gray-100 focus:border-cyan-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Port</Label>
                                        <Input
                                            value={config.integration.smtpPort}
                                            onChange={(e) => updateConfig('integration', 'smtpPort', e.target.value)}
                                            className="bg-[#0f1621] border-gray-700 text-gray-100 focus:border-cyan-500"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label className="text-gray-300">User</Label>
                                        <Input
                                            value={config.integration.smtpUser}
                                            onChange={(e) => updateConfig('integration', 'smtpUser', e.target.value)}
                                            className="bg-[#0f1621] border-gray-700 text-gray-100 focus:border-cyan-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator className="bg-gray-700" />

                            <div>
                                <h3 className="text-gray-100 font-medium mb-4">Sao lưu</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-gray-300">Tự động sao lưu</Label>
                                        <Switch
                                            checked={config.integration.backupEnabled}
                                            onCheckedChange={(v) => updateConfig('integration', 'backupEnabled', v)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Tần suất sao lưu</Label>
                                        <Select
                                            value={config.integration.backupFrequency}
                                            onValueChange={(v) => updateConfig('integration', 'backupFrequency', v)}
                                        >
                                            <SelectTrigger className="bg-[#0f1621] border-gray-700 text-gray-100">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="hourly">Mỗi giờ</SelectItem>
                                                <SelectItem value="daily">Hàng ngày</SelectItem>
                                                <SelectItem value="weekly">Hàng tuần</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={handleReset}
                    className="border-gray-700 hover:border-gray-600 text-gray-300 hover:text-gray-100 bg-transparent"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Khôi phục mặc định
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600"
                >
                    {isSaving ? (
                        <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Đang lưu...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            Lưu thay đổi
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
