import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/session";
import UploadView from "./UploadView";

export default async function UploadPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    redirect("/login");
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-1">Upload to R2</h1>
      <p className="text-sm text-[var(--text-dim)] mb-6">
        Upload files directly to a Cloudflare R2 bucket subfolder.
      </p>
      <UploadView />
    </div>
  );
}
