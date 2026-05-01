import ScreenshotsView from "../screenshots/ScreenshotsView";

export default function ScreenshotsV2Page() {
  return (
    <div className="max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Screenshots v2</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Screenshots pulled from the <code className="text-xs bg-[var(--panel-2)] px-1 py-0.5 rounded">screenshots_v2</code> table.
        </p>
      </header>
      <ScreenshotsView table="screenshots_v2" />
    </div>
  );
}
