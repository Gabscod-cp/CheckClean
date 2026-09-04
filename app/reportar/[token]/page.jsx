"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { aptosDoProprietario, limpezasDoProprietario, registrarLimpeza } from "../../../lib/data";

const brl = (n) => "R$ " + Number(n || 0).toLocaleString("pt-BR");
const hoje = () => new Date().toISOString().slice(0, 10);
const fmtDay = (iso) => { if (!iso) return "—"; const [, m, d] = iso.split("-"); return `${d}/${m}`; };

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
  const [aba, setAba] = useState("avisar");
  const [aptos, setAptos] = useState(null);
  const [limpezas, setLimpezas] = useState([]);
  const [erro, setErro] = useState("");
  const [aptId, setAptId] = useState("");
  const [saida, setSaida] = useState(hoje());
  const [entrada, setEntrada] = useState("");
  const [antesDas15h, setAntesDas15h] = useState(false);
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);

  async function carregarHistorico() {
    try {
      const l = await limpezasDoProprietario(token);
      setLimpezas(l || []);
    } catch (e) {
      // silencioso: a aba "Avisar" continua funcionando mesmo se o histórico falhar
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const data = await aptosDoProprietario(token);
        setAptos(data);
        if (data && data.length) setAptId(data[0].id);
      } catch (e) {
        setErro("Não conseguimos abrir este link. Confira com quem te enviou.");
        return;
      }
      await carregarHistorico();
    })();
  }, [token]);

  const pendentesDoApto = useMemo(
    () => limpezas.filter((l) => l.status === "pendente" && l.apartamento === aptos?.find((a) => a.id === aptId)?.apelido),
    [limpezas, aptos, aptId]
  );

  async function enviar() {
    setEnviando(true);
    try {
      await registrarLimpeza(token, aptId, saida, entrada, obs.trim(), antesDas15h);
      setOk(true);
      await carregarHistorico();
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
            onClick={() => { setOk(false); setObs(""); setAntesDas15h(false); setEnviando(false); setAba("historico"); }}>
            Ver meu histórico
          </button>
          <button onClick={() => { setOk(false); setObs(""); setAntesDas15h(false); setEnviando(false); }}
            style={{ width: "100%", border: "none", background: "transparent", color: "var(--muted)", fontWeight: 600, padding: 12, fontSize: 14, marginTop: 4 }}>
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
          <div style={{ fontWeight: 700 }}>{primeiroNome ? `Oi, ${primeiroNome}! 👋` : "Facilidade ADM"}</div>
          <div style={{ fontSize: 13, color: "#3B5B54" }}>Avise limpezas e acompanhe o fechamento do mês por aqui.</div>
        </div>
      </div>

      <nav className="navseg" style={{ maxWidth: 480, margin: "14px auto 0" }}>
        <button className={"navseg-item" + (aba === "avisar" ? " active" : "")} onClick={() => setAba("avisar")}>Avisar limpeza</button>
        <button className={"navseg-item" + (aba === "historico" ? " active" : "")} onClick={() => setAba("historico")}>Meu histórico</button>
      </nav>

      {aba === "avisar" ? (
        <div className="card in" style={{ padding: 20, marginTop: 14, maxWidth: 480, margin: "14px auto 0" }}>
          <Campo label="Qual apartamento?">
            <select className="input" value={aptId} onChange={(e) => setAptId(e.target.value)}>
              {aptos.map((a) => <option key={a.id} value={a.id}>{a.apelido} — {a.predio}</option>)}
            </select>
          </Campo>

          {pendentesDoApto.length > 0 && (
            <div style={{ fontSize: 12.5, color: "var(--gold)", background: "var(--gold-soft)", borderRadius: 10, padding: "9px 11px", marginBottom: 14, lineHeight: 1.5 }}>
              ℹ️ Esse apartamento já tem {pendentesDoApto.length === 1 ? "uma limpeza avisada" : `${pendentesDoApto.length} limpezas avisadas`} aguardando
              {pendentesDoApto.length === 1 ? ` (saída ${fmtDay(pendentesDoApto[0].data_saida)})` : ""}. Confira em "Meu histórico" antes de avisar de novo.
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <Campo label="Quando desocupa"><input className="input" type="date" value={saida} onChange={(e) => setSaida(e.target.value)} /></Campo>
            <Campo label="Próxima entrada (opcional)"><input className="input" type="date" value={entrada} onChange={(e) => setEntrada(e.target.value)} /></Campo>
          </div>
          {!entrada && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 14, lineHeight: 1.5 }}>
              💡 Ainda não sabe quando entra o próximo hóspede? Pode deixar em branco.
            </div>
          )}

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
      ) : (
        <Historico limpezas={limpezas} />
      )}
    </div>
  );
}

function Historico({ limpezas }) {
  const [mesRef, setMesRef] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const agora = new Date();
  const ehMesAtual = mesRef.getFullYear() === agora.getFullYear() && mesRef.getMonth() === agora.getMonth();
  const mesChave = `${mesRef.getFullYear()}-${String(mesRef.getMonth() + 1).padStart(2, "0")}`;
  const mesNome = mesRef.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const mudarMes = (delta) => setMesRef((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  // Não deixa voltar pra um mês anterior ao primeiro registro que existe.
  const mesesComDados = limpezas.map((l) => l.data_saida?.slice(0, 7)).filter(Boolean);
  const mesMaisAntigo = mesesComDados.length ? mesesComDados.reduce((min, m) => (m < min ? m : min)) : mesChave;
  const podeVoltar = mesChave > mesMaisAntigo;

  const pendentes = limpezas.filter((l) => l.status === "pendente");
  const concluidasMes = limpezas.filter((l) => l.status === "pronto" && l.data_saida?.slice(0, 7) === mesChave);
  const totalMes = concluidasMes.reduce((s, l) => s + Number(l.valor), 0);

  return (
    <div style={{ maxWidth: 900, margin: "14px auto 0" }}>
      <div className="in" style={{
        background: "linear-gradient(155deg,var(--ink2),#3B2230)", color: "#fff", borderRadius: "var(--radius-xl)",
        padding: 22, boxShadow: "var(--shadow-md)", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -60, right: -60, width: 180, height: 180, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,80,106,.35), transparent 70%)",
        }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <div style={{ fontSize: 12.5, color: "#CBA9B0", textTransform: "capitalize", fontWeight: 600 }}>Fechamento — {mesNome}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <button onClick={() => mudarMes(-1)} disabled={!podeVoltar} aria-label="Mês anterior" style={{
              width: 38, height: 38, borderRadius: 999, border: "none", background: "rgba(255,255,255,.14)",
              color: "#fff", fontWeight: 700, fontSize: 17, lineHeight: 1, opacity: podeVoltar ? 1 : 0.35,
            }}>‹</button>
            <button onClick={() => mudarMes(1)} disabled={ehMesAtual} aria-label="Próximo mês" style={{
              width: 38, height: 38, borderRadius: 999, border: "none", background: "rgba(255,255,255,.14)",
              color: "#fff", fontWeight: 700, fontSize: 17, lineHeight: 1, opacity: ehMesAtual ? 0.35 : 1,
            }}>›</button>
          </div>
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, marginTop: 3, fontFamily: "'Bricolage Grotesque',sans-serif", position: "relative" }}>{brl(totalMes)}</div>
      </div>

      <div className="section-label">Aguardando limpeza ({pendentes.length})</div>
      {pendentes.length === 0 ? (
        <div className="card" style={{ borderStyle: "dashed", padding: 18, textAlign: "center", color: "var(--muted)", marginTop: 10, fontSize: 13.5 }}>
          Nenhuma limpeza avisada no momento. 🌿
        </div>
      ) : (
        <div className="grid-2">
          {pendentes.map((l) => <ItemHistorico key={l.id} l={l} />)}
        </div>
      )}

      <div className="section-label">Concluídas — {mesNome}</div>
      {concluidasMes.length === 0 ? (
        <div className="card" style={{ borderStyle: "dashed", padding: 18, textAlign: "center", color: "var(--muted)", marginTop: 10, fontSize: 13.5 }}>
          Nenhuma limpeza concluída nesse mês.
        </div>
      ) : (
        <div className="grid-2">
          {concluidasMes.map((l) => <ItemHistorico key={l.id} l={l} />)}
        </div>
      )}
    </div>
  );
}

function ItemHistorico({ l }) {
  const feita = l.status === "pronto";
  const accent = feita ? "var(--brand)" : "var(--gold)";
  const tagBg = feita ? "var(--brand-soft)" : "var(--gold-soft)";
  return (
    <div className="card card-hover in" style={{ borderLeft: `4px solid ${accent}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontWeight: 700, fontSize: 16.5 }}>{l.apartamento}</div>
        <span className="chip" style={{ background: tagBg, color: accent }}>{feita ? "Feita" : "Aguardando"}</span>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 13, color: "var(--muted)" }}>
        <span>Saída <b style={{ color: "var(--ink)" }}>{fmtDay(l.data_saida)}</b></span>
        {l.data_entrada && <span>Entrada <b style={{ color: "var(--ink)" }}>{fmtDay(l.data_entrada)}</b></span>}
        <span style={{ marginLeft: "auto", fontWeight: 700, color: "var(--ink)" }}>{brl(l.valor)}</span>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return <label style={{ display: "block", marginBottom: 14, flex: 1, minWidth: 0 }}><span className="field-label">{label}</span>{children}</label>;
}
