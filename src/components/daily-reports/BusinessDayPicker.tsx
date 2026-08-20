import {
  JALALI_MONTH_NAMES,
  jalaliMonthLength,
  makeBusinessDay,
  todayBusinessDay,
  type BusinessDay,
} from "@/lib/daily-reports/business-day";
import { toFa } from "@/lib/format";

const selectCls =
  "h-12 w-full rounded-xl border bg-card px-2 text-sm font-bold outline-none focus:ring-2 focus:ring-ring";

/** Jalali day / month / year picker working directly on business days. */
export function BusinessDayPicker({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: BusinessDay;
  onChange: (day: BusinessDay) => void;
}) {
  const thisYear = todayBusinessDay().jy;
  const years = Array.from({ length: 11 }, (_, i) => thisYear - 5 + i);

  const set = (jy: number, jm: number, jd: number) => onChange(makeBusinessDay(jy, jm, jd));

  return (
    <div className="space-y-2">
      <span id={`${id}-label`} className="block text-sm font-bold">
        {label}
      </span>
      <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby={`${id}-label`}>
        <select
          id={id}
          aria-label="روز"
          value={value.jd}
          onChange={(e) => set(value.jy, value.jm, Number(e.target.value))}
          className={selectCls}
        >
          {Array.from({ length: jalaliMonthLength(value.jy, value.jm) }, (_, i) => i + 1).map(
            (d) => (
              <option key={d} value={d}>
                {toFa(d)}
              </option>
            ),
          )}
        </select>
        <select
          aria-label="ماه"
          value={value.jm}
          onChange={(e) => set(value.jy, Number(e.target.value), value.jd)}
          className={selectCls}
        >
          {JALALI_MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          aria-label="سال"
          value={value.jy}
          onChange={(e) => set(Number(e.target.value), value.jm, value.jd)}
          className={selectCls}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {toFa(y)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
