import LogsTabs from "./LogsTabs";

export default function LogsPage() {
  return (
    <div className="max-w-7xl w-full">
      <header className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold">Logs</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Admin actions, system events, and shop / transaction audit.
        </p>
      </header>
      <LogsTabs />
    </div>
  );
}
