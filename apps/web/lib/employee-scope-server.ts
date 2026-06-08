import "server-only";

import { cookies } from "next/headers";
import { INCLUDE_TOWERBROOK_EMPLOYEES_COOKIE } from "@/lib/employee-scope";

export async function getIncludeTowerBrookEmployees() {
  return (await cookies()).get(INCLUDE_TOWERBROOK_EMPLOYEES_COOKIE)?.value === "true";
}
