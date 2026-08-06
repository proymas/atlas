import { list } from '@vercel/blob';

function authorized(req) {
  const secret = process.env.DASHBOARD_SECRET;
  if (!secret) return false;
  return req.headers.authorization === `Bearer ${secret}`;
}

async function readPrivateBlob(blob) {
  const url = blob.downloadUrl || blob.url;
  if (!url) return null;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
  });
  if (!response.ok) throw new Error(`Blob read failed (${response.status})`);
  return response.text();
}

async function readEvents(limit = 5000) {
  const events = [];
  let cursor;
  do {
    const remaining = limit - events.length;
    if (remaining <= 0) break;
    const page = await list({ prefix: 'analytics/events/', cursor, limit: Math.min(1000, remaining) });
    for (const blob of page.blobs) {
      if (events.length >= limit) break;
      try {
        const text = await readPrivateBlob(blob);
        if (text) events.push(JSON.parse(text));
      } catch (error) {
        console.warn('Atlas analytics blob skipped', blob.pathname, error.message);
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && events.length < limit);
  return events.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

function countBy(events, selector) {
  const output = {};
  for (const event of events) {
    const key = selector(event) || 'unknown';
    output[key] = (output[key] || 0) + 1;
  }
  return output;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function aggregate(events) {
  const sessions = new Map();
  for (const event of events) {
    if (!sessions.has(event.sessionId)) sessions.set(event.sessionId, []);
    sessions.get(event.sessionId).push(event);
  }

  const eventCounts = countBy(events, event => event.name);
  const started = eventCounts.validator_started || 0;
  const completed = eventCounts.report_generated || 0;
  const durations = events.filter(e => e.name === 'report_generated').map(e => Number(e.data?.durationMs)).filter(Number.isFinite);
  const questionAbandonment = {};
  for (const sessionEvents of sessions.values()) {
    const startedEvent = sessionEvents.find(e => e.name === 'validator_started');
    const completedEvent = sessionEvents.find(e => e.name === 'report_generated');
    if (!startedEvent || completedEvent) continue;
    const lastQuestion = [...sessionEvents].reverse().find(e => e.name === 'question_viewed' || e.name === 'question_answered');
    const step = lastQuestion?.data?.step || 0;
    questionAbandonment[step] = (questionAbandonment[step] || 0) + 1;
  }

  const scores = events.filter(e => e.name === 'report_generated').map(e => Number(e.data?.score)).filter(Number.isFinite);
  const ratings = events.filter(e => e.name === 'feedback_submitted').map(e => Number(e.data?.rating)).filter(Number.isFinite);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      events: events.length,
      sessions: sessions.size,
      landingViews: eventCounts.landing_view || 0,
      analysesStarted: started,
      reportsGenerated: completed,
      completionRate: started ? Math.round((completed / started) * 1000) / 10 : 0,
      pdfDownloads: eventCounts.pdf_downloaded || 0,
      shares: eventCounts.report_shared || 0,
      feedback: eventCounts.feedback_submitted || 0,
      proWaitlist: eventCounts.pro_waitlist_joined || 0,
      errors: eventCounts.analysis_error || 0,
      blocked: eventCounts.screening_blocked || 0
    },
    timing: {
      averageMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      p50Ms: percentile(durations, 0.5),
      p90Ms: percentile(durations, 0.9)
    },
    quality: {
      averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      averageRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0,
      verdicts: countBy(events.filter(e => e.name === 'report_generated'), e => e.data?.verdict),
      profiles: countBy(events.filter(e => e.name === 'report_generated'), e => e.data?.profile),
      maturity: countBy(events.filter(e => e.name === 'report_generated'), e => e.data?.maturity),
      modes: countBy(events.filter(e => e.name === 'report_generated'), e => e.data?.mode),
      locales: countBy(events.filter(e => e.name === 'report_generated'), e => e.locale)
    },
    funnel: {
      landing: eventCounts.landing_view || 0,
      started,
      questionnaireCompleted: eventCounts.questionnaire_completed || 0,
      reportGenerated: completed,
      feedback: eventCounts.feedback_submitted || 0,
      proWaitlist: eventCounts.pro_waitlist_joined || 0
    },
    abandonmentByQuestion: questionAbandonment,
    recentEvents: events.slice(-100).reverse().map(event => ({
      name: event.name,
      createdAt: event.createdAt,
      locale: event.locale,
      country: event.country,
      data: event.data
    }))
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'Analytics storage is not configured' });
  try {
    const events = await readEvents(5000);
    return res.status(200).json(aggregate(events));
  } catch (error) {
    console.error('Atlas metrics error', error);
    return res.status(500).json({ error: 'Unable to load analytics metrics', detail: error.message });
  }
}
