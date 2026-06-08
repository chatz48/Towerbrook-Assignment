import type { Expert } from "@/lib/types";

export const INCLUDE_TOWERBROOK_EMPLOYEES_COOKIE = "include-towerbrook-employees";
export const INCLUDE_TOWERBROOK_EMPLOYEES_EVENT = "include-towerbrook-employees-change";

export function isTowerBrookEmployee(expert: Pick<Expert, "org">) {
  return (expert.org ?? "").toLowerCase().includes("towerbrook");
}

export function filterTowerBrookEmployees<T extends Pick<Expert, "org">>(
  experts: T[],
  includeTowerBrookEmployees: boolean,
) {
  return includeTowerBrookEmployees
    ? experts
    : experts.filter((expert) => !isTowerBrookEmployee(expert));
}

export function readIncludeTowerBrookEmployeesCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${INCLUDE_TOWERBROOK_EMPLOYEES_COOKIE}=`))
    ?.endsWith("=true") ?? false;
}

export function publishIncludeTowerBrookEmployees(include: boolean) {
  document.cookie = `${INCLUDE_TOWERBROOK_EMPLOYEES_COOKIE}=${include}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(
    new CustomEvent(INCLUDE_TOWERBROOK_EMPLOYEES_EVENT, { detail: include }),
  );
}
