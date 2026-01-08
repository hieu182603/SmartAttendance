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
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { updateUserProfile, changePassword, uploadAvatar, getUserProfile } from "@/services/userService";
import { getDepartmentById } from '@/services/departmentService'
import { useAuth } from "@/context/AuthContext";
import { UserRole, getRolePosition, type UserRoleType } from "@/utils/roles";
import type { User as UserType } from "@/types";
import type { ErrorWithMessage } from "@/types";
import banksLocal from '@/data/banks.json'
import { useMemo } from 'react'

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
  taxId?: string;
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
  const { t } = useTranslation(['dashboard', 'common', 'auth']);
  const { setUser, user: contextUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now()); // Force reload avatar image

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
    taxId: "",
  });
  const [banks, setBanks] = useState<{ shortname?: string; name: string }[]>(banksLocal || []);

  // Fetch remote banks.json with fallback to local file and cache in localStorage
  useEffect(() => {
    let mounted = true
    const cacheKey = 'banks_json_cache_v1'
    const remoteUrl = 'https://raw.githubusercontent.com/huylaguna/danhsachNganHangVietNam/master/banks.json'

    // Try cache first
      try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
            setBanks(parsed)
        }
      }
    } catch (e) {
      // ignore
    }

    fetch(remoteUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch remote banks')
        return res.json()
      })
      .then((json) => {
        if (!mounted) return
        if (!Array.isArray(json)) return
        const normalized = json.map((entry: any) => ({
          shortname: entry.shortname || entry.shortName || entry.short || entry.short_code || entry.code || '',
          name: entry.name || entry.fullname || entry.bankName || entry.full_name || ''
        })).filter((b: any) => b.shortname || b.name)
        if (normalized.length > 0) {
          setBanks(normalized)
          try {
            localStorage.setItem(cacheKey, JSON.stringify(normalized))
          } catch (e) {
            // ignore storage errors
          }
        }
      })
      .catch(() => {
        // fallback already set from banksLocal
      })
    return () => { mounted = false }
  }, [])

  const banksOptions = useMemo(() => banks, [banks])

  // After banks loaded, if profile.bankName is full name map to shortname
  useEffect(() => {
    if (!banksOptions || banksOptions.length === 0) return
    if (!profile.bankName) return
    const found = banksOptions.find(b => b.name === profile.bankName || b.shortname === profile.bankName)
    if (found && found.shortname && found.shortname !== profile.bankName) {
      setProfile(p => ({ ...p, bankName: found.shortname }))
    }
  }, [banksOptions])

  const getBankFullName = (shortOrName: string | undefined): string => {
    if (!shortOrName) return ''
    const found = banksOptions.find(b => b.shortname === shortOrName || b.name === shortOrName)
    return found ? found.name : shortOrName
  }

  // Use contextUser if available, otherwise use prop user
  const currentUser = contextUser || user;

  useEffect(() => {
    if (currentUser) {
      // Format birthday từ ISO string sang YYYY-MM-DD cho input date
      let formattedBirthday = "";
      if (currentUser.birthday) {
        try {
          formattedBirthday = new Date(currentUser.birthday).toISOString().split("T")[0];
        } catch (e) {
          formattedBirthday = "";
        }
      }

      // Get position from role using roles.ts helper
      const userRole = (currentUser.role || UserRole.EMPLOYEE) as UserRoleType;
      const position = getRolePosition(userRole);

      // Extract department name from object or string; if dept is an id string, fetch name
      const getDepartmentName = async (dept?: string | { _id: string; name: string }) => {
        if (!dept) return "";
        if (typeof dept === "string") {
          // if looks like ObjectId (24 hex chars), try fetch department name
          if (/^[0-9a-fA-F]{24}$/.test(dept)) {
            try {
              const res = await getDepartmentById(dept)
              return res?.department?.name || dept
            } catch (e) {
              return dept
            }
          }
          return dept;
        }
        return dept.name || "";
      };

      (async () => {
        const departmentName = await getDepartmentName(currentUser.department as any)

        setProfile({
        fullName: currentUser.name || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        address: currentUser.address || "",
        birthday: formattedBirthday,
        department: departmentName,
        position: position,
        joinDate: currentUser.createdAt
          ? new Date(currentUser.createdAt).toISOString().split("T")[0]
          : "",
        employeeId: currentUser._id ? currentUser._id.slice(-6).toUpperCase() : "",
        bankAccount: currentUser.bankAccount || "",
        bankName: currentUser.bankName || "",
        taxId: (currentUser as any).taxId || (currentUser as any).tax_number || "",
        })
      })()
    }
  }, [currentUser, role]);

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

  const [passwordTouched, setPasswordTouched] = useState<{
    current?: boolean;
    new?: boolean;
    confirm?: boolean;
  }>({});

  // Password strength validation
  const passwordStrength = {
    hasMinLength: passwordData.new.length >= 8,
    hasUpperCase: /[A-Z]/.test(passwordData.new),
    hasLowerCase: /[a-z]/.test(passwordData.new),
    hasNumber: /[0-9]/.test(passwordData.new),
  };

  // Validation functions
  const validateCurrentPassword = (password: string): string | undefined => {
    if (!password) return t('dashboard:profile.security.errors.currentRequired');
    return undefined;
  };

  const validateNewPassword = (password: string): string | undefined => {
    if (!password) return t('dashboard:profile.security.errors.newRequired');
    if (password.length < 8) return t('dashboard:profile.security.errors.minLength');
    if (!/[A-Z]/.test(password)) return t('dashboard:profile.security.errors.hasUpperCase');
    if (!/[a-z]/.test(password)) return t('dashboard:profile.security.errors.hasLowerCase');
    if (!/[0-9]/.test(password)) return t('dashboard:profile.security.errors.hasNumber');
    return undefined;
  };

  const validateConfirmPassword = (confirmPassword: string, password: string): string | undefined => {
    if (!confirmPassword) return t('dashboard:profile.security.errors.confirmRequired');
    if (confirmPassword !== password) return t('dashboard:profile.security.errors.notMatch');
    return undefined;
  };

  const handlePasswordBlur = (field: 'current' | 'new' | 'confirm') => {
    setPasswordTouched({ ...passwordTouched, [field]: true });
    const newErrors = { ...passwordErrors };

    if (field === 'current') {
      newErrors.current = validateCurrentPassword(passwordData.current);
    } else if (field === 'new') {
      newErrors.new = validateNewPassword(passwordData.new);
      // Re-validate confirm password if it's already filled
      if (passwordData.confirm) {
        newErrors.confirm = validateConfirmPassword(passwordData.confirm, passwordData.new);
      }
    } else if (field === 'confirm') {
      newErrors.confirm = validateConfirmPassword(passwordData.confirm, passwordData.new);
    }

    setPasswordErrors(newErrors);
  };

  const handleSaveProfile = async (): Promise<void> => {
    try {
      const updateData = {
        name: profile.fullName,
        phone: profile.phone,
        address: profile.address,
        birthday: profile.birthday,
        bankAccount: profile.bankAccount,
        bankName: profile.bankName,
        taxId: profile.taxId,
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
    // Mark all fields as touched
    setPasswordTouched({ current: true, new: true, confirm: true });

    // Validate all fields
    const newErrors: PasswordErrors = {
      current: validateCurrentPassword(passwordData.current),
      new: validateNewPassword(passwordData.new),
      confirm: validateConfirmPassword(passwordData.confirm, passwordData.new),
    };

    setPasswordErrors(newErrors);

    // Check if form is valid
    if (newErrors.current || newErrors.new || newErrors.confirm) {
      toast.error(t('dashboard:profile.security.errors.formValidationError'));
      return;
    }

    try {
      await changePassword(passwordData.current, passwordData.new);
      toast.success(t('dashboard:profile.security.success'));
      setPasswordData({ current: "", new: "", confirm: "" });
      setPasswordErrors({ current: "", new: "", confirm: "" });
      setPasswordTouched({});
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

      console.log('Upload avatar response:', response); // Debug log

      // Fetch fresh user data to ensure we have all fields including avatar
      try {
        const freshUser = await getUserProfile();
        console.log('Fresh user data:', freshUser); // Debug log
        
        if (freshUser) {
          // Update user in context with fresh data
          setUser(freshUser);
          // Force avatar reload by updating timestamp
          setAvatarTimestamp(Date.now());
          toast.success(t('dashboard:profile.avatar.success'), { id: 'upload-avatar' });
        } else if (response.user) {
          // Fallback to response.user if getUserProfile fails
          setUser(response.user);
          setAvatarTimestamp(Date.now());
          toast.success(t('dashboard:profile.avatar.success'), { id: 'upload-avatar' });
        } else {
          console.error('No user data available:', { response, freshUser });
          toast.error('Không nhận được thông tin user sau khi upload', { id: 'upload-avatar' });
        }
      } catch (fetchError) {
        console.error('Error fetching fresh user:', fetchError);
        // Fallback to response.user if available
        if (response.user) {
          setUser(response.user);
          setAvatarTimestamp(Date.now());
          toast.success(t('dashboard:profile.avatar.success'), { id: 'upload-avatar' });
        } else {
          toast.error('Upload thành công nhưng không thể tải lại thông tin user', { id: 'upload-avatar' });
        }
      }
    } catch (error) {
      const err = error as ErrorWithMessage;
      toast.error(err.response?.data?.message || t('dashboard:profile.avatar.error'), { id: 'upload-avatar' });
    } finally {
      // Reset input để có thể chọn lại file cùng tên
      e.target.value = '';
    }
  };

  // Ensure avatar URL is https to avoid mixed-content blocking on https pages
  const getAvatarSrc = (): string => {
    const raw = currentUser?.avatar || currentUser?.avatarUrl;
    if (raw) {
      const safeUrl = raw.startsWith("http://") ? raw.replace("http://", "https://") : raw;
      return `${safeUrl}?t=${avatarTimestamp}`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.name || "user"}`;
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
                        key={`avatar-${avatarTimestamp}-${currentUser?.avatar || currentUser?.avatarUrl || 'default'}`}
                        src={getAvatarSrc()}
                        onError={(e) => {
                          console.error('Avatar load error:', e);
                          // Fallback to default if avatar fails to load
                          const target = e.target as HTMLImageElement;
                          target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.name || "user"}`;
                        }}
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
                      <div className="flex items-center gap-2">
                      {isEditing ? (
                        <Select className="w-full" value={profile.bankName} onValueChange={(v) => setProfile({ ...profile, bankName: v })} disabled={!isEditing}>
                          <SelectTrigger className="w-full bg-[var(--input-bg)] border-[var(--border)] h-9 text-[var(--text-main)]">
                            <SelectValue placeholder={t('dashboard:profile.personalInfo.fields.bankName')} />
                          </SelectTrigger>
                          <SelectContent className="max-h-44 overflow-auto">
                            {banksOptions.map((b) => (
                              <SelectItem key={b.shortname || b.name} value={b.shortname || b.name}>
                                {b.shortname ? `${b.shortname} - ${b.name}` : b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={getBankFullName(profile.bankName)}
                          disabled
                          className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] opacity-60"
                        />
                      )}
                      </div>
                      
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[var(--text-main)]">
                        🧾 {t('dashboard:profile.personalInfo.fields.taxId', 'Mã số thuế')}
                      </Label>
                      <Input
                        value={profile.taxId}
                        onChange={(e) => setProfile({ ...profile, taxId: e.target.value })}
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
                          onBlur={() => handlePasswordBlur('current')}
                          className={`bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] pr-10 ${
                            passwordTouched.current && passwordErrors.current
                              ? "border-red-500 focus-visible:ring-red-500"
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
                      {passwordTouched.current && passwordErrors.current && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-red-500"
                        >
                          {passwordErrors.current}
                        </motion.p>
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
                            // Re-validate confirm password when password changes
                            if (passwordData.confirm) {
                              const confirmError = validateConfirmPassword(passwordData.confirm, e.target.value);
                              setPasswordErrors({
                                ...passwordErrors,
                                confirm: confirmError || "",
                              });
                            }
                          }}
                          onBlur={() => handlePasswordBlur('new')}
                          className={`bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] pr-10 ${
                            passwordTouched.new && passwordErrors.new
                              ? "border-red-500 focus-visible:ring-red-500"
                              : ""
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
                      {passwordTouched.new && passwordErrors.new && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-red-500"
                        >
                          {passwordErrors.new}
                        </motion.p>
                      )}

                      {/* Password Strength Indicators */}
                      {passwordData.new && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5"
                        >
                          {[
                            { label: t('dashboard:profile.security.minLength'), valid: passwordStrength.hasMinLength },
                            { label: t('dashboard:profile.security.hasUpperCase'), valid: passwordStrength.hasUpperCase },
                            { label: t('dashboard:profile.security.hasLowerCase'), valid: passwordStrength.hasLowerCase },
                            { label: t('dashboard:profile.security.hasNumber'), valid: passwordStrength.hasNumber },
                          ].map((requirement, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.02 }}
                              className="flex items-center space-x-1.5"
                            >
                              <CheckCircle2
                                className={`h-3 w-3 transition-colors flex-shrink-0 ${
                                  requirement.valid ? 'text-[var(--success)]' : 'text-[var(--text-sub)] opacity-30'
                                }`}
                              />
                              <span
                                className={`text-xs transition-colors whitespace-nowrap ${
                                  requirement.valid ? 'text-[var(--success)]' : 'text-[var(--text-sub)]'
                                }`}
                              >
                                {requirement.label}
                              </span>
                            </motion.div>
                          ))}
                        </motion.div>
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
                          onBlur={() => handlePasswordBlur('confirm')}
                          className={`bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] pr-10 ${
                            passwordTouched.confirm && passwordErrors.confirm
                              ? "border-red-500 focus-visible:ring-red-500"
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
                      {passwordTouched.confirm && passwordErrors.confirm && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-red-500"
                        >
                          {passwordErrors.confirm}
                        </motion.p>
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
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}




