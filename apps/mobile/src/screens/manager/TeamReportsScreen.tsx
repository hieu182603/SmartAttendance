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
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../utils/styles';
import { Icon } from '../../components/ui/Icon';
import { useManagerReports } from '../../hooks/useManagerQueries';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';
import { ThemeColors } from '../../theme/colors';

type TeamReportsScreenNavigationProp = BottomTabNavigationProp<ManagerTabParamList, 'TeamReports'>;

interface TeamReportsScreenProps {
    navigation: TeamReportsScreenNavigationProp;
}

const screenWidth = Dimensions.get('window').width;

function makeStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            paddingTop: SPACING.xxl * 1.5,
            paddingBottom: SPACING.md,
            paddingHorizontal: SPACING.md,
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
            backgroundColor: colors.card,
            padding: SPACING.xs,
            borderRadius: BORDER_RADIUS.lg,
            marginBottom: SPACING.md,
            borderWidth: 1,
            borderColor: colors.border,
        },
        filterButton: {
            flex: 1,
            paddingVertical: SPACING.sm,
            alignItems: 'center',
            borderRadius: BORDER_RADIUS.md,
        },
        filterButtonActive: {
            backgroundColor: COLORS.primary,
        },
        filterText: {
            color: colors.textSecondary,
            fontWeight: '600',
        },
        filterTextActive: {
            color: '#fff',
        },
        card: {
            backgroundColor: colors.card,
            borderRadius: BORDER_RADIUS.lg,
            padding: SPACING.md,
            marginBottom: SPACING.md,
            borderWidth: 1,
            borderColor: colors.border,
            ...SHADOWS.md,
        },
        cardTitle: {
            color: colors.textPrimary,
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: SPACING.xs,
        },
        statCard: {
            flex: 0.48,
            backgroundColor: colors.card,
            borderRadius: BORDER_RADIUS.lg,
            padding: SPACING.md,
            borderLeftWidth: 4,
            borderTopWidth: 1,
            borderRightWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: colors.border,
            borderRightColor: colors.border,
            borderBottomColor: colors.border,
            ...SHADOWS.sm,
        },
        statLabel: {
            color: colors.textSecondary,
            fontSize: 12,
            marginBottom: SPACING.xs,
        },
        statValue: {
            color: colors.textPrimary,
            fontSize: 24,
            fontWeight: 'bold',
        },
        issueItem: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: SPACING.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        avatarPlaceholder: {
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
        },
        badge: {
            paddingHorizontal: SPACING.sm,
            paddingVertical: 2,
            borderRadius: BORDER_RADIUS.full,
        },
        issueName: {
            color: colors.textPrimary,
            fontWeight: 'bold',
        },
        issueDate: {
            color: colors.textSecondary,
            fontSize: 12,
        },
        issueTime: {
            color: colors.textPrimary,
            marginTop: 4,
        },
        emptyText: {
            color: colors.textSecondary,
            textAlign: 'center',
            paddingVertical: SPACING.lg,
        },
    });
}

export default function TeamReportsScreen({ navigation }: TeamReportsScreenProps) {
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

    // TanStack Query hook
    const { data: stats, isLoading: loading } = useManagerReports(period);

    const legendFontColor = isDark ? '#cbd5e1' : '#444654';

    const chartData = stats ? [
        {
            name: t.attendance.onTime,
            population: stats.attendance.present,
            color: COLORS.accent.green,
            legendFontColor,
            legendFontSize: 12,
        },
        {
            name: t.attendance.late,
            population: stats.attendance.late,
            color: COLORS.accent.yellow,
            legendFontColor,
            legendFontSize: 12,
        },
        {
            name: t.attendance.absent,
            population: stats.attendance.absent,
            color: COLORS.accent.red,
            legendFontColor,
            legendFontSize: 12,
        },
        {
            name: 'Nghỉ phép',
            population: stats.attendance.leave,
            color: COLORS.accent.cyan,
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
                styles.filterButton,
                period === value && styles.filterButtonActive
            ]}
        >
            <Text style={[
                styles.filterText,
                period === value && styles.filterTextActive
            ]}>{title}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[COLORS.primaryDark, COLORS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={{ width: 24 }} />
                <Text style={styles.headerTitle}>{t.manager.dashboard.reports}</Text>
                <View style={{ width: 24 }} />
            </LinearGradient>

            <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
                {/* Filter */}
                <View style={styles.filterContainer}>
                    <FilterButton title={t.common.today} value="day" />
                    <FilterButton title="Tuần này" value="week" />
                    <FilterButton title="Tháng này" value="month" />
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
                ) : stats ? (
                    <>
                        {/* Chart Section */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Tỷ lệ chuyên cần</Text>
                            <PieChart
                                data={chartData}
                                width={screenWidth - SPACING.lg * 4}
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
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md }}>
                            <View style={[styles.statCard, { borderLeftColor: COLORS.accent.yellow }]}>
                                <Text style={styles.statLabel}>{t.attendance.late}</Text>
                                <Text style={styles.statValue}>{stats.attendance.late}</Text>
                            </View>
                            <View style={[styles.statCard, { borderLeftColor: COLORS.accent.red }]}>
                                <Text style={styles.statLabel}>{t.attendance.absent}</Text>
                                <Text style={styles.statValue}>{stats.attendance.absent}</Text>
                            </View>
                        </View>

                        {/* Issues List */}
                        <View style={styles.card}>
                            <Text style={[styles.cardTitle, { marginBottom: SPACING.md }]}>Danh sách cần lưu ý</Text>
                            {stats.issues.length === 0 ? (
                                <Text style={styles.emptyText}>{t.common.noData}</Text>
                            ) : (
                                stats.issues.map((issue: any) => (
                                    <View key={issue.id} style={styles.issueItem}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={[
                                                styles.avatarPlaceholder,
                                                { backgroundColor: issue.type === 'late' ? `${COLORS.accent.yellow}20` : `${COLORS.accent.red}20` }
                                            ]}>
                                                <Text style={{
                                                    color: issue.type === 'late' ? COLORS.accent.yellow : COLORS.accent.red,
                                                    fontWeight: 'bold'
                                                }}>
                                                    {issue.name.charAt(0)}
                                                </Text>
                                            </View>
                                            <View style={{ marginLeft: SPACING.md }}>
                                                <Text style={styles.issueName}>{issue.name}</Text>
                                                <Text style={styles.issueDate}>{issue.date}</Text>
                                            </View>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <View style={[
                                                styles.badge,
                                                { backgroundColor: issue.type === 'late' ? `${COLORS.accent.yellow}20` : `${COLORS.accent.red}20` }
                                            ]}>
                                                <Text style={{
                                                    color: issue.type === 'late' ? COLORS.accent.yellow : COLORS.accent.red,
                                                    fontSize: 12,
                                                    fontWeight: 'bold'
                                                }}>
                                                    {issue.type === 'late' ? t.attendance.late : t.attendance.absent}
                                                </Text>
                                            </View>
                                            <Text style={styles.issueTime}>
                                                {issue.time}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    </>
                ) : (
                    <Text style={styles.emptyText}>{t.common.noData}</Text>
                )}
            </ScrollView>
        </View>
    );
}
