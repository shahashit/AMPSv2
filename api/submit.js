// Vercel Function: receives the website forms and emails them via Resend.
//
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY        required  API key from https://resend.com
//   MAIL_FROM             required  e.g. "AMPS Website <website@automps.eu>" (domain verified in Resend)
//   MAIL_TO               optional  where enquiries go            (default sales@automps.eu)
//   MAIL_TO_APPLICATIONS  optional  where technician applications go (default = MAIL_TO)

const MAX_FILES_BYTES = 4 * 1024 * 1024; // Vercel request bodies are capped at 4.5 MB
const ALLOWED_EXT = /\.(pdf|docx?|jpe?g|png)$/i;

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (v, n = 2000) => String(v ?? '').trim().slice(0, n);
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

function table(rows) {
  const tr = rows
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e6ecf1;color:#51677a;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:8px 12px;border-bottom:1px solid #e6ecf1;color:#071e2d">${esc(v).replace(/\n/g, '<br>')}</td></tr>`)
    .join('');
  return `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${tr}</table>`;
}

async function readBody(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('multipart/form-data')) {
    const fd = await request.formData();
    const fields = {};
    const files = [];
    for (const [k, v] of fd.entries()) {
      if (typeof v === 'object' && v !== null && 'arrayBuffer' in v) {
        if (v.size > 0) files.push({ field: k, file: v });
      } else {
        fields[k] = v;
      }
    }
    return { fields, files };
  }
  const fields = await request.json();
  return { fields: fields && typeof fields === 'object' ? fields : {}, files: [] };
}

export async function POST(request) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return json(500, { ok: false, error: 'Mail is not configured (RESEND_API_KEY / MAIL_FROM).' });

  let fields, files;
  try {
    ({ fields, files } = await readBody(request));
  } catch {
    return json(400, { ok: false, error: 'Invalid form data.' });
  }

  // Honeypot: bots fill the hidden "website" field. Pretend success.
  if (clip(fields.website)) return json(200, { ok: true });

  const form = fields.form === 'application' ? 'application' : 'enquiry';
  const to = form === 'application'
    ? (process.env.MAIL_TO_APPLICATIONS || process.env.MAIL_TO || 'sales@automps.eu')
    : (process.env.MAIL_TO || 'sales@automps.eu');

  let subject, html, replyTo;
  const attachments = [];

  if (form === 'enquiry') {
    const f = fields;
    if (!clip(f.company) || !clip(f.name) || !isEmail(f.email)) return json(400, { ok: false, error: 'Missing required fields.' });
    const list = (v) => (Array.isArray(v) ? v.join(', ') : clip(v));
    replyTo = clip(f.email, 200);
    subject = `Programme request: ${clip(f.company, 120)} (${clip(f.organisationType, 60)}, ${clip(f.country, 40)})`;
    html = `<h2 style="font-family:Arial,sans-serif;color:#071e2d">New programme request from the website</h2>` + table([
      ['Organisation', clip(f.company, 200)], ['Organisation type', clip(f.organisationType, 80)], ['Name & role', clip(f.name, 200)],
      ['Email', clip(f.email, 200)], ['Phone', clip(f.phone, 60)], ['Country', clip(f.country, 60)], ['City / location', clip(f.city, 200)],
      ['Workshop sites', clip(f.sites, 10)], ['Repair areas', list(f.repairAreas)], ['Brands', list(f.brands) || 'Any / to be discussed'],
      ['Start', clip(f.start, 60)], ['Duration', clip(f.duration, 60)], ['Message', clip(f.message, 5000)],
      ['Site language', clip(f.lang, 5)], ['Sent from', clip(f.page, 200)],
    ]);
  } else {
    const f = fields;
    if (!clip(f.first) || !clip(f.last) || !isEmail(f.email)) return json(400, { ok: false, error: 'Missing required fields.' });
    if (f.consent !== 'yes') return json(400, { ok: false, error: 'Consent missing.' });
    let total = 0;
    for (const { field, file } of files) {
      if (!['cv', 'certificates'].includes(field)) continue;
      if (!ALLOWED_EXT.test(file.name || '')) return json(400, { ok: false, error: `File type not allowed: ${file.name}` });
      total += file.size;
      if (total > MAX_FILES_BYTES) return json(413, { ok: false, error: 'Files too large.' });
      const buf = Buffer.from(await file.arrayBuffer());
      attachments.push({ filename: (field === 'cv' ? 'CV - ' : 'Certificate - ') + String(file.name).slice(0, 120), content: buf.toString('base64') });
    }
    if (!attachments.some((a) => a.filename.startsWith('CV - '))) return json(400, { ok: false, error: 'CV missing.' });
    replyTo = clip(f.email, 200);
    subject = `Technician application: ${clip(f.first, 80)} ${clip(f.last, 80)} (${clip(f.repairAreas, 120) || 'no area'})`;
    html = `<h2 style="font-family:Arial,sans-serif;color:#071e2d">New technician application from the website</h2>` + table([
      ['Name', `${clip(f.first, 80)} ${clip(f.last, 80)}`], ['Email', clip(f.email, 200)], ['Phone / WhatsApp', clip(f.phone, 60)],
      ['Country of residence', clip(f.residence, 80)], ['Languages', clip(f.languages, 300)], ['Repair areas', clip(f.repairAreas, 300)],
      ['Brands', clip(f.brands, 300)], ['Years of experience', clip(f.years, 40)], ['Driving licence', clip(f.licence, 40)],
      ['Certifications', clip(f.certs, 3000)], ['Available from', clip(f.from, 20)], ['Preferred programme length', clip(f.length, 40)],
      ['Preferred countries', clip(f.countries, 200)], ['Consent to processing', 'Yes'], ['Attachments', attachments.map((a) => a.filename).join(', ')],
      ['Site language', clip(f.lang, 5)], ['Sent from', clip(f.page, 200)],
    ]);
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: to.split(',').map((s) => s.trim()).filter(Boolean), reply_to: replyTo, subject, html, attachments: attachments.length ? attachments : undefined }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('Resend error', res.status, detail.slice(0, 500));
    return json(502, { ok: false, error: 'Mail could not be sent.' });
  }
  return json(200, { ok: true });
}

export function GET() {
  return json(405, { ok: false, error: 'Use POST.' });
}
