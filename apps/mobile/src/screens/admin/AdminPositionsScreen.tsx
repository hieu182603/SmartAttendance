import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    StyleSheet,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SPACING, BORDER_RADIUS, SHADOWS } from '../../utils/styles';
import { Icon } from '../../components/ui/Icon';
import { AdminService } from '../../services/admin.service';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';
import { ThemeColors } from '../../theme/colors';

type AdminPositionsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AdminPositions'>;

interface AdminPositionsScreenProps {
    navigation: AdminPositionsScreenNavigationProp;
}

interface Position {
    _id: string;
    title: string;
    level: number;
}

function makeStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            paddingTop: SPACING.xxl * 1.5,
            paddingBottom: SPACING.xl,
            paddingHorizontal: SPACING.md,
        },
        headerTitle: {
            color: '#ffffff',
            fontSize: 20,
            fontWeight: 'bold',
            marginLeft: SPACING.sm,
        },
        addButton: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: SPACING.xs,
            borderRadius: BORDER_RADIUS.full,
        },
        card: {
            backgroundColor: colors.card,
            borderRadius: BORDER_RADIUS.lg,
            padding: SPACING.md,
            marginBottom: SPACING.md,
            flexDirection: 'row',
            alignItems: 'center',
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
        cardSubtitle: {
            color: colors.textSecondary,
            fontSize: 12,
        },
        actionButton: {
            padding: SPACING.sm,
            marginLeft: SPACING.xs,
        },
        emptyContainer: {
            padding: SPACING.xl,
            alignItems: 'center',
        },
        emptyText: {
            color: colors.textSecondary,
        },
        modalOverlay: {
            flex: 1,
            justifyContent: 'center',
            backgroundColor: colors.overlay,
            padding: SPACING.lg,
        },
        modalContent: {
            backgroundColor: colors.card,
            borderRadius: BORDER_RADIUS.lg,
            padding: SPACING.xl,
            borderWidth: 1,
            borderColor: colors.border,
        },
        modalTitle: {
            color: colors.textPrimary,
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: SPACING.lg,
            textAlign: 'center',
        },
        label: {
            color: colors.textSecondary,
            marginBottom: SPACING.xs,
            marginTop: SPACING.md,
        },
        input: {
            backgroundColor: colors.inputBg,
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.md,
            color: colors.inputText,
            borderWidth: 1,
            borderColor: colors.inputBorder,
        },
        modalActions: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginTop: SPACING.xl,
        },
        modalButton: {
            paddingVertical: SPACING.md,
            paddingHorizontal: SPACING.lg,
            borderRadius: BORDER_RADIUS.md,
            marginLeft: SPACING.md,
            minWidth: 80,
            alignItems: 'center',
            justifyContent: 'center',
        },
        cancelButton: {
            backgroundColor: colors.cardAlt,
            borderWidth: 1,
            borderColor: colors.border,
        },
        cancelButtonText: {
            color: colors.textPrimary,
        },
    });
}

export default function AdminPositionsScreen({ navigation }: AdminPositionsScreenProps) {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    const [positions, setPositions] = useState<Position[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingPos, setEditingPos] = useState<Position | null>(null);

    const [title, setTitle] = useState('');
    const [level, setLevel] = useState('');

    useEffect(() => {
        loadPositions();
    }, []);

    const loadPositions = async () => {
        try {
            setIsLoading(true);
            const data = await AdminService.getPositions();
            setPositions(data || []);
        } catch (error) {
            console.error('Error loading positions', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách chức vụ');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadPositions();
    };

    const handleEdit = (pos: Position) => {
        setEditingPos(pos);
        setTitle(pos.title);
        setLevel(String(pos.level));
        setModalVisible(true);
    };

    const handleAdd = () => {
        setEditingPos(null);
        setTitle('');
        setLevel('');
        setModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Xóa chức vụ',
            'Bạn có chắc chắn muốn xóa chức vụ này?',
            [
                { text: t.common.cancel, style: 'cancel' },
                {
                    text: t.common.delete,
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsLoading(true);
                            await AdminService.deletePosition(id);
                            loadPositions();
                        } catch (error: any) {
                            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa chức vụ');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                },
            ]
        );
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Lỗi', 'Tên chức vụ không được để trống');
            return;
        }

        try {
            setIsLoading(true);
            const data = {
                title: title.trim(),
                level: parseInt(level) || 0
            };

            if (editingPos) {
                await AdminService.updatePosition(editingPos._id, data);
            } else {
                await AdminService.createPosition(data);
            }

            setModalVisible(false);
            loadPositions();
        } catch (error: any) {
            console.error('Error saving position', error);
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lưu chức vụ');
        } finally {
            setIsLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Position }) => (
        <View style={styles.card}>
            <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>Cấp bậc (Level): {item.level}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
                    <Icon name="edit" size={20} color="#4F6EF7" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionButton}>
                    <Icon name="delete" size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={['#4F6EF7', '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: SPACING.xs }}>
                            <Icon name="arrow_back" size={24} color="#ffffff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Quản lý Chức vụ</Text>
                    </View>
                    <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
                        <Icon name="add" size={24} color="#ffffff" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {isLoading && !refreshing && positions.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#4F6EF7" />
                </View>
            ) : (
                <FlatList
                    data={positions}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={{ padding: SPACING.md }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F6EF7" />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>{t.common.noData}</Text>
                        </View>
                    }
                />
            )}

            {/* Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingPos ? 'Sửa Chức Vụ' : 'Thêm Chức Vụ'}
                        </Text>

                        <Text style={styles.label}>Tên chức vụ <Text style={{ color: '#ef4444' }}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Nhập tên chức vụ"
                            placeholderTextColor={colors.inputPlaceholder}
                        />

                        <Text style={styles.label}>Cấp bậc (Level)</Text>
                        <TextInput
                            style={styles.input}
                            value={level}
                            onChangeText={setLevel}
                            placeholder="Nhập cấp bậc (số 1-10)"
                            placeholderTextColor={colors.inputPlaceholder}
                            keyboardType="numeric"
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>{t.common.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#4F6EF7' }]}
                                onPress={handleSave}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t.common.save}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
