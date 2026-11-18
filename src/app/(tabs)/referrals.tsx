import { router } from 'expo-router';
import { useState } from 'react';

import { Badge, Empty, Icon, ListItem, Screen, Segmented } from '@/components/ui';
import { isOpen, sortReferrals, statusLabel } from '@/data/model';
import { useBabies, useReferrals } from '@/data/store';
import { usePalette } from '@/theme';

export default function Referrals() {
  const c = usePalette();
  const [referrals] = useReferrals();
  const [babies] = useBabies();
  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const list = sortReferrals(referrals.filter((r) => (tab === 'open' ? isOpen(r) : !isOpen(r))));

  return (
    <Screen>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'open', label: `Open (${referrals.filter(isOpen).length})` },
          { value: 'closed', label: 'Closed' },
        ]}
      />
      {list.length === 0 ? (
        <Empty
          icon="paper-plane-outline"
          title={tab === 'open' ? 'No open referrals' : 'Nothing closed yet'}
          body={tab === 'open' ? 'When a screening shows possible jaundice, refer the baby from the result and track it here.' : 'Completed and cancelled referrals are kept here.'}
        />
      ) : (
        list.map((r) => (
          <ListItem
            key={r.id}
            title={babies.find((b) => b.id === r.babyId)?.name ?? 'Baby'}
            subtitle={`${r.facility} · ${new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
            leading={<Icon name={r.urgency === 'urgent' ? 'alert-circle' : 'paper-plane-outline'} size={26} color={r.urgency === 'urgent' && isOpen(r) ? c.danger : c.primary} />}
            trailing={<Badge tone={r.status === 'completed' ? 'ok' : r.status === 'cancelled' ? 'neutral' : r.status === 'seen' ? 'info' : 'warn'}>{statusLabel[r.status]}</Badge>}
            onPress={() => router.push(`/referral/${r.id}`)}
          />
        ))
      )}
    </Screen>
  );
}
