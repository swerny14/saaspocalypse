import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function MoatAnomaliesRedirect() {
  redirect("/admin/score-audit?filter=suspects");
}
