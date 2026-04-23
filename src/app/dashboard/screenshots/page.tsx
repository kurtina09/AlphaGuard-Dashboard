import ScreenshotsView from "./ScreenshotsView";

export default function ScreenshotsPage() {
  return (
    <div className="max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Screenshots</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Screenshots pulled directly from the anti-cheat database.
        </p>
      </header>
      <ScreenshotsView />
    </div>
  );
}
