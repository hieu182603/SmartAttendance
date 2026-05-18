import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Icon } from '../ui/Icon';

const TABS = [
  { name: 'Home', icon: 'home-outline', label: 'Trang chủ' },
  { name: 'Schedule', icon: 'calendar-outline', label: 'Lịch' },
  { name: '__fab__', icon: 'camera-outline', label: 'Check-in' },
  { name: 'Leaves', icon: 'document-text-outline', label: 'Đơn từ' },
  { name: 'Profile', icon: 'person-outline', label: 'Cá nhân' },
];

export function CustomBottomTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={s.container}>
      <View style={s.bar}>
        {TABS.map((tab) => {
          if (tab.name === '__fab__') {
            return (
              <View key="fab" style={s.fabWrap}>
                <TouchableOpacity
                  style={s.fabOuter}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Attendance' as any)}
                >
                  <LinearGradient colors={['#4245f0', '#06b6d4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fab}>
                    <Icon name={tab.icon as any} size={22} color="#fff" library="ionicons" />
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={s.fabLabel}>{tab.label}</Text>
              </View>
            );
          }

          const route = state.routes.find((r) => r.name === tab.name);
          if (!route) return null;
          const isFocused = state.routes[state.index]?.name === tab.name;

          const onPress = () => {
            if (!isFocused) navigation.navigate(route.name as any);
          };

          return (
            <TouchableOpacity key={tab.name} style={s.tab} onPress={onPress} activeOpacity={0.7}>
              <View style={[s.iconPill, isFocused && s.iconPillActive]}>
                <Icon name={tab.icon as any} size={20} color={isFocused ? '#4F6EF7' : '#9ca3af'} library="ionicons" />
              </View>
              <Text style={[s.label, isFocused && s.labelActive]}>{tab.label}</Text>
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.2)',
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: 8,
    alignItems: 'flex-start',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center', paddingTop: 4 },
  iconPill: { width: 34, height: 34, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  iconPillActive: { backgroundColor: '#EEF1FF' },
  label: { fontSize: 10, color: '#9ca3af', marginTop: 4, fontWeight: '500' },
  labelActive: { color: '#3538cd', fontWeight: '700' },
  fabWrap: { flex: 1, alignItems: 'center', marginTop: -16 },
  fabOuter: {
    shadowColor: '#4245f0',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 14,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  fabLabel: { fontSize: 10, color: '#3538cd', fontWeight: '700', marginTop: 4 },
});
