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
import { Icon } from '../../components/ui/Icon';
import { UserRole } from '../../types';
import { AdminService } from '../../services/admin.service';
import { useTheme, Theme } from '../../theme';

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

export default function AdminUsersScreen({ navigation }: AdminUsersScreenProps) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

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
        return theme.colors.status.danger;
      case UserRole.Manager:
        return theme.colors.brand.primary;
      default:
        return theme.colors.status.info;
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
      style={s.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text.onPrimary} />
      }
    >
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.brand.primaryHover, '#9333ea'] as unknown as readonly [string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: 48,
          paddingBottom: 20,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
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
              marginRight: 12,
            }}
          >
            <Icon name="arrow-back-outline" size={20} color={theme.colors.text.onPrimary} library="ionicons" />
          </TouchableOpacity>
          <Text
            style={{
              color: theme.colors.text.onPrimary,
              fontSize: 24,
              fontWeight: 'bold',
              flex: 1,
            }}
          >
            Người dùng
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
            <Icon name="person-add-outline" size={24} color={theme.colors.text.onPrimary} library="ionicons" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginBottom: 12,
          }}
        >
          <Icon name="search-outline" size={20} color="rgba(255, 255, 255, 0.7)" library="ionicons" />
          <TextInput
            style={{
              flex: 1,
              color: theme.colors.text.onPrimary,
              fontSize: 14,
              marginLeft: 8,
              padding: 0,
            }}
            placeholder="Tìm kiếm"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-outline" size={18} color="rgba(255, 255, 255, 0.7)" library="ionicons" />
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
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor:
                  selectedFilter === filter
                    ? 'rgba(255, 255, 255, 0.3)'
                    : 'rgba(255, 255, 255, 0.1)',
                marginRight: index < 3 ? 8 : 0,
              }}
            >
              <Text
                style={{
                  color: theme.colors.text.onPrimary,
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
      <View style={s.listPadding}>
        {isLoading && !refreshing ? (
          <ActivityIndicator size="large" color={theme.colors.brand.primary} style={{ marginTop: 24 }} />
        ) : (
          <>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={s.countText}>{users.length} người dùng</Text>
            </View>

            {users.length === 0 ? (
              <View style={s.emptyContainer}>
                <Icon name="person-outline" size={60} color={theme.colors.text.secondary} library="ionicons" />
                <Text style={s.emptyText}>Không có dữ liệu</Text>
              </View>
            ) : (
              users.map((user) => (
                <TouchableOpacity key={user._id} style={s.userCard}>
                  <View style={s.userRow}>
                    {/* Avatar */}
                    <View
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: getRoleColor(user.role),
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Text style={{ color: theme.colors.text.onPrimary, fontSize: 18, fontWeight: 'bold' }}>
                        {user.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    {/* User Info */}
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: 2,
                        }}
                      >
                        <Text style={s.userName}>{user.name}</Text>
                        <View
                          style={{
                            paddingHorizontal: 4,
                            paddingVertical: 2,
                            borderRadius: 6,
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
                      <Text style={s.userEmail}>{user.email}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor:
                              user.status === 'active' ? theme.colors.status.success : theme.colors.text.secondary,
                            marginRight: 4,
                          }}
                        />
                        <Text style={s.userStatus}>
                          {user.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}{' '}
                          {user.lastActive ? `• ${user.lastActive}` : ''}
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <TouchableOpacity style={{ padding: 8 }}>
                      <Icon name="ellipsis-vertical-outline" size={20} color={theme.colors.text.secondary} library="ionicons" />
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

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background.base,
    },
    listPadding: {
      padding: 20,
      paddingBottom: 100,
    },
    countText: {
      color: t.colors.text.secondary,
      fontSize: 14,
      fontWeight: '500',
    },
    emptyContainer: {
      alignItems: 'center',
      marginTop: 24,
    },
    emptyText: {
      color: t.colors.text.secondary,
      marginTop: 12,
    },
    userCard: {
      backgroundColor: t.colors.background.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: t.colors.border.default,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    userName: {
      color: t.colors.text.primary,
      fontSize: 16,
      fontWeight: 'bold',
      marginRight: 8,
    },
    userEmail: {
      color: t.colors.text.secondary,
      fontSize: 12,
      marginBottom: 2,
    },
    userStatus: {
      color: t.colors.text.secondary,
      fontSize: 11,
    },
  });
}
