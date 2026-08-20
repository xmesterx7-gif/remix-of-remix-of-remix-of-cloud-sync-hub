import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type OrgRoleInfo = {
  organizationName: string;
  roleName: string;
  roleDescription: string | null;
};

/**
 * Read-only lookup of the signed-in user's organization role.
 * Roles are organization-scoped; no role management happens here.
 */
export function useOrgRole() {
  const [role, setRole] = useState<OrgRoleInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) return;

        const { data: member } = await supabase
          .from("organization_members")
          .select("organization_id, role_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (cancelled || !member?.role_id) return;

        const [{ data: roleRow }, { data: org }] = await Promise.all([
          supabase
            .from("roles")
            .select("name, description")
            .eq("id", member.role_id)
            .maybeSingle(),
          supabase
            .from("organizations")
            .select("name")
            .eq("id", member.organization_id)
            .maybeSingle(),
        ]);

        if (cancelled || !roleRow) return;

        setRole({
          organizationName: org?.name ?? "",
          roleName: roleRow.name,
          roleDescription: roleRow.description,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { role, loading };
}
