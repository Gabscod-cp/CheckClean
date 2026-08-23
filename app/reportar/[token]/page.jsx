"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { aptosDoProprietario, registrarLimpeza } from "../../../lib/data";

const hoje = () => new Date().toISOString().slice(0, 10);
const maisDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const fmtDay = (iso) => { const [, m, d] = iso.split("-"); return `${d}/${m}`; };

export default function Reportar() {
  return (
    <Suspense fallback={<div className="wrap" style={{ paddingTop: 80, textAlign: "center", color: "var(--muted)" }}>Abrindo…</div>}>
      <ReportarForm />
    </Suspense>
  );
}

function ReportarForm() {
  const { token } = useParams();
  const searchParams = useSearchParams();
  const primeiroNome = (searchParams.get("nome") || "").trim().split(" ")[0] || "";
  const [aptos, setAptos] = useState(null);
  const [erro, setErro] = useState("");
  const [aptId, setAptId] = useState("");
  const [saida, setSaida] = useState(hoje());
  const [entrada, setEntrada] = useState(maisDias(2));
  const [antesDas15h, setAntesDas15h] = useState(false);
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await aptosDoProprietario(token);
        setAptos(data);
        if (data && data.length) setAptId(data[0].id);
      } catch (e) {
        setErro("Não conseguimos abrir este link. Confira com quem te enviou.");
      }
    })();
  }, [token]);

  async function enviar() {
    setEnviando(true);
    try {
      await registrarLimpeza(token, aptId, saida, entrada, obs.trim(), antesDas15h);
      setOk(true);
    } catch (e) {
      setErro("Não deu pra enviar: " + e.message);
      setEnviando(false);
    }
  }

  if (erro && !ok) {
    return (
      <div className="wrap" style={{ paddingTop: 80, minHeight: "100vh", display: "flex", alignItems: "center" }}>
        <div className="card in" style={{ textAlign: "center", padding: 32, width: "100%" }}>
          <div style={{ fontSize: 34 }}>😕</div>
          <p style={{ color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>{erro}</p>
        </div>
      </div>
    );
  }

  if (aptos === null) {
    return <div className="wrap" style={{ paddingTop: 80, textAlign: "center", color: "var(--muted)" }}>Abrindo…</div>;
  }

  if (ok) {
    const nome = aptos.find((a) => a.id === aptId)?.apelido || "apartamento";
    return (
      <div className="wrap" style={{ paddingTop: 70, minHeight: "100vh" }}>
        <div className="card in" style={{ textAlign: "center", padding: "38px 24px", maxWidth: 420, margin: "0 auto" }}>
          <div style={{
            width: 60, height: 60, borderRadius: 999, background: "var(--brand-soft)", color: "var(--brand)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 16px",
            boxShadow: "var(--shadow-xs)",
          }}>✓</div>
          <h2 style={{ margin: 0, fontSize: 23, fontWeight: 800 }}>Recebido{primeiroNome ? `, ${primeiroNome}` : ""}, obrigada!</h2>
          <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.55, marginTop: 10 }}>
            A limpeza do <b style={{ color: "var(--ink)" }}>{nome}</b> já entrou na lista. Saída {fmtDay(saida)}, entrada {fmtDay(entrada)}.
          </p>
          <button className="btn-outline" style={{ width: "100%", marginTop: 18, padding: 13, fontSize: 15 }}
            onClick={() => { setOk(false); setObs(""); setAntesDas15h(false); setEnviando(false); }}>
            Avisar outra limpeza
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 28 }}>
      <div className="in" style={{
        background: "linear-gradient(135deg, var(--brand-soft), #F3EFDD)", borderRadius: "var(--radius-lg)",
        padding: "16px 18px", display: "flex", gap: 12, alignItems: "center", boxShadow: "var(--shadow-xs)", maxWidth: 480, margin: "0 auto",
      }}>
        <div style={{
          fontSize: 22, width: 42, height: 42, borderRadius: 12, background: "#fff", display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "var(--shadow-xs)",
        }}>🧹</div>
        <div>
          <div style={{ fontWeight: 700 }}>{primeiroNome ? `Oi, ${primeiroNome}! 👋` : "Avisar uma limpeza"}</div>
          <div style={{ fontSize: 13, color: "#3B5B54" }}>Preencha os dias e a gente cuida do resto.</div>
        </div>
      </div>

      <div className="card in" style={{ padding: 20, marginTop: 14, maxWidth: 480, margin: "14px auto 0" }}>
        <Campo label="Qual apartamento?">
          <select className="input" value={aptId} onChange={(e) => setAptId(e.target.value)}>
            {aptos.map((a) => <option key={a.id} value={a.id}>{a.apelido} — {a.predio}</option>)}
          </select>
        </Campo>
        <div style={{ display: "flex", gap: 12 }}>
          <Campo label="Quando desocupa"><input className="input" type="date" value={saida} onChange={(e) => setSaida(e.target.value)} /></Campo>
          <Campo label="Próxima entrada"><input className="input" type="date" value={entrada} onChange={(e) => setEntrada(e.target.value)} /></Campo>
        </div>

        <Campo label="Horário de entrada do próximo hóspede">
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button type="button" onClick={() => setAntesDas15h(false)} style={{
              flex: 1, padding: "10px 8px", borderRadius: 10, fontSize: 13.5, fontWeight: 700,
              border: `1.5px solid ${!antesDas15h ? "var(--brand)" : "var(--line)"}`,
              background: !antesDas15h ? "var(--brand-soft)" : "#fff", color: !antesDas15h ? "var(--brand)" : "var(--muted)",
              transition: "all .15s var(--ease)",
            }}>Depois das 15h</button>
            <button type="button" onClick={() => setAntesDas15h(true)} style={{
              flex: 1, padding: "10px 8px", borderRadius: 10, fontSize: 13.5, fontWeight: 700,
              border: `1.5px solid ${antesDas15h ? "var(--amber)" : "var(--line)"}`,
              background: antesDas15h ? "var(--amber-soft)" : "#fff", color: antesDas15h ? "var(--amber)" : "var(--muted)",
              transition: "all .15s var(--ease)",
            }}>Antes das 15h</button>
          </div>
        </Campo>
        {antesDas15h && (
          <div style={{ fontSize: 12.5, color: "var(--amber)", background: "var(--amber-soft)", borderRadius: 10, padding: "9px 11px", marginTop: -6, marginBottom: 14, lineHeight: 1.5 }}>
            ⚠️ Isso aumenta a prioridade dessa limpeza na fila. Só marque antes das 15h se for realmente necessário — quando há várias saídas no mesmo dia, liberar antes do horário padrão atrapalha a organização da equipe.
          </div>
        )}

        {saida <= hoje() ? (
          <div style={{ fontSize: 12.5, color: "var(--amber)", background: "var(--amber-soft)", borderRadius: 10, padding: "9px 11px", marginBottom: 14, lineHeight: 1.5 }}>
            ⚠️ Você está avisando em cima da hora. Sempre que possível, avise com mais antecedência — avisos no mesmo dia ou de madrugada atrapalham a organização da equipe.
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
            💡 Avise com a maior antecedência possível — ajuda bastante a equipe a se organizar.
          </div>
        )}

        <Campo label="Alguma observação? (opcional)">
          <textarea className="input" rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: trocar roupa de cama, sofá manchado…" style={{ resize: "vertical" }} />
        </Campo>
        <button className="btn" onClick={enviar} disabled={enviando || !aptId}>{enviando ? "Enviando…" : "Enviar aviso"}</button>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return <label style={{ display: "block", marginBottom: 14, flex: 1 }}><span className="field-label">{label}</span>{children}</label>;
}
