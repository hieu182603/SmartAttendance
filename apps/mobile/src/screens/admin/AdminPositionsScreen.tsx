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
import { Icon } from '../../components/ui/Icon';
import { AdminService } from '../../services/admin.service';
import { useTheme, Theme } from '../../theme';

type AdminPositionsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AdminPositions'>;

interface AdminPositionsScreenProps {
    navigation: AdminPositionsScreenNavigationProp;
}

interface Position {
    _id: string;
    title: string;
    level: number;
}

export default function AdminPositionsScreen({ navigation }: AdminPositionsScreenProps) {
    const theme = useTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

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
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
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
        <View style={s.card}>
            <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{item.title}</Text>
                <Text style={s.cardSubtitle}>Cấp bậc (Level): {item.level}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity onPress={() => handleEdit(item)} style={s.actionButton}>
                    <Icon name="create-outline" library="ionicons" size={20} color={theme.colors.brand.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={s.actionButton}>
                    <Icon name="trash-outline" library="ionicons" size={20} color={theme.colors.status.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={s.container}>
            {/* Header */}
            <LinearGradient
                colors={[theme.colors.brand.primary, theme.colors.brand.primaryActive] as unknown as readonly [string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.header}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
                            <Icon name="arrow-back-outline" library="ionicons" size={24} color={theme.colors.text.onPrimary} />
                        </TouchableOpacity>
                        <Text style={s.headerTitle}>Quản lý Chức vụ</Text>
                    </View>
                    <TouchableOpacity onPress={handleAdd} style={s.addButton}>
                        <Icon name="add-outline" library="ionicons" size={24} color={theme.colors.text.onPrimary} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {isLoading && !refreshing && positions.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.colors.brand.primary} />
                </View>
            ) : (
                <FlatList
                    data={positions}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={{ padding: 12 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.brand.primary} />
                    }
                    ListEmptyComponent={
                        <View style={s.emptyContainer}>
                            <Text style={s.emptyText}>Không có dữ liệu</Text>
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
                <View style={s.modalOverlay}>
                    <View style={s.modalContent}>
                        <Text style={s.modalTitle}>
                            {editingPos ? 'Sửa Chức Vụ' : 'Thêm Chức Vụ'}
                        </Text>

                        <Text style={s.label}>Tên chức vụ <Text style={{ color: theme.colors.status.danger }}>*</Text></Text>
                        <TextInput
                            style={s.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Nhập tên chức vụ"
                            placeholderTextColor={theme.colors.text.muted}
                        />

                        <Text style={s.label}>Cấp bậc (Level)</Text>
                        <TextInput
                            style={s.input}
                            value={level}
                            onChangeText={setLevel}
                            placeholder="Nhập cấp bậc (số 1-10)"
                            placeholderTextColor={theme.colors.text.muted}
                            keyboardType="numeric"
                        />

                        <View style={s.modalActions}>
                            <TouchableOpacity
                                style={[s.modalButton, s.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={s.cancelButtonText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.modalButton, { backgroundColor: theme.colors.brand.primary }]}
                                onPress={handleSave}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={theme.colors.text.onPrimary} size="small" />
                                ) : (
                                    <Text style={{ color: theme.colors.text.onPrimary, fontWeight: 'bold' }}>Lưu</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
            paddingBottom: 20,
            paddingHorizontal: 12,
        },
        headerTitle: {
            color: t.colors.text.onPrimary,
            fontSize: 20,
            fontWeight: 'bold',
            marginLeft: 8,
        },
        addButton: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: 4,
            borderRadius: 999,
        },
        card: {
            backgroundColor: t.colors.background.surface,
            borderRadius: 12,
            padding: 12,
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
        cardTitle: {
            color: t.colors.text.primary,
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 4,
        },
        cardSubtitle: {
            color: t.colors.text.secondary,
            fontSize: 12,
        },
        actionButton: {
            padding: 8,
            marginLeft: 4,
        },
        emptyContainer: {
            padding: 20,
            alignItems: 'center',
        },
        emptyText: {
            color: t.colors.text.secondary,
        },
        modalOverlay: {
            flex: 1,
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: 16,
        },
        modalContent: {
            backgroundColor: t.colors.background.surface,
            borderRadius: 12,
            padding: 20,
            borderWidth: 1,
            borderColor: t.colors.border.default,
        },
        modalTitle: {
            color: t.colors.text.primary,
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: 16,
            textAlign: 'center',
        },
        label: {
            color: t.colors.text.secondary,
            marginBottom: 4,
            marginTop: 12,
        },
        input: {
            backgroundColor: t.colors.background.base,
            borderRadius: 8,
            padding: 12,
            color: t.colors.text.primary,
            borderWidth: 1,
            borderColor: t.colors.border.default,
        },
        modalActions: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginTop: 20,
        },
        modalButton: {
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            marginLeft: 12,
            minWidth: 80,
            alignItems: 'center',
            justifyContent: 'center',
        },
        cancelButton: {
            backgroundColor: t.colors.background.base,
            borderWidth: 1,
            borderColor: t.colors.border.default,
        },
        cancelButtonText: {
            color: t.colors.text.primary,
        },
    });
}
