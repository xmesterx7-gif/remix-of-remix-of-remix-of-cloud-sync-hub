import { useState, type FormEvent } from "react";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getOwnerSetupService } from "@/lib/owner-setup-service";

const usernameSchema = z
  .string()
  .trim()
  .min(1, { message: "نام کاربری الزامی است." })
  .min(3, { message: "نام کاربری حداقل ۳ نویسه باشد." })
  .max(32, { message: "نام کاربری حداکثر ۳۲ نویسه باشد." })
  .regex(/^[a-zA-Z0-9._-]+$/, {
    message: "نام کاربری فقط حروف انگلیسی، عدد، نقطه، خط تیره و زیرخط مجاز است.",
  });

const passwordSchema = z
  .string()
  .min(1, { message: "گذرواژه الزامی است." })
  .min(8, { message: "گذرواژه حداقل ۸ نویسه باشد." })
  .max(72, { message: "گذرواژه حداکثر ۷۲ نویسه باشد." })
  .regex(/[A-Z]/, { message: "گذرواژه باید حداقل یک حرف بزرگ انگلیسی داشته باشد." })
  .regex(/[a-z]/, { message: "گذرواژه باید حداقل یک حرف کوچک انگلیسی داشته باشد." })
  .regex(/[0-9]/, { message: "گذرواژه باید حداقل یک عدد داشته باشد." })
  .regex(/[^A-Za-z0-9]/, { message: "گذرواژه باید حداقل یک نماد ویژه داشته باشد." });

const ownerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, { message: "نام و نام خانوادگی الزامی است." })
      .max(100, { message: "نام و نام خانوادگی حداکثر ۱۰۰ نویسه باشد." }),
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, { message: "تکرار گذرواژه الزامی است." }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "گذرواژه و تکرار آن یکسان نیستند.",
  });

type OwnerFormValues = z.infer<typeof ownerSchema>;
type FieldErrors = Partial<Record<keyof OwnerFormValues, string>>;

const emptyValues: OwnerFormValues = {
  fullName: "",
  username: "",
  password: "",
  confirmPassword: "",
};

/**
 * First-run OWNER setup step.
 * Validates input locally, then creates the OWNER auth account, profile, and
 * the first organization record, and keeps the session active.
 * It does NOT create membership, roles, or permissions yet.
 */
export function OwnerSetupForm({
  onBack,
  onOwnerCreated,
}: {
  onBack: () => void;
  onOwnerCreated?: (userId: string) => void;
}) {
  const [values, setValues] = useState<OwnerFormValues>(emptyValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  const setField = (key: keyof OwnerFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || createdUserId) return;
    const result = ownerSchema.safeParse(values);
    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof OwnerFormValues;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      const outcome = await getOwnerSetupService().createOwner({
        fullName: result.data.fullName,
        username: result.data.username,
        password: result.data.password,
      });

      if (!outcome.ok) {
        setFormError(outcome.message);
        return;
      }

      // Never keep the password in state after use.
      setValues((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      setCreatedUserId(outcome.userId);
      // Session stays active; signal the flow that step 1 is complete.
      onOwnerCreated?.(outcome.userId);
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : "خطای غیرمنتظره در ساخت حساب.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <CardContent className="space-y-5">
        <div className="rounded-xl bg-primary-soft/50 p-4 text-center">
          <p className="text-sm font-semibold text-foreground">
            ساخت حساب صاحب سیستم (OWNER)
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            در این مرحله فقط حساب کاربری صاحب سیستم ساخته می‌شود؛ سازمان، نقش‌ها و
            دسترسی‌ها بعداً تعریف می‌شوند.
          </p>
        </div>

        <div className="space-y-4">
          <Field
            id="owner-full-name"
            label="نام و نام خانوادگی"
            value={values.fullName}
            error={errors.fullName}
            autoComplete="name"
            onChange={(v) => setField("fullName", v)}
          />
          <Field
            id="owner-username"
            label="نام کاربری"
            value={values.username}
            error={errors.username}
            autoComplete="username"
            dir="ltr"
            onChange={(v) => setField("username", v)}
          />
          <Field
            id="owner-password"
            label="گذرواژه"
            type="password"
            value={values.password}
            error={errors.password}
            autoComplete="new-password"
            dir="ltr"
            onChange={(v) => setField("password", v)}
          />
          <Field
            id="owner-confirm-password"
            label="تکرار گذرواژه"
            type="password"
            value={values.confirmPassword}
            error={errors.confirmPassword}
            autoComplete="new-password"
            dir="ltr"
            onChange={(v) => setField("confirmPassword", v)}
          />
        </div>

        {formError ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs font-semibold text-destructive"
          >
            {formError}
          </p>
        ) : null}

        {createdUserId ? (
          <div className="space-y-1 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs font-semibold text-primary">
            <p className="flex items-center justify-center gap-2">
              <ShieldCheck className="size-4" />
              حساب صاحب سیستم، پروفایل، اولین سازمان و عضویت OWNER ساخته شدند و نشست ورود فعال است.
            </p>
            <p className="text-center font-mono text-[11px] break-all" dir="ltr">
              {createdUserId}
            </p>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="mt-6 flex-col gap-3">
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={submitting || Boolean(createdUserId)}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {createdUserId ? "حساب ساخته شد" : "ساخت حساب صاحب سیستم"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={onBack}
        >
          <ArrowRight className="size-4" />
          بازگشت
        </Button>
        <p className="text-xs text-muted-foreground">
          گذرواژه فقط برای ساخت حساب استفاده می‌شود و در جایی ذخیره نمی‌گردد.
        </p>
      </CardFooter>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  type = "text",
  dir,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  error?: string | undefined;
  onChange: (value: string) => void;
  type?: string | undefined;
  dir?: "ltr" | "rtl" | undefined;
  autoComplete?: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        dir={dir}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-errormessage={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
