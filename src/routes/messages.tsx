import { nowISO } from "@/lib/datetime";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Pencil,
  Send,
  Square,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui-kit";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GroupEditor } from "@/components/messages/GroupEditor";
import {
  can,
  dmKey,
  groupKey,
  uid,
  useStore,
  ROLE_LABEL,
  type Attachment,
  type ChatGroup,
  type ChatMessage,
  type User,
} from "@/lib/store";
import { faDateTimeLong, faTime, toFa } from "@/lib/format";
import { cn } from "@/lib/utils";
import chatBg from "@/assets/chat-bg.jpg";
import { Logo } from "@/components/brand/Logo";
import { useChatViewport } from "@/hooks/use-chat-viewport";
import { RecordActions } from "@/components/records/RecordActions";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "پیام‌رسان داخلی | مدیریت تعمیرگاه دوچرخه" },
      {
        name: "description",
        content: "گفت‌وگوی گروهی و خصوصی کارکنان فروشگاه و تعمیرگاه با ارسال عکس، ویدیو، فایل و ویس.",
      },
      { property: "og:title", content: "پیام‌رسان داخلی تعمیرگاه دوچرخه" },
      { property: "og:description", content: "ارتباط سریع تیم فروشگاه و تعمیرگاه در یک پیام‌رسان امن." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ c: typeof s['c'] === "string" ? (s['c'] as string) : undefined }),
  component: () => (
    <AppShell>
      <Messages />
    </AppShell>
  ),
});

const MAX_ATTACHMENT = 8 * 1024 * 1024;

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

function Messages() {
  const { state, user } = useStore();
  const { c } = Route.useSearch();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<ChatGroup | null | undefined>(undefined);
  const [q, setQ] = useState("");
  const others = useMemo(
    () => (user ? state.users.filter((u) => u.id !== user.id && u.isActive) : []),
    [state.users, user],
  );
  const myGroups = useMemo(
    () => (user ? (state.chatGroups ?? []).filter((g) => g.memberIds.includes(user.id)) : []),
    [state.chatGroups, user],
  );

  const channels = useMemo(() => {
    const list: {
      id: string;
      title: string;
      subtitle: string;
      group: boolean;
      groupId?: string;
    }[] = [];
    if (!user) return list;
    for (const g of myGroups)
      list.push({
        id: groupKey(g.id),
        title: g.title,
        subtitle: `${toFa(g.memberIds.length)} عضو`,
        group: true,
        groupId: g.id,
      });
    for (const u of others)
      list.push({
        id: dmKey(user.id, u.id),
        title: u.fullName,
        subtitle: u.title?.trim() || ROLE_LABEL[u.role],
        group: false,
      });
    return list;
  }, [others, user, myGroups]);

  if (!user) return null;
  const me = user;

  const active = channels.find((ch) => ch.id === c);
  const activeGroup = active?.groupId
    ? (state.chatGroups ?? []).find((g) => g.id === active.groupId)
    : undefined;


  if (!active)
    return (
      <>
        <PageHeader title="پیام‌رسان" subtitle="گفت‌وگوی گروهی و خصوصی با هم‌تیمی‌ها" />

        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جست‌وجوی کاربر یا گروه..."
            aria-label="جست‌وجوی گفت‌وگو"
            className="h-12 flex-1 rounded-xl border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground"
          >
            <UserPlus className="size-5" /> گروه جدید
          </button>
        </div>

        <div className="space-y-2">
          {channels
            .filter((ch) => (q.trim() ? ch.title.includes(q.trim()) : true))
            .map((ch) => {
              const msgs = state.messages.filter((m) => m.channel === ch.id);
              const last = msgs[msgs.length - 1];
              const unread = msgs.filter(
                (m) => m.senderId !== me.id && !m.readBy.includes(me.id),
              ).length;
              const grp = ch.groupId
                ? (state.chatGroups ?? []).find((g) => g.id === ch.groupId)
                : undefined;
              return (
                <div
                  key={ch.id}
                  className="flex w-full items-center gap-2 rounded-2xl border bg-card p-3 transition-colors hover:bg-accent"
                >
                  <button
                    type="button"
                    onClick={() => void navigate({ to: "/messages", search: { c: ch.id } })}
                    className="flex min-w-0 flex-1 items-center gap-3 text-start"
                  >
                    <Avatar className="size-11">
                      <AvatarFallback className="bg-primary-soft font-bold text-primary">
                        {ch.group ? <Users className="size-5" /> : ch.title.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{ch.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {last ? last.text || attachmentLabel(last.attachment) : ch.subtitle}
                      </p>
                    </div>
                    <div className="shrink-0 text-end">
                      {last ? (
                        <span className="block text-[11px] text-muted-foreground">
                          {faTime(last.createdAt)}
                        </span>
                      ) : null}
                      {unread > 0 ? (
                        <span className="mt-1 inline-block rounded-full bg-destructive px-2 text-xs font-bold text-destructive-foreground">
                          {toFa(unread)}
                        </span>
                      ) : null}
                    </div>
                  </button>
                  {grp ? (
                    <button
                      type="button"
                      onClick={() => setEditing(grp)}
                      aria-label={`افزودن عضو به ${ch.title}`}
                      title="افزودن عضو"
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
                    >
                      <UserPlus className="size-5" />
                    </button>
                  ) : null}
                </div>
              );

            })}
        </div>

        {editing !== undefined ? (
          <GroupEditor
            group={editing}
            onClose={(channelId?: string) => {
              setEditing(undefined);
              if (channelId) void navigate({ to: "/messages", search: { c: channelId } });
            }}
          />
        ) : null}
      </>
    );

  return (
    <>
      <Chat
        channelId={active.id}
        title={active.title}
        subtitle={active.subtitle}
        me={me}
        {...(activeGroup ? { onManageMembers: () => setEditing(activeGroup) } : {})}
      />
      {editing !== undefined ? (
        <GroupEditor
          group={editing}
          onClose={() => {
            setEditing(undefined);
          }}
        />
      ) : null}
    </>
  );
}



function attachmentLabel(a?: Attachment) {
  if (!a) return "—";
  if (a.kind === "image") return "🖼 عکس";
  if (a.kind === "video") return "🎬 ویدیو";
  if (a.kind === "voice") return "🎤 پیام صوتی";
  return `📎 ${a.name}`;
}

function Chat({
  channelId,
  title,
  subtitle,
  me,
  onManageMembers,
}: {
  channelId: string;
  title: string;
  subtitle: string;
  me: User;
  onManageMembers?: () => void;
}) {

  const { state, setState, notify, log } = useStore();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Attachment | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [recording, setRecording] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);

  const messages = state.messages.filter((m) => m.channel === channelId);

  // Mark everything in this channel as read for me (polling-friendly).
  useEffect(() => {
    const unread = state.messages.filter(
      (m) => m.channel === channelId && m.senderId !== me.id && !m.readBy.includes(me.id),
    );
    if (!unread.length) return;
    setState((s) => ({
      ...s,
      messages: s.messages.map((m) =>
        unread.some((u) => u.id === m.id) ? { ...m, readBy: [...m.readBy, me.id] } : m,
      ),
    }));
  }, [state.messages, channelId, me.id, setState]);

  // Keep the newest message in view without scrolling the whole page.
  function pinToBottom() {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

  useEffect(() => {
    pinToBottom();
  }, [messages.length, channelId, draft, editing]);

  // Height follows the visible viewport so the mobile keyboard never hides
  // the composer or the last message.
  const { ref: shellRef, height: shellHeight } = useChatViewport(pinToBottom);

  async function pick(kind: "media" | "file", file?: File | null) {
    if (!file) return;
    if (file.size > MAX_ATTACHMENT) {
      toast.error("حجم فایل باید کمتر از ۸ مگابایت باشد.");
      return;
    }
    try {
      const url = await readFile(file);
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      setDraft({
        kind: kind === "media" ? (isVideo ? "video" : isImage ? "image" : "file") : "file",
        url,
        name: file.name,
      });
    } catch {
      toast.error("خواندن فایل ممکن نشد.");
    }
  }

  async function toggleRecord() {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        if (blob.size > MAX_ATTACHMENT) {
          toast.error("پیام صوتی بیش از حد طولانی است.");
          return;
        }
        const url = await readFile(new File([blob], "voice.webm", { type: blob.type }));
        setDraft({ kind: "voice", url, name: "پیام صوتی" });
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      toast.error("دسترسی به میکروفون ممکن نشد.");
    }
  }

  function send() {
    const body = text.trim();
    if (!body && !draft) return;
    if (editing) {
      setState((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.id === editing.id ? { ...m, text: body, editedAt: nowISO() } : m,
        ),
      }));
      log({
        entity: "message",
        recordId: editing.id,
        action: "ویرایش پیام",
        before: { text: editing.text },
        after: { text: body },
      });
      setEditing(null);
      setText("");
      return;
    }
    const msg: ChatMessage = {
      id: uid("m"),
      channel: channelId,
      senderId: me.id,
      text: body,
      ...(draft ? { attachment: draft } : {}),
      createdAt: nowISO(),
      readBy: [me.id],
    };
    setState((s) => ({ ...s, messages: [...s.messages, msg] }));

    // Everyone who can see this channel gets an alarm, except the sender.
    const customGroup = channelId.startsWith("g:")
      ? (state.chatGroups ?? []).find((g) => g.id === channelId.slice(2))
      : undefined;
    const recipients = channelId.startsWith("dm:")
      ? channelId.slice(3).split("|").filter((x) => x !== me.id)
      : customGroup
        ? customGroup.memberIds.filter((x) => x !== me.id)
        : state.users
            .filter((u) => u.isActive && u.id !== me.id)
            .filter((u) =>
              channelId === "partners" ? can(u, "partnersChat") : can(u, "messages"),
            )
            .map((u) => u.id);

    if (recipients.length) {
      notify({
        userRole: [],
        userIds: recipients,
        title: `پیام جدید از ${me.fullName}`,
        body: body || draft?.name || "پیوست جدید",
        url: `/messages?c=${encodeURIComponent(channelId)}`,
        type: "message",
        event: urgent ? "URGENT_MESSAGE" : "NEW_MESSAGE",
      });
    }
    setText("");
    setDraft(null);
    setUrgent(false);
  }

  return (
    <div
      ref={shellRef}
      style={shellHeight ? { height: shellHeight } : undefined}
      className="chat-shell relative -mx-4 flex h-[calc(100dvh-13.5rem)] min-h-[18rem] flex-col overflow-hidden rounded-none sm:mx-0 sm:rounded-3xl lg:h-[calc(100dvh-9.5rem)]"
    >
      <img src={chatBg} alt="" aria-hidden loading="lazy" className="chat-bg" />
      <div className="chat-veil" />

      <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-on-hero/10 bg-[oklch(0.16_0.02_52/0.45)] px-4 py-3 backdrop-blur-md">
        <button
          onClick={() => void navigate({ to: "/messages", search: { c: undefined } })}
          aria-label="بازگشت به فهرست گفت‌وگوها"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-on-hero/20 text-on-hero"
        >
          <ArrowRight className="size-5" />
        </button>
        <Logo className="size-10 rounded-full shadow-[var(--shadow-glow)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg leading-tight text-on-hero">{title}</p>
          <p className="truncate text-xs font-bold text-on-hero-muted">{subtitle}</p>
        </div>
        {onManageMembers ? (
          <button
            type="button"
            onClick={onManageMembers}
            className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-2 text-[11px] font-extrabold text-primary-foreground"
          >
            <UserPlus className="size-4" /> افزودن کاربر
          </button>
        ) : null}
      </header>

      <div
        ref={scroller}
        className="relative z-10 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4"
      >
        {messages.length === 0 ? (
          <div className="mx-auto -mt-1 flex w-fit max-w-full items-center gap-2 rounded-full bg-[oklch(0.18_0.02_52/0.55)] px-4 py-2 text-center text-xs text-on-hero-muted backdrop-blur-md">
            <Send className="size-4 shrink-0" />
            <span className="font-extrabold text-on-hero">هنوز پیامی نیست</span>
            <span>— اولین پیام را شما بفرستید.</span>
          </div>
        ) : null}
        {messages.map((m) => {
          const mine = m.senderId === me.id;
          const sender = state.users.find((u) => u.id === m.senderId);
          const seen = m.readBy.filter((id) => id !== me.id).length > 0;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[82%] px-3.5 py-2.5 text-sm shadow-[0_10px_25px_-14px_oklch(0_0_0/0.8)]",
                  mine
                    ? "grad-primary rounded-2xl rounded-be-md text-primary-foreground"
                    : "rounded-2xl rounded-bs-md bg-[oklch(0.235_0.015_52/0.62)] text-on-hero backdrop-blur-md",
                )}
              >
                {!mine ? (
                  <p className="mb-1 text-xs font-extrabold text-primary">
                    {sender?.fullName ?? "کاربر"}
                  </p>
                ) : null}
                <div className="flex items-start gap-1">
                  <div className="min-w-0 flex-1">
                    {m.attachment ? <AttachmentView a={m.attachment} /> : null}
                  </div>
                  <RecordActions
                    kind="message"
                    id={m.id}
                    title={m.text?.slice(0, 40) || "پیام"}
                    tone="onHero"
                    className="-me-1 -mt-1 size-7"
                  />
                </div>
                {m.text ? <p className="whitespace-pre-wrap break-words">{m.text}</p> : null}
                <div
                  className={cn(
                    "mt-1 flex items-center gap-2 text-[11px]",
                    mine ? "text-primary-foreground/80" : "text-on-hero-muted",
                  )}
                >
                  <span title={faDateTimeLong(m.createdAt)}>{faTime(m.createdAt)}</span>
                  {m.editedAt ? <span>ویرایش شده</span> : null}
                  {mine ? (
                    <>
                      {seen ? <CheckCheck className="size-3.5" /> : <Check className="size-3.5" />}
                      {m.text ? (
                        <button
                          onClick={() => {
                            setEditing(m);
                            setText(m.text);
                          }}
                          className="ms-auto inline-flex items-center gap-1 font-bold"
                        >
                          <Pencil className="size-3.5" /> ویرایش
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <div className="relative z-10 shrink-0 space-y-2 border-t border-on-hero/10 bg-[oklch(0.16_0.02_52/0.55)] p-3 backdrop-blur-md">

        {editing ? (
          <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs">
            <Pencil className="size-3.5" /> در حال ویرایش پیام
            <button
              onClick={() => {
                setEditing(null);
                setText("");
              }}
              className="ms-auto"
              aria-label="لغو ویرایش"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}
        {draft ? (
          <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs">
            {attachmentLabel(draft)}
            <button onClick={() => setDraft(null)} className="ms-auto" aria-label="حذف پیوست">
              <X className="size-4" />
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            placeholder="پیام خود را بنویسید…"
            className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            onClick={send}
            aria-label="ارسال پیام"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"
          >
            <Send className="size-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={mediaInput}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={(e) => void pick("media", e.target.files?.[0])}
          />
          <input
            ref={fileInput}
            type="file"
            hidden
            onChange={(e) => void pick("file", e.target.files?.[0])}
          />
          <IconBtn label="عکس یا ویدیو" onClick={() => mediaInput.current?.click()}>
            <ImageIcon className="size-5" />
          </IconBtn>
          <IconBtn label="فایل" onClick={() => fileInput.current?.click()}>
            <Paperclip className="size-5" />
          </IconBtn>
          <IconBtn label={recording ? "پایان ضبط" : "ضبط ویس"} onClick={() => void toggleRecord()}>
            {recording ? <Square className="size-5 text-destructive" /> : <Mic className="size-5" />}
          </IconBtn>
          <button
            type="button"
            aria-pressed={urgent}
            onClick={() => setUrgent((u) => !u)}
            className={`ms-auto h-10 rounded-lg px-3 text-xs font-bold ${
              urgent ? "bg-destructive text-destructive-foreground" : "bg-secondary text-foreground"
            }`}
          >
            ارسال فوری
          </button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-10 shrink-0 place-items-center rounded-xl border border-on-hero/25 bg-[oklch(0.2_0.02_52/0.6)] text-on-hero"
    >
      {children}
    </button>
  );
}

function AttachmentView({ a }: { a: Attachment }) {
  if (a.kind === "image")
    return <img src={a.url} alt={a.name} className="mb-2 max-h-64 rounded-xl object-cover" />;
  if (a.kind === "video")
    return <video src={a.url} controls className="mb-2 max-h-64 w-full rounded-xl" />;
  if (a.kind === "voice") return <audio src={a.url} controls className="mb-2 w-56" />;
  return (
    <a
      href={a.url}
      download={a.name}
      className="mb-2 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 font-bold"
    >
      <Video className="hidden" />
      <Paperclip className="size-4" /> {a.name}
    </a>
  );
}
