"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import {
  getLimpezas, getApartamentos, getPredios, getProprietarios,
  marcarPronto, criarPredio, criarProprietario, criarApartamento,
  atualizarApartamento, excluirApartamento, excluirProprietario,
} from "../lib/data";

// ——— utilitários ———
const brl = (n) => "R$ " + Number(n || 0).toLocaleString("pt-BR");
const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const fmtDay = (iso) => { if (!iso) return "—"; const [, m, d] = iso.split("-"); return `${d}/${m}`; };
const daysBetween = (iso) => (iso ? Math.round((new Date(iso + "T00:00:00") - today) / 86400000) : 999);
const relText = (n) =>
  n >= 999 ? "sem data" : n < 0 ? `há ${Math.abs(n)} ${Math.abs(n) === 1 ? "dia" : "dias"}`
  : n === 0 ? "hoje" : n === 1 ? "amanhã" : `em ${n} dias`;
// Ordena por urgência de entrada; empatando no mesmo dia, quem entra antes das 15h vai primeiro.
const ordenarFila = (a, b) => {
  const d = daysBetween(a.data_entrada) - daysBetween(b.data_entrada);
  if (d !== 0) return d;
  return (a.entrada_antes_15h ? 0 : 1) - (b.entrada_antes_15h ? 0 : 1);
};
const fmtAvisado = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} às ${hh}:${mi}`;
};

const TABS = [["hoje", "Hoje"], ["cadastro", "Cadastro"], ["equipe", "Equipe"]];

export default function Admin() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("hoje");
  const [limpezas, setLimpezas] = useState([]);
  const [apartamentos, setApartamentos] = useState([]);
  const [predios, setPredios] = useState([]);
  const [proprietarios, setProprietarios] = useState([]);

  async function recarregar() {
    const [l, a, p, o] = await Promise.all([getLimpezas(), getApartamentos(), getPredios(), getProprietarios()]);
    setLimpezas(l); setApartamentos(a); setPredios(p); setProprietarios(o);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace("/login"); return; }
      await recarregar();
      setReady(true);
    })();
  }, [router]);

  async function sair() { await supabase.auth.signOut(); router.replace("/login"); }

  if (!ready) return <div className="wrap" style={{ paddingTop: 80, textAlign: "center", color: "var(--muted)" }}>Carregando…</div>;

  return (
    <div className="wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(155deg,var(--ink2),#3B2230)", boxShadow: "var(--shadow-xs)",
          }}>🧹</div>
          <div style={{ fontWeight: 800, fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 17 }}>CheckClean</div>
        </div>
        <button onClick={sair} style={{ border: "none", background: "none", color: "var(--muted)", fontSize: 13, fontWeight: 600, padding: "6px 8px" }}>Sair</button>
      </div>

      <nav className="navseg">
        {TABS.map(([id, txt]) => (
          <button key={id} className={"navseg-item" + (tab === id ? " active" : "")} onClick={() => setTab(id)}>{txt}</button>
        ))}
      </nav>

      <div style={{ marginTop: 18 }}>
        {tab === "hoje" && <Hoje limpezas={limpezas} onDone={async (id) => { await marcarPronto(id); await recarregar(); }} />}
        {tab === "cadastro" && (
          <Cadastro
            apartamentos={apartamentos} predios={predios} proprietarios={proprietarios}
            onCreate={recarregar} criarPredio={criarPredio} criarProprietario={criarProprietario} criarApartamento={criarApartamento}
            atualizarApartamento={atualizarApartamento} excluirApartamento={excluirApartamento} excluirProprietario={excluirProprietario}
          />
        )}
        {tab === "equipe" && <Equipe limpezas={limpezas} onDone={async (id) => { await marcarPronto(id); await recarregar(); }} />}
      </div>
    </div>
  );
}

// ═══════════ HOJE ═══════════
function Hoje({ limpezas, onDone }) {
  const [mostrarProximos, setMostrarProximos] = useState(false);
  const pend = useMemo(
    () => limpezas.filter((c) => c.status === "pendente").sort(ordenarFila),
    [limpezas]
  );
  // O dia da limpeza é o dia da saída — não o dia em que o próximo hóspede entra.
  const pendHoje = useMemo(() => pend.filter((c) => daysBetween(c.data_saida) <= 0), [pend]);
  const pendProximos = useMemo(
    () => pend.filter((c) => daysBetween(c.data_saida) > 0).sort((a, b) => {
      const d = daysBetween(a.data_saida) - daysBetween(b.data_saida);
      if (d !== 0) return d;
      return (a.entrada_antes_15h ? 0 : 1) - (b.entrada_antes_15h ? 0 : 1);
    }),
    [pend]
  );
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const done = limpezas.filter((c) => {
    if (c.status !== "pronto") return false;
    const d = new Date(c.data_saida + "T00:00:00");
    return d >= monthStart && d < monthEnd;
  });
  const faturado = done.reduce((s, c) => s + Number(c.valor), 0);
  const aReceber = pend.reduce((s, c) => s + Number(c.valor), 0);
  const monthName = today.toLocaleDateString("pt-BR", { month: "long" });

  // Relatório navegável — recebido por proprietário em qualquer mês.
  const [mesRelatorio, setMesRelatorio] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const relatorioEhMesAtual = mesRelatorio.getFullYear() === today.getFullYear() && mesRelatorio.getMonth() === today.getMonth();
  const relatorioInicio = mesRelatorio;
  const relatorioFim = new Date(mesRelatorio.getFullYear(), mesRelatorio.getMonth() + 1, 1);
  const doneRelatorio = limpezas.filter((c) => {
    if (c.status !== "pronto") return false;
    const d = new Date(c.data_saida + "T00:00:00");
    return d >= relatorioInicio && d < relatorioFim;
  });
  const totalRelatorio = doneRelatorio.reduce((s, c) => s + Number(c.valor), 0);
  const byOwnerRelatorio = {};
  doneRelatorio.forEach((c) => {
    const id = c.apartamentos?.proprietario_id || "sem-dono";
    const nome = c.apartamentos?.proprietarios?.nome || "—";
    if (!byOwnerRelatorio[id]) byOwnerRelatorio[id] = { nome, total: 0, itens: [] };
    byOwnerRelatorio[id].total += Number(c.valor);
    byOwnerRelatorio[id].itens.push(c);
  });
  Object.values(byOwnerRelatorio).forEach((o) => o.itens.sort((a, b) => a.data_saida.localeCompare(b.data_saida)));
  const mesParam = `${mesRelatorio.getFullYear()}-${String(mesRelatorio.getMonth() + 1).padStart(2, "0")}`;
  const mudarMesRelatorio = (delta) => setMesRelatorio((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  return (
    <div>
      <header>
        <div style={{ fontSize: 13, color: "var(--muted)", textTransform: "capitalize", fontWeight: 600 }}>
          {today.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h1 style={{ margin: "3px 0 0", fontSize: 28, fontWeight: 800, letterSpacing: "-.02em" }}>Limpezas de hoje</h1>
      </header>

      <div className="in" style={{
        background: "linear-gradient(155deg,var(--ink2),#3B2230)", color: "#fff", borderRadius: "var(--radius-xl)",
        padding: 22, marginTop: 16, boxShadow: "var(--shadow-md)", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -60, right: -60, width: 180, height: 180, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,80,106,.35), transparent 70%)",
        }} />
        <div style={{ fontSize: 12.5, color: "#CBA9B0", textTransform: "capitalize", fontWeight: 600, position: "relative" }}>Faturamento — {monthName}</div>
        <div style={{ fontSize: 36, fontWeight: 800, marginTop: 3, fontFamily: "'Bricolage Grotesque',sans-serif", position: "relative" }}>{brl(faturado)}</div>
        <div style={{ display: "flex", gap: 26, marginTop: 15, fontSize: 12.5, position: "relative" }}>
          <div><div style={{ color: "#B99298" }}>Feitas no mês</div><div style={{ fontWeight: 700, fontSize: 16.5, marginTop: 2 }}>{done.length}</div></div>
          <div><div style={{ color: "#B99298" }}>Ainda a receber</div><div style={{ fontWeight: 700, fontSize: 16.5, marginTop: 2 }}>{brl(aReceber)}</div></div>
        </div>
      </div>

      <div className="section-label">Hoje — hóspede chegando primeiro</div>
      {pendHoje.length === 0 ? <Empty>Nada urgente para hoje. 🌿</Empty> : (
        <div className="grid-2">
          {pendHoje.map((c) => <CardHoje key={c.id} c={c} onDone={onDone} />)}
        </div>
      )}

      {pendProximos.length > 0 && (
        <>
          <button
            onClick={() => setMostrarProximos((s) => !s)}
            style={{
              width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
              border: "1px solid var(--line)", background: "var(--surface)", borderRadius: "var(--radius-md)",
              padding: "13px 16px", marginTop: 26, fontFamily: "'Bricolage Grotesque',sans-serif",
              fontWeight: 700, fontSize: 14.5, color: "var(--ink)", boxShadow: "var(--shadow-xs)",
            }}
          >
            <span>Próximos dias <span style={{ color: "var(--faint)", fontWeight: 500, fontSize: 13 }}>({pendProximos.length})</span></span>
            <span style={{ color: "var(--brand)", fontSize: 13 }}>{mostrarProximos ? "Recolher ▲" : "Ver todos ▼"}</span>
          </button>
          {mostrarProximos && (
            <div className="grid-2" style={{ marginTop: 10 }}>
              {pendProximos.map((c) => <CardHoje key={c.id} c={c} onDone={onDone} />)}
            </div>
          )}
        </>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "26px 0 8px" }}>
        <div className="section-label" style={{ margin: 0 }}>Relatório por proprietário</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 10 }}>
          <button onClick={() => mudarMesRelatorio(-1)} aria-label="Mês anterior" style={{
            width: 28, height: 28, borderRadius: 999, border: "1px solid var(--line)", background: "#fff",
            color: "var(--ink)", fontWeight: 700, fontSize: 14, lineHeight: 1, flexShrink: 0,
          }}>‹</button>
          <span style={{ fontSize: 12.5, fontWeight: 700, minWidth: 92, textAlign: "center", textTransform: "capitalize", color: "var(--ink)" }}>
            {mesRelatorio.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </span>
          <button onClick={() => mudarMesRelatorio(1)} disabled={relatorioEhMesAtual} aria-label="Próximo mês" style={{
            width: 28, height: 28, borderRadius: 999, border: "1px solid var(--line)", background: "#fff",
            color: relatorioEhMesAtual ? "var(--faint)" : "var(--ink)", fontWeight: 700, fontSize: 14, lineHeight: 1,
            opacity: relatorioEhMesAtual ? 0.5 : 1, flexShrink: 0,
          }}>›</button>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "13px 16px", background: "var(--brand-soft)" }}>
          <span style={{ fontWeight: 700, color: "var(--ink)" }}>Total do mês ({doneRelatorio.length})</span>
          <span style={{ fontWeight: 800, color: "var(--brand)" }}>{brl(totalRelatorio)}</span>
        </div>
        {Object.keys(byOwnerRelatorio).length === 0 ? <div style={{ padding: 16, color: "var(--muted)", fontSize: 14 }}>Nada recebido nesse mês.</div>
          : Object.entries(byOwnerRelatorio).map(([id, o]) => (
            <RelatorioOwnerRow key={id} proprietarioId={id} nome={o.nome} total={o.total} itens={o.itens} mesParam={mesParam} />
          ))}
      </div>
    </div>
  );
}

function RelatorioOwnerRow({ proprietarioId, nome, total, itens, mesParam }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div style={{ borderTop: "1px solid var(--line-soft)" }}>
      <button
        onClick={() => setAberto((s) => !s)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", background: "transparent", border: "none", textAlign: "left" }}
      >
        <span style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 7, color: "var(--ink)" }}>
          <span style={{ color: "var(--faint)", fontSize: 11, transform: aberto ? "rotate(90deg)" : "none", transition: "transform .15s var(--ease)", display: "inline-block" }}>▶</span>
          {nome} <span style={{ color: "var(--faint)", fontWeight: 500, fontSize: 12 }}>· {itens.length} {itens.length === 1 ? "limpeza" : "limpezas"}</span>
        </span>
        <span style={{ fontWeight: 700, color: "var(--brand)" }}>{brl(total)}</span>
      </button>
      {aberto && (
        <div style={{ padding: "0 16px 14px", background: "#FBFAF7" }}>
          {itens.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderTop: "1px solid var(--line-soft)", fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>{c.apartamentos?.apelido}</div>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>{c.apartamentos?.predios?.nome} · saída {fmtDay(c.data_saida)}</div>
              </div>
              <div style={{ fontWeight: 700, color: "var(--ink)" }}>{brl(c.valor)}</div>
            </div>
          ))}
          <a
            href={`/relatorio/${proprietarioId}?nome=${encodeURIComponent(nome)}&mes=${mesParam}`}
            target="_blank" rel="noopener noreferrer"
            className="btn-outline"
            style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 12 }}
          >
            📄 Baixar PDF
          </a>
        </div>
      )}
    </div>
  );
}

function CardHoje({ c, onDone }) {
  const a = c.apartamentos || {};
  const dIn = daysBetween(c.data_entrada);
  const dSai = daysBetween(c.data_saida);
  const urgent = dIn <= 1, soon = dIn > 1 && dIn <= 3;
  const accent = urgent ? "var(--amber)" : soon ? "var(--gold)" : "var(--brand)";
  const tagBg = urgent ? "var(--amber-soft)" : soon ? "var(--gold-soft)" : "var(--brand-soft)";
  const nota = [a.obs_fixa, c.obs].filter(Boolean).join(" · ");
  return (
    <div className="card card-hover in" style={{ borderLeft: `4px solid ${accent}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16.5 }}>{a.apelido}</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{a.predios?.nome} · {a.proprietarios?.nome}</div>
        </div>
        <span className="chip" style={{ background: tagBg, color: accent }}>entra {relText(dIn)}</span>
      </div>
      {c.entrada_antes_15h && (
        <div style={{
          marginTop: 10, fontSize: 12.5, fontWeight: 700, color: "var(--amber)", background: "var(--amber-soft)",
          borderRadius: 9, padding: "8px 10px", display: "flex", alignItems: "center", gap: 6,
        }}>
          ⏰ Prioridade — hóspede entra antes das 15h
        </div>
      )}
      <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 13, color: "var(--muted)" }}>
        <span>{dSai > 0 ? "Sai" : "Saiu"} <b style={{ color: "var(--ink)" }}>{fmtDay(c.data_saida)}</b></span>
        <span>Entra <b style={{ color: "var(--ink)" }}>{fmtDay(c.data_entrada)}</b></span>
        <span style={{ marginLeft: "auto", fontWeight: 700, color: "var(--ink)" }}>{brl(c.valor)}</span>
      </div>
      {nota && <div style={{ marginTop: 10, fontSize: 13, background: "#F7F6F2", borderRadius: 10, padding: "8px 10px", color: "#4A5350" }}>📝 {nota}</div>}
      {c.criado_em && <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--faint)" }}>Avisado em {fmtAvisado(c.criado_em)}</div>}
      <button className="btn" style={{ marginTop: 12 }} onClick={() => onDone(c.id)}>Marcar como pronto</button>
    </div>
  );
}

// ═══════════ CADASTRO ═══════════
function Cadastro({ apartamentos, predios, proprietarios, onCreate, criarPredio, criarProprietario, criarApartamento, atualizarApartamento, excluirApartamento, excluirProprietario }) {
  const [open, setOpen] = useState(false); // true = criando novo
  const [editando, setEditando] = useState(null); // apartamento sendo editado

  function copiarLink(p) {
    const url = `${window.location.origin}/reportar/${p.token_acesso}?nome=${encodeURIComponent(p.nome)}`;
    navigator.clipboard?.writeText(url);
    alert("Link copiado:\n" + url);
  }

  async function excluir(a) {
    try {
      await excluirApartamento(a.id);
      await onCreate();
    } catch (e) {
      alert("Não deu pra excluir: " + e.message);
    }
  }

  async function excluirDono(p) {
    try {
      await excluirProprietario(p.id);
      await onCreate();
    } catch (e) {
      alert("Não deu pra excluir: " + e.message);
    }
  }

  const semDono = apartamentos.filter((a) => !proprietarios.some((p) => p.id === a.proprietario_id));

  return (
    <div>
      <header>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-.02em" }}>Apartamentos</h1>
          <button className="btn" style={{ width: "auto", padding: "10px 16px", fontSize: 14 }} onClick={() => setOpen(true)}>+ Novo</button>
        </div>
        <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "8px 0 0", lineHeight: 1.5 }}>
          Agrupados por proprietário. O valor daqui vai pro faturamento sozinho quando a limpeza fica pronta.
        </p>
      </header>

      <div style={{ marginTop: 18 }}>
        {proprietarios.map((p) => {
          const aptos = apartamentos.filter((a) => a.proprietario_id === p.id);
          return (
            <div key={p.id} style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "'Bricolage Grotesque',sans-serif" }}>
                  {p.nome} <span style={{ color: "var(--faint)", fontWeight: 500, fontSize: 12.5 }}>· {aptos.length} {aptos.length === 1 ? "apto" : "aptos"}</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button className="btn-outline" onClick={() => copiarLink(p)}>Copiar link</button>
                  <ConfirmDeleteButton
                    onConfirm={() => excluirDono(p)}
                    armedLabel={aptos.length > 0 ? `${aptos.length} apto(s) ficam sem dono — confirmar?` : "Confirmar exclusão?"}
                  />
                </div>
              </div>
              {aptos.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 8 }}>Nenhum apartamento ainda.</div>
              ) : (
                <div className="grid-2" style={{ marginTop: 10 }}>
                  {aptos.map((a) => <AptCard key={a.id} a={a} onEdit={() => setEditando(a)} onDelete={() => excluir(a)} />)}
                </div>
              )}
            </div>
          );
        })}
        {proprietarios.length === 0 && <Empty>Nenhum proprietário ainda. Toque em “+ Novo”.</Empty>}

        {semDono.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--muted)", fontFamily: "'Bricolage Grotesque',sans-serif" }}>Sem proprietário</div>
            <div className="grid-2" style={{ marginTop: 10 }}>
              {semDono.map((a) => <AptCard key={a.id} a={a} onEdit={() => setEditando(a)} onDelete={() => excluir(a)} />)}
            </div>
          </div>
        )}
      </div>

      {(open || editando) && (
        <AptForm
          apto={editando}
          predios={predios} proprietarios={proprietarios}
          criarPredio={criarPredio} criarProprietario={criarProprietario}
          criarApartamento={criarApartamento} atualizarApartamento={atualizarApartamento}
          onClose={() => { setOpen(false); setEditando(null); }} onSaved={onCreate}
        />
      )}
    </div>
  );
}

function AptCard({ a, onEdit, onDelete }) {
  return (
    <div className="card card-hover" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{a.apelido}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{a.predios?.nome}</div>
        </div>
        <div style={{ fontWeight: 700, color: "var(--brand)", whiteSpace: "nowrap" }}>{brl(a.valor_limpeza)}</div>
      </div>
      {a.obs_fixa && <div style={{ fontSize: 12, color: "var(--faint)" }}>📝 {a.obs_fixa}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button className="btn-ghost" style={{ flex: 1 }} onClick={onEdit}>Editar</button>
        <ConfirmDeleteButton onConfirm={onDelete} style={{ flex: 1 }} />
      </div>
    </div>
  );
}

function ConfirmDeleteButton({ onConfirm, label = "Excluir", armedLabel = "Confirmar exclusão?", className = "btn-danger", style }) {
  const [armado, setArmado] = useState(false);

  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(false), 4000);
    return () => clearTimeout(t);
  }, [armado]);

  return (
    <button
      type="button"
      className={className}
      style={{ ...style, ...(armado ? { background: "var(--amber)", borderColor: "var(--amber)", color: "#fff" } : {}) }}
      onClick={() => { if (armado) { setArmado(false); onConfirm(); } else { setArmado(true); } }}
    >
      {armado ? armedLabel : label}
    </button>
  );
}

function AptForm({ apto, predios, proprietarios, criarPredio, criarProprietario, criarApartamento, atualizarApartamento, onClose, onSaved }) {
  const editing = !!apto;
  const [label, setLabel] = useState(apto?.apelido || "");
  const [predioId, setPredioId] = useState(apto?.predio_id || predios[0]?.id || "__new__");
  const [novoPredio, setNovoPredio] = useState({ nome: "", endereco: "" });
  const [ownerId, setOwnerId] = useState(apto?.proprietario_id || proprietarios[0]?.id || "__new__");
  const [novoOwner, setNovoOwner] = useState("");
  const [valor, setValor] = useState(apto ? String(apto.valor_limpeza ?? "") : "");
  const [obs, setObs] = useState(apto?.obs_fixa || "");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      let bId = predioId, oId = ownerId;
      if (predioId === "__new__") { const b = await criarPredio(novoPredio.nome || "Novo prédio", novoPredio.endereco); bId = b.id; }
      if (ownerId === "__new__") { const o = await criarProprietario(novoOwner || "Novo proprietário", null); oId = o.id; }
      const payload = { apelido: label || "Novo apto", predio_id: bId, proprietario_id: oId, valor_limpeza: Number(valor) || 0, obs_fixa: obs.trim() || null };
      if (editing) { await atualizarApartamento(apto.id, payload); } else { await criarApartamento(payload); }
      await onSaved();
      onClose();
    } catch (e) {
      alert("Não deu pra salvar: " + e.message);
      setSalvando(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="in sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "var(--line)", borderRadius: 9, margin: "0 auto 14px" }} />
        <h2 style={{ margin: "0 0 4px", fontSize: 21 }}>{editing ? "Editar apartamento" : "Novo apartamento"}</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>Cadastre o prédio uma vez; os próximos aptos dele reaproveitam.</p>

        <Campo label="Apelido / número do apto"><input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Apto 402" /></Campo>

        <Campo label="Prédio">
          <select className="input" value={predioId} onChange={(e) => setPredioId(e.target.value)}>
            {predios.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
            <option value="__new__">＋ Cadastrar novo prédio…</option>
          </select>
        </Campo>
        {predioId === "__new__" && (
          <div style={{ background: "var(--brand-soft)", borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <Campo label="Nome do prédio"><input className="input" value={novoPredio.nome} onChange={(e) => setNovoPredio({ ...novoPredio, nome: e.target.value })} placeholder="Ex.: Ed. Bela Vista" /></Campo>
            <Campo label="Endereço (uma vez só)"><input className="input" value={novoPredio.endereco} onChange={(e) => setNovoPredio({ ...novoPredio, endereco: e.target.value })} placeholder="Rua, número — bairro" /></Campo>
          </div>
        )}

        <Campo label="Proprietário">
          <select className="input" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            {proprietarios.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            <option value="__new__">＋ Cadastrar novo proprietário…</option>
          </select>
        </Campo>
        {ownerId === "__new__" && (
          <div style={{ background: "var(--brand-soft)", borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <Campo label="Nome do proprietário"><input className="input" value={novoOwner} onChange={(e) => setNovoOwner(e.target.value)} placeholder="Nome" /></Campo>
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <Campo label="Valor da limpeza"><input className="input" value={valor} onChange={(e) => setValor(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="120" /></Campo>
          <Campo label="Observação fixa"><input className="input" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="chave na portaria" /></Campo>
        </div>

        <button className="btn" style={{ marginTop: 4 }} onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : editing ? "Salvar alterações" : "Salvar apartamento"}</button>
        <button onClick={onClose} style={{ width: "100%", border: "none", background: "transparent", color: "var(--muted)", fontWeight: 600, padding: 12, fontSize: 14 }}>Cancelar</button>
      </div>
    </div>
  );
}

// ═══════════ EQUIPE ═══════════
function Equipe({ limpezas, onDone }) {
  const [showTexto, setShowTexto] = useState(false);
  // Só o que já pode ser limpo hoje — apartamentos com saída futura ainda não estão liberados.
  const pend = useMemo(
    () => limpezas.filter((c) => c.status === "pendente" && daysBetween(c.data_saida) <= 0).sort(ordenarFila),
    [limpezas]
  );

  const texto = "🧹 *Roteiro de limpeza — " + today.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + "*\n\n" +
    pend.map((c, i) => {
      const a = c.apartamentos || {};
      const nota = [a.obs_fixa, c.obs].filter(Boolean).join(" · ");
      const horario = c.entrada_antes_15h ? " (antes das 15h ⚠️)" : "";
      return `${i + 1}. ${a.apelido} · ${a.predios?.nome || ""}\n📍 ${a.predios?.endereco || "endereço não cadastrado"}\n⏰ entra ${relText(daysBetween(c.data_entrada))}${horario}` + (nota ? `\n📝 ${nota}` : "");
    }).join("\n\n");
  const waLink = "https://wa.me/?text=" + encodeURIComponent(texto);

  return (
    <div>
      <header>
        <div style={{ fontSize: 13, color: "var(--muted)", textTransform: "capitalize", fontWeight: 600 }}>{today.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</div>
        <h1 style={{ margin: "3px 0 0", fontSize: 28, fontWeight: 800, letterSpacing: "-.02em" }}>Roteiro da equipe</h1>
        <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "8px 0 0", lineHeight: 1.5 }}>Só o essencial pra quem limpa: endereço, ordem e o que fazer. Sem valores.</p>
      </header>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn" style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>Enviar no WhatsApp</a>
        <button className="btn-ghost" style={{ padding: "0 18px" }} onClick={() => setShowTexto((s) => !s)}>Ver texto</button>
      </div>

      {showTexto && (
        <div className="in" style={{ background: "#0B1B18", color: "#E8F0EE", borderRadius: "var(--radius-md)", padding: 15, marginTop: 12, fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.55, fontFamily: "ui-monospace,monospace", boxShadow: "var(--shadow-sm)" }}>{texto}</div>
      )}

      <div className="section-label">Ordem de hoje ({pend.length})</div>
      {pend.length === 0 ? <Empty>Nenhuma limpeza pra hoje. 🌿</Empty> : pend.map((c, i) => {
        const a = c.apartamentos || {};
        const dIn = daysBetween(c.data_entrada);
        const urgent = dIn <= 1, soon = dIn > 1 && dIn <= 3;
        const accent = urgent ? "var(--amber)" : soon ? "var(--gold)" : "var(--brand)";
        const nota = [a.obs_fixa, c.obs].filter(Boolean).join(" · ");
        const maps = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(a.predios?.endereco || "");
        return (
          <div key={c.id} className="card card-hover in" style={{ marginTop: 10, display: "flex", gap: 13 }}>
            <div style={{ width: 30, height: 30, borderRadius: 999, background: "var(--ink2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{a.apelido} · {a.predios?.nome}</div>
                <span className="chip" style={{ color: accent, background: "transparent", padding: 0 }}>entra {relText(dIn)}</span>
              </div>
              {c.entrada_antes_15h && (
                <div style={{
                  marginTop: 8, fontSize: 12.5, fontWeight: 700, color: "var(--amber)", background: "var(--amber-soft)",
                  borderRadius: 9, padding: "8px 10px", display: "flex", alignItems: "center", gap: 6,
                }}>
                  ⏰ Prioridade — hóspede entra antes das 15h
                </div>
              )}
              <a href={maps} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 13.5, color: "var(--brand)", marginTop: 3, textDecoration: "none", fontWeight: 500 }}>📍 {a.predios?.endereco || "endereço não cadastrado"}</a>
              {nota && <div style={{ marginTop: 8, fontSize: 13, background: "#F7F6F2", borderRadius: 10, padding: "8px 10px", color: "#4A5350" }}>📝 {nota}</div>}
              <button className="btn-outline" style={{ marginTop: 10 }} onClick={() => onDone(c.id)}>Marcar feito ✓</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ——— pequenos ———
function Campo({ label, children }) {
  return <label style={{ display: "block", marginBottom: 14, flex: 1 }}><span className="field-label">{label}</span>{children}</label>;
}
function Empty({ children }) {
  return <div className="card" style={{ borderStyle: "dashed", padding: 22, textAlign: "center", color: "var(--muted)", marginTop: 10 }}>{children}</div>;
}
