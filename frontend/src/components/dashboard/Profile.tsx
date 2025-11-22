import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  CreditCard,
  Camera,
  Lock,
  Bell,
  Globe,
  Moon,
  Sun,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { toast } from "sonner";
import { updateUserProfile, changePassword } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../ThemeProvider";
import type { User as UserType } from "../../types";
import type { ErrorWithMessage } from "../../types";

interface ProfileProps {
  role?: string;
  user?: UserType & {
    phone?: string;
    address?: string;
    birthday?: string;
    department?: string;
    createdAt?: string;
    avatarUrl?: string;
    bankAccount?: string;
    bankName?: string;
    leaveBalance?: {
      annual?: {
        used: number;
        total: number;
      };
    };
  };
}

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  birthday: string;
  department: string;
  position: string;
  joinDate: string;
  employeeId: string;
  bankAccount: string;
  bankName: string;
}

interface PasswordData {
  current: string;
  new: string;
  confirm: string;
}

interface ShowPassword {
  current: boolean;
  new: boolean;
  confirm: boolean;
}

interface PasswordErrors {
  current: string;
  new: string;
  confirm: string;
}

interface Notifications {
  email: boolean;
  push: boolean;
  sms: boolean;
}

export function Profile({ role, user }: ProfileProps): React.JSX.Element {
  const { setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [notifications, setNotifications] = useState<Notifications>({
    email: true,
    push: true,
    sms: false,
  });

  const [profile, setProfile] = useState<ProfileData>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    birthday: "",
    department: "",
    position: "",
    joinDate: "",
    employeeId: "",
    bankAccount: "",
    bankName: "",
  });

  useEffect(() => {
    if (user) {
      // Format birthday từ ISO string sang YYYY-MM-DD cho input date
      let formattedBirthday = "";
      if (user.birthday) {
        try {
          formattedBirthday = new Date(user.birthday).toISOString().split("T")[0];
        } catch (e) {
          formattedBirthday = "";
        }
      }

      setProfile({
        fullName: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        birthday: formattedBirthday,
        department: user.department || "",
        position: role === "admin" ? "Admin Manager" : "Senior Developer",
        joinDate: user.createdAt
          ? new Date(user.createdAt).toISOString().split("T")[0]
          : "",
        employeeId: user._id ? user._id.slice(-6).toUpperCase() : "",
        bankAccount: user.bankAccount || "",
        bankName: user.bankName || "",
      });
    }
  }, [user, role]);

  const [passwordData, setPasswordData] = useState<PasswordData>({
    current: "",
    new: "",
    confirm: "",
  });

  const [showPassword, setShowPassword] = useState<ShowPassword>({
    current: false,
    new: false,
    confirm: false,
  });

  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({
    current: "",
    new: "",
    confirm: "",
  });

  const handleSaveProfile = async (): Promise<void> => {
    try {
      const updateData = {
        name: profile.fullName,
        phone: profile.phone,
        address: profile.address,
        birthday: profile.birthday,
        bankAccount: profile.bankAccount,
        bankName: profile.bankName,
      };

      const response = await updateUserProfile(updateData);

      if (response.user) {
        setUser(response.user);
        setIsEditing(false);
        toast.success("Cập nhật thông tin thành công!");
      }
    } catch (error) {
      const err = error as ErrorWithMessage;
      toast.error(err.response?.data?.message || "Cập nhật thông tin thất bại");
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    // Reset errors
    setPasswordErrors({ current: "", new: "", confirm: "" });

    // Validate
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      setPasswordErrors({
        current: !passwordData.current ? "Vui lòng nhập mật khẩu hiện tại" : "",
        new: !passwordData.new ? "Vui lòng nhập mật khẩu mới" : "",
        confirm: !passwordData.confirm ? "Vui lòng xác nhận mật khẩu mới" : "",
      });
      return;
    }

    if (passwordData.new.length < 6) {
      setPasswordErrors({
        current: "",
        new: "Mật khẩu mới phải có ít nhất 6 ký tự",
        confirm: "",
      });
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      setPasswordErrors({
        current: "",
        new: "",
        confirm: "Mật khẩu mới không khớp",
      });
      return;
    }

    try {
      await changePassword(passwordData.current, passwordData.new);
      toast.success("Đổi mật khẩu thành công!");
      setPasswordData({ current: "", new: "", confirm: "" });
      setPasswordErrors({ current: "", new: "", confirm: "" });
    } catch (error) {
      // API interceptor wraps error, so check both error.message and error.response
      const err = error as ErrorWithMessage;
      const errorMessage = err.message || (err.response?.data as { message?: string })?.message || "Đổi mật khẩu thất bại";

      console.log("Error caught:", error);
      console.log("Error message:", errorMessage);

      // Check if error message contains password validation error
      if (errorMessage.includes("Mật khẩu hiện tại không đúng") ||
        errorMessage.includes("không đúng") ||
        errorMessage === "Mật khẩu hiện tại không đúng") {
        setPasswordErrors({
          current: "Mật khẩu hiện tại không đúng",
          new: "",
          confirm: "",
        });
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      // Upload avatar logic
      console.log("Uploading avatar:", file.name);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl text-[var(--text-main)] flex items-center space-x-3">
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            👤
          </motion.span>
          <span>Hồ sơ cá nhân</span>
        </h1>
        <p className="text-[var(--text-sub)]">
          Quản lý thông tin và cài đặt tài khoản
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div
          className="lg:col-span-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* infomation card */}
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-8 pt-4">
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Avatar */}
                <div className="relative group">
                  <motion.div whileHover={{ scale: 1.05 }}>
                    <Avatar className="h-32 w-32 border-4 border-[var(--accent-cyan)] shadow-lg">
                      <AvatarImage
                        src={
                          user?.avatarUrl ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || "user"
                          }`
                        }
                      />
                      <AvatarFallback className="text-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white">
                        {profile.fullName
                          ? profile.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                          : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>

                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 p-2 bg-[var(--accent-cyan)] rounded-full cursor-pointer hover:bg-[var(--primary)] transition-colors shadow-lg"
                  >
                    <Camera className="h-4 w-4 text-white" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                </div>

                {/* Basic Info */}
                <div className="space-y-1">
                  <h2 className="text-xl text-[var(--text-main)]">
                    {profile.fullName}
                  </h2>
                  <p className="text-sm text-[var(--text-sub)]">
                    {profile.position}
                  </p>
                  <Badge className="bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] mt-2">
                    {profile.employeeId}
                  </Badge>
                </div>

                <Separator />

                {/* Quick Stats */}
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-sub)] flex items-center space-x-2">
                      <Briefcase className="h-4 w-4" />
                      <span>Phòng ban</span>
                    </span>
                    <span className="text-[var(--text-main)]">
                      {profile.department}
                    </span>
                  </div>

                  {profile.joinDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-sub)] flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Ngày vào</span>
                      </span>
                      <span className="text-[var(--text-main)]">
                        {new Date(profile.joinDate).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  )}

                  {role === "employee" && user?.leaveBalance?.annual && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-sub)] flex items-center space-x-2">
                        <span>🏖️</span>
                        <span>Phép năm</span>
                      </span>
                      <span className="text-[var(--success)]">
                        {user.leaveBalance.annual.used}/
                        {user.leaveBalance.annual.total} ngày
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Details Tabs */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-6 mt-4">
              <Tabs defaultValue="info" className="space-y-6">
                <TabsList className="bg-[var(--shell)] flex items-center w-full">
                  <TabsTrigger
                    value="info"
                    className="flex-1 flex items-center justify-center"
                  >
                    Thông tin
                  </TabsTrigger>
                  <TabsTrigger
                    value="security"
                    className="flex-1 flex items-center justify-center"
                  >
                    Bảo mật
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="flex-1 flex items-center justify-center"
                  >
                    Cài đặt
                  </TabsTrigger>
                </TabsList>

                {/* Personal Info Tab */}
                <TabsContent value="info" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg text-[var(--text-main)]">
                        Thông tin cá nhân
                      </h3>
                      <p className="text-sm text-[var(--text-sub)]">
                        Cập nhật thông tin của bạn
                      </p>
                    </div>
                    {!isEditing ? (
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]"
                      >
                        Chỉnh sửa
                      </Button>
                    ) : (
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => setIsEditing(false)}
                          variant="outline"
                          className="border-[var(--border)]"
                        >
                          Hủy
                        </Button>
                        <Button
                          onClick={handleSaveProfile}
                          className="bg-gradient-to-r from-[var(--success)] to-[var(--accent-cyan)]"
                        >
                          Lưu
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[var(--text-main)]">
                        <User className="h-4 w-4 inline mr-2" />
                        Họ và tên
                      </Label>
                      <Input
                        value={profile.fullName}
                        onChange={(e) =>
                          setProfile({ ...profile, fullName: e.target.value })
                        }
                        disabled={!isEditing}
                        className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[var(--text-main)]">
                        <Mail className="h-4 w-4 inline mr-2" />
                        Email
                      </Label>
                      <Input
                        value={profile.email}
                        disabled
                        className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] opacity-60"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[var(--text-main)]">
                        <Phone className="h-4 w-4 inline mr-2" />
                        Số điện thoại
                      </Label>
                      <Input
                        value={profile.phone}
                        onChange={(e) =>
                          setProfile({ ...profile, phone: e.target.value })
                        }
                        disabled={!isEditing}
                        className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[var(--text-main)]">
                        <Calendar className="h-4 w-4 inline mr-2" />
                        Ngày sinh
                      </Label>
                      <Input
                        type="date"
                        value={profile.birthday}
                        onChange={(e) =>
                          setProfile({ ...profile, birthday: e.target.value })
                        }
                        disabled={!isEditing}
                        className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-[var(--text-main)]">
                        <MapPin className="h-4 w-4 inline mr-2" />
                        Địa chỉ
                      </Label>
                      <Input
                        value={profile.address}
                        onChange={(e) =>
                          setProfile({ ...profile, address: e.target.value })
                        }
                        disabled={!isEditing}
                        className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[var(--text-main)]">
                        <Building2 className="h-4 w-4 inline mr-2" />
                        Phòng ban
                      </Label>
                      <Input
                        value={profile.department}
                        disabled
                        className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] opacity-60"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[var(--text-main)]">
                        <Briefcase className="h-4 w-4 inline mr-2" />
                        Chức vụ
                      </Label>
                      <Input
                        value={profile.position}
                        disabled
                        className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] opacity-60"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[var(--text-main)]">
                        <CreditCard className="h-4 w-4 inline mr-2" />
                        Số tài khoản
                      </Label>
                      <Input
                        value={profile.bankAccount}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            bankAccount: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                        className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[var(--text-main)]">
                        <Building2 className="h-4 w-4 inline mr-2" />
                        Ngân hàng
                      </Label>
                      <Input
                        value={profile.bankName}
                        onChange={(e) =>
                          setProfile({ ...profile, bankName: e.target.value })
                        }
                        disabled={!isEditing}
                        className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)]"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security" className="space-y-6">
                  <div>
                    <h3 className="text-lg text-[var(--text-main)] mb-1">
                      Đổi mật khẩu
                    </h3>
                    <p className="text-sm text-[var(--text-sub)]">
                      Cập nhật mật khẩu để bảo mật tài khoản
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[var(--text-main)]">
                        <Lock className="h-4 w-4 inline mr-2" />
                        Mật khẩu hiện tại
                      </Label>
                      <div className="relative">
                        <Input
                          type={showPassword.current ? "text" : "password"}
                          value={passwordData.current}
                          onChange={(e) => {
                            setPasswordData({
                              ...passwordData,
                              current: e.target.value,
                            });
                            // Clear error when user types
                            if (passwordErrors.current) {
                              setPasswordErrors({
                                ...passwordErrors,
                                current: "",
                              });
                            }
                          }}
                          className={`bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] pr-10 ${passwordErrors.current
                            ? "border-[var(--error)]"
                            : ""
                            }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword({
                              ...showPassword,
                              current: !showPassword.current,
                            })
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-sub)] hover:text-[var(--text-main)]"
                        >
                          {showPassword.current ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {passwordErrors.current && (
                        <p className="text-sm text-[var(--error)]">
                          {passwordErrors.current}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[var(--text-main)]">
                        <Lock className="h-4 w-4 inline mr-2" />
                        Mật khẩu mới
                      </Label>
                      <div className="relative">
                        <Input
                          type={showPassword.new ? "text" : "password"}
                          value={passwordData.new}
                          onChange={(e) => {
                            setPasswordData({
                              ...passwordData,
                              new: e.target.value,
                            });
                            // Clear error when user types
                            if (passwordErrors.new) {
                              setPasswordErrors({
                                ...passwordErrors,
                                new: "",
                              });
                            }
                          }}
                          className={`bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] pr-10 ${passwordErrors.new ? "border-[var(--error)]" : ""
                            }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword({
                              ...showPassword,
                              new: !showPassword.new,
                            })
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-sub)] hover:text-[var(--text-main)]"
                        >
                          {showPassword.new ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {passwordErrors.new && (
                        <p className="text-sm text-[var(--error)]">
                          {passwordErrors.new}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[var(--text-main)]">
                        <Lock className="h-4 w-4 inline mr-2" />
                        Xác nhận mật khẩu mới
                      </Label>
                      <div className="relative">
                        <Input
                          type={showPassword.confirm ? "text" : "password"}
                          value={passwordData.confirm}
                          onChange={(e) => {
                            setPasswordData({
                              ...passwordData,
                              confirm: e.target.value,
                            });
                            // Clear error when user types
                            if (passwordErrors.confirm) {
                              setPasswordErrors({
                                ...passwordErrors,
                                confirm: "",
                              });
                            }
                          }}
                          className={`bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] pr-10 ${passwordErrors.confirm
                            ? "border-[var(--error)]"
                            : ""
                            }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword({
                              ...showPassword,
                              confirm: !showPassword.confirm,
                            })
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-sub)] hover:text-[var(--text-main)]"
                        >
                          {showPassword.confirm ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {passwordErrors.confirm && (
                        <p className="text-sm text-[var(--error)]">
                          {passwordErrors.confirm}
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={handleChangePassword}
                      className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]"
                    >
                      Cập nhật mật khẩu
                    </Button>
                  </div>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-6">
                  <div>
                    <h3 className="text-lg text-[var(--text-main)] mb-1">
                      Cài đặt ứng dụng
                    </h3>
                    <p className="text-sm text-[var(--text-sub)]">
                      Tùy chỉnh trải nghiệm của bạn
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Theme */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-[var(--accent-cyan)]/10">
                          {theme === 'dark' ? (
                            <Moon className="h-5 w-5 text-[var(--accent-cyan)]" />
                          ) : (
                            <Sun className="h-5 w-5 text-[var(--warning)]" />
                          )}
                        </div>
                        <div>
                          <p className="text-[var(--text-main)]">Chế độ tối</p>
                          <p className="text-sm text-[var(--text-sub)]">
                            Giao diện tối dễ nhìn
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={theme === 'dark'}
                        onCheckedChange={toggleTheme}
                      />
                    </div>

                    {/* Language */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-[var(--primary)]/10">
                          <Globe className="h-5 w-5 text-[var(--primary)]" />
                        </div>
                        <div>
                          <p className="text-[var(--text-main)]">Ngôn ngữ</p>
                          <p className="text-sm text-[var(--text-sub)]">
                            Chọn ngôn ngữ hiển thị
                          </p>
                        </div>
                      </div>
                      <Select defaultValue="vi">
                        <SelectTrigger className="w-32 bg-[var(--input-bg)] border-[var(--border)]">
                          <SelectValue placeholder="Tiếng Việt" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vi">Tiếng Việt</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Notifications */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Bell className="h-5 w-5 text-[var(--accent-cyan)]" />
                        <h4 className="text-[var(--text-main)]">Thông báo</h4>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--shell)]">
                          <div>
                            <p className="text-sm text-[var(--text-main)]">
                              Email
                            </p>
                            <p className="text-xs text-[var(--text-sub)]">
                              Nhận thông báo qua email
                            </p>
                          </div>
                          <Switch
                            checked={notifications.email}
                            onCheckedChange={(checked) =>
                              setNotifications({
                                ...notifications,
                                email: checked,
                              })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--shell)]">
                          <div>
                            <p className="text-sm text-[var(--text-main)]">
                              Push
                            </p>
                            <p className="text-xs text-[var(--text-sub)]">
                              Thông báo trên trình duyệt
                            </p>
                          </div>
                          <Switch
                            checked={notifications.push}
                            onCheckedChange={(checked) =>
                              setNotifications({
                                ...notifications,
                                push: checked,
                              })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--shell)]">
                          <div>
                            <p className="text-sm text-[var(--text-main)]">
                              SMS
                            </p>
                            <p className="text-xs text-[var(--text-sub)]">
                              Nhận tin nhắn SMS
                            </p>
                          </div>
                          <Switch
                            checked={notifications.sms}
                            onCheckedChange={(checked) =>
                              setNotifications({
                                ...notifications,
                                sms: checked,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}




