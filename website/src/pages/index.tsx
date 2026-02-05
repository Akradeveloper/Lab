import React from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";

export default function Home(): JSX.Element {
  return (
    <Layout title="Inicio" description="Documentación de QA Lab">
      <main style={{ padding: "2rem", textAlign: "center" }}>
        <h1>QA Lab</h1>
        <p>Aprende Testing y QA paso a paso.</p>
        <Link to="/docs/intro" className="button button--primary">
          Ir a la documentación
        </Link>
      </main>
    </Layout>
  );
}
