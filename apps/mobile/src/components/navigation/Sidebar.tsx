import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, UserRole } from '../../types';
import { Icon } from '../ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { useManagerApprovals } from '../../hooks/useManagerQueries';
import { useTheme } from '../../theme';

interface MenuItem {
  screen: Screen;
  icon: string;
  label: string;
  badge?: number;
}

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { logout, userRole } = useAuth();
  const { navigation, state } = props;
  const { colors } = useTheme();

  const { data: approvalsData } = useManagerApprovals();
  const pendingCount = approvalsData?.filter((a: any) => a.status === 'pending').length || 0;

  const managerItems: MenuItem[] = [
    { screen: Screen.ManagerDashboard, icon: 'dashboard', label: 'Tổng quan' },
    { screen: Screen.ManagerApprovals, icon: 'fact_check', label: 'Duyệt đơn', badge: pendingCount > 0 ? pendingCount : undefined },
    { screen: Screen.ManagerTeam, icon: 'groups', label: 'Đội nhóm' },
    { screen: Screen.Schedule, icon: 'calendar_month', label: 'Lịch làm việc' },
    { screen: Screen.Settings, icon: 'settings', label: 'Cài đặt' },
  ];

  const adminItems: MenuItem[] = [
    { screen: Screen.AdminDashboard, icon: 'dashboard', label: 'Dashboard' },
    { screen: Screen.AdminUsers, icon: 'manage_accounts', label: 'User Management' },
    { screen: Screen.AdminReports, icon: 'analytics', label: 'Reports & Analytics' },
    { screen: Screen.AdminAudit, icon: 'history_edu', label: 'Audit Logs' },
    { screen: Screen.AdminSettings, icon: 'settings', label: 'Global Settings' },
    { screen: Screen.Profile, icon: 'person', label: 'My Profile' },
  ];

  const items = userRole === UserRole.Manager ? managerItems : adminItems;
  const currentRoute = state.routes[state.index]?.name;

  const getScreenName = (screen: Screen): string => {
    const screenMap: { [key in Screen]?: string } = {
      [Screen.ManagerDashboard]: 'ManagerDashboard',
      [Screen.ManagerTeam]: 'ManagerTeam',
      [Screen.ManagerApprovals]: 'ManagerApprovals',
      [Screen.Schedule]: 'Schedule',
      [Screen.AdminDashboard]: 'AdminDashboard',
      [Screen.AdminUsers]: 'AdminUsers',
      [Screen.AdminReports]: 'AdminReports',
      [Screen.AdminSettings]: 'AdminSettings',
      [Screen.AdminAudit]: 'AdminAudit',
      [Screen.Profile]: 'Profile',
      [Screen.Settings]: 'Settings',
    };
    return screenMap[screen] || screen;
  };

  const handleNavigate = (screen: Screen) => {
    const screenName = getScreenName(screen);
    navigation.navigate(screenName as any);
    navigation.closeDrawer();
  };

  const handleLogout = async () => {
    await logout();
    navigation.navigate('Login' as any);
  };

  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[colors.brand.primary, colors.brand.primaryActive] as unknown as readonly [string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerContent}>
          <View style={s.logoContainer}>
            <Icon name="timelapse" size={24} color={colors.text.onPrimary} />
          </View>
          <View>
            <Text style={s.logoText}>
              Smart<Text style={s.logoTextAccent}>Att</Text>
            </Text>
            <Text style={s.versionText}>Workspace v2.0</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={s.menuContainer}
        contentContainerStyle={s.menuContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.menuSectionTitle}>Menu</Text>
        {items.map((item) => {
          const screenName = getScreenName(item.screen);
          const isActive = currentRoute === screenName;
          return (
            <TouchableOpacity
              key={item.screen}
              onPress={() => handleNavigate(item.screen)}
              style={[s.menuItem, isActive && s.menuItemActive]}
              activeOpacity={0.7}
            >
              <Icon
                name={item.icon}
                size={22}
                color={isActive ? colors.text.onPrimary : 'rgba(255,255,255,0.5)'}
              />
              <Text style={[
                s.menuItemText,
                isActive && s.menuItemTextActive,
                { marginLeft: 16 },
              ]}>
                {item.label}
              </Text>
              {item.badge && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          onPress={handleLogout}
          style={s.logoutButton}
          activeOpacity={0.7}
        >
          <Icon name="logout" size={22} color={colors.status.danger} />
          <Text style={[s.logoutText, { marginLeft: 16 }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#15152a',
      borderRightWidth: 1,
      borderRightColor: 'rgba(255, 255, 255, 0.05)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
    header: {
      paddingTop: 48,
      paddingBottom: 24,
      paddingHorizontal: 32,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoContainer: {
      width: 40,
      height: 40,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      marginRight: 12,
    },
    logoText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: c.text.onPrimary,
    },
    logoTextAccent: {
      color: '#7B95FF',
    },
    versionText: {
      fontSize: 10,
      color: 'rgba(255, 255, 255, 0.7)',
      marginTop: 2,
    },
    menuContainer: {
      flex: 1,
    },
    menuContent: {
      paddingVertical: 24,
      paddingHorizontal: 8,
    },
    menuSectionTitle: {
      fontSize: 10,
      fontWeight: 'bold',
      color: 'rgba(255,255,255,0.4)',
      textTransform: 'uppercase',
      letterSpacing: 1,
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 18,
      paddingHorizontal: 24,
      borderRadius: 16,
      marginVertical: 2,
      marginHorizontal: 4,
    },
    menuItemActive: {
      backgroundColor: c.brand.primary,
      shadowColor: c.brand.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    menuItemText: {
      flex: 1,
      fontSize: 14,
      color: 'rgba(255,255,255,0.5)',
    },
    menuItemTextActive: {
      color: c.text.onPrimary,
      fontWeight: 'bold',
    },
    badge: {
      backgroundColor: c.status.danger,
      borderRadius: 9999,
      paddingHorizontal: 6,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: c.text.onPrimary,
      fontSize: 10,
      fontWeight: 'bold',
    },
    footer: {
      padding: 24,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
    },
    logoutText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: c.status.danger,
    },
  });
}
