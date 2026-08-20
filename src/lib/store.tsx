import { nowISO } from "@/lib/datetime";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

import { toAuthPassword } from "./auth-shared";
import { loadAll, logActivity, pushChanges, subscribeAll, type SyncStatus } from "./db";
import { bootstrapFirstAdmin, resolveLoginEmail } from "./users.functions";


export type Role =
  | "ADMIN"
  | "GENERAL_MANAGER"
  | "STORE_MANAGER"
  | "ACCOUNTANT"
  | "EMPLOYEE"
  | "SENIOR_SELLER"
  | "MECHANIC"
  | "VIEWER";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "پشتیبان",
  GENERAL_MANAGER: "مدیر کل",
  STORE_MANAGER: "مدیر",
  ACCOUNTANT: "حسابدار",
  EMPLOYEE: "فروشنده",
  SENIOR_SELLER: "فروشنده ارشد",
  MECHANIC: "تعمیرکار",
  VIEWER: "مشاهده‌کننده",
};

/** The seven official positions, in the order the support admin thinks about them. */
export const POSITIONS: Role[] = [
  "ADMIN",
  "GENERAL_MANAGER",
  "STORE_MANAGER",
  "ACCOUNTANT",
  "EMPLOYEE",
  "SENIOR_SELLER",
  "MECHANIC",
];

/** Positions that may manage the shop (the owner/support account aside). */
export const MANAGER_POSITIONS: Role[] = ["ADMIN", "GENERAL_MANAGER", "STORE_MANAGER"];

export type User = {
  id: string;
  fullName: string;
  username: string;
  phone: string;
  password: string;
  role: Role;
  isActive: boolean;
  isWorker: boolean;
  title: string;
  /** Manual per-user access overrides set by the main admin (key -> allowed). */
  permissions?: Record<string, boolean>;
  /** Archived people stay in the history but can never sign in again. */
  isArchived?: boolean;
  /** Label of a custom role defined by the main admin (display only). */
  customRole?: string;
  /** Free-form notes the support admin keeps about the person (optional). */
  bio?: string;
};

/** A role the main admin defined manually, with its own access map. */
export type CustomRole = {
  /** Stable name, also used as the label shown across the app. */
  name: string;
  /** Base role used for database level rules. */
  baseRole: Role;
  permissions: Record<string, boolean>;
};




export type Status =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SYNCED_TO_ACCOUNTING"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "CANCELLED";

export type BikeType = "GIRL" | "BOY" | "SPORT";

export const BIKE_TYPE_LABEL: Record<BikeType, string> = {
  GIRL: "دخترانه",
  BOY: "پسرانه",
  SPORT: "اسپرت",
};

/** Standard wheel sizes offered in the purchase form (inches). */
export const BIKE_SIZES = ["12", "16", "20", "24", "26", "27.5", "29"] as const;



export type BicyclePurchase = {
  id: string;
  size: string;
  brand: string;
  color: string;
  bikeType: BikeType;
  purchasePrice: number;
  description: string;
  createdBy: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SYNCED_TO_ACCOUNTING";
  reviewNote?: string;
  accountingRef?: string;
  createdAt: string;
  /** Set once the bike has been handed to a mechanic for repair. */
  repairTaskId?: string;
};

export type ExpenseCategory =
  | "MISCELLANEOUS"
  | "SALARY"
  | "BONUS"
  | "PENALTY"
  | "PERSONAL_WITHDRAWAL";

/** Order matters: it drives the order of the pickers across the app. */
export const EXPENSE_LABEL: Record<ExpenseCategory, string> = {
  MISCELLANEOUS: "هزینه",
  SALARY: "حقوق",
  BONUS: "پاداش",
  PENALTY: "جریمه",
  PERSONAL_WITHDRAWAL: "برداشت شخصی",
};

export const EXPENSE_ORDER: ExpenseCategory[] = [
  "MISCELLANEOUS",
  "SALARY",
  "BONUS",
  "PENALTY",
  "PERSONAL_WITHDRAWAL",
];

export type Expense = {
  id: string;
  category: ExpenseCategory;
  /** Free-text name, only for the generic "هزینه" category. */
  name?: string;
  amount: number;
  date: string;
  description: string;
  relatedUserId?: string;
  createdBy: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SYNCED_TO_ACCOUNTING";
  reviewNote?: string;
  accountingRef?: string;
};

export function expenseTitle(e: Expense) {
  return e.category === "MISCELLANEOUS"
    ? e.name?.trim() || EXPENSE_LABEL.MISCELLANEOUS
    : EXPENSE_LABEL[e.category];
}


export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "اولویت پایین",
  MEDIUM: "اولویت متوسط",
  HIGH: "اولویت بالا",
  URGENT: "فوری",
};

export type TaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "SYNCED_TO_ACCOUNTING";

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: "انجام‌نشده",
  IN_PROGRESS: "در حال انجام",
  SUBMITTED: "منتظر تأیید",
  APPROVED: "تأییدشده",
  REJECTED: "رد شده",
  CANCELLED: "لغو شده",
  SYNCED_TO_ACCOUNTING: "ثبت در حسابداری",
};

export type Task = {
  id: string;
  /** Assigned worker. Empty string means a general (unassigned) task. */
  workerId: string;
  /** Bicycle (purchase) this repair task belongs to, when created from inventory. */
  bikeId?: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate?: string;
  wage: number;
  finalWage?: number;
  status: TaskStatus;
  createdBy: string;
  completedNote?: string;
  /** Optional photo of the finished work (data URL). Never required. */
  photo?: string;
  /** Extra photos of the finished work (data URLs). Always optional. */
  photos?: string[];
  rejectReason?: string;
  accountingRef?: string;
  createdAt: string;
  /** Exact moment the mechanic submitted the work. */
  submittedAt?: string;
  /** Exact moment the manager approved the wage. */
  approvedAt?: string;
  /** Exact moment the wage was marked as booked in accounting. */
  accountingAt?: string;
  /** Manager note required whenever the wage amount is changed. */
  wageNote?: string;
  /** Correction request filed by the worker on a locked task. */
  editRequest?: string;
  editRequestAt?: string;
  /** Exact moment of the last edit. */
  updatedAt?: string;
};


export type InvoiceStatus =
  | "PRE_INVOICE"
  | "PURCHASED"
  | "PENDING_FINAL"
  | "FINALIZED"
  | "SYNCED_TO_ACCOUNTING";

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  PRE_INVOICE: "پیش‌فاکتور",
  PURCHASED: "خرید شده",
  PENDING_FINAL: "در انتظار نهایی‌سازی",
  FINALIZED: "نهایی شده",
  SYNCED_TO_ACCOUNTING: "ثبت در حسابداری",
};

export type InvoiceItem = {
  id: string;
  productName: string;
  probableQty: number;
  probableUnitPrice: number;
  finalQty?: number;
  finalUnitPrice?: number;
  notes?: string;
};

export type PurchaseInvoice = {
  id: string;
  invoiceNumber: string;
  supplier: string;
  date: string;
  status: InvoiceStatus;
  notes: string;
  createdBy: string;
  accountingRef?: string;
  items: InvoiceItem[];
};

/** Importance level chosen by the main admin for every kind of event. */
export type NotifyLevel = "NORMAL" | "IMPORTANT" | "URGENT";

export const LEVEL_LABEL: Record<NotifyLevel, string> = {
  NORMAL: "عادی",
  IMPORTANT: "مهم",
  URGENT: "فوری",
};

export type AppNotification = {
  id: string;
  userRole: Role[];
  /** When set, only these users receive the notification. */
  userIds?: string[];
  title: string;
  body: string;
  url: string;
  type: "purchase" | "expense" | "task" | "invoice" | "accounting" | "message";
  priority: NotifyLevel;
  isRead: boolean;
  createdAt: string;
  /** Vibration pattern in ms (vibrate/pause pairs). Falls back to alarm settings. */
  vibratePattern?: number[];
  /** ISO time the alarm should actually reach the user's phone. */
  deliverAt: string;
  delivered: boolean;
};

export type Attachment = {
  kind: "image" | "video" | "file" | "voice";
  /** Data URL of the attachment (stored locally on the device). */
  url: string;
  name: string;
};

export type ChatMessage = {
  id: string;
  /** "public" | "partners" | "dm:<idA>|<idB>" */
  channel: string;
  senderId: string;
  text: string;
  attachment?: Attachment;
  createdAt: string;
  editedAt?: string;
  readBy: string[];
};

/** Stable channel id for a private chat between two users. */
export function dmKey(a: string, b: string) {
  return `dm:${[a, b].sort().join("|")}`;
}

/** A chat group built by hand: any users of the app can be added to it. */
export type ChatGroup = {
  id: string;
  title: string;
  memberIds: string[];
  createdBy: string;
  createdAt: string;
};

/** Stable channel id for a custom group chat. */
export function groupKey(id: string) {
  return `g:${id}`;
}

/** Banner pictures the admin can replace from the settings page. */
export type Banners = {
  /** Banner shown on the login screen (data URL; empty = built-in picture). */
  login: string;
  /** Banner shown on top of every in-app page (data URL; empty = login banner). */
  app: string;
};


/** Events the main admin can switch alarms on/off for. */
export type AlarmEventKey =
  | "NEW_MESSAGE"
  | "URGENT_MESSAGE"
  | "NEW_TASK"
  | "TASK_STATUS"
  | "BONUS_PENALTY";

export const ALARM_EVENT_LABEL: Record<AlarmEventKey, string> = {
  NEW_MESSAGE: "پیام جدید",
  URGENT_MESSAGE: "پیام فوری",
  NEW_TASK: "وظیفه جدید",
  TASK_STATUS: "تغییر وضعیت وظیفه",
  BONUS_PENALTY: "پاداش یا جریمه",
};

export const ALARM_EVENT_KEYS = Object.keys(ALARM_EVENT_LABEL) as AlarmEventKey[];

export type AlarmEventConfig = {
  enabled: boolean;
  level: NotifyLevel;
  sound: boolean;
  vibrate: boolean;
};

/** Quiet-hours style alarm window managed by the main admin. */
export type AlarmSettings = {
  enabled: boolean;
  /** Alarms only ring between startHour:00 and endHour:00 (24h clock). */
  startHour: number;
  endHour: number;
  /** Roles the window applies to; other roles get alarms instantly. */
  roles: Role[];
  vibrate: boolean;
  sound: boolean;
  /** How many vibration pulses a normal alarm plays. */
  vibratePulses: number;
  /** Length of every pulse in milliseconds (heavier = longer). */
  vibrateDuration: number;
  /** Per-event alarm rules chosen by the main admin. */
  events: Record<AlarmEventKey, AlarmEventConfig>;
};

export const DEFAULT_ALARM_EVENTS: Record<AlarmEventKey, AlarmEventConfig> = {
  NEW_MESSAGE: { enabled: true, level: "NORMAL", sound: true, vibrate: true },
  URGENT_MESSAGE: { enabled: true, level: "URGENT", sound: true, vibrate: true },
  NEW_TASK: { enabled: true, level: "IMPORTANT", sound: true, vibrate: true },
  TASK_STATUS: { enabled: true, level: "NORMAL", sound: true, vibrate: true },
  BONUS_PENALTY: { enabled: true, level: "IMPORTANT", sound: true, vibrate: true },
};

/** Builds a vibrate/pause pattern from a pulse count and pulse length. */
export function buildVibratePattern(pulses: number, duration: number): number[] {
  const p = Math.max(1, Math.min(10, Math.round(pulses)));
  const d = Math.max(100, Math.min(2000, Math.round(duration)));
  return Array.from({ length: p * 2 - 1 }, (_, i) => (i % 2 === 0 ? d : 150));
}

/** Stronger alarms for more important events. */
export function levelPattern(level: NotifyLevel, alarms: AlarmSettings): number[] {
  if (level === "URGENT") return buildVibratePattern(6, Math.max(700, alarms.vibrateDuration));
  if (level === "IMPORTANT") return buildVibratePattern(4, alarms.vibrateDuration);
  return buildVibratePattern(alarms.vibratePulses, alarms.vibrateDuration);
}

/** Short beep pattern; urgent alarms sound louder and longer. */
export function playAlarmSound(level: NotifyLevel) {
  try {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    const ctx = new Ctor();
    const beeps = level === "URGENT" ? 3 : level === "IMPORTANT" ? 2 : 1;
    for (let i = 0; i < beeps; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = level === "URGENT" ? 980 : 660;
      gain.gain.value = level === "URGENT" ? 0.28 : 0.16;
      osc.connect(gain).connect(ctx.destination);
      const start = ctx.currentTime + i * 0.35;
      osc.start(start);
      osc.stop(start + 0.22);
    }
    window.setTimeout(() => void ctx.close(), 1500);
    return true;
  } catch {
    return false;
  }
}

/** تم‌های اپلیکیشن: روشن، تیره و طرح ویژه نارنجی. */
export type ThemeName = "light" | "dark" | "vivid";

export const THEME_LABEL: Record<ThemeName, string> = {
  light: "حالت روز",
  dark: "حالت شب",
  vivid: "طرح ویژه",
};

export type State = {
  currentUserId: string | null;
  currency: "TOMAN" | "RIAL";
  theme: ThemeName;
  alarms: AlarmSettings;
  users: User[];
  purchases: BicyclePurchase[];
  expenses: Expense[];
  tasks: Task[];
  invoices: PurchaseInvoice[];
  notifications: AppNotification[];
  messages: ChatMessage[];
  activity: ActivityEntry[];
  /** Roles defined manually by the main admin. */
  customRoles: CustomRole[];
  /** Custom chat groups built by the admin. */
  chatGroups: ChatGroup[];
  /** Replaceable banner pictures. */
  banners: Banners;
};


/** One immutable line of the change history. */
export type ActivityEntry = {
  id: string;
  entity: "task" | "message" | "expense" | "user" | "wage" | "file";
  recordId: string;
  userId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  note?: string;
  createdAt: string;
};

export const ENTITY_LABEL: Record<ActivityEntry["entity"], string> = {
  task: "وظیفه",
  message: "پیام",
  expense: "هزینه",
  user: "کاربر",
  wage: "دستمزد",
  file: "فایل",
};

export const DEFAULT_ALARMS: AlarmSettings = {
  enabled: true,
  startHour: 16,
  endHour: 23,
  roles: ["MECHANIC"],
  vibrate: true,
  sound: true,
  vibratePulses: 3,
  vibrateDuration: 500,
  events: DEFAULT_ALARM_EVENTS,
};

/** The only account that ships with the app; every other user is created by the admin. */
const users: User[] = [
  {
    id: "u1",
    fullName: "مهدی",
    username: "mehdi",
    phone: "09120000001",
    password: "1400",
    role: "ADMIN",
    isActive: true,
    isWorker: false,
    title: "پشتیبان",
  },
];

const initialState: State = {
  currentUserId: null,
  currency: "TOMAN",
  theme: "dark",
  alarms: DEFAULT_ALARMS,
  users,
  purchases: [],
  expenses: [],
  tasks: [],
  invoices: [],
  notifications: [],
  messages: [],
  activity: [],
  customRoles: [],
  chatGroups: [],
  banners: { login: "", app: "" },
};



/** Only the visual theme stays on the device; all data lives in the cloud. */
const THEME_KEY = "dar-rekab-theme";

/** Appearance is a personal preference: each account keeps its own theme. */
export function themeStorageKey(userId: string | null): string {
  return userId ? `${THEME_KEY}:${userId}` : THEME_KEY;
}


export type NotifyInput = Omit<
  AppNotification,
  "id" | "isRead" | "createdAt" | "deliverAt" | "delivered" | "priority"
> & {
  /** Which admin-configured event this alarm belongs to. */
  event?: AlarmEventKey;
  /** Explicit level; otherwise the event configuration decides. */
  priority?: NotifyLevel;
};

/** Does this notification belong to the given user? */
export function isForUser(n: AppNotification, u: User) {
  return n.userIds?.length ? n.userIds.includes(u.id) : n.userRole.includes(u.role);
}

/** Next moment the alarm may ring, honouring the admin's alarm window. */
export function computeDeliverAt(alarms: AlarmSettings, roles: Role[], from = new Date()): Date {
  if (!alarms.enabled) return from;
  const affected = roles.some((r) => alarms.roles.includes(r));
  if (!affected) return from;
  const start = alarms.startHour;
  const end = alarms.endHour;
  const h = from.getHours();
  const inWindow = start <= end ? h >= start && h < end : h >= start || h < end;
  if (inWindow) return from;
  const next = new Date(from);
  next.setMinutes(0, 0, 0);
  if (h < start) next.setHours(start);
  else {
    next.setDate(next.getDate() + 1);
    next.setHours(start);
  }
  return next;
}

type Ctx = {
  state: State;
  setState: (updater: (s: State) => State) => void;
  user: User | null;
  /** Signs in against the cloud account; resolves to false on wrong credentials. */
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => void;
  notify: (n: NotifyInput) => void;
  /** Appends one line to the immutable change history. */
  log: (entry: Omit<ActivityEntry, "id" | "createdAt" | "userId">) => void;
  setTheme: (t: ThemeName) => void;
  /** True until the first cloud load finished. */
  loading: boolean;
  /** Live connection state of the shared-data socket. */
  syncStatus: SyncStatus;
  /** Forces a fresh pull of the shared data (used by retry buttons). */
  resync: () => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState_] = useState<State>(initialState);
  /**
   * Mirror of the latest state. React may invoke a state updater more than once
   * for the same change, so updaters must stay pure: every id generation and
   * every cloud write is computed once, here, against this ref.
   */
  const latest = useRef<State>(initialState);
  const setRaw = useCallback((updater: (s: State) => State) => {
    const next = updater(latest.current);
    latest.current = next;
    setState_(next);
    return next;
  }, []);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const synced = useRef<State>(initialState);
  const pushing = useRef<Promise<void>>(Promise.resolve());
  /** Monotonic ticket so a slow response can never overwrite a newer one. */
  const loadTicket = useRef(0);
  const inFlight = useRef(false);
  const queued = useRef(false);


  // Theme is a personal preference: stored per signed-in account on the device.
  useEffect(() => {
    const saved = localStorage.getItem(
      themeStorageKey(state.currentUserId),
    ) as ThemeName | null;
    if (saved === "light" || saved === "dark" || saved === "vivid") {
      setRaw((s) => ({ ...s, theme: saved }));
    }
    setHydrated(true);
  }, [state.currentUserId]);

  useEffect(() => {
    if (hydrated)
      localStorage.setItem(themeStorageKey(state.currentUserId), state.theme);
  }, [state.theme, state.currentUserId, hydrated]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", state.theme === "dark");
    root.classList.toggle("theme-vivid", state.theme === "vivid");
    root.style.colorScheme = state.theme === "dark" ? "dark" : "light";
  }, [state.theme]);

  /**
   * Pulls the shared shop data for the signed-in device.
   * Concurrent calls collapse into one in-flight request plus a single trailing
   * one, and a stale response is discarded instead of overwriting newer data.
   */
  const refresh = useCallback(async (userId: string | null): Promise<void> => {
    if (!userId) {
      loadTicket.current += 1;
      setRaw((s) => ({ ...initialState, theme: s.theme, currentUserId: null }));
      synced.current = { ...initialState, currentUserId: null };
      setLoading(false);
      return;
    }
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    inFlight.current = true;
    const ticket = ++loadTicket.current;
    try {
      const data = await loadAll(userId);
      if (ticket !== loadTicket.current) return; // a newer load already landed
      setRaw((s) => {
        // Settings saved before per-event alarm rules existed need the defaults.
        const alarms: AlarmSettings = {
          ...DEFAULT_ALARMS,
          ...(data.alarms ?? {}),
          events: { ...DEFAULT_ALARM_EVENTS, ...(data.alarms?.events ?? {}) },
        };
        const next = { ...s, ...data, alarms, currentUserId: userId };
        synced.current = next;
        return next;
      });
      setLoading(false);
    } finally {
      inFlight.current = false;
      if (queued.current) {
        queued.current = false;
        void refresh(userId);
      }
    }
  }, [setRaw]);

  const activeUserId = useRef<string | null>(null);
  const resync = useCallback(() => {
    void refresh(activeUserId.current);
  }, [refresh]);

  // Session bootstrap + realtime sync.
  useEffect(() => {
    let stop: (() => void) | undefined;
    let coalesce: ReturnType<typeof setTimeout> | undefined;

    /** Batches bursts of database events into one reload. */
    const scheduleRefresh = (userId: string) => {
      if (coalesce) clearTimeout(coalesce);
      coalesce = setTimeout(() => {
        coalesce = undefined;
        void refresh(userId);
      }, 120);
    };

    const start = (userId: string) => {
      activeUserId.current = userId;
      stop = subscribeAll(
        () => scheduleRefresh(userId),
        (s) => setSyncStatus(s),
      );
    };

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id ?? null;
      activeUserId.current = userId;
      await refresh(userId);
      if (userId) start(userId);
      else setSyncStatus("offline");
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      stop?.();
      stop = undefined;
      const userId = session?.user.id ?? null;
      activeUserId.current = userId;
      if (!userId) setSyncStatus("offline");
      void refresh(userId).then(() => {
        if (userId) start(userId);
      });
    });
    return () => {
      if (coalesce) clearTimeout(coalesce);
      stop?.();
      sub.subscription.unsubscribe();
    };
  }, [refresh]);


  // Alarm delivery loop: queued alarms fire once their window opens.
  // Delivery is tracked per device, so every device a user is signed in on rings.
  const currentUser = state.users.find((u) => u.id === state.currentUserId) ?? null;
  const fired = useRef<Set<string>>(new Set());
  const warned = useRef({ sound: false, vibrate: false, notification: false });

  useEffect(() => {
    if (!currentUser) return;
    try {
      const raw = localStorage.getItem(`dz-alarms-fired-${currentUser.id}`);
      fired.current = new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      fired.current = new Set();
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (loading || !currentUser) return;
    const tick = () => {
      const mine = state.notifications.filter(
        (n) =>
          isForUser(n, currentUser) &&
          new Date(n.deliverAt).getTime() <= Date.now() &&
          !fired.current.has(n.id),
      );
      if (!mine.length) return;

      for (const n of mine) fired.current.add(n.id);
      try {
        localStorage.setItem(
          `dz-alarms-fired-${currentUser.id}`,
          JSON.stringify([...fired.current].slice(-400)),
        );
      } catch {
        /* storage full or blocked: alarms still ring this session */
      }

      // Shared "delivered" flag stays in sync for the notification centre.
      const undelivered = mine.filter((n) => !n.delivered).map((n) => n.id);
      if (undelivered.length) {
        void supabase.from("notifications").update({ delivered: true }).in("id", undelivered);
      }

      const top: NotifyLevel = mine.some((n) => n.priority === "URGENT")
        ? "URGENT"
        : mine.some((n) => n.priority === "IMPORTANT")
          ? "IMPORTANT"
          : "NORMAL";

      // In-app banner for anything above a routine alarm.
      for (const n of mine) {
        if (n.priority === "URGENT") toast.error(`${n.title} — ${n.body}`, { duration: 10_000 });
        else if (n.priority === "IMPORTANT") toast.warning(`${n.title} — ${n.body}`, { duration: 7000 });
        else toast(`${n.title} — ${n.body}`);
      }

      if (state.alarms.vibrate) {
        const pattern =
          mine.find((n) => n.vibratePattern?.length)?.vibratePattern ??
          levelPattern(top, state.alarms);
        const ok =
          typeof navigator !== "undefined" &&
          "vibrate" in navigator &&
          navigator.vibrate?.(pattern) !== false;
        if (!ok && !warned.current.vibrate) {
          warned.current.vibrate = true;
          toast.error("ویبره روی این دستگاه در دسترس نیست.");
        }
      }

      if (state.alarms.sound && !playAlarmSound(top) && !warned.current.sound) {
        warned.current.sound = true;
        toast.error("پخش صدای آلارم ممکن نشد؛ یک‌بار روی صفحه ضربه بزنید تا صدا فعال شود.");
      }

      if (typeof Notification !== "undefined") {
        if (Notification.permission === "granted") {
          for (const n of mine) {
            try {
              new Notification(n.title, {
                body: n.body,
                tag: n.id,
                requireInteraction: n.priority === "URGENT",
                ...(n.vibratePattern ? { vibrate: n.vibratePattern } : {}),
              } as NotificationOptions);
            } catch {
              /* the OS refused this notification; the in-app banner already showed */
            }
          }
        } else if (Notification.permission === "denied" && !warned.current.notification) {
          warned.current.notification = true;
          toast.error("اجازهٔ نوتیفیکیشن سیستم داده نشده است؛ اعلان‌ها فقط داخل برنامه نمایش داده می‌شوند.");
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [loading, state.notifications, state.alarms, currentUser]);

  const value = useMemo<Ctx>(() => {
    /** Applies a change locally, then mirrors it to the cloud for every device. */
    const setState = (updater: (s: State) => State) => {
      setRaw((prev) => {
        const next = updater(prev);
        const base = synced.current;
        synced.current = next;
        pushing.current = pushing.current
          .then(() => pushChanges(base, next, next.currentUserId))
          .then(() => {
            // The optimistic state is never the source of truth: once the write
            // is acknowledged we reconcile against what the database actually has.
            void refresh(next.currentUserId);
          })
          .catch((err: unknown) => {
            toast.error(err instanceof Error ? err.message : "ذخیره در سرور ناموفق بود.");
            return refresh(next.currentUserId);
          });
        return next;
      });
    };

    return {
      state,
      loading,
      syncStatus,
      resync,
      setState,

      user: state.users.find((u) => u.id === state.currentUserId) ?? null,
      login: async (identifier: string, password: string) => {
        let email: string | null = null;
        try {
          const res = await resolveLoginEmail({ data: { identifier } });
          email = res.email;
          if (email && !res.active) return false;
        } catch {
          return false;
        }
        if (!email) {
          // First ever run: the initial admin account is created on the spot.
          try {
            const res = await bootstrapFirstAdmin({
              data: { fullName: identifier, username: identifier, password },
            });
            email = res.email;
          } catch {
            return false;
          }
        }
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: toAuthPassword(password),
        });
        if (error || !data.user) return false;
        await refresh(data.user.id);
        return true;
      },
      logout: () => {
        void supabase.auth.signOut();
        setRaw((s) => ({ ...initialState, theme: s.theme }));
        synced.current = initialState;
      },
      setTheme: (t) => setRaw((s) => ({ ...s, theme: t })),
      log: (entry) => {
        const userId = state.currentUserId;
        if (!userId) return;
        const row: ActivityEntry = {
          ...entry,
          id: uid("a"),
          userId,
          createdAt: nowISO(),
        };
        setRaw((s) => ({ ...s, activity: [row, ...s.activity] }));
        synced.current = { ...synced.current, activity: [row, ...synced.current.activity] };
        void logActivity({ ...entry, userId }).catch((err: unknown) => {
          toast.error(err instanceof Error ? err.message : "ثبت تاریخچه ناموفق بود.");
        });
      },
      notify: (n) =>
        setState((s) => {
          const cfg = n.event ? s.alarms.events?.[n.event] : undefined;
          // The main admin can switch a whole event category off.
          if (cfg && !cfg.enabled) return s;
          const priority: NotifyLevel = n.priority ?? cfg?.level ?? "NORMAL";
          const roles = n.userIds?.length
            ? s.users.filter((u) => n.userIds!.includes(u.id)).map((u) => u.role)
            : n.userRole;
          const deliverAt =
            priority === "URGENT" ? new Date() : computeDeliverAt(s.alarms, roles, new Date());
          const pattern =
            n.vibratePattern ??
            (cfg && !cfg.vibrate ? [] : levelPattern(priority, s.alarms));
          const { event: _event, ...rest } = n;
          return {
            ...s,
            notifications: [
              {
                ...rest,
                priority,
                vibratePattern: pattern,
                id: uid("n"),
                isRead: false,
                createdAt: nowISO(),
                deliverAt: deliverAt.toISOString(),
                delivered: false,
              },
              ...s.notifications,
            ],
          };
        }),
    };
  }, [state, loading, refresh, syncStatus, resync]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}



export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function uid(_prefix?: string) {
  // Cloud rows use real UUIDs so every device agrees on the same identity.
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

/** Server-side permission-style matrix, also used to build navigation. */
export const CAN: Record<string, Role[]> = {
  dashboard: ["ADMIN", "GENERAL_MANAGER", "STORE_MANAGER", "SENIOR_SELLER", "EMPLOYEE", "ACCOUNTANT", "VIEWER"],
  purchases: ["ADMIN", "GENERAL_MANAGER", "STORE_MANAGER", "SENIOR_SELLER", "EMPLOYEE", "ACCOUNTANT", "VIEWER"],
  inventory: ["ADMIN", "GENERAL_MANAGER", "STORE_MANAGER", "SENIOR_SELLER", "EMPLOYEE", "VIEWER"],
  expenses: ["ADMIN", "GENERAL_MANAGER", "STORE_MANAGER", "SENIOR_SELLER", "EMPLOYEE", "ACCOUNTANT", "VIEWER"],
  tasks: ["ADMIN", "GENERAL_MANAGER", "STORE_MANAGER", "SENIOR_SELLER", "EMPLOYEE", "MECHANIC", "VIEWER"],
  invoices: ["ADMIN", "GENERAL_MANAGER", "STORE_MANAGER", "ACCOUNTANT"],
  notifications: ["ADMIN", "GENERAL_MANAGER", "STORE_MANAGER", "SENIOR_SELLER", "EMPLOYEE", "MECHANIC", "ACCOUNTANT", "VIEWER"],
  messages: ["ADMIN", "GENERAL_MANAGER", "STORE_MANAGER", "SENIOR_SELLER", "EMPLOYEE", "MECHANIC", "ACCOUNTANT"],
  partnersChat: ["ADMIN", "GENERAL_MANAGER", "STORE_MANAGER"],
  earnings: ["ADMIN", "GENERAL_MANAGER", "STORE_MANAGER", "MECHANIC", "ACCOUNTANT"],
  reports: ["ADMIN", "GENERAL_MANAGER", "STORE_MANAGER", "SENIOR_SELLER", "ACCOUNTANT", "VIEWER"],
  users: ["ADMIN"],
  settings: ["ADMIN"],
  exports: ["ADMIN", "GENERAL_MANAGER", "STORE_MANAGER", "ACCOUNTANT"],
  approve: ["ADMIN", "GENERAL_MANAGER", "STORE_MANAGER"],
  syncAccounting: ["ADMIN", "ACCOUNTANT"],
  personalWithdrawal: ["ADMIN", "GENERAL_MANAGER", "STORE_MANAGER"],
  /** Creating or changing records at all (viewers are strictly read-only). */
  write: ["ADMIN", "GENERAL_MANAGER", "STORE_MANAGER", "SENIOR_SELLER", "EMPLOYEE", "MECHANIC", "ACCOUNTANT"],
};

/** Human labels for the manual access panel in user management. */
export const PERMISSION_LABEL: Record<string, string> = {
  dashboard: "خانه و داشبورد",
  purchases: "خرید دوچرخه",
  inventory: "دوچرخه‌ها",
  expenses: "هزینه‌ها",
  tasks: "وظایف",
  invoices: "فاکتورهای خرید",
  notifications: "اعلان‌ها",
  messages: "پیام‌رسان داخلی",
  partnersChat: "گروه شرکا",
  earnings: "دستمزد و پاداش",
  reports: "گزارش و تحلیل",
  users: "مدیریت کاربران",
  settings: "تنظیمات سامانه",
  exports: "خروجی حسابداری",
  approve: "تأیید و بررسی موارد",
  syncAccounting: "ثبت در حسابداری",
  personalWithdrawal: "برداشت شخصی",
  write: "ثبت و ویرایش اطلاعات",
};

export const PERMISSION_KEYS = Object.keys(PERMISSION_LABEL);

/** Sections shown in «تغییر دسترسی کاربران», grouped the way the support admin thinks. */
export const PERMISSION_GROUPS: { title: string; keys: string[] }[] = [
  { title: "مدیریت فروشگاه", keys: ["dashboard", "inventory", "purchases", "invoices"] },
  { title: "فروش و مالی", keys: ["expenses", "exports", "syncAccounting", "personalWithdrawal"] },
  { title: "وظایف", keys: ["tasks", "approve", "write"] },
  { title: "دستمزدها", keys: ["earnings"] },
  { title: "آلارم‌ها", keys: ["notifications"] },
  { title: "چت‌ها", keys: ["messages", "partnersChat"] },
  { title: "گزارش‌ها", keys: ["reports"] },
  { title: "تنظیمات و کاربران", keys: ["settings", "users"] },
];

/**
 * Access check. Accepts a role or a full user; per-user overrides set by the
 * support admin always win over the role matrix. The support account (ADMIN)
 * always keeps the highest level of access.
 */
export function can(
  subject: Role | User | undefined | null,
  key: keyof typeof CAN | string,
): boolean {
  if (!subject) return false;
  if (typeof subject === "string") return (CAN[key] ?? []).includes(subject);
  if (!subject.isActive || subject.isArchived) return false;
  if (subject.role === "ADMIN") return true;
  const override = subject.permissions?.[key];
  if (typeof override === "boolean") return override;
  return (CAN[key] ?? []).includes(subject.role);
}

/** Label shown for a person: the admin's custom role wins over the base role. */
export function roleTitle(u: Pick<User, "role" | "customRole">) {
  return u.customRole?.trim() || ROLE_LABEL[u.role];
}

/**
 * Task approval (تأیید وظیفه) is OWNER-only.
 *
 * The database enforces this too (`guard_task_update` → `APPROVAL_OWNER_ONLY`),
 * so the UI must not offer the action to managers or to users who were granted
 * the generic `approve` review permission — the write would be rejected.
 * Deliberately NOT overridable through per-user permissions.
 */
export function canApproveTask(u: User | null | undefined): boolean {
  if (!u || !u.isActive || u.isArchived) return false;
  return u.role === "ADMIN";
}


/** Effective access map for a user (used by the admin access panel). */
export function effectivePermissions(u: User): Record<string, boolean> {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, can(u, k)]));
}

