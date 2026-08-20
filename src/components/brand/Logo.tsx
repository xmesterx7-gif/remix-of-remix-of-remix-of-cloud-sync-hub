import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

/** Brand mark for «دز رکاب» — used in headers, sidebar, chat and login. */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="دز رکاب"
      width={96}
      height={96}
      className={cn("size-10 shrink-0 rounded-xl object-contain", className)}
    />
  );
}
