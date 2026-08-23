import { supabase } from "./supabaseClient";

// ————————————————— LEITURAS —————————————————

// Todas as limpezas, já trazendo o apartamento, o prédio e o dono juntos.
export async function getLimpezas() {
  const { data, error } = await supabase
    .from("limpezas")
    .select(
      "id, data_saida, data_entrada, obs, status, valor, apartamento_id, criado_em, entrada_antes_15h, " +
        "apartamentos(apelido, obs_fixa, proprietario_id, predios(nome, endereco), proprietarios(nome))"
    )
    .order("data_entrada", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getApartamentos() {
  const { data, error } = await supabase
    .from("apartamentos")
    .select("id, apelido, valor_limpeza, obs_fixa, predio_id, proprietario_id, predios(nome), proprietarios(nome)")
    .eq("ativo", true)
    .order("apelido");
  if (error) throw error;
  return data;
}

export async function getPredios() {
  const { data, error } = await supabase.from("predios").select("id, nome, endereco").order("nome");
  if (error) throw error;
  return data;
}

export async function getProprietarios() {
  const { data, error } = await supabase
    .from("proprietarios")
    .select("id, nome, telefone, token_acesso")
    .order("nome");
  if (error) throw error;
  return data;
}

// ————————————————— ESCRITAS (administração) —————————————————

export async function marcarPronto(id) {
  const { error } = await supabase
    .from("limpezas")
    .update({ status: "pronto", concluido_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function criarPredio(nome, endereco) {
  const { data, error } = await supabase.from("predios").insert({ nome, endereco }).select().single();
  if (error) throw error;
  return data;
}

export async function criarProprietario(nome, telefone) {
  const { data, error } = await supabase
    .from("proprietarios")
    .insert({ nome, telefone })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function criarApartamento({ apelido, predio_id, proprietario_id, valor_limpeza, obs_fixa }) {
  const { error } = await supabase
    .from("apartamentos")
    .insert({ apelido, predio_id, proprietario_id, valor_limpeza, obs_fixa });
  if (error) throw error;
}

export async function atualizarApartamento(id, { apelido, predio_id, proprietario_id, valor_limpeza, obs_fixa }) {
  const { error } = await supabase
    .from("apartamentos")
    .update({ apelido, predio_id, proprietario_id, valor_limpeza, obs_fixa })
    .eq("id", id);
  if (error) throw error;
}

// Soft delete: mantém o histórico de limpezas já registradas para este apartamento.
export async function excluirApartamento(id) {
  const { error } = await supabase.from("apartamentos").update({ ativo: false }).eq("id", id);
  if (error) throw error;
}

// ————————————————— LINK DO PROPRIETÁRIO (funções seguras) —————————————————

export async function aptosDoProprietario(token) {
  const { data, error } = await supabase.rpc("apartamentos_do_proprietario", { p_token: token });
  if (error) throw error;
  return data;
}

export async function registrarLimpeza(token, apartamentoId, saida, entrada, obs, antesDas15h) {
  const { data, error } = await supabase.rpc("registrar_limpeza", {
    p_token: token,
    p_apartamento_id: apartamentoId,
    p_data_saida: saida,
    p_data_entrada: entrada || null,
    p_obs: obs || null,
    p_entrada_antes_15h: !!antesDas15h,
  });
  if (error) throw error;
  return data;
}
