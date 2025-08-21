import ClientHeader from "@/components/(client)/Header";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ClientHeader />
      <main>{children}</main>
    </>
  );
}
