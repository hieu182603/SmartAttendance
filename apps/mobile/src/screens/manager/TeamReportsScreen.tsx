import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ManagerTabParamList } from '../../navigation/AppNavigator';
import { Icon } from '../../components/ui/Icon';
import { useManagerReports } from '../../hooks/useManagerQueries';
import { useTheme } from '../../theme';
import type { Theme } from '../../theme';

type TeamReportsScreenNavigationProp = BottomTabNavigationProp<ManagerTabParamList, 'TeamReports'>;

interface TeamReportsScreenProps {
    navigation: TeamReportsScreenNavigationProp;
}

const screenWidth = Dimensions.get('window').width;

export default function TeamReportsScreen({ navigation }: TeamReportsScreenProps) {
    const theme = useTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

    // TanStack Query hook
    const { data: stats, isLoading: loading } = useManagerReports(period);

    const legendFontColor = theme.colors.text.secondary;

    const chartData = stats ? [
        {
            name: 'Đúng giờ',
            population: stats.attendance.present,
            color: theme.colors.status.success,
            legendFontColor,
            legendFontSize: 12,
        },
        {
            name: 'Đi trễ',
            population: stats.attendance.late,
            color: theme.colors.status.warning,
            legendFontColor,
            legendFontSize: 12,
        },
        {
            name: 'Vắng mặt',
            population: stats.attendance.absent,
            color: theme.colors.status.danger,
            legendFontColor,
            legendFontSize: 12,
        },
        {
            name: 'Nghỉ phép',
            population: stats.attendance.leave,
            color: '#06b6d4',
            legendFontColor,
            legendFontSize: 12,
        },
    ] : [];

    const chartConfig = {
        backgroundGradientFrom: "#1E2923",
        backgroundGradientFromOpacity: 0,
        backgroundGradientTo: "#08130D",
        backgroundGradientToOpacity: 0.5,
        color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
        strokeWidth: 2,
        barPercentage: 0.5,
        useShadowColorFromDataset: false,
    };

    const FilterButton = ({ title, value }: { title: string, value: 'day' | 'week' | 'month' }) => (
        <TouchableOpacity
            onPress={() => setPeriod(value)}
            style={[
                s.filterButton,
                period === value && s.filterButtonActive
            ]}
        >
            <Text style={[
                s.filterText,
                period === value && s.filterTextActive
            ]}>{title}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={s.container}>
            {/* Header */}
            <LinearGradient
                colors={[theme.colors.brand.primaryHover, theme.colors.brand.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.header}
            >
                <View style={{ width: 24 }} />
                <Text style={s.headerTitle}>Báo cáo nhóm</Text>
                <View style={{ width: 24 }} />
            </LinearGradient>

            <ScrollView contentContainerStyle={{ padding: 12 }}>
                {/* Filter */}
                <View style={s.filterContainer}>
                    <FilterButton title="Hôm nay" value="day" />
                    <FilterButton title="Tuần này" value="week" />
                    <FilterButton title="Tháng này" value="month" />
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.brand.primary} style={{ marginTop: 20 }} />
                ) : stats ? (
                    <>
                        {/* Chart Section */}
                        <View style={s.card}>
                            <Text style={s.cardTitle}>Tỷ lệ chuyên cần</Text>
                            <PieChart
                                data={chartData}
                                width={screenWidth - 64}
                                height={220}
                                chartConfig={chartConfig}
                                accessor={"population"}
                                backgroundColor={"transparent"}
                                paddingLeft={"15"}
                                center={[0, 0]}
                                absolute
                            />
                        </View>

                        {/* Summary Cards */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                            <View style={[s.statCard, { borderLeftColor: theme.colors.status.warning }]}>
                                <Text style={s.statLabel}>Đi trễ</Text>
                                <Text style={s.statValue}>{stats.attendance.late}</Text>
                            </View>
                            <View style={[s.statCard, { borderLeftColor: theme.colors.status.danger }]}>
                                <Text style={s.statLabel}>Vắng mặt</Text>
                                <Text style={s.statValue}>{stats.attendance.absent}</Text>
                            </View>
                        </View>

                        {/* Issues List */}
                        <View style={s.card}>
                            <Text style={[s.cardTitle, { marginBottom: 12 }]}>Danh sách cần lưu ý</Text>
                            {stats.issues.length === 0 ? (
                                <Text style={s.emptyText}>Không có dữ liệu</Text>
                            ) : (
                                stats.issues.map((issue: any) => (
                                    <View key={issue.id} style={s.issueItem}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={[
                                                s.avatarPlaceholder,
                                                { backgroundColor: issue.type === 'late' ? theme.colors.status.warningBg : theme.colors.status.dangerBg }
                                            ]}>
                                                <Text style={{
                                                    color: issue.type === 'late' ? theme.colors.status.warning : theme.colors.status.danger,
                                                    fontWeight: 'bold'
                                                }}>
                                                    {issue.name.charAt(0)}
                                                </Text>
                                            </View>
                                            <View style={{ marginLeft: 12 }}>
                                                <Text style={s.issueName}>{issue.name}</Text>
                                                <Text style={s.issueDate}>{issue.date}</Text>
                                            </View>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <View style={[
                                                s.badge,
                                                { backgroundColor: issue.type === 'late' ? theme.colors.status.warningBg : theme.colors.status.dangerBg }
                                            ]}>
                                                <Text style={{
                                                    color: issue.type === 'late' ? theme.colors.status.warning : theme.colors.status.danger,
                                                    fontSize: 12,
                                                    fontWeight: 'bold'
                                                }}>
                                                    {issue.type === 'late' ? 'Đi trễ' : 'Vắng mặt'}
                                                </Text>
                                            </View>
                                            <Text style={s.issueTime}>
                                                {issue.time}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    </>
                ) : (
                    <Text style={s.emptyText}>Không có dữ liệu</Text>
                )}
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
            paddingTop: 36,
            paddingBottom: 12,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        headerTitle: {
            color: '#ffffff',
            fontSize: 20,
            fontWeight: 'bold',
        },
        filterContainer: {
            flexDirection: 'row',
            backgroundColor: t.colors.background.surface,
            padding: 4,
            borderRadius: 12,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: t.colors.border.default,
        },
        filterButton: {
            flex: 1,
            paddingVertical: 8,
            alignItems: 'center',
            borderRadius: 8,
        },
        filterButtonActive: {
            backgroundColor: t.colors.brand.primary,
        },
        filterText: {
            color: t.colors.text.secondary,
            fontWeight: '600',
        },
        filterTextActive: {
            color: '#fff',
        },
        card: {
            backgroundColor: t.colors.background.surface,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: t.colors.border.default,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
        },
        cardTitle: {
            color: t.colors.text.primary,
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 4,
        },
        statCard: {
            flex: 0.48,
            backgroundColor: t.colors.background.surface,
            borderRadius: 12,
            padding: 12,
            borderLeftWidth: 4,
            borderTopWidth: 1,
            borderRightWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: t.colors.border.default,
            borderRightColor: t.colors.border.default,
            borderBottomColor: t.colors.border.default,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 1,
        },
        statLabel: {
            color: t.colors.text.secondary,
            fontSize: 12,
            marginBottom: 4,
        },
        statValue: {
            color: t.colors.text.primary,
            fontSize: 24,
            fontWeight: 'bold',
        },
        issueItem: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: t.colors.border.default,
        },
        avatarPlaceholder: {
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
        },
        badge: {
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
        },
        issueName: {
            color: t.colors.text.primary,
            fontWeight: 'bold',
        },
        issueDate: {
            color: t.colors.text.secondary,
            fontSize: 12,
        },
        issueTime: {
            color: t.colors.text.primary,
            marginTop: 4,
        },
        emptyText: {
            color: t.colors.text.secondary,
            textAlign: 'center',
            paddingVertical: 16,
        },
    });
}
