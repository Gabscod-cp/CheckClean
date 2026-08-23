# Facilidade ADM

App de administração de limpeza de apartamentos, conectado ao Supabase.

Três partes:
- **Administração** (`/`) — sua mãe loga, vê as prioridades do dia, o faturamento, cadastra apartamentos e envia o roteiro pra equipe.
- **Link do proprietário** (`/reportar/<token>`) — sem login; cada dono avisa as limpezas dos aptos dele.
- **Equipe** — o botão "Enviar no WhatsApp" abre o app do WhatsApp com o roteiro pronto.

---

## Passo a passo

### 1. Banco de dados
Já feito: você rodou o `banco-facilidade-adm.sql` no Supabase.

### 2. Login da administradora
No Supabase → **Authentication → Users → Add user** → crie com o e-mail e senha da sua mãe.

### 3. Chaves do projeto
No Supabase → **Settings → API** → copie:
- **Project URL**
- **anon public** (a chave pública)

### 4. Rodar no seu computador
```bash
npm install
cp .env.local.example .env.local
```
Abra o `.env.local` e cole os dois valores do passo 3. Depois:
```bash
npm run dev
```
Abra http://localhost:3000 — vai pedir o login (o do passo 2).

### 5. Testar o ciclo
1. Entre → aba **Cadastro** → **+ Novo** → cadastre um prédio, um proprietário e um apto.
2. Ainda em Cadastro, em "Proprietários e seus links", toque em **Copiar link**.
3. Abra esse link numa aba anônima (simula o proprietário) e envie uma limpeza.
4. Volte na aba **Hoje**: a limpeza aparece na prioridade certa. Marque como pronto e veja o faturamento subir.

### 6. Publicar (Vercel)
1. Suba o projeto num repositório do GitHub.
2. Na Vercel → **Add New → Project** → importe o repositório.
3. Em **Environment Variables**, adicione as duas do `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy**. Você recebe um link fixo `algo.vercel.app`.

Pronto: sua mãe abre o link no celular e adiciona à tela inicial (fica com cara de app). Os links dos proprietários passam a ser `https://algo.vercel.app/reportar/<token>`.

---

## Observações
- A chave **anon** é pública por design — pode ficar no app sem problema. Quem protege os dados é o RLS + as funções que você criou no banco.
- O link do proprietário é um "código de acesso" na URL: quem tiver o link consegue avisar limpezas daquele dono. Para este uso é aceitável; se um dia quiser trocar o link de alguém, dá pra gerar um token novo no banco.
- Quer deixar o app só em português no navegador do celular e sem barra do navegador? Depois a gente adiciona um `manifest.json` pra virar PWA instalável de verdade.
