"use client";

type OrderDetailShellProps = {
  header: React.ReactNode;
  main: React.ReactNode;
  aside: React.ReactNode;
  notes: React.ReactNode;
  mobileBar?: React.ReactNode;
  /** On a phone, show the aside above the main column. Wide screens keep main on the left. */
  mobileAsideFirst?: boolean;
  /** Sticky offset for the aside. Defaults to the production-order header. */
  asideStickyClassName?: string;
};

export function OrderDetailShell({
  header,
  main,
  aside,
  notes,
  mobileBar,
  mobileAsideFirst = false,
  asideStickyClassName = "lg:top-[5.5rem]",
}: OrderDetailShellProps) {
  const asideClassName = `space-y-6 lg:sticky ${asideStickyClassName} lg:self-start`;
  const mainClassName = "space-y-6 lg:col-span-2";

  return (
    <section
      className={`mx-auto max-w-[1600px] ${mobileAsideFirst ? "pb-40 lg:pb-8" : "pb-28 lg:pb-8"}`}
    >
      {header}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {mobileAsideFirst ? (
          <>
            <aside className={`order-1 lg:order-2 ${asideClassName}`}>{aside}</aside>
            <div className={`order-2 lg:order-1 ${mainClassName}`}>{main}</div>
          </>
        ) : (
          <>
            <div className={mainClassName}>{main}</div>
            <aside className={asideClassName}>{aside}</aside>
          </>
        )}
      </div>

      {notes ? <div className="mt-6">{notes}</div> : null}

      {mobileBar}
    </section>
  );
}
