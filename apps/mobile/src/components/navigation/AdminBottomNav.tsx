import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Icon } from '../ui/Icon';

const TABS = [
  { name: 'AdminDashboard', icon: 'grid-outline', label: 'Tổng quan' },
  { name: 'AdminUsers', icon: 'people-outline', label: 'Nhân viên' },
  { name: 'AdminReports', icon: 'bar-chart-outline', label: 'Báo cáo', isCenter: true },
  { name: 'AdminAudit', icon: 'shield-outline', label: 'Nhật ký' },
  { name: 'Profile', icon: 'person-outline', label: 'Tôi' },
];

export function AdminBottomTabBar({ state, navigation }: BottomTabBarProps) {
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
                    colors={isFocused ? ['#6d28d9', '#a855f7'] : ['#5b21b6', '#7c3aed']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={s.fab}
                  >
                    <Icon name={tab.icon as any} size={24} color="#fff" library="ionicons" />
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={[s.label, isFocused && s.labelActive]}>{tab.label}</Text>
              </View>
            );
          }

          return (
            <TouchableOpacity key={tab.name} style={s.tab} onPress={onPress} activeOpacity={0.7}>
              <View style={[s.iconPill, isFocused && s.iconPillActive]}>
                <Icon name={tab.icon as any} size={22} color={isFocused ? '#7c3aed' : '#9ca3af'} library="ionicons" />
              </View>
              <Text style={[s.label, isFocused && s.labelActiveAdmin]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
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
  iconPillActive: { backgroundColor: '#ede9fe' },
  label: { fontSize: 10, color: '#9ca3af', marginTop: 3, fontWeight: '500' },
  labelActive: { color: '#4F6EF7', fontWeight: '700' },
  labelActiveAdmin: { color: '#7c3aed', fontWeight: '700' },
  fabWrap: { flex: 1, alignItems: 'center', marginTop: -20 },
  fabOuter: { shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 10 },
  fab: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
