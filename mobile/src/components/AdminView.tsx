import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Shield, Trash2, UserPlus } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing, typography } from '../theme';
import { Avatar, Card, Input, Label, PrimaryButton } from './ui';

export function AdminView() {
  const { members, identityClaims, addGroupMember, removeGroupMember, releaseIdentityClaim, t, sn } =
    useApp();
  const c = useTheme();
  const [name, setName] = useState('');
  const [instapayUser, setInstapayUser] = useState('');
  const [instapayUrl, setInstapayUrl] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    setLoading(true);
    const err = await addGroupMember(name, instapayUser.trim() || undefined, instapayUrl.trim() || undefined);
    setLoading(false);
    if (err) {
      Alert.alert(t('adminAddMember'), err);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setName('');
    setInstapayUser('');
    setInstapayUrl('');
    Alert.alert('✓', t('adminMemberAdded'));
  }

  async function handleRemove(id: string, memberName: string) {
    Alert.alert(t('adminRemove'), memberName, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('adminRemove'),
        style: 'destructive',
        onPress: async () => {
          const err = await removeGroupMember(id);
          if (err) Alert.alert('', err);
        },
      },
    ]);
  }

  async function handleRelease(memberId: string, memberName: string) {
    Alert.alert(t('adminReleaseDevice'), t('adminReleaseConfirm', { name: sn(memberName) }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('adminReleaseDevice'),
        onPress: async () => {
          await releaseIdentityClaim(memberId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  return (
    <View>
      <Card accent>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: c.accentSoft }]}>
            <Shield size={22} color={c.accent} />
          </View>
          <View>
            <Text style={[typography.title, { color: c.text }]}>{t('adminTitle')}</Text>
            <Text style={[typography.caption, { color: c.textSecondary }]}>{t('adminSubtitle')}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={[typography.subtitle, { color: c.text, marginBottom: spacing.md }]}>
          {t('adminAddMember')}
        </Text>
        <Label>{t('adminMemberName')}</Label>
        <Input value={name} onChangeText={setName} placeholder="e.g. Abdo" style={{ marginBottom: spacing.md }} />
        <Label>{t('adminInstapayUser')}</Label>
        <Input
          value={instapayUser}
          onChangeText={setInstapayUser}
          placeholder="username"
          autoCapitalize="none"
          style={{ marginBottom: spacing.md }}
        />
        <Label>{t('adminInstapayUrl')}</Label>
        <Input
          value={instapayUrl}
          onChangeText={setInstapayUrl}
          placeholder="https://ipn.eg/..."
          autoCapitalize="none"
          style={{ marginBottom: spacing.lg }}
        />
        <PrimaryButton
          label={t('adminSave')}
          onPress={handleAdd}
          loading={loading}
          icon={<UserPlus size={18} color="#fff" />}
        />
      </Card>

      <Card>
        <Text style={[typography.micro, { color: c.textMuted, marginBottom: spacing.md, textTransform: 'uppercase' }]}>
          {t('adminMembers')} ({members.length})
        </Text>
        {members.map((member) => {
          const claimed = !!identityClaims[member.id];
          return (
            <View key={member.id} style={[styles.memberRow, { backgroundColor: c.bgMuted }]}>
              <Avatar name={member.name} color={member.color} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.subtitle, { color: c.text }]}>
                  {sn(member.name)}
                  {member.isAdmin ? ' · Admin' : ''}
                </Text>
                {member.instapay?.username && (
                  <Text style={[typography.micro, { color: c.textMuted }]}>
                    {member.instapay.username}@instapay
                  </Text>
                )}
                {claimed && (
                  <Text style={[typography.micro, { color: c.success, marginTop: 2 }]}>
                    {t('adminDeviceRegistered')}
                  </Text>
                )}
              </View>
              {claimed && (
                <Pressable
                  onPress={() => handleRelease(member.id, member.name)}
                  style={[styles.releaseBtn, { borderColor: c.cardBorder }]}
                >
                  <Text style={[typography.micro, { color: c.accent }]}>{t('adminReleaseDevice')}</Text>
                </Pressable>
              )}
              {!member.isAdmin && (
                <Pressable onPress={() => handleRemove(member.id, member.name)} style={styles.removeBtn}>
                  <Trash2 size={16} color={c.danger} />
                </Pressable>
              )}
            </View>
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  removeBtn: { padding: spacing.sm },
  releaseBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
});
