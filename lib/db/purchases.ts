import { getSupabaseAdmin } from "./supabase";
import { wrapDbError } from "./errors";

export type PurchaseStatus = "pending" | "paid" | "failed" | "refunded";

export type StoredPurchase = {
  id: string;
  report_id: string;
  user_id: string | null;
  email: string;
  stripe_session_id: string | null;
  amount_cents: number;
  status: PurchaseStatus;
  access_token: string;
  created_at: string;
  paid_at: string | null;
};

export async function createPendingPurchase(input: {
  report_id: string;
  email: string;
  amount_cents: number;
  access_token: string;
  stripe_session_id?: string | null;
}): Promise<StoredPurchase> {
  const admin = getSupabaseAdmin();
  const row = {
    report_id: input.report_id,
    email: input.email,
    amount_cents: input.amount_cents,
    access_token: input.access_token,
    stripe_session_id: input.stripe_session_id ?? null,
    status: "pending" as PurchaseStatus,
  };
  const { data, error } = await admin
    .from("build_guide_purchases")
    .insert(row)
    .select("*")
    .single();
  if (error) throw wrapDbError(error, "build_guide_purchases insert");
  return data as StoredPurchase;
}

/** Dev-bypass: create a row already marked paid. */
export async function createPaidPurchase(input: {
  report_id: string;
  email: string;
  amount_cents: number;
  access_token: string;
}): Promise<StoredPurchase> {
  const admin = getSupabaseAdmin();
  const row = {
    report_id: input.report_id,
    email: input.email,
    amount_cents: input.amount_cents,
    access_token: input.access_token,
    stripe_session_id: null,
    status: "paid" as PurchaseStatus,
    paid_at: new Date().toISOString(),
  };
  const { data, error } = await admin
    .from("build_guide_purchases")
    .insert(row)
    .select("*")
    .single();
  if (error) throw wrapDbError(error, "build_guide_purchases insert");
  return data as StoredPurchase;
}

export async function markPurchasePaidBySessionId(
  stripeSessionId: string,
): Promise<StoredPurchase | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("build_guide_purchases")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("stripe_session_id", stripeSessionId)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("[purchases] markPurchasePaidBySessionId failed", error);
    return null;
  }
  return (data as StoredPurchase | null) ?? null;
}

export async function getPurchaseByAccessToken(
  accessToken: string,
): Promise<StoredPurchase | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("build_guide_purchases")
    .select("*")
    .eq("access_token", accessToken)
    .maybeSingle();
  if (error) {
    console.error("[purchases] getPurchaseByAccessToken failed", error);
    return null;
  }
  return (data as StoredPurchase | null) ?? null;
}

export async function getLatestPaidPurchaseByEmailAndReport(input: {
  email: string;
  report_id: string;
}): Promise<StoredPurchase | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("build_guide_purchases")
    .select("*")
    .eq("email", input.email.toLowerCase())
    .eq("report_id", input.report_id)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as StoredPurchase | null) ?? null;
}
