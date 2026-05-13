import MatchResultsTabs from "./MatchResultsTabs";

export default function MatchResultsPage() {
  return (
    <div className="max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Match Results</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Paginated match log with boost detection, and aggregate summaries by player / mode / day.
        </p>
      </header>
      <MatchResultsTabs />
    </div>
  );
}
