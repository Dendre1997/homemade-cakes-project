import Link from "next/link";
import { cn } from "@/lib/utils";

export const MenuItem = ({ href, icon: Icon, imageUrl, label, badge, onClick, highlight = false, prefetch }: any) => (
  <Link
    href={href}
    prefetch={prefetch}
    onClick={onClick}
    className={cn(
      "group flex items-center justify-between p-2.5 rounded-[16px] transition-all duration-300",
      highlight ? "hover:bg-accent/5" : "hover:bg-primary/5"
    )}
  >
    <div className="flex items-center gap-3.5">
      <div className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 overflow-hidden",
        highlight 
          ? "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white group-hover:shadow-sm" 
          : "bg-subtleBackground text-primary/70 group-hover:bg-white group-hover:shadow-sm group-hover:text-primary"
      )}>
        {imageUrl ? (
          <img src={imageUrl} alt="" aria-hidden="true" className="h-full w-full object-cover p-1 rounded-xl" />
        ) : Icon ? (
          <Icon className="h-5 w-5 stroke-[1.5]" />
        ) : null}
      </div>
      <span className={cn(
        "font-body text-[15px] font-medium transition-colors",
        highlight ? "text-accent" : "text-primary group-hover:text-primary"
      )}>
        {label}
      </span>
    </div>
    {badge && (
      <span className={cn(
        "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        highlight ? "bg-accent/20 text-accent" : "bg-primary/10 text-primary/70"
      )}>
        {badge}
      </span>
    )}
  </Link>
);
