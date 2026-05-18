import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { EmployeeTabParamList } from '../../navigation/AppNavigator';
import { globalStyles, COLORS, SPACING, BORDER_RADIUS, SHADOWS, useTheme } from '../../utils/styles';
import { useTranslation } from '../../i18n';
import { Icon } from '../../components/ui/Icon';
import { DateTimePickerWrapper } from '../../components/ui/DateTimePickerWrapper';
import { useLeaveBalance, useLeaveHistory, useCreateLeaveRequest } from '../../hooks/useLeaveQueries';
import { queryKeys } from '../../hooks/queryKeys';

type RequestsScreenNavigationProp = BottomTabNavigationProp<EmployeeTabParamList, 'Requests'>;

interface RequestsScreenProps {
  navigation: RequestsScreenNavigationProp;
}

interface LeaveRequest {
  id: string | number;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  rejectionReason?: string;
}

export default function RequestsScreen({ navigation }: RequestsScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [reason, setReason] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showLeaveTypePicker, setShowLeaveTypePicker] = useState(false);

  // Listen for navigation params to open create leave modal
  useFocusEffect(
    React.useCallback(() => {
      // Get current route params
      const state = navigation.getState();
      const currentRoute = state?.routes[state?.index];
      const params = currentRoute?.params as { openCreateModal?: boolean } | undefined;

      if (params?.openCreateModal) {
        setIsDialogOpen(true);
        // Clear the param after opening
        navigation.setParams({ openCreateModal: undefined } as any);
      }
    }, [navigation])
  );

  // TanStack Query hooks
  const { data: balanceData, isLoading: balanceLoading } = useLeaveBalance();
  const { data: historyData, isLoading: historyLoading } = useLeaveHistory({ limit: 10 });
  const createLeaveRequest = useCreateLeaveRequest();

  const isLoading = balanceLoading || historyLoading;
  const isSubmitting = createLeaveRequest.isPending;

  // Derive leave balance from query data
  const leaveBalance = useMemo(() => {
    const defaultBalance = [
      { id: 'annual', name: 'Nghỉ phép năm', remaining: 0 },
      { id: 'sick', name: 'Nghỉ ốm', remaining: 0 },
      { id: 'unpaid', name: 'Nghỉ không lương', remaining: 0 },
    ];
    if (!balanceData) return defaultBalance;
    if (Array.isArray(balanceData) && balanceData.length > 0) return balanceData;
    if (typeof balanceData === 'object') {
      const mapped: any[] = [];
      if ((balanceData as any).annual) mapped.push({ id: 'annual', name: 'Nghỉ phép năm', remaining: (balanceData as any).annual.remaining || 0 });
      if ((balanceData as any).sick) mapped.push({ id: 'sick', name: 'Nghỉ ốm', remaining: (balanceData as any).sick.remaining || 0 });
      if ((balanceData as any).unpaid) mapped.push({ id: 'unpaid', name: 'Nghỉ không lương', remaining: (balanceData as any).unpaid.remaining || 0 });
      return mapped.length > 0 ? mapped : defaultBalance;
    }
    return defaultBalance;
  }, [balanceData]);

  // Derive request list from query data
  const requests: LeaveRequest[] = useMemo(() => {
    if (!historyData || !Array.isArray(historyData)) return [];
    return historyData.map((item: any) => ({
      id: item._id,
      type: item.type,
      startDate: item.startDate,
      endDate: item.endDate,
      reason: item.reason,
      status: item.status,
      submittedDate: item.submittedAt || item.createdAt || Date.now(),
      rejectionReason: item.rejectionReason,
    }));
  }, [historyData]);

  const leaveTypes = [
    { id: 'annual', label: t.requests.leaveTypes.annual },
    { id: 'sick', label: t.requests.leaveTypes.sick },
    { id: 'unpaid', label: t.requests.leaveTypes.unpaid },
    { id: 'other', label: t.requests.leaveTypes.overtime },
    { id: 'compensatory', label: t.requests.leaveTypes.compensatory },
    { id: 'maternity', label: t.requests.leaveTypes.maternity },
  ];

  const getLeaveTypeLabel = (typeId: string) => {
    const found = leaveTypes.find(t => t.id === typeId);
    return found ? found.label : typeId;
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.leave.all });
  };

  const handleSubmitRequest = async () => {
    if (!leaveType || !reason) {
      alert(t.requests.fillAll);
      return;
    }

    createLeaveRequest.mutate(
      {
        type: leaveType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        reason: reason,
      },
      {
        onSuccess: () => {
          alert(t.requests.submitSuccess);
          setIsDialogOpen(false);
          setLeaveType('');
          setReason('');
        },
        onError: (error: any) => {
          alert(error.response?.data?.message || t.requests.submitError);
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <View
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(34, 197, 94, 0.3)',
              borderRadius: BORDER_RADIUS.sm,
              paddingHorizontal: SPACING.sm,
              paddingVertical: SPACING.xs / 2,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Icon name="check_circle" size={12} color={COLORS.accent.green} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: COLORS.accent.green,
                marginLeft: SPACING.xs / 2,
              }}
            >
              {t.requests.status.approved}
            </Text>
          </View>
        );
      case 'rejected':
        return (
          <View
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(239, 68, 68, 0.3)',
              borderRadius: BORDER_RADIUS.sm,
              paddingHorizontal: SPACING.sm,
              paddingVertical: SPACING.xs / 2,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Icon name="error" size={12} color={COLORS.accent.red} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: COLORS.accent.red,
                marginLeft: SPACING.xs / 2,
              }}
            >
              {t.requests.status.rejected}
            </Text>
          </View>
        );
      default:
        return (
          <View
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.3)',
              borderRadius: BORDER_RADIUS.sm,
              paddingHorizontal: SPACING.sm,
              paddingVertical: SPACING.xs / 2,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Icon name="schedule" size={12} color={COLORS.accent.yellow} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: COLORS.accent.yellow,
                marginLeft: SPACING.xs / 2,
              }}
            >
              {t.requests.status.pending}
            </Text>
          </View>
        );
    }
  };

  const formatDate = (dateStr: string | number) => {
    if (!dateStr) return '--/--/----';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--/--/----';
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateForInput = (date: Date) => {
    const d = (!date || isNaN(date.getTime())) ? new Date() : date;
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  return (
    <ScrollView
      style={[globalStyles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent.cyan]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: SPACING.xxl * 2,
          paddingBottom: SPACING.lg,
          paddingHorizontal: SPACING.lg,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decoration */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 256,
            height: 256,
            borderRadius: 128,
            backgroundColor: 'rgba(34, 211, 238, 0.2)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: 192,
            height: 192,
            borderRadius: 96,
            backgroundColor: 'rgba(66, 69, 240, 0.3)',
          }}
        />

        <View style={{ position: 'relative', zIndex: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '600',
                color: '#ffffff',
                marginRight: SPACING.xs,
              }}
            >
              {t.requests.title}
            </Text>
            <Icon name="auto_awesome" size={20} color={COLORS.accent.cyan} />
          </View>
          <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 }}>
            {t.requests.subtitle}
          </Text>
        </View>
      </LinearGradient>

      {/* Leave Balance */}
      <View style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: SPACING.md,
          }}
        >
          <Icon name="schedule" size={16} color={COLORS.primary} />
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: theme.text.primary,
              marginLeft: SPACING.sm,
            }}
          >
            {t.requests.balance}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {Array.isArray(leaveBalance) && leaveBalance.map((item: any, index: number) => (
            <View
              key={item.id || index}
              style={{
                width: '48%',
                backgroundColor: theme.cardBg,
                borderRadius: BORDER_RADIUS.lg,
                padding: SPACING.md,
                marginBottom: SPACING.md,
                borderWidth: 1,
                borderColor: theme.cardBorder,
                ...SHADOWS.md,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: theme.text.secondary,
                  marginBottom: SPACING.xs,
                  height: 32, // Fixed height for alignment
                }}
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: 'bold',
                  color: item.remaining > 0 ? COLORS.accent.green : COLORS.text.secondary,
                }}
              >
                {item.remaining}
              </Text>
              <Text style={{ fontSize: 11, color: theme.text.secondary }}>
                {t.common.day}
              </Text>
            </View>
          ))}
        </View>
      </View>



      {/* Request History */}
      <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: SPACING.md,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: COLORS.primary,
              marginRight: SPACING.sm,
            }}
          />
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: theme.text.primary,
            }}
          >
            {t.requests.history}
          </Text>
        </View>
        <View>
          {requests.map((request) => (
            <View
              key={request.id}
              style={{
                backgroundColor: theme.cardBg,
                borderRadius: BORDER_RADIUS.lg,
                padding: SPACING.md,
                marginBottom: SPACING.md,
                borderWidth: 1,
                borderColor: theme.cardBorder,
                ...SHADOWS.md,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: SPACING.md,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: theme.text.primary,
                      marginBottom: SPACING.xs / 2,
                    }}
                  >
                    {getLeaveTypeLabel(request.type)}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.text.secondary }}>
                    {t.requests.submittedOn} {formatDate(request.submittedDate)}
                  </Text>
                </View>
                {getStatusBadge(request.status)}
              </View>

              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: SPACING.sm,
                    borderRadius: BORDER_RADIUS.md,
                    backgroundColor: 'rgba(66, 69, 240, 0.05)',
                    marginBottom: SPACING.sm,
                  }}
                >
                  <Icon
                    name="event"
                    size={16}
                    color={theme.text.secondary}
                    style={{ marginRight: SPACING.sm }}
                  />
                  <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                    {formatDate(request.startDate)} - {formatDate(request.endDate)}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    padding: SPACING.sm,
                    borderRadius: BORDER_RADIUS.md,
                    backgroundColor: 'rgba(34, 211, 238, 0.05)',
                  }}
                >
                  <Icon
                    name="assignment"
                    size={16}
                    color={theme.text.secondary}
                    style={{ marginRight: SPACING.sm, marginTop: 2 }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.text.secondary,
                      flex: 1,
                    }}
                  >
                    {request.reason}
                  </Text>
                </View>
              </View>

              {request.status === 'rejected' && request.rejectionReason && (
                <View
                  style={{
                    marginTop: SPACING.md,
                    padding: SPACING.md,
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: BORDER_RADIUS.md,
                    borderWidth: 1,
                    borderColor: 'rgba(239, 68, 68, 0.2)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '500',
                      color: COLORS.accent.red,
                      marginBottom: SPACING.xs / 2,
                    }}
                  >
                    {t.requests.rejectionReason}
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.accent.red, opacity: 0.8 }}>
                    {request.rejectionReason}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Create Leave Request Modal */}
      <Modal
        visible={isDialogOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDialogOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: theme.surface,
              borderTopLeftRadius: BORDER_RADIUS.xl,
              borderTopRightRadius: BORDER_RADIUS.xl,
              padding: SPACING.lg,
              maxHeight: '90%',
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: SPACING.lg,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: theme.text.primary,
                    marginBottom: SPACING.xs / 2,
                  }}
                >
                  {t.requests.create}
                </Text>
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                  {t.requests.createSubtitle}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsDialogOpen(false)}>
                <Icon name="close" size={24} color={theme.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Leave Type */}
              <View style={{ marginBottom: SPACING.lg }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: theme.text.primary,
                    marginBottom: SPACING.sm,
                  }}
                >
                  {t.requests.type}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowLeaveTypePicker(true)}
                  style={{
                    backgroundColor: theme.surfaceDarker,
                    borderRadius: BORDER_RADIUS.lg,
                    borderWidth: 1,
                    borderColor: 'rgba(148, 163, 184, 0.2)',
                    paddingVertical: SPACING.md,
                    paddingHorizontal: SPACING.md,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: leaveType ? theme.text.primary : theme.text.secondary,
                      fontSize: 16,
                    }}
                  >
                    {leaveType ? getLeaveTypeLabel(leaveType) : t.requests.selectType}
                  </Text>
                  <Icon name="chevron_right" size={20} color={COLORS.text.secondary} />
                </TouchableOpacity>

                {/* Leave Type Picker Modal */}
                <Modal
                  visible={showLeaveTypePicker}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowLeaveTypePicker(false)}
                >
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    activeOpacity={1}
                    onPress={() => setShowLeaveTypePicker(false)}
                  >
                    <View
                      style={{
                        backgroundColor: theme.surface,
                        borderRadius: BORDER_RADIUS.xl,
                        padding: SPACING.md,
                        width: '80%',
                        maxWidth: 400,
                      }}
                      onStartShouldSetResponder={() => true}
                    >
                      {leaveTypes.map((typeObj) => (
                        <TouchableOpacity
                          key={typeObj.id}
                          onPress={() => {
                            setLeaveType(typeObj.id);
                            setShowLeaveTypePicker(false);
                          }}
                          style={{
                            padding: SPACING.md,
                            borderRadius: BORDER_RADIUS.md,
                            marginBottom: SPACING.xs,
                            backgroundColor:
                              leaveType === typeObj.id
                                ? 'rgba(66, 69, 240, 0.1)'
                                : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              color:
                                leaveType === typeObj.id
                                  ? COLORS.primary
                                  : theme.text.primary,
                              fontSize: 16,
                              fontWeight: leaveType === typeObj.id ? '600' : '400',
                            }}
                          >
                            {typeObj.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </TouchableOpacity>
                </Modal>
              </View>

              {/* Date Pickers */}
              <View
                style={{
                  flexDirection: 'row',
                  marginBottom: SPACING.lg,
                }}
              >
                <View style={{ flex: 1, marginRight: SPACING.sm }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '500',
                      color: theme.text.primary,
                      marginBottom: SPACING.sm,
                    }}
                  >
                    {t.requests.fromDate}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowStartDatePicker(true)}
                    style={{
                      backgroundColor: theme.surfaceDarker,
                      borderRadius: BORDER_RADIUS.lg,
                      borderWidth: 1,
                      borderColor: 'rgba(148, 163, 184, 0.2)',
                      paddingVertical: SPACING.md,
                      paddingHorizontal: SPACING.md,
                    }}
                  >
                    <Text style={{ color: theme.text.primary, fontSize: 16 }}>
                      {formatDateForInput(startDate)}
                    </Text>
                  </TouchableOpacity>
                  {showStartDatePicker && (
                    <DateTimePickerWrapper
                      value={startDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event: any, selectedDate?: Date) => {
                        if (Platform.OS === 'android') {
                          setShowStartDatePicker(false);
                        }
                        if (selectedDate) {
                          setStartDate(selectedDate);
                        }
                      }}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '500',
                      color: theme.text.primary,
                      marginBottom: SPACING.sm,
                    }}
                  >
                    {t.requests.toDate}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowEndDatePicker(true)}
                    style={{
                      backgroundColor: theme.surfaceDarker,
                      borderRadius: BORDER_RADIUS.lg,
                      borderWidth: 1,
                      borderColor: 'rgba(148, 163, 184, 0.2)',
                      paddingVertical: SPACING.md,
                      paddingHorizontal: SPACING.md,
                    }}
                  >
                    <Text style={{ color: theme.text.primary, fontSize: 16 }}>
                      {formatDateForInput(endDate)}
                    </Text>
                  </TouchableOpacity>
                  {showEndDatePicker && (
                    <DateTimePickerWrapper
                      value={endDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event: any, selectedDate?: Date) => {
                        if (Platform.OS === 'android') {
                          setShowEndDatePicker(false);
                        }
                        if (selectedDate) {
                          setEndDate(selectedDate);
                        }
                      }}
                    />
                  )}
                  {Platform.OS === 'web' && showEndDatePicker && (
                    <TextInput
                      value={formatDateForInput(endDate)}
                      onChangeText={(text) => {
                        if (text) {
                          const date = new Date(text);
                          if (!isNaN(date.getTime())) {
                            setEndDate(date);
                          }
                        }
                      }}
                      onBlur={() => setShowEndDatePicker(false)}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={theme.text.secondary}
                      style={{
                        backgroundColor: theme.surfaceDarker,
                        borderRadius: BORDER_RADIUS.lg,
                        borderWidth: 1,
                        borderColor: theme.inputBorder,
                        padding: SPACING.md,
                        color: theme.text.primary,
                        fontSize: 16,
                        marginTop: SPACING.sm,
                      }}
                    />
                  )}
                </View>
              </View>

              {/* Reason */}
              <View style={{ marginBottom: SPACING.lg }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: theme.text.primary,
                    marginBottom: SPACING.sm,
                  }}
                >
                  {t.requests.reason}
                </Text>
                <TextInput
                  placeholder={t.requests.reasonPlaceholder}
                  placeholderTextColor={theme.text.secondary}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={4}
                  style={{
                    backgroundColor: theme.surfaceDarker,
                    borderRadius: BORDER_RADIUS.lg,
                    borderWidth: 1,
                    borderColor: theme.inputBorder,
                    padding: SPACING.md,
                    color: theme.text.primary,
                    fontSize: 16,
                    minHeight: 100,
                    textAlignVertical: 'top',
                  }}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmitRequest}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.accent.cyan]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: BORDER_RADIUS.lg,
                    paddingVertical: SPACING.md,
                    alignItems: 'center',
                    ...SHADOWS.md,
                  }}
                >
                  <Text
                    style={{
                      color: '#ffffff',
                      fontSize: 16,
                      fontWeight: '600',
                    }}
                  >
                    {t.requests.submit}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
