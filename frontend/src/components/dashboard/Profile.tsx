import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  Globe,
  Moon,
  Sun,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { updateUserProfile, changePassword, uploadAvatar } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { UserRole, getRolePosition, type UserRoleType } from "@/utils/roles";
import type { User as UserType } from "@/types";
import type { ErrorWithMessage } from "@/types";

interface ProfileProps {
  role?: string;
  user?: UserType & {
    phone?: string;
    address?: string;
    birthday?: string;
    department?: string;
    createdAt?: string;
    avatar?: string;
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

export function Profile({ role, user }: ProfileProps): React.JSX.Element {
  const { t } = useTranslation(['dashboard', 'common']);
  const { setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);

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

      // Get position from role using roles.ts helper
      const userRole = (user.role || UserRole.EMPLOYEE) as UserRoleType;
      const position = getRolePosition(userRole);

      // Extract department name from object or string
      const getDepartmentName = (dept?: string | { _id: string; name: string }): string => {
        if (!dept) return "";
        if (typeof dept === "string") return dept;
        return dept.name || "";
      };

      setProfile({
        fullName: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        birthday: formattedBirthday,
        department: getDepartmentName(user.department),
        position: position,
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
        toast.success(t('dashboard:profile.update.success'));
      }
    } catch (error) {
      const err = error as ErrorWithMessage;
      toast.error(err.response?.data?.message || t('dashboard:profile.update.error'));
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    // Reset errors
    setPasswordErrors({ current: "", new: "", confirm: "" });

    // Validate
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      setPasswordErrors({
        current: !passwordData.current ? t('dashboard:profile.security.errors.currentRequired') : "",
        new: !passwordData.new ? t('dashboard:profile.security.errors.newRequired') : "",
        confirm: !passwordData.confirm ? t('dashboard:profile.security.errors.confirmRequired') : "",
      });
      return;
    }

    if (passwordData.new.length < 6) {
      setPasswordErrors({
        current: "",
        new: t('dashboard:profile.security.errors.minLength'),
        confirm: "",
      });
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      setPasswordErrors({
        current: "",
        new: "",
        confirm: t('dashboard:profile.security.errors.notMatch'),
      });
      return;
    }

    try {
      await changePassword(passwordData.current, passwordData.new);
      toast.success(t('dashboard:profile.security.success'));
      setPasswordData({ current: "", new: "", confirm: "" });
      setPasswordErrors({ current: "", new: "", confirm: "" });
    } catch (error) {
      // API interceptor wraps error, so check both error.message and error.response
      const err = error as ErrorWithMessage;
      const errorMessage = err.message || (err.response?.data as { message?: string })?.message || t('dashboard:profile.security.error');

      console.log("Error caught:", error);
      console.log("Error message:", errorMessage);

      // Check if error message contains password validation error
      if (errorMessage.includes("Mật khẩu hiện tại không đúng") ||
        errorMessage.includes("không đúng") ||
        errorMessage === "Mật khẩu hiện tại không đúng") {
        setPasswordErrors({
          current: t('dashboard:profile.security.errors.currentIncorrect'),
          new: "",
          confirm: "",
        });
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('dashboard:profile.avatar.invalidFile'));
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('dashboard:profile.avatar.fileTooLarge'));
      return;
    }

    try {
      toast.loading(t('dashboard:profile.avatar.uploading'), { id: 'upload-avatar' });

      const response = await uploadAvatar(file);

      if (response.user) {
        setUser(response.user);
        toast.success(t('dashboard:profile.avatar.success'), { id: 'upload-avatar' });
      }
    } catch (error) {
      const err = error as ErrorWithMessage;
      toast.error(err.response?.data?.message || t('dashboard:profile.avatar.error'), { id: 'upload-avatar' });
    } finally {
      // Reset input để có thể chọn lại file cùng tên
      e.target.value = '';
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
          <span>{t('dashboard:profile.title')}</span>
        </h1>
        <p className="text-[var(--text-sub)]">
          {t('dashboard:profile.description')}
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
                          user?.avatar || user?.avatarUrl ||
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
                      <span>{t('dashboard:profile.stats.department')}</span>
                    </span>
                    <span className="text-[var(--text-main)]">
                      {profile.department}
                    </span>
                  </div>

                  {profile.joinDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-sub)] flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{t('dashboard:profile.stats.joinDate')}</span>
                      </span>
                      <span className="text-[var(--text-main)]">
                        {new Date(profile.joinDate).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  )}

                  {user?.role === UserRole.EMPLOYEE && user?.leaveBalance?.annual && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-sub)] flex items-center space-x-2">
                        <span>🏖️</span>
                        <span>{t('dashboard:profile.stats.annualLeave')}</span>
                      </span>
                      <span className="text-[var(--success)]">
                        {user.leaveBalance.annual.used}/
                        {user.leaveBalance.annual.total} {t('dashboard:profile.stats.days')}
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
                    {t('dashboard:profile.tabs.info')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="security"
                    className="flex-1 flex items-center justify-center"
                  >
                    {t('dashboard:profile.tabs.security')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="flex-1 flex items-center justify-center"
                  >
                    {t('dashboard:profile.tabs.settings')}
                  </TabsTrigger>
                </TabsList>

                {/* Personal Info Tab */}
                <TabsContent value="info" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg text-[var(--text-main)]">
                        {t('dashboard:profile.personalInfo.title')}
                      </h3>
                      <p className="text-sm text-[var(--text-sub)]">
                        {t('dashboard:profile.personalInfo.subtitle')}
                      </p>
                    </div>
                    {!isEditing ? (
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]"
                      >
                        {t('dashboard:profile.personalInfo.edit')}
                      </Button>
                    ) : (
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => setIsEditing(false)}
                          variant="outline"
                          className="border-[var(--border)]"
                        >
                          {t('common:cancel')}
                        </Button>
                        <Button
                          onClick={handleSaveProfile}
                          className="bg-gradient-to-r from-[var(--success)] to-[var(--accent-cyan)]"
                        >
                          {t('common:save')}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[var(--text-main)]">
                        <User className="h-4 w-4 inline mr-2" />
                        {t('dashboard:profile.personalInfo.fields.fullName')}
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
                        {t('dashboard:profile.personalInfo.fields.email')}
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
                        {t('dashboard:profile.personalInfo.fields.phone')}
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
                        {t('dashboard:profile.personalInfo.fields.birthday')}
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
                        {t('dashboard:profile.personalInfo.fields.address')}
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
                        {t('dashboard:profile.personalInfo.fields.department')}
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
                        {t('dashboard:profile.personalInfo.fields.position')}
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
                        {t('dashboard:profile.personalInfo.fields.bankAccount')}
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
                        {t('dashboard:profile.personalInfo.fields.bankName')}
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
                      {t('dashboard:profile.security.title')}
                    </h3>
                    <p className="text-sm text-[var(--text-sub)]">
                      {t('dashboard:profile.security.subtitle')}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[var(--text-main)]">
                        <Lock className="h-4 w-4 inline mr-2" />
                        {t('dashboard:profile.security.currentPassword')}
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
                        {t('dashboard:profile.security.newPassword')}
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
                        {t('dashboard:profile.security.confirmPassword')}
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
                      {t('dashboard:profile.security.updateButton')}
                    </Button>
                  </div>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-6">
                  <div>
                    <h3 className="text-lg text-[var(--text-main)] mb-1">
                      {t('dashboard:profile.settings.title')}
                    </h3>
                    <p className="text-sm text-[var(--text-sub)]">
                      {t('dashboard:profile.settings.title')}
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




