const SKIP_BASKET_AUTO_RUN_KEY = "towerbrook-copilot-skip-basket-auto-run";

export function readSkipBasketAutoRun(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SKIP_BASKET_AUTO_RUN_KEY) === "1";
}

export function writeSkipBasketAutoRun(skip: boolean) {
  window.localStorage.setItem(SKIP_BASKET_AUTO_RUN_KEY, skip ? "1" : "0");
  window.dispatchEvent(new CustomEvent("towerbrook-copilot-preferences-updated"));
}

export function subscribeCopilotPreferences(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener("storage", handler);
  window.addEventListener("towerbrook-copilot-preferences-updated", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("towerbrook-copilot-preferences-updated", handler);
  };
}
