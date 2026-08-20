import { nowISO } from "@/lib/datetime";
import { useState } from "react";
import { Check, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";

import { roleTitle, uid, useStore, type ChatGroup } from "@/lib/store";

/**
 * Create/edit sheet for a custom chat group. Any person with an account in the
 * app can be added, so the admin can build any group they need.
 */
export function GroupEditor({
  group,
  onClose,
}: {
  /** Existing group to edit, or null to build a new one. */
  group: ChatGroup | null;
  onClose: (channelId?: string) => void;
}) {
  const { state, setState, user, log } = useStore();
  const [title, setTitle] = useState(group?.title ?? "");
  const [members, setMembers] = useState<string[]>(group?.memberIds ?? (user ? [user.id] : []));
  const [q, setQ] = useState("");

  if (!user) return null;
  const me = user;

  const people = state.users
    .filter((u) => !u.isArchived)
    .filter((u) => {
      const t = q.trim();
      if (!t) return true;
      return `${u.fullName} ${u.username} ${u.phone}`.includes(t);
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "fa"));

  function toggle(id: string) {
    setMembers((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  }

  function save() {
    const name = title.trim();
    if (!name) {
      toast.error("نام گروه را وارد کنید.");
      return;
    }
    const memberIds = Array.from(new Set([me.id, ...members]));
    if (memberIds.length < 2) {
      toast.error("حداقل یک کاربر دیگر را به گروه اضافه کنید.");
      return;
    }
    const next: ChatGroup = group
      ? { ...group, title: name, memberIds }
      : {
          id: uid("g"),
          title: name,
          memberIds,
          createdBy: me.id,
          createdAt: nowISO(),
        };
    setState((s) => ({
      ...s,
      chatGroups: (s.chatGroups ?? []).some((g) => g.id === next.id)
        ? (s.chatGroups ?? []).map((g) => (g.id === next.id ? next : g))
        : [...(s.chatGroups ?? []), next],
    }));
    log({
      entity: "message",
      recordId: next.id,
      action: group ? "ویرایش گروه گفت‌وگو" : "ساخت گروه گفت‌وگو",
      note: `${name} — ${memberIds.length} عضو`,
    });
    toast.success(group ? "گروه به‌روزرسانی شد" : "گروه ساخته شد");
    onClose(`g:${next.id}`);
  }

  function remove() {
    if (!group) return;
    setState((s) => ({
      ...s,
      chatGroups: (s.chatGroups ?? []).filter((g) => g.id !== group.id),
    }));
    log({
      entity: "message",
      recordId: group.id,
      action: "حذف گروه گفت‌وگو",
      note: group.title,
    });
    toast.success("گروه حذف شد");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <span className="flex items-center gap-2 font-extrabold">
          <Users className="size-5 text-primary" />
          {group ? "اعضای گروه" : "گروه جدید"}
        </span>
        <button
          type="button"
          onClick={() => onClose()}
          aria-label="بستن"
          className="grid size-9 place-items-center rounded-full border"
        >
          <X className="size-5" />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="space-y-2">
          <label htmlFor="group-title" className="block text-sm font-bold">
            نام گروه
          </label>
          <input
            id="group-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً گروه تعمیرکاران"
            className="h-12 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="group-search" className="block text-sm font-bold">
            جست‌وجوی کاربران ({members.length} عضو انتخاب شده)
          </label>
          <input
            id="group-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="نام یا نام کاربری"
            className="h-12 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <ul className="app-card divide-y">
          {people.map((u) => {
            const active = members.includes(u.id) || u.id === user.id;
            return (
              <li key={u.id}>
                <button
                  type="button"
                  disabled={u.id === user.id}
                  onClick={() => toggle(u.id)}
                  className="flex w-full items-center gap-3 p-3 text-start disabled:opacity-70"
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-md border ${
                      active ? "border-primary bg-primary text-primary-foreground" : "bg-card"
                    }`}
                  >
                    {active ? <Check className="size-4" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      {u.fullName}
                      {u.id === user.id ? " (شما)" : ""}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {u.title?.trim() || roleTitle(u)}
                      {u.isActive ? "" : " · غیرفعال"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {people.length === 0 ? (
            <li className="p-4 text-sm font-bold text-muted-foreground">کاربری پیدا نشد.</li>
          ) : null}
        </ul>
      </div>

      <footer className="flex items-center gap-2 border-t p-4">
        <button
          type="button"
          onClick={save}
          className="h-13 flex-1 rounded-xl bg-primary text-base font-extrabold text-primary-foreground"
        >
          {group ? "ذخیره تغییرات" : "ساخت گروه"}
        </button>
        {group ? (
          <button
            type="button"
            onClick={remove}
            aria-label="حذف گروه"
            className="grid size-13 place-items-center rounded-xl bg-destructive/10 text-destructive"
          >
            <Trash2 className="size-5" />
          </button>
        ) : null}
      </footer>
    </div>
  );
}
