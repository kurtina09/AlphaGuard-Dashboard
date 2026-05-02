import HwidManagerView from "./HwidManagerView";

export default function HwidManagerPage() {
  return (
    <div className="max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">HWID Manager</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Look up a player&apos;s hardware IDs and manage the banned HWID list.
          Banned HWIDs immediately prevent the player from entering the game.
        </p>
      </header>
      <HwidManagerView />
    </div>
  );
}
