import { StyleSheet, Text } from 'react-native';

import { Card } from '@src/components/Card';
import { MemberCard } from '@src/components/MemberCard';
import { Screen } from '@src/components/Screen';
import { theme } from '@src/constants/theme';
import { useSolaraData } from '@src/hooks/useSolaraData';

export function MembersScreen() {
  const { snapshot, loading, refresh } = useSolaraData();
  const activeIds = snapshot.currentFront?.memberIds ?? [];
  const visibleMembers = snapshot.members.filter((member) => !member.isArchived);

  return (
    <Screen title="Members" eyebrow="System roster" refreshing={loading} onRefresh={() => void refresh()}>
      {visibleMembers.length > 0 ? (
        visibleMembers.map((member) => (
          <MemberCard key={member.id} member={member} isFronting={activeIds.includes(member.id)} />
        ))
      ) : (
        <Card>
          <Text style={styles.empty}>No members found.</Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
});
