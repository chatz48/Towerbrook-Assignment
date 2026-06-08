import "server-only";

import { cookies } from "next/headers";
import {
  isThemeFocus,
  THEME_FOCUS_COOKIE,
  type ThemeFocus,
} from "@/lib/theme-focus";

export async function getThemeFocus(): Promise<ThemeFocus> {
  const value = (await cookies()).get(THEME_FOCUS_COOKIE)?.value;
  return isThemeFocus(value) ? value : "all";
}
