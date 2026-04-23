import DetectionsView from "./DetectionsView";

export default function DetectionsPage() {
  return (
    <div className="max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Detections</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          External anti-cheat detections reported to the API.
        </p>
      </header>
      <DetectionsView />
    </div>
  );
}
