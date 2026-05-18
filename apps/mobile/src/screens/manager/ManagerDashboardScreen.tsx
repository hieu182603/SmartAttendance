import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ManagerTabParamList } from '../../navigation/AppNavigator';
import { SPACING, BORDER_RADIUS, SHADOWS } from '../../utils/styles';
import { Icon } from '../../components/ui/Icon';
import { ManagerStatCard } from '../../components/cards/ManagerStatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useUnreadCount } from '../../hooks/useNotificationQueries';
import { useManagerApprovals, useTeamMembers } from '../../hooks/useManagerQueries';
import { useAuth } from '../../context/AuthContext';
import { ApprovalRequest } from '../../types';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';

type ManagerDashboardScreenNavigationProp = BottomTabNavigationProp<ManagerTabParamList, 'ManagerDashboard'>;

interface ManagerDashboardScreenProps {
  navigation: ManagerDashboardScreenNavigationProp;
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: SPACING.xxl * 2,
      paddingBottom: SPACING.xl,
      paddingHorizontal: SPACING.xl,
      borderBottomLeftRadius: BORDER_RADIUS.xxl,
      borderBottomRightRadius: BORDER_RADIUS.xxl,
      marginBottom: -SPACING.lg,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.xl,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    avatarContainer: {
      position: 'relative',
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#ffffff',
    },
    avatarText: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    statusDot: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#16a34a',
      borderWidth: 2,
      borderColor: '#FF9800',
    },
    userRole: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 12,
    },
    userName: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    notificationButton: {
      width: 44,
      height: 44,
      borderRadius: BORDER_RADIUS.md,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#ef4444',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#FF9800',
    },
    badgeText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: 'bold',
    },
    welcomeSection: {
      marginTop: SPACING.md,
    },
    welcomeTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: SPACING.sm,
    },
    welcomeSubtitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    content: {
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.lg,
    },
    statsGrid: {
      gap: SPACING.sm,
      marginBottom: SPACING.xl,
    },
    statsRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    section: {
      marginBottom: SPACING.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    sectionTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    countBadge: {
      backgroundColor: 'rgba(255, 152, 0, 0.1)',
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderColor: 'rgba(255, 152, 0, 0.2)',
    },
    countBadgeText: {
      color: '#FF9800',
      fontSize: 12,
      fontWeight: '600',
    },
    approvalsList: {
      gap: SPACING.sm,
    },
    approvalCard: {
      backgroundColor: colors.card,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOWS.md,
      shadowColor: colors.shadow,
    },
    approvalContent: {
      flexDirection: 'row',
      gap: SPACING.sm,
      alignItems: 'flex-start',
    },
    approvalAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 152, 0, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    approvalAvatarText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#FF9800',
    },
    approvalInfo: {
      flex: 1,
      minWidth: 0,
    },
    approvalName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: SPACING.xs / 2,
    },
    approvalDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: SPACING.xs / 2,
    },
    approvalReason: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: SPACING.xs,
    },
    approvalMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    typeBadge: {
      backgroundColor: colors.separator,
      paddingHorizontal: SPACING.xs,
      paddingVertical: 2,
      borderRadius: BORDER_RADIUS.sm,
    },
    typeBadgeText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    approvalTime: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    approvalSkeleton: {
      height: 60,
      backgroundColor: colors.separator,
      borderRadius: BORDER_RADIUS.md,
    },
    viewAllButton: {
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    viewAllText: {
      color: '#FF9800',
      fontSize: 14,
      fontWeight: '600',
    },
    teamCard: {
      backgroundColor: colors.card,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOWS.md,
      shadowColor: colors.shadow,
    },
    membersList: {
      gap: SPACING.xs,
    },
    memberItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      padding: SPACING.xs,
    },
    memberAvatarContainer: {
      position: 'relative',
    },
    memberAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 152, 0, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    memberAvatarText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#FF9800',
    },
    memberStatusDot: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.card,
    },
    memberInfo: {
      flex: 1,
      minWidth: 0,
    },
    memberName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    memberDepartment: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    memberStatusBadge: {
      paddingHorizontal: SPACING.xs,
      paddingVertical: 4,
      borderRadius: BORDER_RADIUS.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    memberStatusText: {
      fontSize: 11,
      fontWeight: '500',
    },
    teamSkeleton: {
      gap: SPACING.xs,
    },
    memberSkeleton: {
      height: 50,
      backgroundColor: colors.separator,
      borderRadius: BORDER_RADIUS.md,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    quickActionCard: {
      flexBasis: '47%',
      flexGrow: 1,
      backgroundColor: colors.card,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOWS.md,
      shadowColor: colors.shadow,
    },
    quickActionIcon: {
      width: 44,
      height: 44,
      borderRadius: BORDER_RADIUS.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    quickActionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: SPACING.xs / 2,
    },
    quickActionSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
  });
}

export default function ManagerDashboardScreen({ navigation }: ManagerDashboardScreenProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: unreadData } = useUnreadCount();
  const { data: approvalsData, isLoading: approvalsLoading } = useManagerApprovals({ status: 'pending' });
  const { data: teamData, isLoading: teamLoading } = useTeamMembers();

  const unreadCount = (unreadData as any)?.count ?? 0;
  const approvals: ApprovalRequest[] = approvalsData ?? [];
  const pendingCount = approvals.length;
  const members = teamData ?? [];
  const onlineCount = (members as any[]).filter((m: any) => m.status === 'online').length;
  const onLeaveCount = (members as any[]).filter((m: any) => m.status === 'on-leave').length;

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'annual': return 'Nghỉ phép';
      case 'sick': return 'Nghỉ ốm';
      case 'unpaid': return 'Nghỉ không lương';
      default: return 'Khác';
    }
  };

  const userName = user?.name || 'Manager';
  const userAvatar = user?.avatar;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <LinearGradient
          colors={['#1A1A2E', '#2A1800', '#FF8C00']}
          locations={[0, 0.4, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.topBar}>
            <View style={styles.userInfo}>
              <View style={styles.avatarContainer}>
                {userAvatar ? (
                  <Image source={{ uri: userAvatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.statusDot} />
              </View>
              <View>
                <Text style={styles.userRole}>{t.manager.dashboard.title},</Text>
                <Text style={styles.userName}>{userName}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications' as any)}
              style={styles.notificationButton}
            >
              <Icon name="notifications" size={20} color="#ffffff" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>
              {t.manager.dashboard.title} 📊
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Tổng quan đội nhóm và công việc cần xử lý
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <ManagerStatCard
                key="pending"
                icon="pending_actions"
                title={t.manager.dashboard.pending}
                value={approvalsLoading ? '...' : pendingCount}
                unit="đơn nghỉ phép"
                color="warning"
              />
              <ManagerStatCard
                key="members"
                icon="groups"
                title={t.manager.dashboard.team}
                value={teamLoading ? '...' : (members as any[]).length}
                unit="nhân viên"
                color="info"
              />
            </View>
            <View style={styles.statsRow}>
              <ManagerStatCard
                key="online"
                icon="how_to_reg"
                title="Đang làm việc"
                value={teamLoading ? '...' : onlineCount}
                unit="trực tuyến"
                color="success"
              />
              <ManagerStatCard
                key="on-leave"
                icon="event_busy"
                title="Đang nghỉ"
                value={teamLoading ? '...' : onLeaveCount}
                unit="nhân viên"
                color="primary"
              />
            </View>
          </View>

          {/* Pending Approvals */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Icon name="check_circle" size={16} color="#FF9800" />
                <Text style={styles.sectionTitle}>{t.manager.dashboard.approvals}</Text>
              </View>
              {pendingCount > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{pendingCount} đơn</Text>
                </View>
              )}
            </View>

            <View style={styles.approvalsList}>
              {approvalsLoading ? (
                [1, 2].map(i => (
                  <View key={i} style={styles.approvalCard}>
                    <View style={styles.approvalSkeleton} />
                  </View>
                ))
              ) : approvals.length === 0 ? (
                <View style={styles.approvalCard}>
                  <EmptyState
                    emoji="✅"
                    title="Không có đơn chờ duyệt"
                    description="Tất cả đơn nghỉ phép đã được xử lý"
                  />
                </View>
              ) : (
                approvals.slice(0, 3).map((approval: ApprovalRequest) => (
                  <TouchableOpacity
                    key={approval.id}
                    style={styles.approvalCard}
                    onPress={() => navigation.navigate('ManagerApprovals')}
                  >
                    <View style={styles.approvalContent}>
                      <View style={styles.approvalAvatar}>
                        <Text style={styles.approvalAvatarText}>
                          {approval.employeeName.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.approvalInfo}>
                        <Text style={styles.approvalName}>{approval.employeeName}</Text>
                        <Text style={styles.approvalDate}>
                          {approval.startDate} → {approval.endDate} ({approval.days} ngày)
                        </Text>
                        <Text style={styles.approvalReason} numberOfLines={1}>
                          Lý do: {approval.reason}
                        </Text>
                        <View style={styles.approvalMeta}>
                          <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>
                              {getLeaveTypeLabel(approval.type)}
                            </Text>
                          </View>
                          <Text style={styles.approvalTime}>
                            {new Date(approval.submittedAt).toLocaleDateString('vi-VN')}
                          </Text>
                        </View>
                      </View>
                      <Icon name="schedule" size={16} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                ))
              )}

              {approvals.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate('ManagerApprovals')}
                >
                  <Text style={styles.viewAllText}>
                    Xem tất cả {approvals.length} đơn →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Team Overview */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="groups" size={16} color="#FF9800" />
              <Text style={styles.sectionTitle}>{t.manager.dashboard.team}</Text>
            </View>

            <View style={styles.teamCard}>
              {teamLoading ? (
                <View style={styles.teamSkeleton}>
                  {[1, 2, 3].map(i => (
                    <View key={i} style={styles.memberSkeleton} />
                  ))}
                </View>
              ) : members.length === 0 ? (
                <EmptyState
                  icon="groups"
                  title="Chưa có thành viên"
                  description="Danh sách đội nhóm trống"
                />
              ) : (
                <View style={styles.membersList}>
                  {(members as any[]).map((member: any) => (
                    <View key={member.id} style={styles.memberItem}>
                      <View style={styles.memberAvatarContainer}>
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberAvatarText}>
                            {member.name.charAt(0)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.memberStatusDot,
                            {
                              backgroundColor:
                                member.status === 'online'
                                  ? '#16a34a'
                                  : member.status === 'on-leave'
                                    ? '#FF9800'
                                    : colors.textMuted,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        <Text style={styles.memberDepartment}>{member.department}</Text>
                      </View>
                      <View
                        style={[
                          styles.memberStatusBadge,
                          {
                            backgroundColor:
                              member.status === 'online'
                                ? 'rgba(22, 163, 74, 0.1)'
                                : member.status === 'on-leave'
                                  ? 'rgba(255, 152, 0, 0.1)'
                                  : colors.separator,
                            borderColor:
                              member.status === 'online'
                                ? 'rgba(22, 163, 74, 0.2)'
                                : member.status === 'on-leave'
                                  ? 'rgba(255, 152, 0, 0.2)'
                                  : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.memberStatusText,
                            {
                              color:
                                member.status === 'online'
                                  ? '#16a34a'
                                  : member.status === 'on-leave'
                                    ? '#FF9800'
                                    : colors.textSecondary,
                            },
                          ]}
                        >
                          {member.status === 'online'
                            ? 'Trực tuyến'
                            : member.status === 'on-leave'
                              ? 'Nghỉ phép'
                              : 'Offline'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="trending_up" size={16} color="#FF9800" />
              <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
            </View>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                key="approve"
                style={styles.quickActionCard}
                onPress={() => navigation.navigate('ManagerApprovals')}
              >
                <LinearGradient
                  colors={['rgba(255, 152, 0, 0.2)', 'rgba(255, 193, 7, 0.1)']}
                  style={styles.quickActionIcon}
                >
                  <Icon name="check_circle" size={20} color="#FF9800" />
                </LinearGradient>
                <Text style={styles.quickActionTitle}>{t.manager.dashboard.approvals}</Text>
                <Text style={styles.quickActionSubtitle}>Xử lý đơn nghỉ phép</Text>
              </TouchableOpacity>

              <TouchableOpacity
                key="schedule"
                style={styles.quickActionCard}
                onPress={() => navigation.navigate('ManagerSchedule')}
              >
                <LinearGradient
                  colors={['rgba(255, 193, 7, 0.2)', 'rgba(255, 152, 0, 0.1)']}
                  style={styles.quickActionIcon}
                >
                  <Icon name="event" size={20} color="#FFC107" />
                </LinearGradient>
                <Text style={styles.quickActionTitle}>Lịch team</Text>
                <Text style={styles.quickActionSubtitle}>Xem lịch làm việc</Text>
              </TouchableOpacity>

              <TouchableOpacity
                key="reports"
                style={styles.quickActionCard}
                onPress={() => navigation.navigate('ManagerTeam')}
              >
                <LinearGradient
                  colors={['rgba(22, 163, 74, 0.2)', 'rgba(22, 163, 74, 0.1)']}
                  style={styles.quickActionIcon}
                >
                  <Icon name="trending_up" size={20} color="#16a34a" />
                </LinearGradient>
                <Text style={styles.quickActionTitle}>{t.manager.dashboard.reports}</Text>
                <Text style={styles.quickActionSubtitle}>Thống kê team</Text>
              </TouchableOpacity>

              <TouchableOpacity
                key="team-manage"
                style={styles.quickActionCard}
                onPress={() => navigation.navigate('ManagerTeam')}
              >
                <LinearGradient
                  colors={['rgba(79, 110, 247, 0.2)', 'rgba(79, 110, 247, 0.1)']}
                  style={styles.quickActionIcon}
                >
                  <Icon name="groups" size={20} color="#4F6EF7" />
                </LinearGradient>
                <Text style={styles.quickActionTitle}>{t.manager.dashboard.team}</Text>
                <Text style={styles.quickActionSubtitle}>Danh sách nhân viên</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
