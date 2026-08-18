const SERNAGEOMIN_URL = "https://www.sernageomin.cl/alertas-volcanicas/";
const GVP_URL = "https://volcano.si.edu/volcano.cfm?vn=357120";

type DetectionCandidate = {
  fuente_tipo: "sernageomin" | "gvp";
  fuente_url: string;
  fingerprint: string;
  titulo: string;
  fecha_documento?: string;
};

type StoredDetection = DetectionCandidate & { id: string };

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizeText(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function absoluteUrl(value: string, base: string): string {
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

async function fingerprint(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fetchSource(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Vulcania detector/1.0 (+operator-configured)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`source_http_${response.status}`);
  return response.text();
}

async function detectSernageomin(html: string): Promise<DetectionCandidate[]> {
  const candidates: DetectionCandidate[] = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const href = absoluteUrl(match[1], SERNAGEOMIN_URL);
    const title = normalizeText(match[2]);
    const searchable = `${href} ${title}`;
    if (!/reav|rav|villarrica/i.test(searchable)) continue;
    candidates.push({
      fuente_tipo: "sernageomin",
      fuente_url: href,
      fingerprint: await fingerprint(`${href}|${title}`),
      titulo: title || href.split("/").pop() || "REAV/RAV Villarrica",
    });
  }
  return candidates;
}

async function detectGvp(html: string): Promise<DetectionCandidate[]> {
  const normalized = normalizeText(html);
  const marker = normalized.search(/Latest Weekly Volcanic Activity Report/i);
  if (marker < 0) return [];
  const report = normalized.slice(marker, marker + 5_000);
  if (!/villarrica/i.test(report)) return [];
  return [{
    fuente_tipo: "gvp",
    fuente_url: GVP_URL,
    fingerprint: await fingerprint(report),
    titulo: report.slice(0, 240),
  }];
}

function supabaseHeaders(): HeadersInit {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key || "",
    Authorization: `Bearer ${key || ""}`,
    "Content-Type": "application/json",
  };
}

function supabaseRestUrl(path: string): string {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("SUPABASE_URL_missing");
  return `${url.replace(/\/$/, "")}/rest/v1/${path}`;
}

async function findDetection(candidate: DetectionCandidate): Promise<StoredDetection | null> {
  const response = await fetch(supabaseRestUrl(`detecciones?select=id,fuente_tipo,fuente_url,fingerprint,titulo,fecha_documento&fingerprint=eq.${encodeURIComponent(candidate.fingerprint)}&limit=1`), {
    headers: supabaseHeaders(),
  });
  if (!response.ok) throw new Error(`detections_read_${response.status}`);
  const rows = await response.json() as StoredDetection[];
  return rows[0] || null;
}

async function insertDetection(candidate: DetectionCandidate): Promise<StoredDetection> {
  const response = await fetch(supabaseRestUrl("detecciones"), {
    method: "POST",
    headers: { ...supabaseHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(candidate),
  });
  if (!response.ok) throw new Error(`detections_insert_${response.status}`);
  const rows = await response.json() as StoredDetection[];
  if (!rows[0]) throw new Error("detections_insert_empty");
  return rows[0];
}

async function updateDetection(id: string, values: Record<string, unknown>): Promise<void> {
  const response = await fetch(supabaseRestUrl(`detecciones?id=eq.${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(values),
  });
  if (!response.ok) throw new Error(`detections_update_${response.status}`);
}

async function notifyOperator(detection: StoredDetection): Promise<{ sent: boolean; detail?: string }> {
  const webhook = Deno.env.get("DETECTOR_NOTIFICATION_WEBHOOK_URL");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const recipient = Deno.env.get("DETECTOR_OPERATOR_EMAIL");
  const sender = Deno.env.get("DETECTOR_FROM_EMAIL");
  const message = {
    title: `Nueva detección Vulcania: ${detection.fuente_tipo}`,
    source: detection.fuente_url,
    detection: detection.titulo,
    instruction: "Verifica la fuente oficial y cambia la alerta manualmente; el detector nunca publica niveles.",
  };

  if (webhook) {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    return response.ok ? { sent: true } : { sent: false, detail: `webhook_http_${response.status}` };
  }

  if (!resendKey || !recipient || !sender) return { sent: false, detail: "notification_not_configured" };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
      "User-Agent": "Vulcania detector/1.0",
    },
    body: JSON.stringify({
      from: sender,
      to: [recipient],
      subject: message.title,
      text: `${message.detection}\n\nFuente: ${message.source}\n\n${message.instruction}`,
    }),
  });
  return response.ok ? { sent: true } : { sent: false, detail: `resend_http_${response.status}` };
}

async function processCandidate(candidate: DetectionCandidate): Promise<{ status: string; id?: string; detail?: string }> {
  const existing = await findDetection(candidate);
  if (existing) return { status: "already_seen", id: existing.id };
  const stored = await insertDetection(candidate);
  const notification = await notifyOperator(stored);
  if (notification.sent) {
    await updateDetection(stored.id, { estado: "notificado", notificado: true, fecha_notificado: new Date().toISOString() });
    return { status: "notified", id: stored.id };
  }
  await updateDetection(stored.id, { estado: "error", detalle: notification.detail || "notification_failed" });
  return { status: "notification_failed", id: stored.id, detail: notification.detail };
}

async function runDetector() {
  if (!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) throw new Error("SUPABASE_SERVICE_ROLE_KEY_missing");
  const sources = [
    { type: "sernageomin" as const, url: SERNAGEOMIN_URL, detect: detectSernageomin },
    { type: "gvp" as const, url: GVP_URL, detect: detectGvp },
  ];
  const results: Array<Record<string, unknown>> = [];
  for (const source of sources) {
    try {
      const html = await fetchSource(source.url);
      const candidates = await source.detect(html);
      for (const candidate of candidates) results.push({ ...candidate, ...(await processCandidate(candidate)) });
      results.push({ source: source.type, status: "checked", candidates: candidates.length });
    } catch (error) {
      results.push({ source: source.type, status: "source_error", detail: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}

Deno.serve(async (request) => {
  const configuredToken = Deno.env.get("DETECTOR_FUNCTION_TOKEN");
  if (configuredToken && request.headers.get("authorization") !== `Bearer ${configuredToken}`) return json({ error: "unauthorized" }, 401);
  if (request.method !== "POST" && request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  try {
    return json({ ok: true, results: await runDetector() });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
