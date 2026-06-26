import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Icon } from '../ui/Icon';
import { useTheme } from '../../theme';

const TABS = [
  { name: 'ManagerDashboard', icon: 'grid-outline', label: 'Tổng quan' },
  { name: 'ManagerTeam', icon: 'people-outline', label: 'Team' },
  { name: 'ManagerApprovals', icon: 'checkmark-done-outline', label: 'Duyệt đơn', isCenter: true },
  { name: 'Schedule', icon: 'calendar-outline', label: 'Lịch' },
  { name: 'Profile', icon: 'person-outline', label: 'Tôi' },
];

const PENDING_BADGE = 0;

export function ManagerBottomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={s.container}>
      <View style={s.bar}>
        {TABS.map((tab) => {
          const route = state.routes.find((r) => r.name === tab.name);
          if (!route) return null;
          const isFocused = state.routes[state.index]?.name === tab.name;

          const onPress = () => {
            if (!isFocused) navigation.navigate(route.name as any);
          };

          if (tab.isCenter) {
            return (
              <View key={tab.name} style={s.fabWrap}>
                <TouchableOpacity onPress={onPress} style={s.fabOuter} activeOpacity={0.85}>
                  <LinearGradient
                    colors={isFocused
                      ? [colors.brand.primary, colors.brand.primaryHover] as unknown as readonly [string, ...string[]]
                      : [colors.brand.primary, colors.brand.primaryActive] as unknown as readonly [string, ...string[]]
                    }
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={s.fab}
                  >
                    <Icon name={tab.icon as any} size={24} color={colors.text.onPrimary} library="ionicons" />
                  </LinearGradient>
                </TouchableOpacity>
                {PENDING_BADGE > 0 && (
                  <View style={s.fabBadge}>
                    <Text style={s.fabBadgeTxt}>{PENDING_BADGE}</Text>
                  </View>
                )}
                <Text style={[s.label, isFocused && s.labelActive]}>{tab.label}</Text>
              </View>
            );
          }

          return (
            <TouchableOpacity key={tab.name} style={s.tab} onPress={onPress} activeOpacity={0.7}>
              <View style={[s.iconPill, isFocused && s.iconPillActive]}>
                <Icon name={tab.icon as any} size={22} color={isFocused ? colors.brand.primary : colors.text.muted} library="ionicons" />
              </View>
              <Text style={[s.label, isFocused && s.labelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    bar: {
      flexDirection: 'row',
      backgroundColor: c.background.surface,
      borderTopWidth: 1,
      borderTopColor: c.border.default,
      paddingTop: 8,
      paddingBottom: Platform.OS === 'ios' ? 24 : 10,
      paddingHorizontal: 8,
      alignItems: 'flex-end',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 12,
    },
    tab: { flex: 1, alignItems: 'center' },
    iconPill: { width: 44, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    iconPillActive: { backgroundColor: c.background.indigoTint },
    label: { fontSize: 10, color: c.text.muted, marginTop: 3, fontWeight: '500' },
    labelActive: { color: c.brand.primary, fontWeight: '700' },
    fabWrap: { flex: 1, alignItems: 'center', marginTop: -20 },
    fabOuter: { shadowColor: c.brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 10, position: 'relative' },
    fab: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    fabBadge: { position: 'absolute', top: -2, right: -4, backgroundColor: c.status.danger, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.background.surface, paddingHorizontal: 3 },
    fabBadgeTxt: { fontSize: 9, fontWeight: '800', color: c.text.onPrimary },
  });
}
