import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Animated, Dimensions, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme, Theme } from '../../theme';

const appIcon = require('../../../assets/icon.png');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Splash'> };

export default function SplashScreen({ navigation }: Props) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  // Logo entrance
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current; // 0→1 maps to -15deg→0deg

  // Ring pulse
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.3)).current;

  // Brand
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandY = useRef(new Animated.Value(24)).current;

  // Dots
  const dotsOpacity = useRef(new Animated.Value(0)).current;
  const dot1Y = useRef(new Animated.Value(0)).current;
  const dot2Y = useRef(new Animated.Value(0)).current;
  const dot3Y = useRef(new Animated.Value(0)).current;

  // Blobs
  const blob1Y = useRef(new Animated.Value(0)).current;
  const blob2Y = useRef(new Animated.Value(0)).current;
  const blob3Y = useRef(new Animated.Value(0)).current;

  // Progress
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo: scale from 0.4→1, opacity 0→1, rotate -15deg→0
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 34, friction: 5, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(logoRotate, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]).start();

    // Ring pulse loop (starts after logo appears)
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ringScale, { toValue: 1.06, duration: 1000, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0.9, duration: 1000, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(ringScale, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }, 400);

    // Brand text entrance
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(brandOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(brandY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }, 300);

    // Dots bounce loop
    setTimeout(() => {
      Animated.timing(dotsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      const bounceDot = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: -10, duration: 300, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.delay(400),
          ])
        ).start();
      bounceDot(dot1Y, 0);
      bounceDot(dot2Y, 200);
      bounceDot(dot3Y, 400);
    }, 900);

    // Blob float loop
    const floatBlob = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -20, duration: 3000, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 3000, useNativeDriver: true }),
        ])
      ).start();
    floatBlob(blob1Y, 0);
    floatBlob(blob2Y, 1500);
    floatBlob(blob3Y, 750);

    // Progress bar
    setTimeout(() => {
      Animated.timing(progressWidth, { toValue: SCREEN_WIDTH, duration: 2400, useNativeDriver: false }).start();
    }, 400);

    const timer = setTimeout(() => navigation.replace('Login'), 3000);
    return () => clearTimeout(timer);
  }, []);

  const rotateDeg = logoRotate.interpolate({ inputRange: [0, 1], outputRange: ['-15deg', '0deg'] });

  return (
    <View style={s.container}>
      {/* Blobs */}
      <Animated.View style={[s.blob, s.blob1, { transform: [{ translateY: blob1Y }] }]} />
      <Animated.View style={[s.blob, s.blob2, { transform: [{ translateY: blob2Y }] }]} />
      <Animated.View style={[s.blob, s.blob3, { transform: [{ translateY: blob3Y }] }]} />

      {/* Content */}
      <View style={s.content}>
        {/* Logo wrapper with ring */}
        <View style={s.logoWrap}>
          {/* Ring pulse (absolute, behind logo) */}
          <Animated.View
            style={[
              s.ring,
              { transform: [{ scale: ringScale }], opacity: ringOpacity },
            ]}
          />
          {/* Logo */}
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { rotate: rotateDeg }],
            }}
          >
            <View style={s.logoCircle}>
              <Image source={appIcon} style={s.logoInner} resizeMode="cover" />
            </View>
          </Animated.View>
        </View>

        {/* Brand */}
        <Animated.View
          style={{
            opacity: brandOpacity,
            transform: [{ translateY: brandY }],
            alignItems: 'center',
          }}
        >
          <Text style={s.brandName}>Smatt</Text>
          <Text style={s.brandSub}>Smart Attendance System</Text>
        </Animated.View>

        {/* Bouncing dots */}
        <Animated.View style={[s.loader, { opacity: dotsOpacity }]}>
          <Animated.View style={[s.dot, { backgroundColor: theme.colors.brand.primary, transform: [{ translateY: dot1Y }] }]} />
          <Animated.View style={[s.dot, { backgroundColor: theme.colors.brand.primaryHover, transform: [{ translateY: dot2Y }] }]} />
          <Animated.View style={[s.dot, { backgroundColor: theme.colors.brand.primaryActive, transform: [{ translateY: dot3Y }] }]} />
        </Animated.View>
      </View>

      {/* Version */}
      <Text style={s.version}>v1.0.0</Text>

      {/* Progress bar with gradient */}
      <View style={s.progressTrack}>
        <Animated.View style={[s.progressFill, { width: progressWidth }]}>
          <LinearGradient
            colors={[theme.colors.brand.primary, theme.colors.brand.primaryHover] as unknown as readonly [string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0d0f1e',
    },
    blob: {
      position: 'absolute',
      borderRadius: 999,
      opacity: 0.35,
    },
    blob1: {
      width: 240,
      height: 240,
      backgroundColor: t.colors.brand.primary,
      top: -60,
      left: -60,
    },
    blob2: {
      width: 180,
      height: 180,
      backgroundColor: t.colors.brand.primaryActive,
      bottom: 80,
      right: -50,
    },
    blob3: {
      width: 120,
      height: 120,
      backgroundColor: t.colors.status.info,
      top: SCREEN_HEIGHT * 0.55,
      left: SCREEN_WIDTH * 0.3,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    logoWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
      width: 112,
      height: 112,
    },
    ring: {
      position: 'absolute',
      width: 112,
      height: 112,
      borderRadius: 36,
      borderWidth: 1,
      borderColor: t.colors.border.indigo,
    },
    logoCircle: {
      width: 96,
      height: 96,
      borderRadius: 28,
      overflow: 'hidden',
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.15)',
      shadowColor: t.colors.brand.primary,
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.5,
      shadowRadius: 30,
      elevation: 12,
    },
    logoInner: {
      width: '100%',
      height: '100%',
    },
    brandName: {
      fontSize: 36,
      fontWeight: '800',
      color: t.colors.text.onPrimary,
      letterSpacing: -1,
      lineHeight: 40,
      marginBottom: 8,
    },
    brandSub: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.45)',
      letterSpacing: 0.5,
    },
    loader: {
      flexDirection: 'row',
      marginTop: 64,
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    version: {
      position: 'absolute',
      bottom: 36,
      alignSelf: 'center',
      fontSize: 11,
      color: 'rgba(255,255,255,0.2)',
    },
    progressTrack: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
      overflow: 'hidden',
    },
  });
}
