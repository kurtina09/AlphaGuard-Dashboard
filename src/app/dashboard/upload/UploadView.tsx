"use client";

import { useRef, useState } from "react";

type UploadResult = { key: string; name: string };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function UploadView() {
  const [subfolder, setSubfolder] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, "pending" | "uploading" | "done" | "error">>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [results, setResults] = useState<UploadResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...arr.filter((f) => !existing.has(f.name))];
    });
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setProgress((p) => { const n = { ...p }; delete n[name]; return n; });
    setErrors((e) => { const n = { ...e }; delete n[name]; return n; });
    setResults((r) => r.filter((x) => x.name !== name));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  async function uploadAll() {
    if (!files.length) return;
    setUploading(true);
    setResults([]);

    const newProgress: Record<string, "pending" | "uploading" | "done" | "error"> = {};
    files.forEach((f) => (newProgress[f.name] = "pending"));
    setProgress(newProgress);
    setErrors({});

    for (const file of files) {
      setProgress((p) => ({ ...p, [file.name]: "uploading" }));

      const fd = new FormData();
      fd.append("file", file);
      fd.append("subfolder", subfolder.trim());

      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
        setProgress((p) => ({ ...p, [file.name]: "done" }));
        setResults((r) => [...r, { key: body.key, name: file.name }]);
      } catch (err) {
        setProgress((p) => ({ ...p, [file.name]: "error" }));
        setErrors((e) => ({
          ...e,
          [file.name]: err instanceof Error ? err.message : "Upload failed.",
        }));
      }
    }

    setUploading(false);
  }

  function clearAll() {
    setFiles([]);
    setProgress({});
    setErrors({});
    setResults([]);
  }

  const doneCount = Object.values(progress).filter((s) => s === "done").length;
  const errorCount = Object.values(progress).filter((s) => s === "error").length;

  return (
    <div className="max-w-2xl space-y-6">

      {/* Subfolder input */}
      <div className="bg-[var(--panel)] border rounded-lg p-5 space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">Destination Subfolder</label>
          <input
            type="text"
            value={subfolder}
            onChange={(e) => setSubfolder(e.target.value)}
            placeholder="e.g. screenshots/2026 or documents/reports"
            className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md text-sm font-mono outline-none focus:border-[var(--accent)]"
          />
          <p className="text-xs text-[var(--text-dim)] mt-1.5">
            Leave empty to upload to the bucket root.
            Files will be saved as <span className="font-mono">{subfolder ? `${subfolder.replace(/^\/+|\/+$/g, "")}/filename` : "filename"}</span>.
          </p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-[var(--accent)] bg-[var(--accent)]/10"
            : "border-[var(--panel)] hover:border-[var(--accent)]/50 bg-[var(--panel)]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <div className="text-3xl mb-2">📁</div>
        <p className="text-sm font-medium">Drop files here or click to browse</p>
        <p className="text-xs text-[var(--text-dim)] mt-1">Any file type · Multiple files supported</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-medium">{files.length} file{files.length !== 1 ? "s" : ""} selected</span>
            <button
              type="button"
              onClick={clearAll}
              disabled={uploading}
              className="text-xs text-[var(--text-dim)] hover:text-white disabled:opacity-40"
            >
              Clear all
            </button>
          </div>
          <ul className="divide-y divide-[var(--panel-2)]">
            {files.map((f) => {
              const state = progress[f.name];
              return (
                <li key={f.name} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  {/* Status icon */}
                  <span className="text-base shrink-0">
                    {state === "done"     ? "✅" :
                     state === "error"    ? "❌" :
                     state === "uploading"? "⏳" : "📄"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{f.name}</div>
                    {state === "error" && errors[f.name] && (
                      <div className="text-xs text-[var(--danger)] truncate">{errors[f.name]}</div>
                    )}
                    {state === "done" && results.find((r) => r.name === f.name) && (
                      <div className="text-xs text-[var(--text-dim)] font-mono truncate">
                        → {results.find((r) => r.name === f.name)?.key}
                      </div>
                    )}
                    {!state && (
                      <div className="text-xs text-[var(--text-dim)]">{formatBytes(f.size)}</div>
                    )}
                  </div>
                  {!state && (
                    <button
                      type="button"
                      onClick={() => removeFile(f.name)}
                      className="shrink-0 text-xs text-[var(--text-dim)] hover:text-[var(--danger)]"
                    >
                      ✕
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Summary after upload */}
          {(doneCount > 0 || errorCount > 0) && !uploading && (
            <div className="px-4 py-2.5 border-t text-xs text-[var(--text-dim)]">
              {doneCount > 0 && <span className="text-green-400">{doneCount} uploaded</span>}
              {doneCount > 0 && errorCount > 0 && <span className="mx-1">·</span>}
              {errorCount > 0 && <span className="text-[var(--danger)]">{errorCount} failed</span>}
            </div>
          )}
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && (
        <button
          type="button"
          onClick={uploadAll}
          disabled={uploading || files.length === 0}
          className="w-full py-2.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
        >
          {uploading
            ? `Uploading… (${doneCount + errorCount}/${files.length})`
            : `Upload ${files.length} file${files.length !== 1 ? "s" : ""} to R2`}
        </button>
      )}
    </div>
  );
}
