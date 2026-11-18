import { Badge, Body, Card, H2, Row, Screen, SectionTitle, Small } from '@/components/ui';
import { MODEL, unavailableReason } from '@/ml/screening';

const steps = [
  ['Shrink', 'The photo is resized natively to 640 px before anything else, so even a 12 MP photo is quick to read.'],
  ['Find the sclera', 'A YOLOv8 segmentation model, run with ONNX Runtime on the phone\'s CPU, outlines the white of the eye.'],
  ['Measure yellowing', 'Shadows and lashes are removed, then CribDoc measures how much of the bright sclera is yellow.'],
  ['Decide', 'The yellow index is compared with a threshold set when the model is calibrated. Unclear photos are never forced into an answer.'],
];

export default function ModelInfo() {
  const reason = unavailableReason();
  return (
    <Screen>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>{MODEL.name}</H2>
          <Badge tone={reason ? 'warn' : 'ok'}>{reason ? 'Not ready' : `v${MODEL.version}`}</Badge>
        </Row>
        <Body muted>
          {reason === 'no-runtime'
            ? 'This build cannot run models (Expo Go or web). Use the CribDoc development or preview build.'
            : reason === 'uncalibrated'
              ? 'The eye model is being trained on a new dataset. Until it is installed and calibrated, CribDoc shows no results at all, never a guess.'
              : 'Installed and running fully on this phone.'}
        </Body>
        <Small>Status: {MODEL.status}. Results are for evaluation only until the model is clinically validated.</Small>
      </Card>

      <SectionTitle>How a scan works</SectionTitle>
      {steps.map(([title, body], i) => (
        <Card key={title}>
          <Small>Step {i + 1}</Small>
          <H2>{title}</H2>
          <Body muted>{body}</Body>
        </Card>
      ))}

      <SectionTitle>Privacy</SectionTitle>
      <Body muted>Photos and results never leave the phone unless you share a report yourself. There is no account and no server.</Body>
    </Screen>
  );
}
