import { Body, Card, H2, Icon, Label, Row, Screen, Small, type IconName } from '@/components/ui';
import { usePalette } from '@/theme';

const danger = [
  'Yellow skin or eyes in the first 24 hours of life',
  'Very sleepy, hard to wake, or not feeding well',
  'Yellow spreading to the arms, legs, palms or soles',
  'High-pitched cry, arched back, stiff body or fever',
  'Pale (chalky) stools or dark urine',
];

const care: { icon: IconName; title: string; body: string }[] = [
  { icon: 'water-outline', title: 'Feed often', body: '8 to 12 feeds a day in the first days. Good feeding helps the body clear the yellow pigment.' },
  { icon: 'sunny-outline', title: 'Check in daylight', body: 'Look at the whites of the eyes and press gently on the skin of the nose or chest. Yellow that stays is worth checking.' },
  { icon: 'calendar-outline', title: 'Watch days 3 to 5', body: 'Jaundice usually peaks around then. Plan a check even if the baby went home early.' },
  { icon: 'ban-outline', title: "Don't treat at home", body: 'Do not put the baby in direct sunlight, and do not give water, glucose or herbs. See a health worker.' },
];

/** Newborn jaundice education. Content must be reviewed by a clinician before release. */
export default function Learn() {
  const c = usePalette();
  return (
    <Screen>
      <Card style={{ borderColor: c.danger, backgroundColor: c.dangerBg }}>
        <Row>
          <Icon name="warning" size={22} color={c.danger} />
          <Label style={{ color: c.danger }}>Get care now if the baby has</Label>
        </Row>
        {danger.map((d) => (
          <Row key={d} style={{ alignItems: 'flex-start' }}>
            <Icon name="ellipse" size={8} color={c.danger} style={{ marginTop: 8 }} />
            <Body style={{ flex: 1 }}>{d}</Body>
          </Row>
        ))}
      </Card>
      <Card>
        <H2>What is newborn jaundice?</H2>
        <Body muted>
          A yellow colour of the skin and the whites of the eyes. It is common in the first week and often mild, but some babies need treatment such as phototherapy,
          so any yellowing should be checked by a health worker.
        </Body>
      </Card>
      {care.map((x) => (
        <Card key={x.title} style={{ flexDirection: 'row', gap: 14 }}>
          <Icon name={x.icon} size={26} color={c.primary} />
          <Body style={{ flex: 1 }}>
            <Body style={{ fontWeight: '700' }}>{x.title}. </Body>
            {x.body}
          </Body>
        </Card>
      ))}
      <Small>CribDoc is a screening aid, not a diagnosis. A reassuring result must never delay assessment by a qualified health professional.</Small>
    </Screen>
  );
}
