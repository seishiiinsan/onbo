export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "3rem", letterSpacing: "-0.04em" }}>Onbo</h1>
      <p style={{ opacity: 0.7, maxWidth: "40ch" }}>
        Portail d&apos;onboarding client pour agences web. L&apos;infrastructure
        est en place — le produit arrive.
      </p>
      <code style={{ opacity: 0.5, fontSize: "0.85rem" }}>
        Next.js 15 · Prisma · PostgreSQL · Docker
      </code>
    </main>
  );
}
