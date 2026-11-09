import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSession()) redirect("/input");
  return (
    <div className="login-wrap">
      <div className="card">
        <h1>SYSTEM NSS SWB31</h1>
        <p className="hint" style={{ marginTop: 0 }}>WhatsApp Blast Management — masuk sebagai admin.</p>
        <LoginForm />
      </div>
    </div>
  );
}
