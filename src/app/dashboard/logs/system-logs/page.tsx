import SystemLogsView from "./SystemLogsView";

export default function SystemLogsPage() {
  return (
    <div className="max-w-7xl w-full">
      <header className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold">System Logs</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Server-side system events — AC detections, scheduled tasks, rewards, and more.
        </p>
      </header>
      <SystemLogsView />
    </div>
  );
}
