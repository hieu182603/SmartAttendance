import React, { useState, useMemo } from 'react';
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
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SPACING, BORDER_RADIUS, SHADOWS } from '../../utils/styles';
import { Icon } from '../../components/ui/Icon';
import {
    useDepartments,
    useManagers,
    useBranches,
    useCreateDepartment,
    useUpdateDepartment,
    useDeleteDepartment,
} from '../../hooks/useAdminQueries';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';
import { ThemeColors } from '../../theme/colors';

type AdminDepartmentsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AdminDepartments'>;

interface AdminDepartmentsScreenProps {
    navigation: AdminDepartmentsScreenNavigationProp;
}

interface Department {
    _id: string;
    name: string;
    code: string;
    description: string;
    managerId?: { _id: string, name: string };
    branchId?: { _id: string, name: string };
}

interface User {
    _id: string;
    name: string;
}

interface Branch {
    _id: string;
    name: string;
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
        cardMeta: {
            color: colors.textSecondary,
            fontSize: 12,
            marginLeft: SPACING.xs,
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
            maxHeight: '80%',
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
        selectButton: {
            backgroundColor: colors.inputBg,
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.md,
            borderWidth: 1,
            borderColor: colors.inputBorder,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        selectButtonText: {
            color: colors.inputPlaceholder,
        },
        selectButtonTextSelected: {
            color: colors.inputText,
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
        },
        cancelButton: {
            backgroundColor: colors.cardAlt,
            borderWidth: 1,
            borderColor: colors.border,
        },
        cancelButtonText: {
            color: colors.textPrimary,
        },
        pickerItem: {
            padding: SPACING.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        pickerItemText: {
            color: colors.textPrimary,
        },
        codeText: {
            color: '#4F6EF7',
            fontWeight: 'bold',
        },
    });
}

export default function AdminDepartmentsScreen({ navigation }: AdminDepartmentsScreenProps) {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    const [modalVisible, setModalVisible] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [selectedManagerId, setSelectedManagerId] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState('');

    const [showManagerPicker, setShowManagerPicker] = useState(false);
    const [showBranchPicker, setShowBranchPicker] = useState(false);

    const { data: departments = [], isLoading, refetch } = useDepartments();
    const { data: managers = [] } = useManagers();
    const { data: branches = [] } = useBranches();
    const createDepartment = useCreateDepartment();
    const updateDepartment = useUpdateDepartment();
    const deleteDepartment = useDeleteDepartment();

    const handleEdit = (dept: Department) => {
        setEditingDept(dept);
        setName(dept.name);
        setCode(dept.code);
        setDescription(dept.description);
        setSelectedManagerId(dept.managerId?._id || '');
        setSelectedBranchId(dept.branchId?._id || '');
        setModalVisible(true);
    };

    const handleAdd = () => {
        setEditingDept(null);
        setName('');
        setCode('');
        setDescription('');
        setSelectedManagerId('');
        setSelectedBranchId('');
        setModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Xóa phòng ban',
            'Bạn có chắc chắn muốn xóa phòng ban này?',
            [
                { text: t.common.cancel, style: 'cancel' },
                {
                    text: t.common.delete,
                    style: 'destructive',
                    onPress: () => {
                        deleteDepartment.mutate(id, {
                            onError: () => {
                                Alert.alert('Error', 'Failed to delete department. It might contain employees.');
                            },
                        });
                    }
                },
            ]
        );
    };

    const handleSave = async () => {
        if (!name.trim() || !code.trim()) {
            Alert.alert('Error', 'Tên và Mã phòng ban là bắt buộc');
            return;
        }
        if (!selectedBranchId) {
            Alert.alert('Error', 'Vui lòng chọn chi nhánh');
            return;
        }

        const data = {
            name,
            code,
            description,
            managerId: selectedManagerId || undefined,
            branchId: selectedBranchId
        };

        const onSuccess = () => { setModalVisible(false); };
        const onError = (error: any) => {
            console.error(error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to save department');
        };

        if (editingDept) {
            updateDepartment.mutate({ id: editingDept._id, data }, { onSuccess, onError });
        } else {
            createDepartment.mutate(data, { onSuccess, onError });
        }
    };

    const getManagerName = (id: string) => (managers as User[]).find((m: User) => m._id === id)?.name || 'Chọn Trưởng phòng';
    const getBranchName = (id: string) => (branches as Branch[]).find((b: Branch) => b._id === id)?.name || 'Chọn Chi nhánh';

    const renderItem = ({ item }: { item: Department }) => (
        <View style={styles.card}>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.codeText}>{item.code}</Text>
                </View>
                <Text style={styles.cardSubtitle}>{item.description}</Text>
                <View style={{ marginTop: SPACING.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="person" size={14} color={colors.textSecondary} />
                        <Text style={styles.cardMeta}>
                            Trưởng phòng: {item.managerId?.name || 'Chưa có'}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Icon name="business" size={14} color={colors.textSecondary} />
                        <Text style={styles.cardMeta}>
                            Chi nhánh: {item.branchId?.name || 'N/A'}
                        </Text>
                    </View>
                </View>
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
                        <Text style={styles.headerTitle}>{t.admin.dashboard.departments}</Text>
                    </View>
                    <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
                        <Icon name="add" size={24} color="#ffffff" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <FlatList
                data={departments}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                contentContainerStyle={{ padding: SPACING.md }}
                refreshing={isLoading}
                onRefresh={() => refetch()}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>{t.common.noData}</Text>
                    </View>
                }
            />

            {/* Main Edit Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView>
                            <Text style={styles.modalTitle}>
                                {editingDept ? 'Sửa Phòng Ban' : 'Thêm Phòng Ban'}
                            </Text>

                            <Text style={styles.label}>Tên phòng ban <Text style={{ color: '#ef4444' }}>*</Text></Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Nhập tên phòng ban"
                                placeholderTextColor={colors.inputPlaceholder}
                            />

                            <Text style={styles.label}>Mã phòng ban <Text style={{ color: '#ef4444' }}>*</Text></Text>
                            <TextInput
                                style={styles.input}
                                value={code}
                                onChangeText={setCode}
                                placeholder="VD: IT, HR, MK"
                                placeholderTextColor={colors.inputPlaceholder}
                                autoCapitalize="characters"
                            />

                            <Text style={styles.label}>Mô tả</Text>
                            <TextInput
                                style={styles.input}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Nhập mô tả"
                                placeholderTextColor={colors.inputPlaceholder}
                            />

                            <Text style={styles.label}>Chi nhánh <Text style={{ color: '#ef4444' }}>*</Text></Text>
                            <TouchableOpacity
                                style={styles.selectButton}
                                onPress={() => setShowBranchPicker(true)}
                            >
                                <Text style={selectedBranchId ? styles.selectButtonTextSelected : styles.selectButtonText}>
                                    {getBranchName(selectedBranchId)}
                                </Text>
                                <Icon name="arrow_drop_down" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>

                            <Text style={styles.label}>Trưởng phòng</Text>
                            <TouchableOpacity
                                style={styles.selectButton}
                                onPress={() => setShowManagerPicker(true)}
                            >
                                <Text style={selectedManagerId ? styles.selectButtonTextSelected : styles.selectButtonText}>
                                    {getManagerName(selectedManagerId)}
                                </Text>
                                <Icon name="arrow_drop_down" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>

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
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t.common.save}</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Selection Picker Modal */}
            <Modal
                transparent={true}
                visible={showManagerPicker || showBranchPicker}
                animationType="fade"
                onRequestClose={() => {
                    setShowManagerPicker(false);
                    setShowBranchPicker(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {showManagerPicker ? 'Chọn Trưởng phòng' : 'Chọn Chi nhánh'}
                        </Text>
                        <FlatList
                            data={showManagerPicker ? managers : branches}
                            keyExtractor={item => item._id}
                            style={{ maxHeight: 300 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.pickerItem}
                                    onPress={() => {
                                        if (showManagerPicker) setSelectedManagerId(item._id);
                                        else setSelectedBranchId(item._id);
                                        setShowManagerPicker(false);
                                        setShowBranchPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerItemText}>{item.name}</Text>
                                    {(showManagerPicker ? selectedManagerId : selectedBranchId) === item._id && (
                                        <Icon name="check" size={20} color="#16a34a" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton, { marginTop: SPACING.md, alignSelf: 'center' }]}
                            onPress={() => {
                                setShowManagerPicker(false);
                                setShowBranchPicker(false);
                            }}
                        >
                            <Text style={styles.cancelButtonText}>{t.common.close}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
