import { notFound, redirect } from "next/navigation";
import { getTheme } from "@/lib/themes";

export function generateStaticParams() {
  return [
    { theme: "clean-energy-advisory" },
    { theme: "grid-infrastructure" },
    { theme: "smart-water" },
  ];
}

/** Legacy theme URLs now set scope on Home. */
export default async function ThemeRedirectPage({
  params,
}: {
  params: Promise<{ theme: string }>;
}) {
  const { theme: themeId } = await params;
  const theme = getTheme(themeId);
  if (!theme) notFound();
  redirect(`/?theme=${themeId}`);
}
