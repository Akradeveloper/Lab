"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

type DbType = "sqlite" | "mysql";

export default function AdminBaseDeDatosPage() {
  const [dbType, setDbType] = useState<DbType | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetch("/api/admin/db/type", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.database === "mysql" || data?.database === "sqlite") {
          setDbType(data.database);
        } else {
          setDbType("sqlite");
        }
      })
      .catch(() => setDbType("sqlite"));
  }, []);

  const isMySQL = dbType === "mysql";
  const backupExt = isMySQL ? ".json" : ".db";
  const acceptExt = isMySQL ? ".json" : ".db";

  async function handleRestoreSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRestoreStatus(null);
    const form = e.currentTarget;
    const fileInput =
      form.querySelector<HTMLInputElement>('input[name="file"]');
    if (!fileInput?.files?.length) {
      setRestoreStatus({ type: "error", message: `Selecciona un archivo ${backupExt}` });
      return;
    }
    setRestoring(true);
    try {
      const formData = new FormData();
      formData.set("file", fileInput.files[0]);
      const res = await fetch("/api/admin/db/restore", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRestoreStatus({
          type: "success",
          message: data.message ?? "Base de datos restaurada correctamente",
        });
        formRef.current?.reset();
      } else {
        setRestoreStatus({
          type: "error",
          message: data.error ?? `Error ${res.status}`,
        });
      }
    } catch (err) {
      setRestoreStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Error de conexión",
      });
    } finally {
      setRestoring(false);
    }
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold text-foreground">
        Base de datos
      </h1>
      <p className="mb-8 text-muted">
        Descarga una copia de la base de datos o restaura desde un archivo{" "}
        {dbType ? backupExt : ".db o .json"} guardado.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <section
          className="rounded-lg border border-border bg-surface p-6"
          aria-labelledby="admin-backup-download-heading"
        >
          <h2
            id="admin-backup-download-heading"
            className="mb-2 text-xl font-semibold text-foreground"
          >
            Descargar backup
          </h2>
          <p className="mb-6 text-muted">
            Guarda una copia de la base de datos en tu equipo ({dbType ? backupExt : "archivo"}).
            El archivo incluirá la fecha y hora en el nombre.
          </p>
          <a
            href="/api/admin/db/backup"
            download={dbType ? `backup.${backupExt.replace(".", "")}` : undefined}
            className="inline-block rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Descargar backup
          </a>
        </section>

        <section
          className="rounded-lg border border-border bg-surface p-6"
          aria-labelledby="admin-backup-restore-heading"
        >
          <h2
            id="admin-backup-restore-heading"
            className="mb-2 text-xl font-semibold text-foreground"
          >
            Restaurar backup
          </h2>
          <p className="mb-4 text-muted">
            Sube un archivo {dbType ? backupExt : ".db o .json"} para reemplazar la base de datos actual.
            Recomendado: cierra otras pestañas del admin durante la
            restauración.
          </p>
          <form
            ref={formRef}
            onSubmit={handleRestoreSubmit}
            className="flex flex-col gap-4"
          >
            <input
              type="file"
              name="file"
              accept={dbType ? acceptExt : ".db,.json"}
              required
              className="block w-full text-sm text-muted file:mr-4 file:rounded file:border file:border-accent file:bg-accent/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent file:transition-colors hover:file:bg-accent/20"
            />
            <button
              type="submit"
              disabled={restoring}
              className="w-fit rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
            >
              {restoring ? "Restaurando…" : "Restaurar"}
            </button>
          </form>
          {restoreStatus && (
            <p
              role="alert"
              className={`mt-4 text-sm ${
                restoreStatus.type === "success"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {restoreStatus.message}
            </p>
          )}
        </section>
      </div>

      <p className="mt-8">
        <Link
          href="/admin"
          className="text-sm text-muted underline hover:text-foreground"
        >
          Volver al inicio del panel
        </Link>
      </p>
    </>
  );
}
