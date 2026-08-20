/**
 * Read/write helper for the organization a person belongs to.
 *
 * Frontend-only: it uses the existing `organizations` / `organization_members`
 * tables through the browser client, so RLS stays the single source of truth.
 * If the database refuses a write, the caller surfaces the message as-is.
 */

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type OrgOption = { id: string; name: string };

export function useOrganizations() {
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [membership, setMembership] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: orgRows }, { data: memberRows }] = await Promise.all([
      supabase.from("organizations").select("id, name").order("created_at", { ascending: true }),
      supabase.from("organization_members").select("user_id, organization_id"),
    ]);
    setOrgs((orgRows ?? []).map((o) => ({ id: o.id, name: o.name })));
    const map: Record<string, string> = {};
    for (const m of memberRows ?? []) map[m.user_id] = m.organization_id;
    setMembership(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Moves a person to one organization. Returns an error message on failure. */
  const assign = useCallback(
    async (userId: string, organizationId: string): Promise<string | null> => {
      if (!organizationId) return null;
      if (membership[userId] === organizationId) return null;
      await supabase.from("organization_members").delete().eq("user_id", userId);
      const { error } = await supabase
        .from("organization_members")
        .insert({ user_id: userId, organization_id: organizationId });
      if (error) return error.message;
      setMembership((m) => ({ ...m, [userId]: organizationId }));
      return null;
    },
    [membership],
  );

  return { orgs, membership, loading, reload: load, assign };
}
