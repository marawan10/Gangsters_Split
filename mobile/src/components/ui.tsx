import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { getPersonAvatar } from '../lib/personAvatars';
import { radius, spacing, typography } from '../theme';

export function Card({
  children,
  style,
  accent,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  accent?: boolean;
}) {
  const c = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.card,
          borderColor: accent ? c.accent + '30' : c.cardBorder,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const c = useTheme();
  return <View style={[styles.screen, { backgroundColor: c.bg }, style]}>{children}</View>;
}

export function Title({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const c = useTheme();
  return <Text style={[typography.title, { color: c.text }, style]}>{children}</Text>;
}

export function Subtitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const c = useTheme();
  return <Text style={[typography.caption, { color: c.textSecondary }, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const c = useTheme();
  return <Text style={[typography.body, { color: c.text }, style]}>{children}</Text>;
}

export function Label({ children }: { children: React.ReactNode }) {
  const c = useTheme();
  return <Text style={[typography.caption, styles.label, { color: c.textSecondary }]}>{children}</Text>;
}

export function Input(props: TextInputProps) {
  const c = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.textMuted}
      {...props}
      style={[
        styles.input,
        {
          backgroundColor: c.inputBg,
          borderColor: c.inputBorder,
          color: c.text,
        },
        props.style,
      ]}
    />
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  loading,
  variant = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'success' | 'danger' | 'ghost';
  style?: ViewStyle;
}) {
  const c = useTheme();
  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.ghostBtn,
          { borderColor: c.inputBorder, opacity: pressed ? 0.8 : 1 },
          style,
        ]}
      >
        {icon}
        <Text style={[typography.subtitle, { color: c.text }]}>{label}</Text>
      </Pressable>
    );
  }
  const colors =
    variant === 'success'
      ? ['#10B981', '#059669']
      : variant === 'danger'
        ? ['#EF4444', '#DC2626']
        : [c.accentGradient[0], c.accentGradient[1]];
  return (
    <Pressable onPress={onPress} disabled={loading} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }, style]}>
      <LinearGradient colors={colors as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <>
            {icon}
            <Text style={styles.primaryBtnText}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: color || c.accentSoft, borderColor: color || c.accent }
          : { backgroundColor: c.bgMuted, borderColor: c.inputBorder },
      ]}
    >
      <Text
        style={[
          typography.caption,
          { color: active ? color || c.accent : c.textMuted, fontWeight: '600' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SectionHeader({ title, count }: { title: string; count?: number }) {
  const c = useTheme();
  return (
    <View style={styles.sectionHeader}>
      {count !== undefined && (
        <View style={[styles.badge, { backgroundColor: c.accentSoft }]}>
          <Text style={[typography.micro, { color: c.accent }]}>{count}</Text>
        </View>
      )}
      <Text style={[typography.micro, { color: c.textMuted, textTransform: 'uppercase' }]}>{title}</Text>
    </View>
  );
}

export function Avatar({ name, color, size = 40 }: { name: string; color?: string; size?: number }) {
  const c = useTheme();
  const photo = getPersonAvatar(name);
  const borderRadius = size / 3;

  if (photo) {
    return (
      <Image
        source={photo}
        style={{ width: size, height: size, borderRadius }}
        resizeMode="cover"
      />
    );
  }

  const initial = name.replace('El ', '').charAt(0).toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: color || c.accent,
        },
      ]}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.4 }}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  label: { marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    minHeight: 52,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 48,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, paddingHorizontal: 2 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  avatar: { alignItems: 'center', justifyContent: 'center' },
});
