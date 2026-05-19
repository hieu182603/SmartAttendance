import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../../components/ui/Icon';
import { useAuditLogs } from '../../hooks/useAdminQueries';
import { useNavigation } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { vi as viLocale } from 'date-fns/locale';
import { useTheme, Theme } from '../../theme';

export default function AdminAuditScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filters = ['All', 'auth', 'attendance', 'request', 'user', 'system', 'settings'];

  const { data, isLoading } = useAuditLogs({
    page,
    limit: 50,
    search: debouncedSearch || undefined,
    category: activeFilter === 'All' ? undefined : activeFilter,
  }) as { data: { logs: any[]; pagination: { total: number; page: number; totalPages: number; limit: number } } | undefined, isLoading: boolean };

  const auditLogs = data?.logs || [];
  const totalLogs = data?.pagination?.total || 0;

  const handleSelectFilter = (filter: string) => {
    setActiveFilter(filter);
    setShowFilterModal(false);
    setPage(1);
  };

  const mapCategoryToIcon = (category: string) => {
    switch (category) {
      case 'auth': return 'shield-checkmark-outline';
      case 'attendance': return 'time-outline';
      case 'request': return 'document-text-outline';
      case 'user': return 'people-outline';
      case 'system': return 'settings-outline';
      case 'settings': return 'settings-outline';
      default: return 'time-outline';
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'success') return theme.colors.status.success;
    if (status === 'failed') return theme.colors.status.danger;
    if (status === 'warning') return theme.colors.status.warning;
    return theme.colors.brand.primary;
  };

  const getStatusBgColor = (status: string) => {
    if (status === 'success') return 'rgba(22,163,74,0.1)';
    if (status === 'failed') return 'rgba(239,68,68,0.1)';
    if (status === 'warning') return 'rgba(217,119,6,0.1)';
    return theme.colors.status.infoBg;
  };

  return (
    <View style={s.root}>
      <LinearGradient
        colors={[theme.colors.brand.primaryHover, '#9333ea'] as unknown as readonly [string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.headerGradient}
      >
        <View style={s.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 12 }}>
              <Icon name="arrow-back-outline" size={24} color={theme.colors.text.onPrimary} library="ionicons" />
            </TouchableOpacity>
            <View>
              <Text style={s.headerTitle}>Nhật ký hệ thống</Text>
              <Text style={s.headerSubtitle}>Lịch sử hoạt động và thay đổi</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[s.filterBtn, { backgroundColor: activeFilter !== 'All' ? 'rgba(255,255,255,0.125)' : 'rgba(255,255,255,0.1)' }]}
            onPress={() => setShowFilterModal(true)}
          >
            <Icon name="options-outline" size={20} color={theme.colors.text.onPrimary} library="ionicons" />
            <Text style={s.filterBtnText}>{activeFilter === 'All' ? 'Lọc' : activeFilter}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.searchBarWrapper}>
          <View style={s.searchContainer}>
            <Icon name="search-outline" size={20} color={theme.colors.text.muted} library="ionicons" />
            <TextInput
              style={s.searchInput}
              placeholder="Tìm hành động, chi tiết, người dùng..."
              placeholderTextColor={theme.colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-outline" size={18} color={theme.colors.text.muted} library="ionicons" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
        <View style={s.listHeader}>
          <Text style={s.listTitle}>
            {activeFilter === 'All' ? 'Tất cả nhật ký' : `Nhật ký: ${activeFilter}`}
          </Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.brand.primary} />
          ) : (
            <Text style={s.logCount}>{totalLogs} kết quả</Text>
          )}
        </View>

        {auditLogs.map((log: any) => {
          const timeAgo = formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: viLocale });
          return (
            <View key={log.id} style={s.logCard}>
              <View style={s.logMain}>
                <View style={[s.iconWrap, { backgroundColor: getStatusBgColor(log.status) }]}>
                  <Icon name={mapCategoryToIcon(log.category)} size={20} color={getStatusColor(log.status)} library="ionicons" />
                </View>
                <View style={s.logInfo}>
                  <View style={s.logTopRow}>
                    <Text style={s.logActionText} numberOfLines={1}>{log.description}</Text>
                    <View style={s.typeBadge}>
                      <Text style={s.typeBadgeText}>{log.category}</Text>
                    </View>
                  </View>
                  <Text style={s.logTimeText}>{timeAgo} ({log.timestamp})</Text>
                </View>
              </View>

              <View style={s.logDivider} />

              <View style={s.logBottom}>
                <View style={s.userRow}>
                  <Icon name="person-outline" size={14} color={theme.colors.text.secondary} library="ionicons" />
                  <Text style={s.userLabel}>{log.userName} ({log.userRole})</Text>
                </View>
                <Text style={s.logDetailText}>IP: {log.ipAddress} | Hành động gốc: {log.action}</Text>
              </View>
            </View>
          );
        })}

        {!isLoading && auditLogs.length === 0 && (
          <View style={s.emptyWrap}>
            <Icon name="time-outline" size={60} color={theme.colors.text.muted} library="ionicons" />
            <Text style={s.emptyLabel}>Không tìm thấy kết quả nào</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setShowFilterModal(false)}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle}>Lọc theo danh mục</Text>
            </View>

            <View style={s.modalOptions}>
              {filters.map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[s.modalOption, isActive && { backgroundColor: theme.colors.status.infoBg }]}
                    onPress={() => handleSelectFilter(filter)}
                  >
                    <View style={s.optionInfo}>
                      <View style={[s.optionDot, { backgroundColor: isActive ? theme.colors.brand.primary : theme.colors.text.muted }]} />
                      <Text style={[s.optionText, { color: isActive ? theme.colors.brand.primary : theme.colors.text.primary, fontWeight: isActive ? '700' : '500' }]}>
                        {filter === 'All' ? 'Tất cả nhật ký' : filter}
                      </Text>
                    </View>
                    {isActive && <Icon name="checkmark-outline" size={20} color={theme.colors.brand.primary} library="ionicons" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={s.closeBtn} onPress={() => setShowFilterModal(false)}>
              <Text style={s.closeBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.background.base },
    headerGradient: {
      paddingTop: 48, paddingBottom: 20, paddingHorizontal: 20,
      borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTitle: { fontSize: 26, fontWeight: '800', color: t.colors.text.onPrimary, letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
    filterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, gap: 8 },
    filterBtnText: { color: t.colors.text.onPrimary, fontSize: 14, fontWeight: '700' },
    searchBarWrapper: { marginBottom: 12 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.colors.background.base, borderRadius: 12, paddingHorizontal: 12, height: 50 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: t.colors.text.primary },
    listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
    listTitle: { fontSize: 14, fontWeight: '700', color: t.colors.text.secondary, textTransform: 'uppercase', letterSpacing: 1 },
    logCount: { fontSize: 12, fontWeight: '600', color: t.colors.text.muted },
    logCard: {
      backgroundColor: t.colors.background.surface, borderRadius: 16, padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: t.colors.border.default,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    },
    logMain: { flexDirection: 'row', alignItems: 'center' },
    iconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    logInfo: { flex: 1 },
    logTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    logActionText: { fontSize: 16, fontWeight: '700', color: t.colors.text.primary, marginBottom: 4, flex: 1 },
    typeBadge: { backgroundColor: t.colors.background.base, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
    typeBadgeText: { fontSize: 9, fontWeight: '800', color: t.colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    logTimeText: { fontSize: 12, color: t.colors.text.muted },
    logDivider: { height: 1, backgroundColor: t.colors.border.default, marginVertical: 12 },
    logBottom: { gap: 8 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    userLabel: { fontSize: 13, fontWeight: '600', color: t.colors.text.secondary },
    logDetailText: { fontSize: 13, color: t.colors.text.primary, lineHeight: 20 },
    emptyWrap: { alignItems: 'center', marginTop: 60, opacity: 0.4 },
    emptyLabel: { marginTop: 12, fontSize: 15, color: t.colors.text.muted },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: t.colors.background.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, minHeight: 400 },
    modalHeader: { alignItems: 'center', marginBottom: 20 },
    modalHandle: { width: 40, height: 4, backgroundColor: t.colors.border.default, borderRadius: 2, marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: t.colors.text.primary },
    modalOptions: { gap: 8, marginBottom: 20 },
    modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16 },
    optionInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    optionDot: { width: 8, height: 8, borderRadius: 4 },
    optionText: { fontSize: 16 },
    closeBtn: { backgroundColor: t.colors.background.base, padding: 16, borderRadius: 16, alignItems: 'center' },
    closeBtnText: { fontSize: 16, fontWeight: '700', color: t.colors.text.primary },
  });
}
