import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { globalStyles, COLORS, SPACING } from '../../utils/styles';
import { Icon } from '../../components/ui/Icon';
import { AttendanceService } from '../../services/attendance.service';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Attendance'>; route: any };

export default function AttendanceScreen({ navigation, route }: Props) {
  const mode: 'check-in' | 'check-out' = route.params?.mode ?? 'check-in';
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Oval breathe animation
  const breatheAnim = useRef(new Animated.Value(1)).current;
  // Scan line animation
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1.03, duration: 1250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 1, duration: 1250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(200),
        Animated.timing(scanAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationStatus('error'); return; }
      const hasGps = await Location.hasServicesEnabledAsync();
      if (!hasGps) { setLocationStatus('error'); return; }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation(loc);
        setLocationStatus('ok');
      } catch {
        setLocationStatus('error');
      }
    })();
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current || locationStatus !== 'ok' || !location) {
      Alert.alert('Lỗi', 'Đang lấy vị trí. Vui lòng thử lại.');
      return;
    }
    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: false });

      const data = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? 0,
        photo,
        earlyCheckoutReason: mode === 'check-out' ? route.params?.reason : undefined,
      };

      if (mode === 'check-out') {
        await AttendanceService.checkOut(data);
      } else {
        await AttendanceService.checkIn(data);
      }

      Alert.alert('Thành công', `${mode === 'check-in' ? 'Check-in' : 'Check-out'} thành công!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.error ?? err?.response?.data?.message ?? 'Có lỗi xảy ra khi chấm công.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!permission) return <View style={globalStyles.container} />;

  if (!permission.granted) {
    return (
      <View style={[globalStyles.container, s.center]}>
        <Text style={s.permText}>Cần quyền truy cập camera để chấm công khuôn mặt.</Text>
        <TouchableOpacity style={globalStyles.primaryButton} onPress={requestPermission}>
          <Text style={globalStyles.primaryButtonText}>Cấp quyền Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const scanTranslate = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 254] });

  return (
    <View style={s.root}>
      {/* Status bar area — dark */}
      <View style={s.statusBarSpacer} />

      {/* Camera full area */}
      <View style={s.camera}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

        {/* GPS chip */}
        <View style={s.gpsChip}>
          <View style={[s.gpsDot, locationStatus === 'ok' && s.gpsDotGreen, locationStatus === 'error' && s.gpsDotRed]} />
          <Text style={s.gpsText}>
            {locationStatus === 'loading' ? 'Đang lấy vị trí...' : locationStatus === 'error' ? 'Không có GPS' : 'GPS · Hợp lệ'}
          </Text>
        </View>

        {/* Scan target */}
        <View style={s.scanTarget}>
          {/* Oval */}
          <Animated.View style={[s.faceOval, { transform: [{ scale: breatheAnim }] }]} />

          {/* Corner brackets */}
          <View style={[s.bracket, s.bracketTL]} />
          <View style={[s.bracket, s.bracketTR]} />
          <View style={[s.bracket, s.bracketBL]} />
          <View style={[s.bracket, s.bracketBR]} />

          {/* Scan line */}
          <Animated.View style={[s.scanLine, { transform: [{ translateY: scanTranslate }] }]} />
        </View>

        {/* Instructions */}
        <View style={s.instructions}>
          <Text style={s.instructionsText}>Nhìn thẳng vào camera và giữ yên để nhận diện</Text>
        </View>
      </View>

      {/* Bottom panel */}
      <View style={s.panel}>
        {/* Status row */}
        <View style={s.statusRow}>
          <View style={s.statusItem}>
            <Text style={s.statusLabel}>Vị trí</Text>
            <Text style={[s.statusVal, locationStatus === 'ok' && s.statusValGreen]}>
              {locationStatus === 'ok' ? '✓ Hợp lệ' : locationStatus === 'error' ? '✗ Lỗi' : '...'}
            </Text>
          </View>
          <View style={s.statusItem}>
            <Text style={s.statusLabel}>Ca làm việc</Text>
            <Text style={[s.statusVal, s.statusValBlue]}>08–17h</Text>
          </View>
          <View style={s.statusItem}>
            <Text style={s.statusLabel}>Trạng thái</Text>
            <Text style={s.statusVal}>{mode === 'check-in' ? 'Chưa vào' : 'Đang làm'}</Text>
          </View>
        </View>

        {/* Check-in button */}
        <TouchableOpacity
          style={[s.checkinBtn, (isProcessing || locationStatus !== 'ok') && s.checkinBtnDisabled]}
          onPress={handleCapture}
          disabled={isProcessing || locationStatus !== 'ok'}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={mode === 'check-out' ? ['#ef4444', '#dc2626'] : ['#4F6EF7', '#3a52dd']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.checkinBtnGradient}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name={mode === 'check-in' ? 'log-in-outline' : 'log-out-outline'} size={22} color="#fff" library="ionicons" />
                <Text style={s.checkinBtnText}>{mode === 'check-in' ? 'Check-in ngay' : 'Check-out khi kết thúc'}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={s.hint}>
          {mode === 'check-in' ? 'Đã vào ca? ' : 'Chưa check-in? '}
          <Text style={s.hintLink} onPress={() => navigation.goBack()}>Quay lại</Text>
        </Text>
      </View>

      {/* Top bar: close + flip */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} activeOpacity={0.7}>
          <Icon name="cameraswitch" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const OVAL_W = 216;
const OVAL_H = 270;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0f1e' },
  center: { justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  permText: { color: '#fff', textAlign: 'center', marginBottom: 20, fontSize: 14 },
  statusBarSpacer: { height: 44 },

  // Camera
  camera: { flex: 1, backgroundColor: '#0d0f1e', position: 'relative', alignItems: 'center', justifyContent: 'center' },

  // GPS chip
  gpsChip: {
    position: 'absolute', top: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 9999, paddingVertical: 6, paddingHorizontal: 14,
    zIndex: 10,
  },
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9ca3af' },
  gpsDotGreen: { backgroundColor: '#4ade80' },
  gpsDotRed: { backgroundColor: '#ef4444' },
  gpsText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  // Scan target
  scanTarget: {
    width: 288, height: 308,
    position: 'absolute', top: '50%', marginTop: -154,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },

  // Oval
  faceOval: {
    position: 'absolute',
    width: OVAL_W, height: OVAL_H,
    borderRadius: OVAL_W / 2,
    borderWidth: 2, borderColor: 'rgba(79,110,247,0.6)',
    backgroundColor: 'transparent',
  },

  // Corner brackets
  bracket: {
    position: 'absolute',
    width: 28, height: 28,
    borderColor: '#4F6EF7', borderStyle: 'solid',
  },
  bracketTL: { top: 0, left: 16, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  bracketTR: { top: 0, right: 16, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  bracketBL: { bottom: 0, left: 16, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  bracketBR: { bottom: 0, right: 16, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },

  // Scan line
  scanLine: {
    position: 'absolute',
    top: 0, left: 24, right: 24,
    height: 2,
    backgroundColor: 'transparent',
    shadowColor: '#4F6EF7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4, elevation: 0,
    // gradient via background
    borderRadius: 1,
    // fake gradient with tint
    opacity: 0.85,
    borderTopWidth: 2, borderTopColor: '#4F6EF7',
  },

  // Instructions
  instructions: {
    position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center',
  },
  instructionsText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', paddingHorizontal: 32 },

  // Top bar
  topBar: {
    position: 'absolute', top: 44, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, zIndex: 20,
  },
  iconBtn: {
    padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20,
  },

  // Bottom panel
  panel: {
    backgroundColor: '#f3f4f8',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 20,
    paddingBottom: 32,
    flexShrink: 0,
  },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statusItem: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  statusLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '500', marginBottom: 4 },
  statusVal: { fontSize: 14, fontWeight: '700', color: '#191c1e' },
  statusValGreen: { color: '#16a34a' },
  statusValBlue: { color: '#4F6EF7' },

  checkinBtn: {
    borderRadius: 9999, overflow: 'hidden',
    shadowColor: '#4F6EF7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 6,
    marginBottom: 12,
  },
  checkinBtnDisabled: { opacity: 0.6 },
  checkinBtnGradient: {
    height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  checkinBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  hint: { textAlign: 'center', fontSize: 12, color: '#9ca3af' },
  hintLink: { color: '#4F6EF7', fontWeight: '600' },
});
