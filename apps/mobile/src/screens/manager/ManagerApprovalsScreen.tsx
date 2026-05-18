import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ManagerTabParamList } from '../../navigation/AppNavigator';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../utils/styles';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { useManagerApprovals, useApproveRequest, useRejectRequest } from '../../hooks/useManagerQueries';
import { ApprovalRequest } from '../../types';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';
import { ThemeColors } from '../../theme/colors';

type ManagerApprovalsScreenNavigationProp = BottomTabNavigationProp<ManagerTabParamList, 'ManagerApprovals'>;

interface ManagerApprovalsScreenProps {
  navigation: ManagerApprovalsScreenNavigationProp;
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: SPACING.xxl * 2,
      paddingBottom: SPACING.xl,
      paddingHorizontal: SPACING.lg,
      borderBottomLeftRadius: BORDER_RADIUS.xxl,
      borderBottomRightRadius: BORDER_RADIUS.xxl,
      marginBottom: SPACING.md,
    },
    headerContent: {
      zIndex: 10,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    menuButtonPlaceholder: {
      width: 40,
      height: 40,
    },
    badgeContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    badgeText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
    },
    headerTitleContainer: {
      marginTop: SPACING.sm,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: SPACING.xs,
    },
    headerSubtitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.9)',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: SPACING.lg,
      paddingBottom: SPACING.xxl,
    },
    searchContainer: {
      marginBottom: SPACING.lg,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderRadius: BORDER_RADIUS.lg,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    searchInput: {
      flex: 1,
      marginLeft: SPACING.sm,
      color: colors.inputText,
      fontSize: 14,
    },
    clearButton: {
      padding: SPACING.xs,
    },
    statsContainer: {
      flexDirection: 'row',
      gap: SPACING.md,
      marginBottom: SPACING.lg,
    },
    statCard: {
      flex: 1,
      padding: SPACING.sm,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      ...SHADOWS.sm,
    },
    statIconContainer: {
      width: 36,
      height: 36,
      borderRadius: BORDER_RADIUS.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    approvalsSection: {
      marginTop: SPACING.sm,
    },
    loadingContainer: {
      paddingVertical: SPACING.xxl,
      alignItems: 'center',
    },
    emptyContainer: {
      paddingVertical: SPACING.xxl,
    },
    approvalsList: {
      gap: SPACING.md,
    },
    approvalCard: {
      backgroundColor: colors.card,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOWS.md,
    },
    approvalContent: {
      flexDirection: 'row',
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    avatarText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#f97316',
    },
    approvalInfo: {
      flex: 1,
    },
    approvalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: SPACING.md,
    },
    approvalHeaderLeft: {
      flex: 1,
      marginRight: SPACING.sm,
    },
    employeeName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: SPACING.xs,
    },
    submittedDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    typeBadge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '500',
    },
    detailsContainer: {
      marginBottom: SPACING.md,
      gap: SPACING.sm,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    detailText: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
    },
    daysBadge: {
      backgroundColor: colors.cardAlt,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
    },
    daysBadgeText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    reasonText: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
    },
    actionsContainer: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginTop: SPACING.sm,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      gap: SPACING.xs,
    },
    approveButton: {
      backgroundColor: COLORS.status.success,
    },
    approveButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
    },
    rejectButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: COLORS.status.error,
    },
    rejectButtonText: {
      color: COLORS.status.error,
      fontSize: 14,
      fontWeight: '600',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.md,
    },
    statusBadgeText: {
      fontSize: 13,
      fontWeight: '600',
    },
    // Modal styles
    modalContainer: {
      flex: 1,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.lg,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.lg,
      width: '100%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOWS.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
      flex: 1,
    },
    closeButton: {
      padding: SPACING.xs,
    },
    modalDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: SPACING.lg,
    },
    modalDescriptionBold: {
      fontWeight: '600',
      color: colors.textPrimary,
    },
    noteInputContainer: {
      marginBottom: SPACING.lg,
    },
    noteInputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
      marginBottom: SPACING.sm,
    },
    requiredStar: {
      color: COLORS.status.error,
    },
    noteInput: {
      backgroundColor: colors.inputBg,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      padding: SPACING.md,
      color: colors.inputText,
      fontSize: 14,
      minHeight: 100,
      maxHeight: 150,
    },
    modalActions: {
      flexDirection: 'row',
      gap: SPACING.md,
    },
    modalButton: {
      flex: 1,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCancelButtonText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    modalConfirmButton: {
      backgroundColor: COLORS.status.error,
    },
    modalButtonDisabled: {
      opacity: 0.5,
    },
    modalConfirmButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
    },
  });
}

export default function ManagerApprovalsScreen({ navigation }: ManagerApprovalsScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // TanStack Query hooks
  const { data: approvalsData, isLoading, error: queryError } = useManagerApprovals();
  const approveRequestMutation = useApproveRequest();
  const rejectRequestMutation = useRejectRequest();

  const approvals: ApprovalRequest[] = approvalsData ?? [];
  const pendingCount = approvals.filter((a: ApprovalRequest) => a.status === 'pending').length;
  const error = queryError ? (queryError as Error).message : '';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const isProcessing = approveRequestMutation.isPending || rejectRequestMutation.isPending;

  // Filter approvals based on search
  const filteredApprovals = useMemo(() => {
    if (!searchQuery.trim()) return approvals;

    const query = searchQuery.toLowerCase();
    return approvals.filter(
      (approval: ApprovalRequest) =>
        approval.employeeName.toLowerCase().includes(query) ||
        approval.reason.toLowerCase().includes(query) ||
        approval.type.toLowerCase().includes(query)
    );
  }, [approvals, searchQuery]);

  // Get stats
  const approvedCount = approvals.filter((a: ApprovalRequest) => a.status === 'approved').length;
  const rejectedCount = approvals.filter((a: ApprovalRequest) => a.status === 'rejected').length;

  // Handle approve
  const handleApprove = useCallback(
    (approval: ApprovalRequest) => {
      if (isProcessing) return;
      approveRequestMutation.mutate(
        { id: approval.id, note: 'Đã phê duyệt' },
        {
          onSuccess: () => Alert.alert(t.common.success, 'Đã duyệt đơn nghỉ phép thành công'),
          onError: () => Alert.alert(t.common.error, 'Không thể duyệt đơn. Vui lòng thử lại.'),
        }
      );
    },
    [approveRequestMutation, isProcessing, t]
  );

  // Handle reject
  const handleReject = useCallback(() => {
    if (!selectedApproval || !rejectNote.trim() || isProcessing) return;
    rejectRequestMutation.mutate(
      { id: selectedApproval.id, note: rejectNote },
      {
        onSuccess: () => {
          setShowRejectDialog(false);
          setSelectedApproval(null);
          setRejectNote('');
          Alert.alert(t.common.success, 'Đã từ chối đơn nghỉ phép');
        },
        onError: () => Alert.alert(t.common.error, 'Không thể từ chối đơn. Vui lòng thử lại.'),
      }
    );
  }, [rejectRequestMutation, selectedApproval, rejectNote, isProcessing, t]);

  // Open reject dialog
  const openRejectDialog = useCallback((approval: ApprovalRequest) => {
    setSelectedApproval(approval);
    setShowRejectDialog(true);
  }, []);

  // Close reject dialog
  const closeRejectDialog = useCallback(() => {
    if (!isProcessing) {
      setShowRejectDialog(false);
      setSelectedApproval(null);
      setRejectNote('');
    }
  }, [isProcessing]);

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'annual':
        return 'Nghỉ phép';
      case 'sick':
        return 'Nghỉ ốm';
      case 'unpaid':
        return 'Nghỉ không lương';
      default:
        return 'Khác';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header - Premium Orange/Gold Mix Theme for Manager */}
      <LinearGradient
        colors={['#1A1A2E', '#2A1800', '#FF8C00']}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.menuButtonPlaceholder} />
            {pendingCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{pendingCount} đơn</Text>
              </View>
            )}
          </View>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{t.manager.approvals.title}</Text>
            <Text style={styles.headerSubtitle}>Quản lý và xử lý đơn nghỉ phép</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color={colors.inputPlaceholder} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên, lý do..."
              placeholderTextColor={colors.inputPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
                activeOpacity={0.7}
              >
                <Icon name="close" size={18} color={colors.inputPlaceholder} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(249, 115, 22, 0.2)' }]}>
              <Icon name="schedule" size={20} color="#f97316" />
            </View>
            <View>
              <Text style={styles.statValue}>{pendingCount}</Text>
              <Text style={styles.statLabel}>{t.manager.approvals.pending}</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(11, 218, 104, 0.2)' }]}>
              <Icon name="check_circle" size={20} color={COLORS.status.success} />
            </View>
            <View>
              <Text style={styles.statValue}>{approvedCount}</Text>
              <Text style={styles.statLabel}>{t.manager.approvals.approved}</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <Icon name="error" size={20} color={COLORS.status.error} />
            </View>
            <View>
              <Text style={styles.statValue}>{rejectedCount}</Text>
              <Text style={styles.statLabel}>{t.manager.approvals.rejected}</Text>
            </View>
          </View>
        </View>

        {/* Approvals List */}
        <View style={styles.approvalsSection}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : error ? (
            <View style={styles.emptyContainer}>
              <EmptyState icon="error" title="Lỗi tải dữ liệu" description={error} />
            </View>
          ) : filteredApprovals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                emoji="✅"
                title={searchQuery ? 'Không tìm thấy kết quả' : t.common.noData}
                description={
                  searchQuery
                    ? 'Thử tìm kiếm với từ khóa khác'
                    : 'Tất cả đơn nghỉ phép đã được xử lý'
                }
              />
            </View>
          ) : (
            <View style={styles.approvalsList}>
              {filteredApprovals.map(approval => (
                <View key={approval.id} style={styles.approvalCard}>
                  <View style={styles.approvalContent}>
                    {/* Avatar */}
                    <LinearGradient
                      colors={['rgba(249, 115, 22, 0.2)', 'rgba(245, 158, 11, 0.1)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.avatar}
                    >
                      <Text style={styles.avatarText}>
                        {approval.employeeName.charAt(0).toUpperCase()}
                      </Text>
                    </LinearGradient>

                    {/* Content */}
                    <View style={styles.approvalInfo}>
                      {/* Header */}
                      <View style={styles.approvalHeader}>
                        <View style={styles.approvalHeaderLeft}>
                          <Text style={styles.employeeName}>{approval.employeeName}</Text>
                          <Text style={styles.submittedDate}>
                            Gửi lúc {formatDate(approval.submittedAt)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: 'rgba(249, 115, 22, 0.1)' },
                          ]}
                        >
                          <Text style={[styles.typeBadgeText, { color: '#f97316' }]}>
                            {getLeaveTypeLabel(approval.type)}
                          </Text>
                        </View>
                      </View>

                      {/* Details */}
                      <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}>
                          <Icon name="calendar_month" size={16} color={colors.textSecondary} />
                          <Text style={styles.detailText}>
                            {approval.startDate} → {approval.endDate}
                          </Text>
                          <View style={styles.daysBadge}>
                            <Text style={styles.daysBadgeText}>{approval.days} ngày</Text>
                          </View>
                        </View>

                        <View style={styles.detailRow}>
                          <Icon name="assignment" size={16} color={colors.textSecondary} />
                          <Text style={styles.reasonText}>{approval.reason}</Text>
                        </View>
                      </View>

                      {/* Action Buttons - only for pending */}
                      {approval.status === 'pending' ? (
                        <View style={styles.actionsContainer}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.approveButton]}
                            onPress={() => handleApprove(approval)}
                            disabled={isProcessing}
                            activeOpacity={0.7}
                          >
                            <Icon name="check_circle" size={18} color="#ffffff" />
                            <Text style={styles.approveButtonText}>{t.manager.approvals.approve}</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => openRejectDialog(approval)}
                            disabled={isProcessing}
                            activeOpacity={0.7}
                          >
                            <Icon name="error" size={18} color={COLORS.status.error} />
                            <Text style={styles.rejectButtonText}>{t.manager.approvals.reject}</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.actionsContainer}>
                          <View style={[
                            styles.statusBadge,
                            {
                              backgroundColor: approval.status === 'approved'
                                ? 'rgba(11, 218, 104, 0.1)'
                                : 'rgba(239, 68, 68, 0.1)',
                            },
                          ]}>
                            <Icon
                              name={approval.status === 'approved' ? 'check_circle' : 'cancel'}
                              size={16}
                              color={approval.status === 'approved' ? COLORS.status.success : COLORS.status.error}
                            />
                            <Text style={[
                              styles.statusBadgeText,
                              {
                                color: approval.status === 'approved'
                                  ? COLORS.status.success
                                  : COLORS.status.error,
                              },
                            ]}>
                              {approval.status === 'approved' ? t.manager.approvals.approved : t.manager.approvals.rejected}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Reject Dialog Modal */}
      <Modal
        visible={showRejectDialog}
        transparent
        animationType="fade"
        onRequestClose={closeRejectDialog}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeRejectDialog}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Từ chối đơn nghỉ phép</Text>
                <TouchableOpacity
                  onPress={closeRejectDialog}
                  disabled={isProcessing}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDescription}>
                Từ chối đơn của <Text style={styles.modalDescriptionBold}>{selectedApproval?.employeeName}</Text>
              </Text>

              {/* Note Input */}
              <View style={styles.noteInputContainer}>
                <Text style={styles.noteInputLabel}>
                  {t.manager.approvals.note} <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Nhập lý do từ chối..."
                  placeholderTextColor={colors.inputPlaceholder}
                  value={rejectNote}
                  onChangeText={setRejectNote}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!isProcessing}
                />
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={closeRejectDialog}
                  disabled={isProcessing}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelButtonText}>{t.common.cancel}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalConfirmButton,
                    (!rejectNote.trim() || isProcessing) && styles.modalButtonDisabled,
                  ]}
                  onPress={handleReject}
                  disabled={!rejectNote.trim() || isProcessing}
                  activeOpacity={0.7}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalConfirmButtonText}>{t.manager.approvals.reject}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
