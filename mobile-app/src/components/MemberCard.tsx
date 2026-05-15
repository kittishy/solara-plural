import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@src/components/Avatar';
import { Card } from '@src/components/Card';
import { StatusPill } from '@src/components/StatusPill';
import { theme } from '@src/constants/theme';
import type { SolaraMember } from '@src/types/solara';

type MemberCardProps = {
  member: SolaraMember;
  isFronting?: boolean;
};

export function MemberCard({ member, isFronting = false }: MemberCardProps) {
  return (
    <Card accentColor={member.color ?? theme.colors.primary}>
      <View style={styles.row}>
        <Avatar name={member.name} uri={member.avatarUrl} color={member.color} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{member.name}</Text>
            {isFronting ? <StatusPill label="In front" color={theme.colors.front} /> : null}
          </View>
          {member.pronouns ? <Text style={styles.meta}>{member.pronouns}</Text> : null}
          {member.role ? <Text style={styles.role}>{member.role}</Text> : null}
        </View>
      </View>
      {member.description ? <Text style={styles.description}>{member.description}</Text> : null}
      {member.tags.length > 0 ? (
        <View style={styles.tags}>
          {member.tags.map((tag) => (
            <Text key={tag} style={styles.tag}>
              {tag}
            </Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  description: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  name: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
  },
  role: {
    color: theme.colors.primaryGlow,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  tag: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
});
