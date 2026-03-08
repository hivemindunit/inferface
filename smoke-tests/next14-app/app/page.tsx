/**
 * Smoke test: Next.js 14 App Router consuming @inferface/hooks.
 * This page demonstrates importing useCompletion in a client component
 * within the App Router paradigm.
 */
"use client";

import { useCompletion } from "@inferface/hooks";

export default function Page() {
  const { completion, complete, isLoading, error, reset } = useCompletion({
    api: "/api/completion",
    providerFormat: "openai",
    onFinish: (text) => console.log("Completion finished:", text),
  });

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem" }}>
      <h1>inferface + Next.js 14</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          complete(formData.get("prompt") as string);
        }}
      >
        <input
          name="prompt"
          placeholder="Enter a prompt..."
          disabled={isLoading}
          style={{ width: "100%", padding: "0.5rem" }}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Generating..." : "Generate"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error.message}</p>}

      {completion && (
        <div>
          <h2>Result</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{completion}</pre>
          <button onClick={reset}>Clear</button>
        </div>
      )}
    </main>
  );
}
