
"use client";

import Link from "next/link";
import { FC } from "react";

const Logo: FC = () => {
  return (
    <Link href="/" className="flex flex-col items-center group select-none">
      <span className="font-heading text-2xl md:text-3xl font-bold tracking-wide text-primary group-hover:text-accent transition-colors">
        DILNA
      </span>
      <span className="font-body text-[10px] md:text-xs tracking-[0.3em] text-primary/60 uppercase group-hover:text-accent/80 transition-colors">
        CAKES
      </span>
    </Link>
  );
};

export default Logo;
