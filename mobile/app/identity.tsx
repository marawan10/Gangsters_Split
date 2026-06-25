import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp } from '../src/context/AppContext';
import { useTheme } from '../src/context/ThemeContext';
import { DEFAULT_MEMBERS } from '../src/lib/constants';
import { AppLogo } from '../src/components/AppLogo';
import { Avatar } from '../src/components/ui';
import { FadeInView, PopIn, StaggerIn } from '../src/components/motion';
import { radius, spacing, typography } from '../src/theme';

export default function IdentityScreen() {
  const { currentUser, members, pickIdentity, isMemberSelectable, t, sn, toggleLang, lang } = useApp();
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<string | null>(null);
  const squad = members.length > 0 ? members : DEFAULT_MEMBERS;
  const available = squad.filter(isMemberSelectable);

  useEffect(() => {
    if (currentUser) {
      router.replace('/(tabs)/dashboard');
    }
  }, [currentUser, router]);

  async function select(name: string) {
    if (loading) return;
    setLoading(name);
    try {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // haptics optional
      }
      const err = await pickIdentity(name);
      if (err) {
        Alert.alert(t('appName'), err);
        return;
      }
      router.replace('/(tabs)/dashboard');
    } catch {
      Alert.alert(t('appName'), t('identityError'));
    } finally {
      setLoading(null);
    }
  }

  return (
    <LinearGradient
      colors={[c.bg, c.bgElevated] as [string, string]}
      style={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
    >
      <FadeInView from="fade" style={styles.hero}>
        <PopIn delay={80}>
          <AppLogo size={72} style={styles.logoShadow} />
        </PopIn>
        <FadeInView delay={200}>
          <Text style={[typography.hero, { color: c.text, textAlign: 'center', marginTop: spacing.lg }]}>
            {t('appName')}
          </Text>
        </FadeInView>
        <FadeInView delay={280}>
          <Text style={[typography.body, { color: c.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
            {t('whoAreYou')}
          </Text>
        </FadeInView>
      </FadeInView>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {available.length === 0 ? (
          <FadeInView delay={320}>
            <View style={[styles.emptyBox, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <Text style={[typography.subtitle, { color: c.text, textAlign: 'center' }]}>
                {t('identityAllTaken')}
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: c.textSecondary, textAlign: 'center', marginTop: spacing.sm },
                ]}
              >
                {t('identityAllTakenHint')}
              </Text>
            </View>
          </FadeInView>
        ) : (
          available.map((member, index) => {
            const isLoading = loading === member.name;
            return (
              <StaggerIn key={member.id} index={index + 2}>
                <Pressable
                  onPress={() => select(member.name)}
                  disabled={!!loading}
                  style={({ pressed }) => [
                    styles.userBtn,
                    {
                      backgroundColor: c.card,
                      borderColor: c.cardBorder,
                      opacity: loading && !isLoading ? 0.6 : pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Avatar name={member.name} color={member.color} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.subtitle, { color: c.text }]}>{sn(member.name)}</Text>
                    {member.isAdmin && (
                      <Text style={[typography.micro, { color: c.accent }]}>Admin</Text>
                    )}
                  </View>
                  {isLoading ? (
                    <ActivityIndicator color={c.accent} />
                  ) : (
                    <Text style={{ color: c.textMuted, fontSize: 18 }}>→</Text>
                  )}
                </Pressable>
              </StaggerIn>
            );
          })
        )}
      </ScrollView>

      <FadeInView delay={500}>
        <Pressable onPress={toggleLang} style={styles.langBtn}>
          <Text style={[typography.caption, { color: c.textMuted }]}>{lang === 'en' ? 'العربية' : 'English'}</Text>
        </Pressable>
        <Text style={[typography.micro, { color: c.textMuted, textAlign: 'center' }]}>{t('pickOnce')}</Text>
      </FadeInView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.xxl },
  hero: { alignItems: 'center', marginBottom: spacing.xxl },
  logoShadow: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  listScroll: { flex: 1, width: '100%' },
  list: { gap: spacing.md, paddingBottom: spacing.lg, flexGrow: 1 },
  emptyBox: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  userBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  langBtn: { alignSelf: 'center', padding: spacing.md, marginBottom: spacing.sm },
});
