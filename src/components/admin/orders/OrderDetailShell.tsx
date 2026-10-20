"use client";

type OrderDetailShellProps = {
  header: React.ReactNode;
  main: React.ReactNode;
  aside: React.ReactNode;
  notes: React.ReactNode;
  mobileBar?: React.ReactNode;
};

export function OrderDetailShell({
  header,
  main,
  aside,
  notes,
  mobileBar,
}: OrderDetailShellProps) {
  return (
    <section className="mx-auto max-w-[1600px] pb-28 lg:pb-8">
      {header}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <div className="space-y-6 lg:col-span-2">{main}</div>
        <aside className="space-y-6 lg:sticky lg:top-[5.5rem] lg:self-start">
          {aside}
        </aside>
      </div>

      <div className="mt-6">{notes}</div>

      {mobileBar}
    </section>
  );
}
