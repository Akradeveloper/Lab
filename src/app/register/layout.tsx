import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registro - QA Lab",
  description: "Crea tu cuenta en QA Lab",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
