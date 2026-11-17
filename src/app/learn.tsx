import { Body, Card, H2, Label, Screen } from '@/components/ui';
import { usePalette } from '@/theme';

/** Newborn jaundice education. Content must be reviewed by a clinician before release. */
export default function Learn() {
  const c = usePalette();
  return (
    <Screen>
      <Card style={{ borderColor: c.danger }}>
        <Label style={{ color: c.danger }}>Get urgent care now if the baby</Label>
        <Body>• Has yellow skin in the first 24 hours of life</Body>
        <Body>• Is very sleepy, hard to wake, or feeding poorly</Body>
        <Body>• Has yellowing spreading to the arms, legs, palms or soles</Body>
        <Body>• Has a high-pitched cry, arched back, or fever</Body>
        <Body>• Has pale (chalky) stools or dark urine</Body>
      </Card>
      <Card>
        <H2>What is newborn jaundice?</H2>
        <Body muted>
          Jaundice is a yellow colour of the skin and the whites of the eyes. It is common in the first week of life and often mild, but some babies need
          treatment, so any yellowing should be checked by a health worker.
        </Body>
      </Card>
      <Card>
        <H2>Feeding helps</H2>
        <Body muted>Feed often — 8 to 12 times a day in the first days. Good feeding helps the body clear the yellow pigment.</Body>
      </Card>
      <Card>
        <H2>About this app</H2>
        <Body muted>CribDoc is a screening aid, not a diagnosis. A reassuring result must never delay assessment by a qualified health professional.</Body>
      </Card>
    </Screen>
  );
}
