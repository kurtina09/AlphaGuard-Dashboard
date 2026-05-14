import AdminLogsView from "./AdminLogsView";

export default function AdminLogsPage() {
  return (
    <div className="max-w-7xl w-full">
      <header className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold">Admin Logs</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Audit trail of all admin actions — updates, bans, gifts, and more.
        </p>
      </header>
      <AdminLogsView />
    </div>
  );
}
