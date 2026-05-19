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
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { useManagerApprovals, useApproveRequest, useRejectRequest } from '../../hooks/useManagerQueries';
import { ApprovalRequest } from '../../types';
import { useTheme, Theme } from '../../theme';

type ManagerApprovalsScreenNavigationProp = BottomTabNavigationProp<ManagerTabParamList, 'ManagerApprovals'>;

interface ManagerApprovalsScreenProps {
  navigation: ManagerApprovalsScreenNavigationProp;
}

export default function ManagerApprovalsScreen({ navigation }: ManagerApprovalsScreenProps) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

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
          onSuccess: () => Alert.alert('Thành công', 'Đã duyệt đơn nghỉ phép thành công'),
          onError: () => Alert.alert('Lỗi', 'Không thể duyệt đơn. Vui lòng thử lại.'),
        }
      );
    },
    [approveRequestMutation, isProcessing]
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
          Alert.alert('Thành công', 'Đã từ chối đơn nghỉ phép');
        },
        onError: () => Alert.alert('Lỗi', 'Không thể từ chối đơn. Vui lòng thử lại.'),
      }
    );
  }, [rejectRequestMutation, selectedApproval, rejectNote, isProcessing]);

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
    <View style={s.container}>
      {/* Header - Premium Orange/Gold Mix Theme for Manager */}
      <LinearGradient
        colors={['#1A1A2E', '#2A1800', '#FF8C00']}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerContent}>
          <View style={s.headerTop}>
            <View style={s.menuButtonPlaceholder} />
            {pendingCount > 0 && (
              <View style={s.badgeContainer}>
                <Text style={s.badgeText}>{pendingCount} đơn</Text>
              </View>
            )}
          </View>

          <View style={s.headerTitleContainer}>
            <Text style={s.headerTitle}>Phê duyệt</Text>
            <Text style={s.headerSubtitle}>Quản lý và xử lý đơn nghỉ phép</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={s.searchContainer}>
          <View style={s.searchInputContainer}>
            <Icon name="search-outline" size={20} color={theme.colors.text.muted} library="ionicons" />
            <TextInput
              style={s.searchInput}
              placeholder="Tìm theo tên, lý do..."
              placeholderTextColor={theme.colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={s.clearButton}
                activeOpacity={0.7}
              >
                <Icon name="close-outline" size={18} color={theme.colors.text.muted} library="ionicons" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Summary */}
        <View style={s.statsContainer}>
          <View style={s.statCard}>
            <View style={[s.statIconContainer, { backgroundColor: theme.colors.status.warningBg }]}>
              <Icon name="time-outline" size={20} color={theme.colors.status.warning} library="ionicons" />
            </View>
            <View>
              <Text style={s.statValue}>{pendingCount}</Text>
              <Text style={s.statLabel}>Chờ duyệt</Text>
            </View>
          </View>

          <View style={s.statCard}>
            <View style={[s.statIconContainer, { backgroundColor: theme.colors.status.successBg }]}>
              <Icon name="checkmark-circle-outline" size={20} color={theme.colors.status.success} library="ionicons" />
            </View>
            <View>
              <Text style={s.statValue}>{approvedCount}</Text>
              <Text style={s.statLabel}>Đã duyệt</Text>
            </View>
          </View>

          <View style={s.statCard}>
            <View style={[s.statIconContainer, { backgroundColor: theme.colors.status.dangerBg }]}>
              <Icon name="close-circle-outline" size={20} color={theme.colors.status.danger} library="ionicons" />
            </View>
            <View>
              <Text style={s.statValue}>{rejectedCount}</Text>
              <Text style={s.statLabel}>Từ chối</Text>
            </View>
          </View>
        </View>

        {/* Approvals List */}
        <View style={s.approvalsSection}>
          {isLoading ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.brand.primary} />
            </View>
          ) : error ? (
            <View style={s.emptyContainer}>
              <EmptyState icon="warning-outline" title="Lỗi tải dữ liệu" description={error} />
            </View>
          ) : filteredApprovals.length === 0 ? (
            <View style={s.emptyContainer}>
              <EmptyState
                emoji="✅"
                title={searchQuery ? 'Không tìm thấy kết quả' : 'Không có dữ liệu'}
                description={
                  searchQuery
                    ? 'Thử tìm kiếm với từ khóa khác'
                    : 'Tất cả đơn nghỉ phép đã được xử lý'
                }
              />
            </View>
          ) : (
            <View style={s.approvalsList}>
              {filteredApprovals.map(approval => (
                <View key={approval.id} style={s.approvalCard}>
                  <View style={s.approvalContent}>
                    {/* Avatar */}
                    <LinearGradient
                      colors={[theme.colors.status.warningBg, theme.colors.status.warningBg]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.avatar}
                    >
                      <Text style={s.avatarText}>
                        {approval.employeeName.charAt(0).toUpperCase()}
                      </Text>
                    </LinearGradient>

                    {/* Content */}
                    <View style={s.approvalInfo}>
                      {/* Header */}
                      <View style={s.approvalHeader}>
                        <View style={s.approvalHeaderLeft}>
                          <Text style={s.employeeName}>{approval.employeeName}</Text>
                          <Text style={s.submittedDate}>
                            Gửi lúc {formatDate(approval.submittedAt)}
                          </Text>
                        </View>
                        <View
                          style={[
                            s.typeBadge,
                            { backgroundColor: theme.colors.status.warningBg },
                          ]}
                        >
                          <Text style={[s.typeBadgeText, { color: theme.colors.status.warning }]}>
                            {getLeaveTypeLabel(approval.type)}
                          </Text>
                        </View>
                      </View>

                      {/* Details */}
                      <View style={s.detailsContainer}>
                        <View style={s.detailRow}>
                          <Icon name="calendar-outline" size={16} color={theme.colors.text.secondary} library="ionicons" />
                          <Text style={s.detailText}>
                            {approval.startDate} → {approval.endDate}
                          </Text>
                          <View style={s.daysBadge}>
                            <Text style={s.daysBadgeText}>{approval.days} ngày</Text>
                          </View>
                        </View>

                        <View style={s.detailRow}>
                          <Icon name="document-text-outline" size={16} color={theme.colors.text.secondary} library="ionicons" />
                          <Text style={s.reasonText}>{approval.reason}</Text>
                        </View>
                      </View>

                      {/* Action Buttons - only for pending */}
                      {approval.status === 'pending' ? (
                        <View style={s.actionsContainer}>
                          <TouchableOpacity
                            style={[s.actionButton, s.approveButton]}
                            onPress={() => handleApprove(approval)}
                            disabled={isProcessing}
                            activeOpacity={0.7}
                          >
                            <Icon name="checkmark-circle-outline" size={18} color="#ffffff" library="ionicons" />
                            <Text style={s.approveButtonText}>Duyệt</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[s.actionButton, s.rejectButton]}
                            onPress={() => openRejectDialog(approval)}
                            disabled={isProcessing}
                            activeOpacity={0.7}
                          >
                            <Icon name="close-circle-outline" size={18} color={theme.colors.status.danger} library="ionicons" />
                            <Text style={s.rejectButtonText}>Từ chối</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={s.actionsContainer}>
                          <View style={[
                            s.statusBadge,
                            {
                              backgroundColor: approval.status === 'approved'
                                ? theme.colors.status.successBg
                                : theme.colors.status.dangerBg,
                            },
                          ]}>
                            <Icon
                              name={approval.status === 'approved' ? 'checkmark-circle-outline' : 'close-circle-outline'}
                              size={16}
                              color={approval.status === 'approved' ? theme.colors.status.success : theme.colors.status.danger}
                              library="ionicons"
                            />
                            <Text style={[
                              s.statusBadgeText,
                              {
                                color: approval.status === 'approved'
                                  ? theme.colors.status.success
                                  : theme.colors.status.danger,
                              },
                            ]}>
                              {approval.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
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
          style={s.modalContainer}
        >
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
          <TouchableOpacity
            style={s.modalBackdrop}
            activeOpacity={1}
            onPress={closeRejectDialog}
          >
            <View style={s.modalContent}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Từ chối đơn nghỉ phép</Text>
                <TouchableOpacity
                  onPress={closeRejectDialog}
                  disabled={isProcessing}
                  style={s.closeButton}
                  activeOpacity={0.7}
                >
                  <Icon name="close-outline" size={24} color={theme.colors.text.secondary} library="ionicons" />
                </TouchableOpacity>
              </View>

              <Text style={s.modalDescription}>
                Từ chối đơn của <Text style={s.modalDescriptionBold}>{selectedApproval?.employeeName}</Text>
              </Text>

              {/* Note Input */}
              <View style={s.noteInputContainer}>
                <Text style={s.noteInputLabel}>
                  Ghi chú <Text style={s.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={s.noteInput}
                  placeholder="Nhập lý do từ chối..."
                  placeholderTextColor={theme.colors.text.muted}
                  value={rejectNote}
                  onChangeText={setRejectNote}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!isProcessing}
                />
              </View>

              {/* Actions */}
              <View style={s.modalActions}>
                <TouchableOpacity
                  style={[s.modalButton, s.modalCancelButton]}
                  onPress={closeRejectDialog}
                  disabled={isProcessing}
                  activeOpacity={0.7}
                >
                  <Text style={s.modalCancelButtonText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    s.modalButton,
                    s.modalConfirmButton,
                    (!rejectNote.trim() || isProcessing) && s.modalButtonDisabled,
                  ]}
                  onPress={handleReject}
                  disabled={!rejectNote.trim() || isProcessing}
                  activeOpacity={0.7}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={s.modalConfirmButtonText}>Từ chối</Text>
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

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background.base,
    },
    header: {
      paddingTop: 48,
      paddingBottom: 20,
      paddingHorizontal: 16,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      marginBottom: 12,
    },
    headerContent: {
      zIndex: 10,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    menuButtonPlaceholder: {
      width: 40,
      height: 40,
    },
    badgeContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 9999,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    badgeText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
    },
    headerTitleContainer: {
      marginTop: 8,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.9)',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 24,
    },
    searchContainer: {
      marginBottom: 16,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.background.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: t.colors.border.default,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      color: t.colors.text.primary,
      fontSize: 14,
    },
    clearButton: {
      padding: 4,
    },
    statsContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      padding: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.colors.border.default,
      backgroundColor: t.colors.background.surface,
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 1,
    },
    statIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: t.colors.text.primary,
    },
    statLabel: {
      fontSize: 12,
      color: t.colors.text.secondary,
    },
    approvalsSection: {
      marginTop: 8,
    },
    loadingContainer: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    emptyContainer: {
      paddingVertical: 24,
    },
    approvalsList: {
      gap: 12,
    },
    approvalCard: {
      backgroundColor: t.colors.background.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: t.colors.border.default,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
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
      marginRight: 12,
    },
    avatarText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: t.colors.status.warning,
    },
    approvalInfo: {
      flex: 1,
    },
    approvalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    approvalHeaderLeft: {
      flex: 1,
      marginRight: 8,
    },
    employeeName: {
      fontSize: 16,
      fontWeight: '600',
      color: t.colors.text.primary,
      marginBottom: 4,
    },
    submittedDate: {
      fontSize: 12,
      color: t.colors.text.secondary,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '500',
    },
    detailsContainer: {
      marginBottom: 12,
      gap: 8,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detailText: {
      flex: 1,
      fontSize: 14,
      color: t.colors.text.primary,
    },
    daysBadge: {
      backgroundColor: t.colors.background.base,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    daysBadgeText: {
      fontSize: 12,
      color: t.colors.text.secondary,
      fontWeight: '500',
    },
    reasonText: {
      flex: 1,
      fontSize: 13,
      color: t.colors.text.secondary,
    },
    actionsContainer: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      gap: 4,
    },
    approveButton: {
      backgroundColor: t.colors.status.success,
    },
    approveButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
    },
    rejectButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: t.colors.status.danger,
    },
    rejectButtonText: {
      color: t.colors.status.danger,
      fontSize: 14,
      fontWeight: '600',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
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
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalContent: {
      backgroundColor: t.colors.background.surface,
      borderRadius: 16,
      padding: 16,
      width: '100%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: t.colors.border.default,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: t.colors.text.primary,
      flex: 1,
    },
    closeButton: {
      padding: 4,
    },
    modalDescription: {
      fontSize: 14,
      color: t.colors.text.secondary,
      marginBottom: 16,
    },
    modalDescriptionBold: {
      fontWeight: '600',
      color: t.colors.text.primary,
    },
    noteInputContainer: {
      marginBottom: 16,
    },
    noteInputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: t.colors.text.primary,
      marginBottom: 8,
    },
    requiredStar: {
      color: t.colors.status.danger,
    },
    noteInput: {
      backgroundColor: t.colors.background.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.colors.border.default,
      padding: 12,
      color: t.colors.text.primary,
      fontSize: 14,
      minHeight: 100,
      maxHeight: 150,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: t.colors.border.default,
    },
    modalCancelButtonText: {
      color: t.colors.text.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    modalConfirmButton: {
      backgroundColor: t.colors.status.danger,
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
