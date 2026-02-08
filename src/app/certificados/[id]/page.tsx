import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      module: { select: { title: true } },
    },
  });

  if (!cert) return { title: "Certificado no encontrado - QA Lab" };

  return {
    title: `Certificado: ${cert.module.title} - ${cert.user.name} - QA Lab`,
    description: `Certificado emitido a ${cert.user.name} por completar el módulo "${cert.module.title}" en QA Lab.`,
  };
}

export default async function CertificatePage({ params }: Props) {
  const { id } = await params;
  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      module: { select: { title: true } },
    },
  });

  if (!cert) notFound();

  const formattedDate = cert.issuedAt.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Certificado visual */}
        <div
          id="certificate"
          className="relative overflow-hidden rounded-2xl border-2 border-accent/30 bg-surface p-8 shadow-xl sm:p-12"
        >
          {/* Decoración esquinas */}
          <div className="absolute left-4 top-4 h-16 w-16 rounded-tl-xl border-l-4 border-t-4 border-accent/20" />
          <div className="absolute right-4 top-4 h-16 w-16 rounded-tr-xl border-r-4 border-t-4 border-accent/20" />
          <div className="absolute bottom-4 left-4 h-16 w-16 rounded-bl-xl border-b-4 border-l-4 border-accent/20" />
          <div className="absolute bottom-4 right-4 h-16 w-16 rounded-br-xl border-b-4 border-r-4 border-accent/20" />

          <div className="text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              QA Lab
            </p>
            <h1 className="mb-1 text-3xl font-bold text-foreground sm:text-4xl">
              Certificado de finalización
            </h1>
            <div className="mx-auto my-6 h-px w-24 bg-accent/40" />

            <p className="mb-1 text-sm text-muted">Otorgado a</p>
            <p className="mb-6 text-2xl font-bold text-accent sm:text-3xl">
              {cert.user.name}
            </p>

            <p className="mb-2 text-sm text-muted">
              Por completar satisfactoriamente el módulo
            </p>
            <p className="mb-6 text-xl font-semibold text-foreground">
              &ldquo;{cert.module.title}&rdquo;
            </p>

            <p className="text-sm text-muted">
              Emitido el {formattedDate}
            </p>

            <p className="mt-6 text-xs text-muted">
              ID de verificación: <code className="text-accent">{cert.id}</code>
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            Ir al inicio
          </Link>
          <Link
            href="/modulos"
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90"
          >
            Seguir aprendiendo
          </Link>
        </div>
      </div>
    </div>
  );
}
