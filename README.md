# Reserva de Salas & Nave — Assembleia de Deus Louveira

Sistema de reserva de Salas e da Nave, com calendário, checagem automática de
conflito de horário e área de administrador. Agora com banco de dados real
(Postgres), pronto para publicar na Vercel.

## O que muda em relação à versão anterior (HTML único)

- Antes: tudo ficava só na memória do navegador (ou na sincronização interna do Claude).
- Agora: as salas e reservas ficam salvas num banco de dados Postgres de verdade.
  Qualquer pessoa, em qualquer dispositivo, vê os mesmos dados.
- A senha de administrador não aparece mais no código — ela fica guardada como
  variável de ambiente na Vercel, fora do código-fonte.
- A checagem de conflito de horário agora é feita dentro do próprio banco de
  dados, numa única operação atômica — duas pessoas não conseguem "roubar"
  o mesmo horário mesmo clicando ao mesmo tempo.

## Passo a passo para publicar na Vercel

### 1. Subir o código para o GitHub
1. Crie um repositório novo no GitHub (pode ser privado).
2. Suba esta pasta para o repositório (`git init`, `git add .`, `git commit -m "primeira versão"`, `git push`).
   Se preferir não usar o terminal, dá pra arrastar os arquivos direto na interface do GitHub.

### 2. Criar o projeto na Vercel
1. Entre em [vercel.com](https://vercel.com) e faça login (pode ser com a conta do GitHub).
2. Clique em **Add New → Project** e selecione o repositório que você acabou de criar.
3. A Vercel detecta automaticamente que é um projeto Next.js — não precisa mudar nada nessa tela. Clique em **Deploy**.
   (O primeiro deploy pode dar erro porque o banco de dados ainda não existe — é normal, resolvemos no próximo passo.)

### 3. Criar o banco de dados (Neon, via Vercel)
1. Dentro do projeto na Vercel, vá na aba **Storage**.
2. Clique em **Create Database** → escolha **Neon** (Postgres serverless).
   Se aparecer em **Marketplace** em vez de **Storage**, o caminho é o mesmo: procure por "Neon" e clique em **Install/Add**.
3. Siga as instruções e conecte o banco ao seu projeto quando for perguntado.
   Isso cria automaticamente a variável `DATABASE_URL` (e outras parecidas) — você não precisa copiar nada manualmente.

### 4. Configurar a senha de administrador
1. Vá em **Settings → Environment Variables** no projeto da Vercel.
2. Adicione:
   - `ADMIN_PASSWORD` → a senha que os administradores vão digitar no site.
   - `SESSION_SECRET` → qualquer frase longa e aleatória (só é usada internamente, ninguém digita ela).
3. Salve e depois vá na aba **Deployments** → clique nos três pontinhos do último deploy → **Redeploy**, para a Vercel aplicar as novas variáveis.

### 5. Pronto
Depois desse redeploy, o site já está no ar com banco de dados real. A primeira
requisição cria as tabelas automaticamente e já cadastra "Sala 1", "Sala 2" e
"Nave" como ambientes padrão — você pode editar isso depois pela própria tela
de **Cadastro de Salas**, logado como administrador.

## Rodando localmente (opcional, para testar antes de publicar)

```bash
npm install
vercel link        # conecta esta pasta ao projeto criado na Vercel
vercel env pull .env.local   # baixa as variáveis (banco, senha etc.) para rodar localmente
npm run dev
```

Acesse http://localhost:3000

## Trocar o logo

Troque o arquivo `public/logo.jpg` por outra imagem com o mesmo nome (ou ajuste
o caminho em `app/page.js`, na linha que tem `<img src="/logo.jpg" ...>`).

## Trocar cores / textos

Tudo isso está em `app/globals.css` (cores, variáveis `--primary`, `--gold`,
cores das salas etc.) e em `app/page.js` (textos da interface).
