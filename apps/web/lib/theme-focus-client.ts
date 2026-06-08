"use client";

import { useSyncExternalStore } from "react";
import {
  readThemeFocusCookie,
  THEME_FOCUS_EVENT,
  type ThemeFocus,
} from "@/lib/theme-focus";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(THEME_FOCUS_EVENT, onStoreChange);
  return () => window.removeEventListener(THEME_FOCUS_EVENT, onStoreChange);
}

export function useThemeFocusClient(): ThemeFocus {
  return useSyncExternalStore(subscribe, readThemeFocusCookie, () => "all");
}
