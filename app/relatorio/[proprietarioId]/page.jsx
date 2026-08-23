"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getLimpezas } from "../../../lib/data";

const brl = (n) => "R$ " + Number(n || 0).toLocaleString("pt-BR");
const fmtDay = (iso) => { if (!iso) return "—"; const [, m, d] = iso.split("-"); return `${d}/${m}/${iso.slice(0, 4)}`; };

export default function RelatorioProprietario() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: "center", color: "#6C7671" }}>Preparando relatório…</div>}>
      <RelatorioConteudo />
    </Suspense>
  );
}

function RelatorioConteudo() {
  const router = useRouter();
  const { proprietarioId } = useParams();
  const searchParams = useSearchParams();
  const nome = searchParams.get("nome") || "Proprietário";
  const mesParam = searchParams.get("mes") || "";
  const [ready, setReady] = useState(false);
  const [itens, setItens] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace("/login"); return; }

      const [anoStr, mesStr] = mesParam.split("-");
      const ano = Number(anoStr), mes = Number(mesStr);
      const inicio = new Date(ano, mes - 1, 1);
      const fim = new Date(ano, mes, 1);

      const limpezas = await getLimpezas();
      const filtrado = limpezas
        .filter((c) => {
          if (c.status !== "pronto") return false;
          if (c.apartamentos?.proprietario_id !== proprietarioId) return false;
          const d = new Date(c.data_saida + "T00:00:00");
          return d >= inicio && d < fim;
        })
        .sort((a, b) => a.data_saida.localeCompare(b.data_saida));
      setItens(filtrado);
      setReady(true);
    })();
  }, [proprietarioId, mesParam, router]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, [ready]);

  if (!ready) return <div style={{ padding: 60, textAlign: "center", color: "#6C7671" }}>Preparando relatório…</div>;

  const total = itens.reduce((s, c) => s + Number(c.valor), 0);
  const [anoStr, mesStr] = mesParam.split("-");
  const mesNome = new Date(Number(anoStr), Number(mesStr) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const geradoEm = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <style>{`
        @page { size: A4; margin: 18mm 16mm; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { }
        @media print { .no-print { display: none !important; } }
      `}</style>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 28px", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#2A2224" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #A8506A", paddingBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(155deg,#241820,#3B2230)",
            }}>🧹</div>
            <div style={{ fontWeight: 800, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 19 }}>CheckClean</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#7C6F6C" }}>Gerado em {geradoEm}</div>
        </div>

        <div style={{ marginTop: 26 }}>
          <div style={{ fontSize: 12.5, color: "#7C6F6C", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 700 }}>Relatório de limpezas</div>
          <h1 style={{ margin: "4px 0 2px", fontSize: 26, fontWeight: 800, fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: "-.02em" }}>{nome}</h1>
          <div style={{ fontSize: 14.5, color: "#7C6F6C", textTransform: "capitalize" }}>{mesNome}</div>
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22,
          background: "#F6E4E9", borderRadius: 14, padding: "16px 20px",
        }}>
          <div>
            <div style={{ fontSize: 12, color: "#7C6F6C", fontWeight: 600 }}>Total do período</div>
            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Bricolage Grotesque', sans-serif", color: "#A8506A", marginTop: 2 }}>{brl(total)}</div>
          </div>
          <div style={{ fontSize: 13, color: "#7C6F6C", fontWeight: 600 }}>{itens.length} {itens.length === 1 ? "limpeza" : "limpezas"}</div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 26, fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "#F2ECE5" }}>
              <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 700, color: "#2A2224", borderBottom: "1px solid #E9E1DA" }}>Apartamento</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 700, color: "#2A2224", borderBottom: "1px solid #E9E1DA" }}>Prédio</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 700, color: "#2A2224", borderBottom: "1px solid #E9E1DA" }}>Saída</th>
              <th style={{ textAlign: "right", padding: "10px 12px", fontWeight: 700, color: "#2A2224", borderBottom: "1px solid #E9E1DA" }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: "18px 12px", color: "#7C6F6C", textAlign: "center" }}>Nenhuma limpeza registrada neste período.</td></tr>
            ) : itens.map((c) => (
              <tr key={c.id}>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #F2ECE5" }}>{c.apartamentos?.apelido}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #F2ECE5", color: "#7C6F6C" }}>{c.apartamentos?.predios?.nome || "—"}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #F2ECE5", color: "#7C6F6C" }}>{fmtDay(c.data_saida)}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #F2ECE5", textAlign: "right", fontWeight: 600 }}>{brl(c.valor)}</td>
              </tr>
            ))}
          </tbody>
          {itens.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} style={{ padding: "12px", textAlign: "right", fontWeight: 700 }}>Total</td>
                <td style={{ padding: "12px", textAlign: "right", fontWeight: 800, color: "#A8506A" }}>{brl(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>

        <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid #E9E1DA", fontSize: 11.5, color: "#A99D98", textAlign: "center" }}>
          Relatório gerado automaticamente pelo CheckClean.
        </div>

        <button
          className="no-print"
          onClick={() => window.print()}
          style={{
            display: "block", margin: "30px auto 0", border: "none", background: "linear-gradient(155deg,#A8506A,#7E3A50)",
            color: "#fff", fontWeight: 700, fontSize: 15, padding: "13px 26px", borderRadius: 14, cursor: "pointer",
          }}
        >
          Baixar PDF
        </button>
      </div>
    </div>
  );
}
