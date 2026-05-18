import React from 'react';
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
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../utils/styles';
import { useAuth } from '../../context/AuthContext';
import { useManagerApprovals } from '../../hooks/useManagerQueries';

interface MenuItem {
  screen: Screen;
  icon: string;
  label: string;
  badge?: number;
}

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { logout, userRole } = useAuth();
  const { navigation, state } = props;

  const { data: approvalsData } = useManagerApprovals();
  const pendingCount = approvalsData?.filter((a: any) => a.status === 'pending').length || 0;

  const managerItems: MenuItem[] = [
    { screen: Screen.ManagerDashboard, icon: 'dashboard', label: 'Tổng quan' },
    { screen: Screen.ManagerApprovals, icon: 'fact_check', label: 'Duyệt đơn', badge: pendingCount > 0 ? pendingCount : undefined },
    { screen: Screen.ManagerTeam, icon: 'groups', label: 'Đội nhóm' },
    { screen: Screen.ManagerSchedule, icon: 'calendar_month', label: 'Lịch làm việc' },
    { screen: Screen.TeamReports, icon: 'analytics', label: 'Báo cáo' },
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

  // Map Screen enum to actual navigator screen names
  const getScreenName = (screen: Screen): string => {
    const screenMap: { [key in Screen]?: string } = {
      [Screen.ManagerDashboard]: 'ManagerDashboard',
      [Screen.ManagerTeam]: 'ManagerTeam',
      [Screen.ManagerApprovals]: 'ManagerApprovals',
      [Screen.ManagerSchedule]: 'ManagerSchedule',
      [Screen.TeamReports]: 'TeamReports',
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent.cyan] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Icon name="timelapse" size={24} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.logoText}>
              Smart<Text style={styles.logoTextAccent}>Att</Text>
            </Text>
            <Text style={styles.versionText}>Workspace v2.0</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Menu Items */}
      <ScrollView
        style={styles.menuContainer}
        contentContainerStyle={styles.menuContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.menuSectionTitle}>Menu</Text>
        {items.map((item) => {
          const screenName = getScreenName(item.screen);
          const isActive = currentRoute === screenName;
          return (
            <TouchableOpacity
              key={item.screen}
              onPress={() => handleNavigate(item.screen)}
              style={[
                styles.menuItem,
                isActive && styles.menuItemActive,
              ]}
              activeOpacity={0.7}
            >
              <Icon
                name={item.icon}
                size={22}
                color={isActive ? '#ffffff' : COLORS.text.secondary}
              />
              <Text style={[
                styles.menuItemText,
                isActive && styles.menuItemTextActive,
                { marginLeft: SPACING.md },
              ]}>
                {item.label}
              </Text>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer / Logout */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
          activeOpacity={0.7}
        >
          <Icon name="logout" size={22} color={COLORS.accent.red} />
          <Text style={[styles.logoutText, { marginLeft: SPACING.md }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#15152a',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.05)',
    ...SHADOWS.lg,
  },
  header: {
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.xl,
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
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logoTextAccent: {
    color: COLORS.primaryLight,
  },
  versionText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: SPACING.xs / 2,
  },
  menuContainer: {
    flex: 1,
  },
  menuContent: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  menuSectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginVertical: SPACING.xs / 2,
    marginHorizontal: SPACING.xs,
  },
  menuItemActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.md,
    shadowColor: COLORS.primary,
  },
  menuItemText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  menuItemTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: COLORS.accent.red,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: SPACING.xs / 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.accent.red,
  },
});
