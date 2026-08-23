"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setErro("");
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      setErro("E-mail ou senha incorretos.");
      return;
    }
    router.replace("/");
  }

  return (
    <div className="wrap" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100vh", paddingBottom: 24 }}>
      <div className="in" style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20, margin: "0 auto 14px", fontSize: 30,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(155deg,var(--ink2),#3B2230)", boxShadow: "var(--shadow-md)",
        }}>🧹</div>
        <h1 style={{ margin: "0 0 4px", fontSize: 27, fontWeight: 800 }}>CheckClean</h1>
        <p style={{ color: "var(--muted)", fontSize: 14.5, margin: 0 }}>Entre para administrar as limpezas.</p>
      </div>

      <div className="card in" style={{ padding: 22, maxWidth: 380, width: "100%", margin: "0 auto" }}>
        <label style={{ display: "block", marginBottom: 14 }}>
          <span className="field-label">E-mail</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" />
        </label>
        <label style={{ display: "block", marginBottom: 18 }}>
          <span className="field-label">Senha</span>
          <input
            className="input"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && entrar()}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>
        {erro && (
          <div style={{ color: "var(--red)", fontSize: 13, fontWeight: 600, marginBottom: 14, background: "#FBEAE7", borderRadius: 10, padding: "9px 11px" }}>
            {erro}
          </div>
        )}
        <button className="btn" onClick={entrar} disabled={carregando || !email || !senha}>
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </div>
    </div>
  );
}
