import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTranslation } from 'react-i18next';

import { useAuth } from '../../contexts/AuthContext';
import type { LoginProvider } from '../../contexts/AuthContext';
import type { RootStackParamList } from '../../types/navigation';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SNS_BUTTONS: { provider: LoginProvider; labelKey: string; icon: string; bg: string; text: string }[] = [
  { provider: 'google', labelKey: 'login_continue_google', icon: 'logo-google', bg: '#FFFFFF', text: '#1A1A2E' },
  { provider: 'apple', labelKey: 'login_continue_apple', icon: 'logo-apple', bg: '#000000', text: '#FFFFFF' },
  { provider: 'kakao', labelKey: 'login_continue_kakao', icon: 'chatbubble', bg: '#FEE500', text: '#191919' },
];

export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { login, loginWithEmail, loginAsGuest } = useAuth();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSNSLogin = async (provider: LoginProvider) => {
    setLoading(true);
    try {
      await login(provider);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setEmailError('');
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    if (!trimmedEmail.includes('@')) { setEmailError(t('login_error_invalid_email')); return; }
    if (trimmedPassword.length < 6) { setEmailError(t('login_error_password_short')); return; }

    setLoading(true);
    const result = await loginWithEmail(trimmedEmail, trimmedPassword);
    setLoading(false);
    if (!result.success) setEmailError(result.error ?? t('login_error_login_failed'));
  };

  const handleGuest = () => {
    loginAsGuest();
    // canBrowse becomes true → AppNavigator auto-switches to MainTabs
  };

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={require('../../../assets/images/login-bg.jpg')}
        style={styles.heroBg}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(27,42,74,0.2)', 'rgba(27,42,74,0.5)', 'rgba(27,42,74,0.9)', colors.primary]}
          locations={[0, 0.3, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Guest Browse — top right */}
          <TouchableOpacity
            style={styles.guestBtn}
            onPress={handleGuest}
            activeOpacity={0.7}
          >
            <Text style={styles.guestText}>{t('login_guest')}</Text>
          </TouchableOpacity>

          <View style={styles.spacer} />

          {/* Hero Text */}
          <View style={styles.heroSection}>
            <Text style={styles.heroEmoji}>⚾</Text>
            <Text style={styles.heroTitle}>우다몬</Text>
            <Text style={styles.heroSubtitle}>
              {t('login_hero_subtitle')}
            </Text>
          </View>

          {/* SNS Login Buttons */}
          <View style={styles.snsSection}>
            {SNS_BUTTONS.map((btn) => (
              <TouchableOpacity
                key={btn.provider}
                style={[styles.snsBtn, { backgroundColor: btn.bg }]}
                activeOpacity={0.8}
                onPress={() => handleSNSLogin(btn.provider)}
                disabled={loading}
              >
                <Ionicons
                  name={btn.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={btn.text}
                />
                <Text style={[styles.snsBtnText, { color: btn.text }]}>{t(btn.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Email Login Toggle */}
          <TouchableOpacity
            style={styles.emailToggle}
            onPress={() => setShowEmailForm(!showEmailForm)}
            activeOpacity={0.7}
          >
            <View style={styles.dividerLine} />
            <Text style={styles.emailToggleText}>
              {showEmailForm ? t('login_email_collapse') : t('login_email')}
            </Text>
            <View style={styles.dividerLine} />
          </TouchableOpacity>

          {/* Email Form */}
          {showEmailForm && (
            <View style={styles.emailForm}>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={colors.whiteAlpha50} />
                <TextInput
                  style={styles.input}
                  placeholder={t('login_email_placeholder')}
                  placeholderTextColor={colors.whiteAlpha50}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.whiteAlpha50} />
                <TextInput
                  style={styles.input}
                  placeholder={t('login_password_placeholder')}
                  placeholderTextColor={colors.whiteAlpha50}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.whiteAlpha50}
                  />
                </TouchableOpacity>
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              <TouchableOpacity
                style={[styles.emailLoginBtn, loading && { opacity: 0.6 }]}
                onPress={handleEmailLogin}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.emailLoginBtnText}>{t('login_signin')}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => navigation.navigate('ForgotPassword')}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>{t('login_forgot_password')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Signup Link */}
          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => navigation.navigate('Signup')}
            activeOpacity={0.7}
          >
            <Text style={styles.signupText}>
              {t('login_no_account')} <Text style={styles.signupAccent}>{t('login_signup')}</Text>
            </Text>
          </TouchableOpacity>

          {/* Legal Footer */}
          <View style={styles.legalRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
              <Text style={styles.legalText}>{t('my_terms')}</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>·</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
              <Text style={styles.legalText}>{t('my_privacy_policy')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  flex: { flex: 1 },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  spacer: { flex: 1 },

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: fontWeight.heading,
    color: colors.buttonPrimaryText,
    letterSpacing: 4,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.body,
    color: colors.whiteAlpha60,
    textAlign: 'center',
  },

  // SNS Buttons
  snsSection: {
    gap: 10,
    marginBottom: 24,
  },
  snsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: radius.lg,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.whiteAlpha10,
  },
  snsBtnText: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.name,
  },

  // Email Toggle
  emailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.whiteAlpha10,
  },
  emailToggleText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.whiteAlpha50,
  },

  // Email Form
  emailForm: {
    gap: 12,
    marginBottom: 20,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: colors.whiteAlpha10,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.whiteAlpha10,
  },
  input: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.buttonPrimaryText,
  },
  errorText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.error,
  },
  emailLoginBtn: {
    height: 52,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  emailLoginBtnText: {
    fontSize: fontSize.cardName,
    fontWeight: fontWeight.name,
    color: colors.primary,
  },

  // Forgot password
  forgotBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
  },
  forgotText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.whiteAlpha50,
  },

  // Signup
  signupLink: {
    alignItems: 'center',
    marginBottom: 16,
  },
  signupText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.whiteAlpha50,
  },
  signupAccent: {
    color: colors.buttonPrimaryText,
    fontWeight: fontWeight.name,
    textDecorationLine: 'underline',
  },

  // Guest
  guestBtn: {
    alignSelf: 'flex-end',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  guestText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.body,
    color: colors.whiteAlpha50,
  },

  // Legal
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  legalText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.body,
    color: colors.whiteAlpha50,
  },
  legalDot: {
    fontSize: fontSize.micro,
    color: colors.whiteAlpha10,
  },
});
