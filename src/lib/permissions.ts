/**
 * Typed, backend-ready permission model.
 *
 * Permissions are organization-scoped and derived from the EXISTING role
 * system (`public.roles` per organization + the `app_role` enum in
 * `public.user_roles`). No new tables, no data changes, no UI.
 *
 * Nothing in this module is wired into current behavior; it is a service
 * layer other code can adopt later.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Role } from "./store";

/* ------------------------------------------------------------------ */
/* Permission catalog                                                  */
/* ------------------------------------------------------------------ */

export const PERMISSIONS = [
  "org.view",
  "org.manage",
  "members.view",
  "members.manage",
  "roles.view",
  "roles.manage",
  "tasks.view",
  "tasks.create",
  "tasks.assign",
  "tasks.complete",
  "inventory.view",
  "inventory.manage",
  "sales.view",
  "sales.manage",
  "purchases.view",
  "purchases.manage",
  "expenses.view",
  "expenses.manage",
  "reports.view",
  "reports.manage",
  "settings.view",
  "settings.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ */
/* Role → permission mapping (compatible with the existing roles)      */
/* ------------------------------------------------------------------ */

const ALL: readonly Permission[] = PERMISSIONS;

const VIEWER_PERMISSIONS: readonly Permission[] = [
  "org.view",
  "tasks.view",
  "inventory.view",
  "sales.view",
  "reports.view",
  "settings.view",
];

/** Permissions granted by each `app_role`. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: ALL,
  GENERAL_MANAGER: ALL.filter((p) => p !== "org.manage"),
  STORE_MANAGER: ALL.filter((p) => p !== "org.manage"),
  ACCOUNTANT: [
    ...VIEWER_PERMISSIONS,
    "purchases.view",
    "purchases.manage",
    "expenses.view",
    "expenses.manage",
    "sales.manage",
    "reports.manage",
  ],
  EMPLOYEE: [
    ...VIEWER_PERMISSIONS,
    "sales.manage",
    "inventory.manage",
    "tasks.create",
    "tasks.complete",
  ],
  SENIOR_SELLER: [
    ...VIEWER_PERMISSIONS,
    "sales.manage",
    "inventory.manage",
    "purchases.view",
    "tasks.create",
    "tasks.assign",
    "tasks.complete",
    "reports.manage",
  ],
  MECHANIC: [...VIEWER_PERMISSIONS, "tasks.complete"],
  VIEWER: VIEWER_PERMISSIONS,
};

/**
 * Organization-scoped role names in `public.roles` (free-form text) mapped
 * onto the enum roles above. Unknown names fall back to `VIEWER`.
 */
export function normalizeOrgRoleName(name: string | null | undefined): Role {
  switch ((name ?? "").trim().toUpperCase()) {
    case "OWNER":
    case "ADMIN":
      return "ADMIN";
    case "GENERAL_MANAGER":
      return "GENERAL_MANAGER";
    case "MANAGER":
    case "STORE_MANAGER":
      return "STORE_MANAGER";
    case "SENIOR_SELLER":
      return "SENIOR_SELLER";
    case "ACCOUNTANT":
      return "ACCOUNTANT";
    case "MECHANIC":
      return "MECHANIC";
    case "EMPLOYEE":
      return "EMPLOYEE";
    default:
      return "VIEWER";
  }
}

/* ------------------------------------------------------------------ */
/* Permission set                                                      */
/* ------------------------------------------------------------------ */

export type OrgPermissionContext = {
  userId: string;
  organizationId: string | null;
  /** Organization role name from `public.roles`, when the user is a member. */
  orgRoleName: string | null;
  /** Global roles from `public.user_roles`. */
  roles: readonly Role[];
  /** True when the user owns the organization. */
  isOwner: boolean;
  permissions: ReadonlySet<Permission>;
};

export function permissionsForRoles(
  roles: readonly Role[],
): ReadonlySet<Permission> {
  const set = new Set<Permission>();
  for (const role of roles) {
    for (const p of ROLE_PERMISSIONS[role] ?? []) set.add(p);
  }
  return set;
}

export function can(
  ctx: Pick<OrgPermissionContext, "permissions">,
  permission: Permission,
): boolean {
  return ctx.permissions.has(permission);
}

export function canAll(
  ctx: Pick<OrgPermissionContext, "permissions">,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((p) => ctx.permissions.has(p));
}

export function canAny(
  ctx: Pick<OrgPermissionContext, "permissions">,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((p) => ctx.permissions.has(p));
}

/** Throws when the permission is missing; useful at service boundaries. */
export function assertPermission(
  ctx: Pick<OrgPermissionContext, "permissions">,
  permission: Permission,
): void {
  if (!can(ctx, permission)) {
    throw new Error(`PERMISSION_DENIED: ${permission}`);
  }
}

export const EMPTY_PERMISSION_CONTEXT: OrgPermissionContext = {
  userId: "",
  organizationId: null,
  orgRoleName: null,
  roles: [],
  isOwner: false,
  permissions: new Set<Permission>(),
};

/* ------------------------------------------------------------------ */
/* Service                                                             */
/* ------------------------------------------------------------------ */

export interface PermissionService {
  /** Resolve the signed-in user's permission context, optionally for one org. */
  getContext(organizationId?: string): Promise<OrgPermissionContext | null>;
  /** Convenience check for the signed-in user. */
  hasPermission(permission: Permission, organizationId?: string): Promise<boolean>;
}

/** Reads existing tables only; RLS applies as the signed-in user. */
export const cloudPermissionService: PermissionService = {
  async getContext(organizationId?: string) {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return null;

    let query = supabase
      .from("organization_members")
      .select("organization_id, role_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);
    if (organizationId) query = query.eq("organization_id", organizationId);

    const { data: member } = await query.maybeSingle();

    const [{ data: roleRow }, { data: globalRoles }, { data: org }] =
      await Promise.all([
        member?.role_id
          ? supabase.from("roles").select("name").eq("id", member.role_id).maybeSingle()
          : Promise.resolve({ data: null as { name: string } | null }),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        member?.organization_id
          ? supabase
              .from("organizations")
              .select("owner_id")
              .eq("id", member.organization_id)
              .maybeSingle()
          : Promise.resolve({ data: null as { owner_id: string } | null }),
      ]);

    const roles: Role[] = [
      ...new Set<Role>([
        ...((globalRoles ?? []).map((r) => r.role) as Role[]),
        ...(roleRow ? [normalizeOrgRoleName(roleRow.name)] : []),
      ]),
    ];

    const isOwner = org?.owner_id === user.id;
    if (isOwner && !roles.includes("ADMIN")) roles.push("ADMIN");

    return {
      userId: user.id,
      organizationId: member?.organization_id ?? organizationId ?? null,
      orgRoleName: roleRow?.name ?? null,
      roles,
      isOwner,
      permissions: permissionsForRoles(roles),
    };
  },

  async hasPermission(permission, organizationId) {
    const ctx = await cloudPermissionService.getContext(organizationId);
    return ctx ? can(ctx, permission) : false;
  },
};

/** In-memory implementation for tests and offline use. */
export function createLocalPermissionService(
  ctx: OrgPermissionContext,
): PermissionService {
  return {
    getContext: async () => ctx,
    hasPermission: async (permission) => can(ctx, permission),
  };
}
