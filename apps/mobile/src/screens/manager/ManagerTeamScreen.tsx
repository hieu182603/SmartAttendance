import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ManagerTabParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTeamMembers } from '../../hooks/useManagerQueries';
import { TeamMember } from '../../types';
import { useTheme, Theme } from '../../theme';

type ManagerTeamScreenNavigationProp = BottomTabNavigationProp<ManagerTabParamList, 'ManagerTeam'>;

interface ManagerTeamScreenProps {
  navigation: ManagerTeamScreenNavigationProp;
}

type FilterType = 'all' | 'online' | 'on-leave' | 'offline';

export default function ManagerTeamScreen({ navigation }: ManagerTeamScreenProps) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const { data: teamData, isLoading } = useTeamMembers();
  const members: TeamMember[] = (teamData as TeamMember[]) ?? [];
  const onlineCount = members.filter((m: TeamMember) => m.status === 'online').length;
  const onLeaveCount = members.filter((m: TeamMember) => m.status === 'on-leave').length;
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // Filter members based on search and filter
  const filteredMembers = useMemo(() => {
    let result = members;

    // Apply status filter
    if (filter !== 'all') {
      result = result.filter(member => member.status === filter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        member =>
          member.name.toLowerCase().includes(query) ||
          member.department.toLowerCase().includes(query)
      );
    }

    return result;
  }, [members, filter, searchQuery]);

  const offlineCount = members.filter(m => m.status === 'offline').length;

  const getStatusBadgeStyle = (status: TeamMember['status']) => {
    switch (status) {
      case 'online':
        return {
          backgroundColor: theme.colors.status.successBg,
          borderColor: theme.colors.status.successBorder,
          color: theme.colors.status.success,
        };
      case 'on-leave':
        return {
          backgroundColor: theme.colors.status.warningBg,
          borderColor: theme.colors.status.warningBorder,
          color: theme.colors.status.warning,
        };
      default:
        return {
          backgroundColor: theme.colors.background.base,
          borderColor: theme.colors.border.default,
          color: theme.colors.text.secondary,
        };
    }
  };

  const getStatusText = (status: TeamMember['status']) => {
    switch (status) {
      case 'online':
        return 'Trực tuyến';
      case 'on-leave':
        return 'Nghỉ phép';
      default:
        return 'Offline';
    }
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
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications' as any)}
              style={s.notificationButton}
              activeOpacity={0.7}
            >
              <Icon name="notifications-outline" size={24} color="#ffffff" library="ionicons" />
            </TouchableOpacity>
          </View>

          <View style={s.headerTitleContainer}>
            <Text style={s.headerTitle}>Đội nhóm</Text>
            <Text style={s.headerSubtitle}>
              Danh sách nhân viên trong team
            </Text>
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
              placeholder="Tìm kiếm..."
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

        {/* Stats Cards */}
        <View style={s.statsContainer}>
          <View style={s.statCard}>
            <View style={[s.statIconContainer, { backgroundColor: theme.colors.status.successBg }]}>
              <Icon name="people-outline" size={20} color={theme.colors.status.success} library="ionicons" />
            </View>
            <View>
              <Text style={s.statValue}>{onlineCount}</Text>
              <Text style={s.statLabel}>Trực tuyến</Text>
            </View>
          </View>

          <View style={s.statCard}>
            <View style={[s.statIconContainer, { backgroundColor: theme.colors.status.warningBg }]}>
              <Icon name="calendar-outline" size={20} color={theme.colors.status.warning} library="ionicons" />
            </View>
            <View>
              <Text style={s.statValue}>{onLeaveCount}</Text>
              <Text style={s.statLabel}>Nghỉ phép</Text>
            </View>
          </View>

          <View style={s.statCard}>
            <View style={[s.statIconContainer, { backgroundColor: theme.colors.background.base }]}>
              <Icon name="person-outline" size={20} color={theme.colors.text.secondary} library="ionicons" />
            </View>
            <View>
              <Text style={s.statValue}>{offlineCount}</Text>
              <Text style={s.statLabel}>Offline</Text>
            </View>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={s.filterContainer}>
          {(['all', 'online', 'on-leave', 'offline'] as FilterType[]).map(filterType => (
            <TouchableOpacity
              key={filterType}
              onPress={() => setFilter(filterType)}
              style={[
                s.filterButton,
                filter === filterType && s.filterButtonActive,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  s.filterButtonText,
                  filter === filterType && s.filterButtonTextActive,
                ]}
              >
                {filterType === 'all'
                  ? 'Tất cả'
                  : filterType === 'online'
                    ? 'Trực tuyến'
                    : filterType === 'on-leave'
                      ? 'Nghỉ phép'
                      : 'Offline'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Team Members List */}
        <View style={s.membersSection}>
          <Text style={s.sectionTitle}>
            {filteredMembers.length} thành viên
          </Text>

          {isLoading ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.brand.primary} />
            </View>
          ) : filteredMembers.length === 0 ? (
            <View style={s.emptyContainer}>
              <EmptyState
                icon="people-outline"
                title={
                  searchQuery
                    ? 'Không tìm thấy thành viên'
                    : filter !== 'all'
                      ? `Không có thành viên ${getStatusText(filter as TeamMember['status']).toLowerCase()}`
                      : 'Không có dữ liệu'
                }
                description={
                  searchQuery
                    ? 'Thử tìm kiếm với từ khóa khác'
                    : 'Danh sách đội nhóm trống'
                }
              />
            </View>
          ) : (
            <View style={s.membersList}>
              {filteredMembers.map(member => {
                const statusStyle = getStatusBadgeStyle(member.status);
                return (
                  <TouchableOpacity
                    key={member.id}
                    style={s.memberCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      // TODO: Navigate to member details
                    }}
                  >
                    <View style={s.memberContent}>
                      {/* Avatar */}
                      <View style={s.avatarContainer}>
                        <LinearGradient
                          colors={[theme.colors.status.warningBg, theme.colors.status.warningBg]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={s.avatar}
                        >
                          <Text style={s.avatarText}>
                            {member.name.charAt(0).toUpperCase()}
                          </Text>
                        </LinearGradient>
                        {/* Status Indicator */}
                        <View
                          style={[
                            s.statusIndicator,
                            {
                              backgroundColor:
                                member.status === 'online'
                                  ? theme.colors.status.success
                                  : member.status === 'on-leave'
                                    ? theme.colors.status.warning
                                    : theme.colors.text.secondary,
                            },
                          ]}
                        />
                      </View>

                      {/* Info */}
                      <View style={s.memberInfo}>
                        <Text style={s.memberName}>{member.name}</Text>
                        <Text style={s.memberDepartment}>{member.department}</Text>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={[
                          s.statusBadge,
                          {
                            backgroundColor: statusStyle.backgroundColor,
                            borderColor: statusStyle.borderColor,
                          },
                        ]}
                      >
                        <Text style={[s.statusBadgeText, { color: statusStyle.color }]}>
                          {getStatusText(member.status)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
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
      marginBottom: 8,
    },
    menuButtonPlaceholder: {
      width: 40,
      height: 40,
    },
    notificationButton: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
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
    filterContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    filterButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: t.colors.background.surface,
      borderWidth: 1,
      borderColor: t.colors.border.default,
      alignItems: 'center',
    },
    filterButtonActive: {
      backgroundColor: t.colors.status.warningBg,
      borderColor: t.colors.status.warningBorder,
    },
    filterButtonText: {
      fontSize: 12,
      color: t.colors.text.secondary,
      fontWeight: '500',
    },
    filterButtonTextActive: {
      color: t.colors.status.warning,
      fontWeight: '600',
    },
    membersSection: {
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: t.colors.text.primary,
      marginBottom: 12,
    },
    loadingContainer: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    emptyContainer: {
      paddingVertical: 24,
    },
    membersList: {
      gap: 12,
    },
    memberCard: {
      backgroundColor: t.colors.background.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: t.colors.border.default,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 1,
    },
    memberContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarContainer: {
      position: 'relative',
      marginRight: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: t.colors.status.warning,
    },
    statusIndicator: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: t.colors.background.surface,
    },
    memberInfo: {
      flex: 1,
      marginRight: 8,
    },
    memberName: {
      fontSize: 15,
      fontWeight: '600',
      color: t.colors.text.primary,
      marginBottom: 4,
    },
    memberDepartment: {
      fontSize: 13,
      color: t.colors.text.secondary,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '500',
    },
  });
}
