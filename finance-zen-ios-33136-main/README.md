# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/715dcac5-69b5-4f34-aa41-2bc0aaffa110

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/715dcac5-69b5-4f34-aa41-2bc0aaffa110) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/715dcac5-69b5-4f34-aa41-2bc0aaffa110) and click on Share -> Publish.

## How can I install the app on my iPhone?

The project is now configured for [Capacitor](https://capacitorjs.com/), so you can compile a fully offline iOS binary (an `.ipa` that behaves like an `exe` for iPhone) without hosting the site on the web. You will need a Mac with Xcode installed in order to complete the build and run it on a device.

1. Install Node.js and npm (only needs to be done once on your Mac):
   - **Via Homebrew** (recomendado se já utilizas `brew`):
     ```sh
     brew install node
     ```
   - **Via nvm** (se preferires gerir várias versões de Node):
     ```sh
     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
     # reinicia o terminal para carregar o nvm
     nvm install --lts
     ```
   - Verifica se ficou tudo pronto executando `node -v` e `npm -v`. Se não aparecerem erros estás pronto para o próximo passo.

2. Instala as dependências do projeto e gera os assets web de produção:
   ```sh
   npm install
   npm run build
   ```
   > 💡 Preferes usar [Bun](https://bun.sh/)? Ele também funciona: `bun install` seguido de `bun run build` vai produzir o mesmo resultado, e podes substituir os comandos `npm run ...` por `bun run ...`.

3. Copy the production build into the native iOS container and install Capacitor's native dependencies:
   ```sh
   npm run cap:sync
   ```
   The first time you run this command it will ask to install the iOS platform; accept the prompt or run `npx cap add ios` manually.
4. Open the generated Xcode project:
   ```sh
   npm run ios
   ```
5. In Xcode, choose your development team, plug in your iPhone (or select a simulator), then press **Run**. Xcode will build and install the app bundle directly on your device.

Once installed through Xcode, the app runs completely offline because all assets are bundled inside the native container. You can still ship the PWA through the browser if you prefer the Add to Home Screen flow.

## Como posso testar a aplicação?

Se quiseres apenas experimentar as automatizações e o fluxo de orçamento sem compilar o `.ipa`, tens três opções equivalentes. Todas partem do mesmo bundle web e funcionam offline graças ao IndexedDB.

> 📘 **Queres um passo-a-passo rápido?** Consulta o guia [docs/local-testing.md](docs/local-testing.md) para veres todos os comandos de uma só vez, incluindo resolução de problemas frequentes no macOS.

> 🤖 **Preferes automatizar no Mac?** Corre `./scripts/install-deps.sh` e o script instala o Node (via Homebrew ou nvm), executa `npm install`/`bun install` e, se detetar conflitos, repete automaticamente com `--legacy-peer-deps` antes de te deixar pronto para `npm run dev`.
>
> 🪟 **No Windows?** Abre o PowerShell, navega até à pasta do projeto (por exemplo `cd C:\Users\oTeuUtilizador\Downloads\finance-zen-ios-33136-main`) e só depois corre `powershell -ExecutionPolicy Bypass -File .\scripts\install-deps.ps1`. O assistente tenta instalar o Node via `winget` (com fallback para Chocolatey ou `nvm-windows` se o tiveres instalado), volta a atualizar o PATH da sessão, e depois executa `npm install` com fallback automático para `--legacy-peer-deps`. Se `npm` não aparecer mas tiveres Bun instalado, ele usa `bun install` e indica que deves arrancar com `bun dev`.

### 1. Testar diretamente via Lovable (mais rápido)

1. Abre o projeto em [Lovable](https://lovable.dev/projects/715dcac5-69b5-4f34-aa41-2bc0aaffa110).
2. Clica em **Share → Publish** para gerar um URL HTTPS temporário.
3. Abre esse link no teu iPhone (Safari) ou no desktop. Podes adicionar à tela inicial para simular um app instalado.

### 2. Correr localmente no Mac (modo desenvolvimento)

> ⚠️ Se o terminal mostrar `zsh: command not found: npm`, significa que o Node.js ainda não está instalado ou não foi carregado na sessão atual. Segue uma das opções abaixo e **fecha/reabre** o terminal antes de continuar.

**Opção A — instalar Node rapidamente com Homebrew**

```sh
brew install node
```

**Opção B — usar nvm para gerir versões (ideal a longo prazo)**

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# reabre o terminal ou executa `source ~/.zshrc`
nvm install --lts
nvm use --lts
```

**Opção C — preferes Bun?**

```sh
curl -fsSL https://bun.sh/install | bash
```

Depois de qualquer opção, confirma que as ferramentas estão disponíveis:

```sh
node -v
npm -v      # se usares Bun, confirma com `bun -v`
```

Agora sim, dentro da pasta do projeto corre:

```sh
npm install
npm run dev
```

> Com Bun substitui por `bun install` e `bun dev`.

Se estiveres a usar nvm e o terminal continuar a queixar-se de `npm`, garante que o ficheiro `~/.zshrc` tem as linhas de inicialização adicionadas pelo instalador (reinicia o terminal ou corre `source ~/.zshrc`).

Quando o Vite arrancar, mostra um endereço `http://localhost:5173/`. Se quiseres abrir no iPhone, certifica-te de que ambos estão na mesma rede e usa o IP local do Mac (ex.: `http://192.168.1.23:5173`).

### 2.1. Correr localmente no Windows (modo desenvolvimento)

> 📦 **Queres automatizar tudo?** Garante primeiro que estás dentro da pasta do projeto (`cd C:\...\finance-zen-ios-33136-main`) e só depois corre `powershell -ExecutionPolicy Bypass -File .\scripts\install-deps.ps1`. O assistente instala o Node via `winget` (com fallback para Chocolatey ou `nvm-windows` quando disponível), atualiza o PATH e executa `npm install`, repetindo automaticamente com `--legacy-peer-deps` se for necessário. Se preferires seguir manualmente, usa os passos abaixo.

1. **Instala o Node LTS** pela tua ferramenta favorita:
   - **winget (recomendado)**
     ```powershell
     winget install OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
     ```
   - **Chocolatey**
     ```powershell
     choco install nodejs-lts -y --no-progress
     ```
   - **nvm-windows**
     1. Faz download do instalador em <https://github.com/coreybutler/nvm-windows/releases>
     2. Depois de instalado, corre `nvm install lts` seguido de `nvm use lts`

   > ⚠️ Depois da instalação fecha e volta a abrir o PowerShell (ou corre `refreshenv` no Chocolatey) para que `npm` fique disponível. Confirma com `node -v` e `npm -v`.

2. **Prepara a pasta do projeto**:
   ```powershell
   git clone <URL_DO_REPO>
   cd finance-zen-ios-33136-main
   ```

3. **Instala as dependências**:
   ```powershell
   npm install
   ```
   > Se aparecerem erros de *peer dependencies*, repete com `npm install --legacy-peer-deps`.

4. **Arranca o servidor de desenvolvimento**:
   ```powershell
   npm run dev
   ```
   Vite mostra um endereço `http://localhost:5173/`. Abre-o no navegador do Windows. Para testar no iPhone, certifica-te de que ambos estão na mesma rede e usa o IP local do PC (ex.: `http://192.168.1.45:5173`).

   > Usas Bun? Troca pelos comandos `bun install` e `bun dev`.

5. **Queres validar o build otimizado?**
   ```powershell
   npm run build
   npm run preview
   ```
   Isso serve a versão final em `http://localhost:4173/`.

### 3. Testar o build de produção sem Xcode

1. Gera o bundle final:
   ```sh
   npm run build
   npm run preview
   ```
   O comando `npm run preview` serve os ficheiros otimizados em `http://localhost:4173/`.
2. Tal como no modo dev, podes abrir esse endereço no desktop ou no iPhone (via IP da rede local). O comportamento é idêntico ao `.ipa`, apenas sem a camada nativa.

> 💡 Depois de experimentares e confirmares que tudo funciona como esperado, podes seguir a secção "How can I install the app on my iPhone?" para gerar a versão nativa com Capacitor/Xcode.

## Como funciona o planeamento financeiro automático?

A app já nasce com um plano mensal completo para entradas e saídas. Sempre que um novo mês é criado são registadas automaticamente as entradas fixas (salário, cartões, subsídio, extraordinários) e ficam disponíveis as metas de despesas/transferências para cada categoria:

- **Entradas**: salário base, subsídio (Junho/Dezembro), saldo do cartão refeição, plafond do cartão de crédito e entradas extraordinárias.
- **Despesas essenciais**: renda, contas (luz/água/gás) e comida.
- **Despesas variáveis**: lazer, shit money, transporte, saúde, compras/necessidades e subscrições de trabalho/formação.
- **Investimentos & buffer**: transferência para poupança, crypto core, crypto shit e fundo de emergência.

O dashboard cruza automaticamente o plano com os movimentos registados para calcular:

- Cash flow do mês (saldo inicial + entradas − saídas).
- Percentagem do rendimento consumida em essenciais, lazer/shit money e crypto.
- Despesas fixas vs variáveis.
- Progresso real da poupança face à meta definida.
- Saldos atualizados de cada “bolsa” (Conta, Cartões, Poupança, Crypto).

Tudo isto funciona offline graças ao IndexedDB, por isso consegues acompanhar o orçamento mesmo sem ligação à internet.

Quando deres o mês por concluído, utiliza o botão **Fechar mês** no dashboard. A app marca o período como encerrado, cria automaticamente o mês seguinte com as mesmas metas (ajustadas aos valores reais que registaste nos cartões) e transporta os saldos das contas para poderes continuar o planeamento sem perder histórico.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
