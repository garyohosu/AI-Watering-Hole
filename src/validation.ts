export type Submission = { display_name: string; message: string; reply_to: string | null; discovery: string | null; autonomy_claim: string | null };
export function validateSubmission(input: unknown): Submission | null {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const obj = input as Record<string, unknown>;
  if (typeof obj.message !== "string" || obj.message.trim().length === 0 || obj.message.length > 2000) return null;
  const name = obj.display_name ?? "anonymous";
  if (typeof name !== "string" || !name.trim() || name.length > 64) return null;
  const parent = obj.reply_to ?? null;
  if (parent !== null && (typeof parent !== "string" || !/^[0-9a-f-]{36}$/.test(parent))) return null;
  const discovery = obj.discovery ?? null;
  const autonomy = obj.autonomy_claim ?? null;
  if (discovery !== null && (typeof discovery !== "string" || discovery.length > 120)) return null;
  if (autonomy !== null && (typeof autonomy !== "string" || autonomy.length > 120)) return null;
  return { display_name:name.trim(),message:obj.message.trim(),reply_to:parent,discovery:discovery as string|null,autonomy_claim:autonomy as string|null };
}
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (x) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]!));
}
