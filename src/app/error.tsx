"use client";

import { useEffect } from "react";

/**
 * The most likely thing to land here is the database being unreachable, so say
 * that plainly instead of showing a stack trace to a sub-admin.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const dbDown = /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|Access denied|ER_/.test(error.message);

  return (
    <div className="auth">
      <div className="auth-box">
        <h1>{dbDown ? "Cannot reach the database" : "Something went wrong"}</h1>
        <p className="sub">
          {dbDown
            ? "The dashboard could not connect to the WordPress database. If this just started, the database server or its network access is the place to look."
            : "That page failed to load. Trying again often clears it."}
        </p>

        {error.digest && (
          <p style={{ fontSize: 12, color: "var(--muted)" }}>Reference: {error.digest}</p>
        )}

        <button className="btn" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
