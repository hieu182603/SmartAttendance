import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../../components/ui/Icon';
import { useTheme } from '../../theme';
import type { Theme } from '../../theme';

const SCAN_TARGET_W = 240;
const SCAN_TARGET_H = 290;
const BRACKET_SIZE = 28;

export default function FaceRegistrationScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [permission, requestPermission] = useCameraPermissions();
  const [showSuccess, setShowSuccess] = useState(false);
  const activeStep = 1;

  const STEPS = [
    'Hướng dẫn chụp ảnh',
    'Đăng ký khuôn mặt',
    'Xác nhận',
    'Cập nhật khuôn mặt',
  ];

  const scanY = useRef(new Animated.Value(0)).current;
  const ovalScale = useRef(new Animated.Value(1)).current;
  const ovalBorder = useRef(new Animated.Value(0.5)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const dotPulse = useRef(new Animated.Value(0.3)).current;

  // Scan line
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(scanY, {
          toValue: SCAN_TARGET_H - 28,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Oval breathe
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ovalScale, { toValue: 1.03, duration: 1250, useNativeDriver: true }),
          Animated.timing(ovalBorder, { toValue: 0.9, duration: 1250, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ovalScale, { toValue: 1, duration: 1250, useNativeDriver: true }),
          Animated.timing(ovalBorder, { toValue: 0.5, duration: 1250, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  // Active step dot pulse
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const scanLineOpacity = scanY.interpolate({
    inputRange: [0, 26, SCAN_TARGET_H - 54, SCAN_TARGET_H - 28],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp',
  });

  const borderOpacity = ovalBorder;

  const handleCapture = () => {
    setShowSuccess(true);
    Animated.parallel([
      Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(successScale, { toValue: 1, tension: 34, friction: 5, useNativeDriver: true }),
    ]).start();
  };

  const handleFinish = () => {
    setShowSuccess(false);
    successScale.setValue(0);
    successOpacity.setValue(0);
    navigation.goBack();
  };

  if (!permission) return <View style={s.root} />;
  if (!permission.granted) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center', gap: 16 }]}>
        <Icon name="camera-outline" size={48} color={theme.colors.text.disabled} library="ionicons" />
        <Text style={s.permText}>
          Hướng dẫn chụp ảnh
        </Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>Xác nhận</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-outline" size={20} color="#fff" library="ionicons" />
        </TouchableOpacity>
        <Text style={s.topTitle}>Nhận diện khuôn mặt</Text>
      </View>

      {/* Camera area */}
      <View style={s.camArea}>
        <CameraView style={StyleSheet.absoluteFill} facing="front" />

        <View style={s.scanTarget}>
          <View style={s.faceWrap}>
            <Animated.View
              style={[s.faceOval, { transform: [{ scale: ovalScale }], borderColor: 'rgba(79,110,247,0.3)' }]}
            >
              <Animated.View
                style={[StyleSheet.absoluteFill, s.faceOvalOverlay, { opacity: borderOpacity }]}
              />
            </Animated.View>
          </View>

          <View style={s.bracketTL} />
          <View style={s.bracketTR} />
          <View style={s.bracketBL} />
          <View style={s.bracketBR} />

          <Animated.View
            style={[
              s.scanLine,
              { transform: [{ translateY: scanY }], opacity: scanLineOpacity },
            ]}
          />
        </View>

        {/* Step dots */}
        <View style={s.stepDots}>
          {STEPS.map((_, i) => {
            const isDone = i < activeStep;
            const isActive = i === activeStep;
            return (
              <Animated.View
                key={i}
                style={[
                  s.stepDot,
                  isDone && s.stepDotDone,
                  isActive && [s.stepDotActive, { opacity: dotPulse }],
                ]}
              />
            );
          })}
        </View>

        {/* Status text */}
        <Text style={s.statusText}>Hướng dẫn chụp ảnh</Text>
        <Text style={s.statusSub}>
          Cập nhật dữ liệu sinh trắc học
        </Text>
      </View>

      {/* Steps card */}
      <View style={s.stepsCard}>
        <Text style={s.stepsTitle}>ĐĂNG KÝ KHUÔN MẶT</Text>
        {STEPS.map((label, i) => {
          const isDone = i < activeStep;
          const isActive = i === activeStep;
          return (
            <View key={label + i} style={s.stepItem}>
              <View
                style={[
                  s.stepNum,
                  isDone && s.stepNumDone,
                  isActive && s.stepNumActive,
                  !isDone && !isActive && s.stepNumWait,
                ]}
              >
                {isDone ? (
                  <Icon name="checkmark-outline" size={14} color={theme.colors.status.success} library="ionicons" />
                ) : (
                  <Text
                    style={[
                      s.stepNumText,
                      isActive && { color: theme.colors.brand.primary },
                      !isDone && !isActive && { color: theme.colors.text.disabled },
                    ]}
                  >
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  s.stepLabel,
                  isDone && s.stepLabelDone,
                  isActive && s.stepLabelActive,
                  !isDone && !isActive && s.stepLabelWait,
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Capture button */}
      <TouchableOpacity
        style={s.captureBtnWrap}
        onPress={handleCapture}
        activeOpacity={0.85}
        disabled={showSuccess}
      >
        <LinearGradient
          colors={[theme.colors.brand.primary, theme.colors.brand.primaryHover] as unknown as readonly [string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.captureBtn}
        >
          <Text style={s.captureBtnText}>Chụp ảnh</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Success overlay */}
      {showSuccess && (
        <Animated.View style={[s.overlay, { opacity: successOpacity }]}>
          <Animated.View style={[s.successCard, { transform: [{ scale: successScale }] }]}>
            <View style={s.scGlow}>
              <View style={s.scIcon}>
                <Icon name="checkmark-outline" size={32} color={theme.colors.status.success} library="ionicons" />
              </View>
            </View>
            <Text style={s.scTitle}>Đăng ký thành công!</Text>
            <Text style={s.scSub}>
              Cập nhật dữ liệu sinh trắc học
            </Text>
            <TouchableOpacity style={s.scBtn} onPress={handleFinish}>
              <Text style={s.scBtnText}>Xác nhận</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: t.colors.text.primary,
    },
    topBar: {
      paddingTop: 56,
      paddingBottom: 16,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    topTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: '#fff',
    },
    camArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      paddingBottom: 16,
    },
    scanTarget: {
      width: SCAN_TARGET_W,
      height: SCAN_TARGET_H,
      marginBottom: 20,
    },
    faceWrap: {
      position: 'absolute',
      inset: 0,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    faceOval: {
      width: SCAN_TARGET_W - 16,
      height: SCAN_TARGET_H - 16,
      borderRadius: (SCAN_TARGET_W - 16) / 2,
      borderWidth: 2,
      borderColor: 'rgba(79,110,247,0.6)',
    },
    faceOvalOverlay: {
      borderRadius: (SCAN_TARGET_W - 16) / 2,
      borderWidth: 2,
      borderColor: 'rgba(79,110,247,0.9)',
    },
    bracketTL: {
      position: 'absolute',
      width: BRACKET_SIZE,
      height: BRACKET_SIZE,
      top: 0,
      left: 0,
      borderTopWidth: 3,
      borderLeftWidth: 3,
      borderTopLeftRadius: 4,
      borderColor: t.colors.brand.primary,
      zIndex: 3,
    },
    bracketTR: {
      position: 'absolute',
      width: BRACKET_SIZE,
      height: BRACKET_SIZE,
      top: 0,
      right: 0,
      borderTopWidth: 3,
      borderRightWidth: 3,
      borderTopRightRadius: 4,
      borderColor: t.colors.brand.primary,
      zIndex: 3,
    },
    bracketBL: {
      position: 'absolute',
      width: BRACKET_SIZE,
      height: BRACKET_SIZE,
      bottom: 0,
      left: 0,
      borderBottomWidth: 3,
      borderLeftWidth: 3,
      borderBottomLeftRadius: 4,
      borderColor: t.colors.brand.primary,
      zIndex: 3,
    },
    bracketBR: {
      position: 'absolute',
      width: BRACKET_SIZE,
      height: BRACKET_SIZE,
      bottom: 0,
      right: 0,
      borderBottomWidth: 3,
      borderRightWidth: 3,
      borderBottomRightRadius: 4,
      borderColor: t.colors.brand.primary,
      zIndex: 3,
    },
    scanLine: {
      position: 'absolute',
      left: 24,
      right: 24,
      height: 2,
      backgroundColor: t.colors.brand.primary,
      shadowColor: t.colors.brand.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 12,
      zIndex: 4,
      top: 14,
    },
    stepDots: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    stepDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    stepDotDone: {
      backgroundColor: t.colors.status.success,
    },
    stepDotActive: {
      backgroundColor: t.colors.brand.primary,
    },
    statusText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 6,
      textAlign: 'center',
    },
    statusSub: {
      fontSize: 13,
      color: t.colors.text.disabled,
      textAlign: 'center',
      lineHeight: 19,
    },
    stepsCard: {
      backgroundColor: 'rgba(26,29,46,1)',
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    stepsTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: t.colors.text.disabled,
      letterSpacing: 0.4,
      marginBottom: 12,
    },
    stepItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 6,
    },
    stepNum: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumDone: {
      backgroundColor: 'rgba(34,197,94,0.15)',
    },
    stepNumActive: {
      backgroundColor: 'rgba(79,110,247,0.2)',
    },
    stepNumWait: {
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    stepNumText: {
      fontSize: 12,
      fontWeight: '700',
    },
    stepLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    stepLabelDone: {
      color: t.colors.text.disabled,
      textDecorationLine: 'line-through',
    },
    stepLabelActive: {
      color: '#fff',
    },
    stepLabelWait: {
      color: t.colors.text.disabled,
    },
    captureBtnWrap: {
      marginHorizontal: 16,
      marginBottom: 28,
      height: 52,
      borderRadius: 9999,
      overflow: 'hidden',
      shadowColor: t.colors.brand.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 24,
    },
    captureBtn: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    captureBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
    // Success overlay
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.85)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
    },
    successCard: {
      backgroundColor: 'rgba(26,29,46,1)',
      borderRadius: 24,
      padding: 32,
      paddingHorizontal: 24,
      alignItems: 'center',
      width: 300,
      borderWidth: 1,
      borderColor: 'rgba(34,197,94,0.2)',
    },
    scGlow: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(34,197,94,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    scIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(34,197,94,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#fff',
      marginBottom: 6,
    },
    scSub: {
      fontSize: 13,
      color: t.colors.text.disabled,
      lineHeight: 21,
      marginBottom: 20,
      textAlign: 'center',
    },
    scBtn: {
      width: '100%',
      height: 46,
      borderRadius: 9999,
      backgroundColor: t.colors.status.success,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
    permText: {
      color: t.colors.text.disabled,
      fontSize: 15,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
    permBtn: {
      backgroundColor: t.colors.brand.primary,
      borderRadius: 9999,
      paddingVertical: 14,
      paddingHorizontal: 32,
    },
    permBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
  });
}
