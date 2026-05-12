import TransactionLogsView from "./TransactionLogsView";

export default function TransactionLogsPage() {
  return (
    <div className="max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Transactions / Shop Audit</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Currency top-up transactions and shop audit feed.
        </p>
      </header>
      <TransactionLogsView />
    </div>
  );
}
