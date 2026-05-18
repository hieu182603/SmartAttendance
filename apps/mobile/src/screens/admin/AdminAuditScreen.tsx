import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { globalStyles, COLORS, SPACING, BORDER_RADIUS, SHADOWS, useTheme } from '../../utils/styles';
import { Icon } from '../../components/ui/Icon';
import { useAuditLogs } from '../../hooks/useAdminQueries';
import { useNavigation } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { vi as viLocale } from 'date-fns/locale';

export default function AdminAuditScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filters = ['All', 'auth', 'attendance', 'request', 'user', 'system', 'settings'];

  const { data, isLoading, refetch } = useAuditLogs({
    page,
    limit: 50,
    search: debouncedSearch || undefined,
    category: activeFilter === 'All' ? undefined : activeFilter,
  }) as { data: { logs: any[]; pagination: { total: number; page: number; totalPages: number; limit: number } } | undefined, isLoading: boolean, refetch: any };

  const auditLogs = data?.logs || [];
  const totalLogs = data?.pagination?.total || 0;

  const handleSelectFilter = (filter: string) => {
    setActiveFilter(filter);
    setShowFilterModal(false);
    setPage(1); // Reset page on filter change
  };

  const mapCategoryToIcon = (category: string) => {
    switch (category) {
      case 'auth': return 'security';
      case 'attendance': return 'schedule';
      case 'request': return 'assignment';
      case 'user': return 'group';
      case 'system': return 'settings_applications';
      case 'settings': return 'settings';
      default: return 'history';
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'success') return '#0bda68';
    if (status === 'failed') return '#ef4444';
    if (status === 'warning') return '#f59e0b';
    return '#4245f0'; // info
  };

  const getStatusBgColor = (status: string) => {
    if (status === 'success') return 'rgba(11, 218, 104, 0.1)';
    if (status === 'failed') return 'rgba(239, 68, 68, 0.1)';
    if (status === 'warning') return 'rgba(245, 158, 11, 0.1)';
    return 'rgba(66, 69, 240, 0.1)';
  };

  return (
    <View style={[globalStyles.container, { backgroundColor: theme.background }]}>
      {/* Header Section */}
      <LinearGradient
        colors={['#4f46e5', '#9333ea']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: SPACING.md }}>
              <Icon name="arrow_back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Nhật ký hệ thống</Text>
              <Text style={styles.headerSubtitle}>Lịch sử hoạt động và thay đổi</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: activeFilter !== 'All' ? '#ffffff20' : 'rgba(255, 255, 255, 0.1)' }]}
            onPress={() => setShowFilterModal(true)}
          >
            <Icon name="tune" size={20} color="#fff" />
            <Text style={styles.filterBtnText}>
              {activeFilter === 'All' ? 'Lọc' : activeFilter}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBarWrapper}>
          <View style={[styles.searchContainer, { backgroundColor: theme.surfaceDarker }]}>
            <Icon name="search" size={20} color={theme.text.muted} />
            <TextInput
              style={[styles.searchInput, { color: theme.text.primary }]}
              placeholder="Tìm hành động, chi tiết, người dùng..."
              placeholderTextColor={theme.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close" size={18} color={theme.text.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Audit List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: theme.text.secondary }]}>
            {activeFilter === 'All' ? 'Tất cả nhật ký' : `Nhật ký: ${activeFilter}`}
          </Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Text style={[styles.logCount, { color: theme.text.muted }]}>{totalLogs} kết quả</Text>
          )}
        </View>

        {auditLogs.map((log: any) => {
          const timeAgo = formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: viLocale });
          return (
            <View key={log.id} style={[styles.logCard, { backgroundColor: theme.surface, borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }]}>
              <View style={styles.logMain}>
                <View style={[
                  styles.iconWrap,
                  { backgroundColor: getStatusBgColor(log.status) }
                ]}>
                  <Icon
                    name={mapCategoryToIcon(log.category)}
                    size={20}
                    color={getStatusColor(log.status)}
                  />
                </View>

                <View style={styles.logInfo}>
                  <View style={styles.logTopRow}>
                    <Text style={[styles.logActionText, { color: theme.text.primary }]} numberOfLines={1}>{log.description}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: theme.surfaceDarker }]}>
                      <Text style={[styles.typeBadgeText, { color: theme.text.secondary }]}>{log.category}</Text>
                    </View>
                  </View>
                  <Text style={[styles.logTimeText, { color: theme.text.muted }]}>{timeAgo} ({log.timestamp})</Text>
                </View>
              </View>

              <View style={styles.logDivider} />

              <View style={styles.logBottom}>
                <View style={styles.userRow}>
                  <Icon name="person" size={14} color={theme.text.secondary} />
                  <Text style={[styles.userLabel, { color: theme.text.secondary }]}>{log.userName} ({log.userRole})</Text>
                </View>
                <Text style={[styles.logDetailText, { color: theme.text.primary }]}>IP: {log.ipAddress} | Hành động gốc: {log.action}</Text>
              </View>
            </View>
          );
        })}

        {!isLoading && auditLogs.length === 0 && (
          <View style={styles.emptyWrap}>
            <Icon name="history_toggle_off" size={60} color={theme.text.muted} />
            <Text style={[styles.emptyLabel, { color: theme.text.muted }]}>Không tìm thấy kết quả nào</Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Selection Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Lọc theo danh mục</Text>
            </View>

            <View style={styles.modalOptions}>
              {filters.map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.modalOption,
                      isActive && { backgroundColor: `${COLORS.primary}10` }
                    ]}
                    onPress={() => handleSelectFilter(filter)}
                  >
                    <View style={styles.optionInfo}>
                      <View style={[styles.optionDot, { backgroundColor: isActive ? COLORS.primary : theme.text.muted }]} />
                      <Text style={[
                        styles.optionText,
                        { color: isActive ? COLORS.primary : theme.text.primary, fontWeight: isActive ? '700' : '500' }
                      ]}>
                        {filter === 'All' ? 'Tất cả nhật ký' : filter}
                      </Text>
                    </View>
                    {isActive && <Icon name="check" size={20} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: theme.surfaceDarker }]}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={[styles.closeBtnText, { color: theme.text.primary }]}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingTop: SPACING.xxl * 2,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    borderBottomLeftRadius: BORDER_RADIUS.xxl,
    borderBottomRightRadius: BORDER_RADIUS.xxl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  filterBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  searchBarWrapper: {
    marginBottom: SPACING.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 50,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 100,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: 4,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  logCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  logCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  logMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  logInfo: {
    flex: 1,
  },
  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logActionText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logTimeText: {
    fontSize: 12,
  },
  logDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: SPACING.md,
  },
  logBottom: {
    gap: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  logDetailText: {
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.9,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
    opacity: 0.4,
  },
  emptyLabel: {
    marginTop: SPACING.md,
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: SPACING.xl,
    minHeight: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalOptions: {
    gap: 8,
    marginBottom: SPACING.xl,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionText: {
    fontSize: 16,
  },
  closeBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
  }
});
