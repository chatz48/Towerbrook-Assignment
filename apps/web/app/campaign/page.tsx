import { redirect } from "next/navigation";
import { singleParam } from "@/lib/url-params";

/** Outreach planning now lives on the Call list. */
export default async function CampaignPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const experts = singleParam(params.experts);
  redirect(experts ? `/experts?experts=${encodeURIComponent(experts)}` : "/experts");
}
