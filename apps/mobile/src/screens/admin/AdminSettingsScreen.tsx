import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SPACING, BORDER_RADIUS, SHADOWS } from '../../utils/styles';
import { Icon } from '../../components/ui/Icon';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';
import { ThemeColors } from '../../theme/colors';

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    menuItem: {
      backgroundColor: colors.card,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      marginBottom: SPACING.md,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOWS.md,
    },
    menuTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: SPACING.xs / 2,
    },
    menuSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
    },
  });
}

export default function AdminSettingsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const menuItems = [
    {
      id: 'departments',
      title: t.admin.dashboard.departments,
      subtitle: 'Thêm, sửa, xóa các phòng ban trong công ty',
      icon: 'business',
      color: '#7c3aed',
      onPress: () => navigation.navigate('AdminDepartments' as any),
    },
    {
      id: 'positions',
      title: 'Quản lý Chức vụ',
      subtitle: 'Thiết lập các vị trí công việc (Giám đốc, NV...)',
      icon: 'badge',
      color: '#06b6d4',
      onPress: () => navigation.navigate('AdminPositions' as any),
    },
    {
      id: 'changePassword',
      title: t.settings.changePassword,
      subtitle: 'Cập nhật mật khẩu tài khoản',
      icon: 'lock',
      color: '#4F6EF7',
      onPress: () => alert('Tính năng đang phát triển'),
    },
    {
      id: 'clearCache',
      title: t.settings.clearCache,
      subtitle: 'Xóa dữ liệu tạm thời của ứng dụng',
      icon: 'cleaning_services',
      color: '#d97706',
      onPress: () => alert('Tính năng đang phát triển'),
    },
    {
      id: 'version',
      title: t.settings.version,
      subtitle: '1.0.0',
      icon: 'info',
      color: '#16a34a',
      onPress: () => {},
    },
    {
      id: 'terms',
      title: t.settings.terms,
      subtitle: 'Điều khoản và điều kiện sử dụng',
      icon: 'description',
      color: '#ef4444',
      onPress: () => alert('Tính năng đang phát triển'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
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
          marginBottom: SPACING.lg,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: SPACING.xs }}>
          {t.settings.title}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
          Thiết lập các thông số vận hành cho ứng dụng
        </Text>
      </LinearGradient>

      <View style={{ padding: SPACING.md }}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={item.onPress}
            style={styles.menuItem}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: `${item.color}20`,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: SPACING.md,
              }}
            >
              <Icon name={item.icon} size={24} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Icon name="chevron_right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
