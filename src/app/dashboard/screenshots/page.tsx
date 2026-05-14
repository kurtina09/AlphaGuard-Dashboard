import ScreenshotsView from "./ScreenshotsView";

export default function ScreenshotsPage() {
  return (
    <div className="max-w-6xl">
      <header className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold">Screenshots v1</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Legacy screenshots from the <code className="text-xs bg-[var(--panel-2)] px-1 py-0.5 rounded">screenshots</code> table.
        </p>
      </header>
      <ScreenshotsView />
    </div>
  );
}
