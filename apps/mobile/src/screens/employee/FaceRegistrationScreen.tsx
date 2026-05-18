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
import { useTranslation } from '../../i18n';

const SCAN_TARGET_W = 240;
const SCAN_TARGET_H = 290;
const BRACKET_SIZE = 28;

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: '#0d0f1a',
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
      borderColor: '#4F6EF7',
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
      borderColor: '#4F6EF7',
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
      borderColor: '#4F6EF7',
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
      borderColor: '#4F6EF7',
      zIndex: 3,
    },
    scanLine: {
      position: 'absolute',
      left: 24,
      right: 24,
      height: 2,
      backgroundColor: '#4F6EF7',
      shadowColor: '#4F6EF7',
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
      backgroundColor: '#22c55e',
    },
    stepDotActive: {
      backgroundColor: '#4F6EF7',
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
      color: '#94a3b8',
      textAlign: 'center',
      lineHeight: 19,
    },
    stepsCard: {
      backgroundColor: '#1a1d2e',
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
      color: '#94a3b8',
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
      color: '#94a3b8',
      textDecorationLine: 'line-through',
    },
    stepLabelActive: {
      color: '#fff',
    },
    stepLabelWait: {
      color: '#94a3b8',
    },
    captureBtnWrap: {
      marginHorizontal: 16,
      marginBottom: 28,
      height: 52,
      borderRadius: 9999,
      overflow: 'hidden',
      shadowColor: '#4F6EF7',
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
      backgroundColor: '#1a1d2e',
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
      color: '#94a3b8',
      lineHeight: 21,
      marginBottom: 20,
      textAlign: 'center',
    },
    scBtn: {
      width: '100%',
      height: 46,
      borderRadius: 9999,
      backgroundColor: '#22c55e',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
    permText: {
      color: '#94a3b8',
      fontSize: 15,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
    permBtn: {
      backgroundColor: '#4F6EF7',
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

export default function FaceRegistrationScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [permission, requestPermission] = useCameraPermissions();
  const [showSuccess, setShowSuccess] = useState(false);
  const activeStep = 1;

  const STEPS = [
    t.face.instructions,
    t.face.register,
    t.face.confirm,
    t.face.update,
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

  if (!permission) return <View style={styles.root} />;
  if (!permission.granted) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', gap: 16 }]}>
        <Icon name="camera-outline" size={48} color="#9ca3af" library="ionicons" />
        <Text style={styles.permText}>
          {t.face.instructions}
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>{t.common.confirm}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-outline" size={20} color="#fff" library="ionicons" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{t.face.title}</Text>
      </View>

      {/* Camera area */}
      <View style={styles.camArea}>
        <CameraView style={StyleSheet.absoluteFill} facing="front" />

        <View style={styles.scanTarget}>
          <View style={styles.faceWrap}>
            <Animated.View
              style={[styles.faceOval, { transform: [{ scale: ovalScale }], borderColor: 'rgba(79,110,247,0.3)' }]}
            >
              <Animated.View
                style={[StyleSheet.absoluteFill, styles.faceOvalOverlay, { opacity: borderOpacity }]}
              />
            </Animated.View>
          </View>

          <View style={styles.bracketTL} />
          <View style={styles.bracketTR} />
          <View style={styles.bracketBL} />
          <View style={styles.bracketBR} />

          <Animated.View
            style={[
              styles.scanLine,
              { transform: [{ translateY: scanY }], opacity: scanLineOpacity },
            ]}
          />
        </View>

        {/* Step dots */}
        <View style={styles.stepDots}>
          {STEPS.map((_, i) => {
            const isDone = i < activeStep;
            const isActive = i === activeStep;
            return (
              <Animated.View
                key={i}
                style={[
                  styles.stepDot,
                  isDone && styles.stepDotDone,
                  isActive && [styles.stepDotActive, { opacity: dotPulse }],
                ]}
              />
            );
          })}
        </View>

        {/* Status text */}
        <Text style={styles.statusText}>{t.face.instructions}</Text>
        <Text style={styles.statusSub}>
          {t.face.subtitle}
        </Text>
      </View>

      {/* Steps card */}
      <View style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>{t.face.register.toUpperCase()}</Text>
        {STEPS.map((label, i) => {
          const isDone = i < activeStep;
          const isActive = i === activeStep;
          return (
            <View key={label + i} style={styles.stepItem}>
              <View
                style={[
                  styles.stepNum,
                  isDone && styles.stepNumDone,
                  isActive && styles.stepNumActive,
                  !isDone && !isActive && styles.stepNumWait,
                ]}
              >
                {isDone ? (
                  <Icon name="checkmark-outline" size={14} color="#16a34a" library="ionicons" />
                ) : (
                  <Text
                    style={[
                      styles.stepNumText,
                      isActive && { color: '#4F6EF7' },
                      !isDone && !isActive && { color: '#9ca3af' },
                    ]}
                  >
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isDone && styles.stepLabelDone,
                  isActive && styles.stepLabelActive,
                  !isDone && !isActive && styles.stepLabelWait,
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
        style={styles.captureBtnWrap}
        onPress={handleCapture}
        activeOpacity={0.85}
        disabled={showSuccess}
      >
        <LinearGradient
          colors={['#4F6EF7', '#3a52dd']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.captureBtn}
        >
          <Text style={styles.captureBtnText}>{t.face.capture}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Success overlay */}
      {showSuccess && (
        <Animated.View style={[styles.overlay, { opacity: successOpacity }]}>
          <Animated.View style={[styles.successCard, { transform: [{ scale: successScale }] }]}>
            <View style={styles.scGlow}>
              <View style={styles.scIcon}>
                <Icon name="checkmark-outline" size={32} color="#16a34a" library="ionicons" />
              </View>
            </View>
            <Text style={styles.scTitle}>{t.face.success}!</Text>
            <Text style={styles.scSub}>
              {t.face.subtitle}
            </Text>
            <TouchableOpacity style={styles.scBtn} onPress={handleFinish}>
              <Text style={styles.scBtnText}>{t.common.confirm}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}
