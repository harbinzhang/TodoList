const REQUIRED_FIREBASE_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export default function StartupErrorScreen({
  error,
  isHostedBuild,
}: {
  error: Error;
  isHostedBuild: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-16 text-slate-50">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Startup blocked
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Firebase environment is not configured
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            The app did not boot because the required Vite Firebase variables are missing or invalid.
          </p>
        </div>

        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4">
          <p className="text-sm font-medium text-rose-100">{error.message}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              Next step
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {isHostedBuild ? (
                <>
                  Rebuild and redeploy with the Firebase web app variables present at build time. Firebase
                  Hosting serves static assets and cannot inject missing <code>VITE_*</code> values after
                  deployment.
                </>
              ) : (
                <>
                  Create <code>.env.local</code> from <code>.env.example</code> and fill in the Firebase web
                  app values before restarting Vite.
                </>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              Required keys
            </h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-cyan-100">
              {REQUIRED_FIREBASE_KEYS.map((key) => (
                <code
                  key={key}
                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1"
                >
                  {key}
                </code>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm leading-6 text-slate-300">
            {isHostedBuild ? (
              <>This should be treated as a build or deployment misconfiguration, not a runtime Firebase outage.</>
            ) : (
              <>
                After updating the env file, restart the Vite dev server so <code>import.meta.env</code>{' '}
                reloads.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
