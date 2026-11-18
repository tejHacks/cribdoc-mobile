/**
 * PDF case report for one baby: profile, screenings (with photos), referrals
 * and case notes. Built as HTML and printed natively, then shared.
 */
import { Platform } from 'react-native';

import { ageLabel, statusLabel, type Baby, type Referral, type Screening } from '@/data/model';
import { stateCopy } from '@/ml/screening';

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch);

const when = (t: number) => new Date(t).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

async function photoData(uri: string) {
  if (Platform.OS === 'web' || !uri.startsWith('file:')) return null;
  try {
    const { File } = await import('expo-file-system');
    const f = new File(uri);
    return f.exists ? `data:image/jpeg;base64,${await f.base64()}` : null;
  } catch {
    return null;
  }
}

/** The report's HTML. Exported for tests. */
export function reportHtml(
  baby: Baby,
  screenings: Screening[],
  referrals: Referral[],
  opts: { facility?: string; preparedBy?: string; photos?: Record<string, string | null>; now?: number } = {},
) {
  const now = opts.now ?? Date.now();
  const rows = screenings
    .map((s) => {
      const img = opts.photos?.[s.id];
      return `<article>
        <h3>${escapeHtml(stateCopy[s.state].title)}</h3>
        <p class="muted">${escapeHtml(when(s.ranAt))} · model ${escapeHtml(s.modelVersion)}${s.yellowIndex == null ? '' : ` · yellow index ${s.yellowIndex.toFixed(3)}`}</p>
        ${img ? `<img src="${img}" alt="Eye photo"/>` : ''}
      </article>`;
    })
    .join('');
  const refs = referrals
    .map(
      (r) => `<article>
        <h3>${escapeHtml(r.facility)} <span class="tag ${r.urgency}">${r.urgency}</span></h3>
        <p>${escapeHtml(r.reason)}</p>
        <p class="muted">${r.history.map((h) => `${escapeHtml(statusLabel[h.status])} — ${escapeHtml(when(h.at))} (${escapeHtml(h.by)})`).join('<br/>')}</p>
      </article>`,
    )
    .join('');
  const notes = baby.notes.map((n) => `<p><b>${escapeHtml(when(n.at))}, ${escapeHtml(n.by)}:</b> ${escapeHtml(n.text)}</p>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(baby.name)} — CribDoc report</title><style>
    @page{margin:28px} body{font-family:-apple-system,Roboto,Arial,sans-serif;color:#0B1F1C;font-size:12px;line-height:1.5}
    h1{color:#0F766E;margin:0 0 4px;font-size:24px} h2{color:#0F766E;font-size:16px;margin:22px 0 8px;border-bottom:1px solid #E2E8E5;padding-bottom:4px}
    h3{font-size:14px;margin:0 0 2px} article{page-break-inside:avoid;padding:10px 0;border-bottom:1px solid #EEF2F1}
    .muted{color:#4B5E59} img{max-width:240px;max-height:240px;border-radius:8px;margin-top:6px}
    .tag{font-size:10px;text-transform:uppercase;padding:2px 6px;border-radius:6px;background:#EAEFED}.tag.urgent{background:#FFEDD5;color:#C2410C}
    .note{margin-top:24px;padding:10px;background:#FEF3C7;border-radius:8px}
  </style></head><body>
    <h1>${escapeHtml(baby.name)}</h1>
    <p class="muted">Born ${escapeHtml(baby.dob)} (${escapeHtml(ageLabel(baby.dob, now))})${baby.caregiverName ? ` · Caregiver ${escapeHtml(baby.caregiverName)}` : ''}${baby.caregiverPhone ? ` · ${escapeHtml(baby.caregiverPhone)}` : ''}</p>
    <p class="muted">Prepared ${escapeHtml(when(now))}${opts.preparedBy ? ` by ${escapeHtml(opts.preparedBy)}` : ''}${opts.facility ? `, ${escapeHtml(opts.facility)}` : ''}</p>
    <h2>Screenings</h2>${rows || '<p class="muted">No screenings yet.</p>'}
    <h2>Referrals</h2>${refs || '<p class="muted">No referrals.</p>'}
    ${notes ? `<h2>Case notes</h2>${notes}` : ''}
    <p class="note">CribDoc is a screening aid, not a diagnosis. Results must be reviewed by a qualified health professional.</p>
  </body></html>`;
}

export async function shareReport(baby: Baby, screenings: Screening[], referrals: Referral[], opts: { facility?: string; preparedBy?: string }) {
  const photos: Record<string, string | null> = {};
  await Promise.all(screenings.map(async (s) => (photos[s.id] = await photoData(s.imageUri))));
  const html = reportHtml(baby, screenings, referrals, { ...opts, photos });
  const Print = await import('expo-print');
  if (Platform.OS === 'web') return Print.printAsync({ html });
  const { uri } = await Print.printToFileAsync({ html });
  const Sharing = await import('expo-sharing');
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `${baby.name} — CribDoc report` });
  else await Print.printAsync({ uri });
}
