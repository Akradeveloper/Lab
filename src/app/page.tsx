import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex max-w-2xl flex-col items-center gap-8 px-6 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          QA Lab
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Aprende Testing y QA paso a paso, como FreeCodeCamp pero enfocado en
          calidad.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-zinc-300 px-6 py-3 font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Registrarse
          </Link>
        </div>
      </main>
    </div>
  );
}
