import PlayersTabs from "./PlayersTabs";

export default function PlayersPage() {
  return (
    <div className="max-w-7xl w-full">
      <header className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold">Players</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Search players, view full profiles, inspect HWID info, and manage live-session actions.
        </p>
      </header>
      <PlayersTabs />
    </div>
  );
}
