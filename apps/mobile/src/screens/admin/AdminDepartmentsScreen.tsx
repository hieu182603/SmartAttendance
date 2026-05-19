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
import { Icon } from '../../components/ui/Icon';
import {
    useDepartments,
    useManagers,
    useBranches,
    useCreateDepartment,
    useUpdateDepartment,
    useDeleteDepartment,
} from '../../hooks/useAdminQueries';
import { useTheme, Theme } from '../../theme';

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

export default function AdminDepartmentsScreen({ navigation }: AdminDepartmentsScreenProps) {
    const theme = useTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

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
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
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
        <View style={s.card}>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={s.cardTitle}>{item.name}</Text>
                    <Text style={s.codeText}>{item.code}</Text>
                </View>
                <Text style={s.cardSubtitle}>{item.description}</Text>
                <View style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="person-outline" size={14} color={theme.colors.text.secondary} library="ionicons" />
                        <Text style={s.cardMeta}>
                            Trưởng phòng: {item.managerId?.name || 'Chưa có'}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Icon name="business-outline" size={14} color={theme.colors.text.secondary} library="ionicons" />
                        <Text style={s.cardMeta}>
                            Chi nhánh: {item.branchId?.name || 'N/A'}
                        </Text>
                    </View>
                </View>
            </View>
            <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity onPress={() => handleEdit(item)} style={s.actionButton}>
                    <Icon name="create-outline" size={20} color={theme.colors.brand.primary} library="ionicons" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={s.actionButton}>
                    <Icon name="trash-outline" size={20} color={theme.colors.status.danger} library="ionicons" />
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
                            <Icon name="arrow-back-outline" size={24} color={theme.colors.text.onPrimary} library="ionicons" />
                        </TouchableOpacity>
                        <Text style={s.headerTitle}>Phòng ban</Text>
                    </View>
                    <TouchableOpacity onPress={handleAdd} style={s.addButton}>
                        <Icon name="add-outline" size={24} color={theme.colors.text.onPrimary} library="ionicons" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <FlatList
                data={departments}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                contentContainerStyle={{ padding: 12 }}
                refreshing={isLoading}
                onRefresh={() => refetch()}
                ListEmptyComponent={
                    <View style={s.emptyContainer}>
                        <Text style={s.emptyText}>Không có dữ liệu</Text>
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
                <View style={s.modalOverlay}>
                    <View style={s.modalContent}>
                        <ScrollView>
                            <Text style={s.modalTitle}>
                                {editingDept ? 'Sửa Phòng Ban' : 'Thêm Phòng Ban'}
                            </Text>

                            <Text style={s.label}>Tên phòng ban <Text style={{ color: theme.colors.status.danger }}>*</Text></Text>
                            <TextInput
                                style={s.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Nhập tên phòng ban"
                                placeholderTextColor={theme.colors.text.muted}
                            />

                            <Text style={s.label}>Mã phòng ban <Text style={{ color: theme.colors.status.danger }}>*</Text></Text>
                            <TextInput
                                style={s.input}
                                value={code}
                                onChangeText={setCode}
                                placeholder="VD: IT, HR, MK"
                                placeholderTextColor={theme.colors.text.muted}
                                autoCapitalize="characters"
                            />

                            <Text style={s.label}>Mô tả</Text>
                            <TextInput
                                style={s.input}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Nhập mô tả"
                                placeholderTextColor={theme.colors.text.muted}
                            />

                            <Text style={s.label}>Chi nhánh <Text style={{ color: theme.colors.status.danger }}>*</Text></Text>
                            <TouchableOpacity
                                style={s.selectButton}
                                onPress={() => setShowBranchPicker(true)}
                            >
                                <Text style={selectedBranchId ? s.selectButtonTextSelected : s.selectButtonText}>
                                    {getBranchName(selectedBranchId)}
                                </Text>
                                <Icon name="chevron-down-outline" size={24} color={theme.colors.text.secondary} library="ionicons" />
                            </TouchableOpacity>

                            <Text style={s.label}>Trưởng phòng</Text>
                            <TouchableOpacity
                                style={s.selectButton}
                                onPress={() => setShowManagerPicker(true)}
                            >
                                <Text style={selectedManagerId ? s.selectButtonTextSelected : s.selectButtonText}>
                                    {getManagerName(selectedManagerId)}
                                </Text>
                                <Icon name="chevron-down-outline" size={24} color={theme.colors.text.secondary} library="ionicons" />
                            </TouchableOpacity>

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
                                >
                                    <Text style={{ color: theme.colors.text.onPrimary, fontWeight: 'bold' }}>Lưu</Text>
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
                <View style={s.modalOverlay}>
                    <View style={s.modalContent}>
                        <Text style={s.modalTitle}>
                            {showManagerPicker ? 'Chọn Trưởng phòng' : 'Chọn Chi nhánh'}
                        </Text>
                        <FlatList
                            data={showManagerPicker ? managers : branches}
                            keyExtractor={item => item._id}
                            style={{ maxHeight: 300 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={s.pickerItem}
                                    onPress={() => {
                                        if (showManagerPicker) setSelectedManagerId(item._id);
                                        else setSelectedBranchId(item._id);
                                        setShowManagerPicker(false);
                                        setShowBranchPicker(false);
                                    }}
                                >
                                    <Text style={s.pickerItemText}>{item.name}</Text>
                                    {(showManagerPicker ? selectedManagerId : selectedBranchId) === item._id && (
                                        <Icon name="checkmark-outline" size={20} color={theme.colors.status.success} library="ionicons" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity
                            style={[s.modalButton, s.cancelButton, { marginTop: 12, alignSelf: 'center' }]}
                            onPress={() => {
                                setShowManagerPicker(false);
                                setShowBranchPicker(false);
                            }}
                        >
                            <Text style={s.cancelButtonText}>Đóng</Text>
                        </TouchableOpacity>
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
            borderRadius: 9999,
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
        cardMeta: {
            color: t.colors.text.secondary,
            fontSize: 12,
            marginLeft: 4,
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
            maxHeight: '80%',
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
        selectButton: {
            backgroundColor: t.colors.background.base,
            borderRadius: 8,
            padding: 12,
            borderWidth: 1,
            borderColor: t.colors.border.default,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        selectButtonText: {
            color: t.colors.text.muted,
        },
        selectButtonTextSelected: {
            color: t.colors.text.primary,
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
        },
        cancelButton: {
            backgroundColor: t.colors.background.base,
            borderWidth: 1,
            borderColor: t.colors.border.default,
        },
        cancelButtonText: {
            color: t.colors.text.primary,
        },
        pickerItem: {
            padding: 12,
            borderBottomWidth: 1,
            borderBottomColor: t.colors.border.default,
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        pickerItemText: {
            color: t.colors.text.primary,
        },
        codeText: {
            color: t.colors.brand.primary,
            fontWeight: 'bold',
        },
    });
}
