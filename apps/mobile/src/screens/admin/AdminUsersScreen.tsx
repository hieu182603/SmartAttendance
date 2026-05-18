import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AdminTabParamList } from '../../navigation/AppNavigator';
import { SPACING, BORDER_RADIUS, SHADOWS } from '../../utils/styles';
import { Icon } from '../../components/ui/Icon';
import { UserRole } from '../../types';
import { AdminService } from '../../services/admin.service';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';
import { ThemeColors } from '../../theme/colors';

type AdminUsersScreenNavigationProp = BottomTabNavigationProp<AdminTabParamList, 'AdminUsers'>;

interface AdminUsersScreenProps {
  navigation: AdminUsersScreenNavigationProp;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  avatar?: string;
  lastActive?: string;
  createdAt?: string;
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listPadding: {
      padding: SPACING.xl,
      paddingBottom: 100,
    },
    countText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '500',
    },
    emptyContainer: {
      alignItems: 'center',
      marginTop: SPACING.xxl,
    },
    emptyText: {
      color: colors.textSecondary,
      marginTop: SPACING.md,
    },
    userCard: {
      backgroundColor: colors.card,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      marginBottom: SPACING.md,
      ...SHADOWS.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    userName: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      marginRight: SPACING.sm,
    },
    userEmail: {
      color: colors.textSecondary,
      fontSize: 12,
      marginBottom: SPACING.xs / 2,
    },
    userStatus: {
      color: colors.textSecondary,
      fontSize: 11,
    },
  });
}

export default function AdminUsersScreen({ navigation }: AdminUsersScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | UserRole>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await AdminService.getUsers({
        role: selectedFilter === 'all' ? undefined : selectedFilter,
        search: searchQuery || undefined,
      });
      const mapped = (data || []).map((u: any) => ({
        ...u,
        status: u.isActive !== undefined ? (u.isActive ? 'active' : 'inactive') : (u.status || 'active'),
      }));
      setUsers(mapped);
    } catch (error) {
      console.log('Error fetching users', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleSearch = () => {
    fetchUsers();
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.Admin:
        return '#ef4444';
      case UserRole.Manager:
        return '#4F6EF7';
      default:
        return '#06b6d4';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.Admin:
        return 'Admin';
      case UserRole.Manager:
        return 'Quản lý';
      default:
        return 'Nhân viên';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
      }
    >
      {/* Header */}
      <LinearGradient
        colors={['#4f46e5', '#9333ea']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: SPACING.xxl * 2,
          paddingBottom: SPACING.xl,
          paddingHorizontal: SPACING.xl,
          borderBottomLeftRadius: BORDER_RADIUS.xxl,
          borderBottomRightRadius: BORDER_RADIUS.xxl,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: SPACING.lg,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: SPACING.md,
            }}
          >
            <Icon name="arrow_back" size={20} color="#ffffff" />
          </TouchableOpacity>
          <Text
            style={{
              color: '#ffffff',
              fontSize: 24,
              fontWeight: 'bold',
              flex: 1,
            }}
          >
            {t.admin.dashboard.users}
          </Text>
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Icon name="person_add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: BORDER_RADIUS.lg,
            paddingHorizontal: SPACING.md,
            paddingVertical: SPACING.sm,
            marginBottom: SPACING.md,
          }}
        >
          <Icon name="search" size={20} color="rgba(255, 255, 255, 0.7)" />
          <TextInput
            style={{
              flex: 1,
              color: '#ffffff',
              fontSize: 14,
              marginLeft: SPACING.sm,
              padding: 0,
            }}
            placeholder={t.common.search}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={18} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={{ flexDirection: 'row' }}>
          {(['all', UserRole.Employee, UserRole.Manager, UserRole.Admin] as const).map((filter, index) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setSelectedFilter(filter)}
              style={{
                paddingHorizontal: SPACING.md,
                paddingVertical: SPACING.xs,
                borderRadius: BORDER_RADIUS.md,
                backgroundColor:
                  selectedFilter === filter
                    ? 'rgba(255, 255, 255, 0.3)'
                    : 'rgba(255, 255, 255, 0.1)',
                marginRight: index < 3 ? SPACING.sm : 0,
              }}
            >
              <Text
                style={{
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: selectedFilter === filter ? 'bold' : '500',
                }}
              >
                {filter === 'all' ? 'Tất cả' : getRoleLabel(filter)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* User List */}
      <View style={styles.listPadding}>
        {isLoading && !refreshing ? (
          <ActivityIndicator size="large" color="#4F6EF7" style={{ marginTop: SPACING.xxl }} />
        ) : (
          <>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: SPACING.md,
              }}
            >
              <Text style={styles.countText}>{users.length} người dùng</Text>
            </View>

            {users.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="person_off" size={60} color={colors.textSecondary} />
                <Text style={styles.emptyText}>{t.common.noData}</Text>
              </View>
            ) : (
              users.map((user) => (
                <TouchableOpacity key={user._id} style={styles.userCard}>
                  <View style={styles.userRow}>
                    {/* Avatar */}
                    <View
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: getRoleColor(user.role),
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: SPACING.md,
                      }}
                    >
                      <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold' }}>
                        {user.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    {/* User Info */}
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: SPACING.xs / 2,
                        }}
                      >
                        <Text style={styles.userName}>{user.name}</Text>
                        <View
                          style={{
                            paddingHorizontal: SPACING.xs,
                            paddingVertical: 2,
                            borderRadius: BORDER_RADIUS.sm,
                            backgroundColor: `${getRoleColor(user.role)}20`,
                            borderWidth: 1,
                            borderColor: `${getRoleColor(user.role)}40`,
                          }}
                        >
                          <Text
                            style={{
                              color: getRoleColor(user.role),
                              fontSize: 10,
                              fontWeight: 'bold',
                            }}
                          >
                            {getRoleLabel(user.role)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.userEmail}>{user.email}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor:
                              user.status === 'active' ? '#16a34a' : colors.textSecondary,
                            marginRight: SPACING.xs,
                          }}
                        />
                        <Text style={styles.userStatus}>
                          {user.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}{' '}
                          {user.lastActive ? `• ${user.lastActive}` : ''}
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <TouchableOpacity style={{ padding: SPACING.sm }}>
                      <Icon name="more_vert" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
