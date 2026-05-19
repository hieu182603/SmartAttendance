import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Theme } from '../../theme';

export default function AdminSettingsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const menuItems = [
    {
      id: 'departments',
      title: 'Phòng ban',
      subtitle: 'Thêm, sửa, xóa các phòng ban trong công ty',
      icon: 'business-outline',
      color: theme.colors.brand.primaryActive,
      onPress: () => navigation.navigate('AdminDepartments' as any),
    },
    {
      id: 'positions',
      title: 'Quản lý Chức vụ',
      subtitle: 'Thiết lập các vị trí công việc (Giám đốc, NV...)',
      icon: 'ribbon-outline',
      color: theme.colors.status.info,
      onPress: () => navigation.navigate('AdminPositions' as any),
    },
    {
      id: 'changePassword',
      title: 'Đổi mật khẩu',
      subtitle: 'Cập nhật mật khẩu tài khoản',
      icon: 'lock-closed-outline',
      color: theme.colors.brand.primary,
      onPress: () => alert('Tính năng đang phát triển'),
    },
    {
      id: 'clearCache',
      title: 'Xóa bộ nhớ đệm',
      subtitle: 'Xóa dữ liệu tạm thời của ứng dụng',
      icon: 'trash-outline',
      color: theme.colors.status.warning,
      onPress: () => alert('Tính năng đang phát triển'),
    },
    {
      id: 'version',
      title: 'Phiên bản',
      subtitle: '1.0.0',
      icon: 'information-circle-outline',
      color: theme.colors.status.success,
      onPress: () => {},
    },
    {
      id: 'terms',
      title: 'Điều khoản sử dụng',
      subtitle: 'Điều khoản và điều kiện sử dụng',
      icon: 'document-text-outline',
      color: theme.colors.status.danger,
      onPress: () => alert('Tính năng đang phát triển'),
    },
  ];

  return (
    <ScrollView style={s.container}>
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
          marginBottom: 16,
        }}
      >
        <Text style={{ color: theme.colors.text.onPrimary, fontSize: 24, fontWeight: 'bold', marginBottom: 4 }}>
          Cài đặt
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
          Thiết lập các thông số vận hành cho ứng dụng
        </Text>
      </LinearGradient>

      <View style={{ padding: 12 }}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={item.onPress}
            style={s.menuItem}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: `${item.color}20`,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}
            >
              <Icon name={item.icon} size={24} color={item.color} library="ionicons" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuTitle}>{item.title}</Text>
              <Text style={s.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Icon name="chevron-forward-outline" size={24} color={theme.colors.text.secondary} library="ionicons" />
          </TouchableOpacity>
        ))}
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
    menuItem: {
      backgroundColor: t.colors.background.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.colors.border.default,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    menuTitle: {
      color: t.colors.text.primary,
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 2,
    },
    menuSubtitle: {
      color: t.colors.text.secondary,
      fontSize: 12,
    },
  });
}
