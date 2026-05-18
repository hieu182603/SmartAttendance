import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { globalStyles, COLORS, SPACING, BORDER_RADIUS } from '../../utils/styles';
import { Icon } from '../../components/ui/Icon';
import { AttendanceService } from '../../services/attendance.service';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';
import { ThemeColors } from '../../theme/colors';

type AttendanceScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AttendanceHistory'>; // Using generic or existing type

interface AttendanceScreenProps {
    navigation: AttendanceScreenNavigationProp;
    route: any; // To get params like "mode" (check-in/check-out)
}

const { width } = Dimensions.get('window');

function makeStyles(colors: ThemeColors) {
    return StyleSheet.create({
        center: {
            justifyContent: 'center',
            alignItems: 'center',
            padding: SPACING.lg,
        },
        cameraContainer: {
            flex: 1,
            position: 'relative',
        },
        camera: {
            flex: 1,
        },
        iconButton: {
            padding: 8,
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 20,
        },
        faceGuideContainer: {
            ...StyleSheet.absoluteFillObject,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 5,
            paddingBottom: 200, // Offset for footer
        },
        faceGuideBox: {
            width: width * 0.7,
            height: width * 0.7 * 1.3, // Aspect ratio roughly 3:4
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: 24,
            backgroundColor: 'transparent',
        },
        faceGuideText: {
            position: 'absolute',
            top: -40,
            color: '#fff',
            fontSize: 16,
            fontWeight: '600',
            backgroundColor: 'rgba(0,0,0,0.6)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            overflow: 'hidden',
        },
        footer: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: SPACING.xxl,
            paddingTop: SPACING.xl,
            backgroundColor: '#000',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            alignItems: 'center',
            zIndex: 20,
        },
        locationInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: SPACING.lg,
            backgroundColor: 'rgba(255,255,255,0.1)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
        },
        locationText: {
            color: '#fff',
            marginLeft: 8,
            fontSize: 14,
        },
        captureButton: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: 6,
            marginBottom: SPACING.sm,
        },
        captureInner: {
            flex: 1,
            borderRadius: 40,
            backgroundColor: COLORS.primary,
            justifyContent: 'center',
            alignItems: 'center',
        },
        actionText: {
            color: '#fff',
            fontSize: 14,
            fontWeight: '500',
        },
        actionTextOverlay: {
            position: 'absolute',
            bottom: -25,
            textAlign: 'center',
            width: 100,
            color: '#fff',
            fontSize: 14,
            fontWeight: '500',
            alignSelf: 'center',
        },
        permissionText: {
            color: colors.textPrimary,
            marginBottom: 20,
            textAlign: 'center',
        },
    });
}

export default function AttendanceScreen({ navigation, route }: AttendanceScreenProps) {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    const mode = route.params?.mode || 'check-in'; // 'check-in' | 'check-out'
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState<CameraType>('front');
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<any>(null);

    const cameraRef = useRef<CameraView>(null);

    useEffect(() => {
        (async () => {
            // Request Location Permissions
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError('Mất quyền truy cập vị trí');
                Alert.alert('Lỗi', 'Cần quyền truy cập vị trí để chấm công.');
                return;
            }

            try {
                // Check if hardware GPS is actually on
                const hasServicesEnabled = await Location.hasServicesEnabledAsync();
                if (!hasServicesEnabled) {
                    setLocationError('Vui lòng bật GPS trên thiết bị');
                    Alert.alert('Lỗi GPS', 'Dịch vụ định vị (GPS) đang tắt. Vui lòng bật Location/GPS trong cài đặt thiết bị để tiếp tục.', [{ text: 'OK' }]);
                    return;
                }

                let loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                setLocation(loc);
            } catch (error) {
                setLocationError('Không thể lấy vị trí');
                Alert.alert('Lỗi', 'Không thể lấy vị trí hiện tại. Vui lòng kiểm tra GPS.');
            }
        })();
    }, []);

    if (!permission) {
        return <View style={globalStyles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={[globalStyles.container, styles.center]}>
                <Text style={styles.permissionText}>
                    Cần quyền truy cập camera để chấm công khuôn mặt.
                </Text>
                <TouchableOpacity style={globalStyles.primaryButton} onPress={requestPermission}>
                    <Text style={globalStyles.primaryButtonText}>Cấp quyền Camera</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleCapturePreview = async () => {
        if (!cameraRef.current || !location) {
            Alert.alert('Lỗi', 'Đang lấy dữ liệu vị trí hoặc camera chưa sẵn sàng.');
            return;
        }

        try {
            setIsProcessing(true);
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.5,
                base64: false,
            });
            setCapturedImage(photo);
        } catch (error) {
            console.error('Capture error:', error);
            Alert.alert('Lỗi', 'Không thể chụp ảnh.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmSubmit = async () => {
        if (!capturedImage || !location) return;

        try {
            setIsProcessing(true);

            const attendanceData = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy || 0,
                photo: capturedImage,
                earlyCheckoutReason: mode === 'check-out' ? route.params?.reason : undefined,
            };

            if (mode === 'check-out') {
                await AttendanceService.checkOut(attendanceData);
                Alert.alert(t.common.success, 'Check-out thành công!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                await AttendanceService.checkIn(attendanceData);
                Alert.alert(t.common.success, 'Check-in thành công!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }

        } catch (error: any) {
            console.error('Attendance submit error:', error);
            Alert.alert(t.common.error, error.response?.data?.error || error.response?.data?.message || 'Có lỗi xảy ra khi chấm công.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRetake = () => {
        setCapturedImage(null);
    };

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    return (
        <View style={globalStyles.container}>
            {/* Header */}
            <LinearGradient
                colors={['rgba(0,0,0,0.8)', 'transparent']}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    paddingTop: SPACING.xxl,
                    paddingHorizontal: SPACING.md,
                    paddingBottom: SPACING.xl,
                    zIndex: 10,
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Icon name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={globalStyles.heading3}>
                        {mode === 'check-in' ? t.dashboard.checkin : t.dashboard.checkout}
                    </Text>
                    <TouchableOpacity onPress={toggleCameraFacing} style={styles.iconButton}>
                        <Icon name="cameraswitch" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Camera View */}
            <View style={styles.cameraContainer}>
                {capturedImage ? (
                    <Image source={{ uri: capturedImage.uri }} style={styles.camera} />
                ) : (
                    <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing={facing}
                    />
                )}

                {/* Face Guide Overlay */}
                {!capturedImage && (
                    <View style={styles.faceGuideContainer}>
                        <View style={styles.faceGuideBox} />
                        <Text style={styles.faceGuideText}>Đặt khuôn mặt vào khung hình</Text>
                    </View>
                )}
            </View>

            {/* Footer Info & Action */}
            <View style={styles.footer}>
                <View style={styles.locationInfo}>
                    <Icon name="location_on" size={20} color={COLORS.accent.cyan} />
                    <Text style={styles.locationText} numberOfLines={1}>
                        {location
                            ? `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`
                            : locationError || 'Đang lấy vị trí...'}
                    </Text>
                </View>

                {capturedImage ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '80%', paddingHorizontal: SPACING.md }}>
                        {/* Retake Button */}
                        <TouchableOpacity
                            onPress={handleRetake}
                            disabled={isProcessing}
                            style={[
                                styles.captureButton,
                                { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
                                isProcessing && { opacity: 0.7 }
                            ]}
                        >
                            <View style={[styles.captureInner, { backgroundColor: COLORS.accent.red }]}>
                                <Icon name="refresh" size={32} color="#fff" />
                            </View>
                            <Text style={styles.actionTextOverlay}>Chụp lại</Text>
                        </TouchableOpacity>

                        {/* Confirm Button */}
                        <TouchableOpacity
                            onPress={handleConfirmSubmit}
                            disabled={isProcessing}
                            style={[
                                styles.captureButton,
                                { backgroundColor: 'rgba(34, 197, 94, 0.2)' },
                                isProcessing && { opacity: 0.7 }
                            ]}
                        >
                            <View style={[styles.captureInner, { backgroundColor: COLORS.accent.green }]}>
                                {isProcessing ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Icon name="check" size={32} color="#fff" />
                                )}
                            </View>
                            <Text style={styles.actionTextOverlay}>{t.common.confirm}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={{ alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={handleCapturePreview}
                            disabled={isProcessing || !location}
                            style={[
                                styles.captureButton,
                                (isProcessing || !location) && { opacity: 0.7 }
                            ]}
                        >
                            {isProcessing ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <View style={styles.captureInner}>
                                    <Icon name={mode === 'check-in' ? "face" : "logout"} size={32} color="#fff" />
                                </View>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.actionText}>
                            {isProcessing ? t.common.loading : `Nhấn để ${mode === 'check-in' ? t.attendance.checkIn : t.attendance.checkOut}`}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}
