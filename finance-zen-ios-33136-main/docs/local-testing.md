# Guia rápido: testar o Finance Zen no teu computador

Este passo-a-passo assume que ainda não tens nada instalado. Segue a ordem e deverás ver a app a correr em poucos minutos.

## 0. Queres automatizar? (opcional)

### macOS

```sh
./scripts/install-deps.sh
```

O script verifica se tens Homebrew ou nvm, instala o Node LTS (ou usa o Bun caso já o tenhas) e corre `npm install`/`bun install`. Se a primeira instalação falhar por conflitos de peer dependencies, ele tenta novamente com `npm install --legacy-peer-deps`. Se não estiveres em macOS ele avisa e podes seguir os passos manuais abaixo.

### Windows

Abre o PowerShell (de preferência como administrador), navega até à pasta do projeto e executa:

```powershell
cd C:\Users\oTeuUtilizador\Downloads\finance-zen-ios-33136-main
powershell -ExecutionPolicy Bypass -File .\scripts\install-deps.ps1
```

O assistente tenta instalar o Node LTS via winget (com fallback para Chocolatey), atualiza o PATH da sessão e corre `npm install`. Caso `npm install` falhe por conflitos, ele repete automaticamente com `--legacy-peer-deps`. Se `npm` continuar indisponível mas detetar Bun, termina com `bun install` e indica que deves usar `bun dev` para arrancar o projeto.

> 🎯 **Preferes um passo-a-passo manual?** Vê a nova secção "2.1. Correr localmente no Windows" do [README](../README.md#21-correr-localmente-no-windows-modo-desenvolvimento) para os mesmos comandos explicados um a um.

## 1. Instalar Node.js (ou Bun)

Escolhe a opção que fizer mais sentido para o teu sistema operativo. Basta uma vez.

### macOS

**Opção A — Homebrew (mais simples)**
```sh
brew install node
```

**Opção B — nvm (se queres gerir várias versões)**
```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# fecha e volta a abrir o terminal, ou executa:
source ~/.zshrc
nvm install --lts
nvm use --lts
```

**Opção C — Bun (alternativa mais rápida)**
```sh
curl -fsSL https://bun.sh/install | bash
```

> 💡 Depois de instalar, confirma que tudo está disponível com `node -v` e `npm -v` (ou `bun -v`). Se algum comando não aparecer, fecha e reabre o terminal.

### Windows

**Opção A — winget (mais direto)**

```powershell
winget install OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
```

**Opção B — Chocolatey (se já o usas)**

```powershell
choco install nodejs-lts -y --no-progress
```

**Opção C — nvm-windows (para gerir versões)**

1. Faz download do instalador em <https://github.com/coreybutler/nvm-windows/releases>
2. Depois de instalar, corre `nvm install lts` seguido de `nvm use lts`

> 💡 Após a instalação, abre uma **nova** janela do PowerShell ou usa o script `scripts/install-deps.ps1` para forçar a atualização do PATH antes de correres `npm`.

## 2. Clonar o projeto (se ainda não tens)
```sh
git clone <URL_DO_REPO>
cd finance-zen-ios-33136-main
```

Se já tens a pasta no teu Mac, entra nela com `cd` e continua.

## 3. Instalar dependências e arrancar o servidor
```sh
npm install
npm run dev
```

> Usando Bun? Substitui por `bun install` e `bun dev`.

> Se o `npm install` acusar conflitos de peer dependencies, repete com `npm install --legacy-peer-deps`. O script automático já faz este passo por ti.

O Vite vai mostrar um endereço `http://localhost:5173/`. Abre esse link no navegador do Mac. Se quiseres testar no iPhone, certifica-te de que ambos estão na mesma rede e usa o IP local do Mac (ex.: `http://192.168.1.23:5173`).

## 4. Testar o build final (opcional)
```sh
npm run build
npm run preview
```

Isso serve os ficheiros otimizados em `http://localhost:4173/`, que é a mesma versão usada para gerar o `.ipa` ou publicar via Lovable.

## 5. Problemas comuns

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| `zsh: command not found: npm` | Node não instalado ou sessão antiga | Instala via Brew/nvm ou reabre o terminal. Com nvm, confirma que `source ~/.zshrc` correu. |
| `winget : The term 'winget' is not recognized` | Windows sem App Installer atualizado | Instala o App Installer pela Microsoft Store ou usa as opções Chocolatey/nvm-windows. |
| `npm : The term 'npm' is not recognized` | PowerShell não foi reiniciado após instalar o Node | Abre uma nova janela do terminal ou corre `powershell -ExecutionPolicy Bypass -File .\scripts\install-deps.ps1` para atualizar o PATH. |
| `The argument '.\scripts\install-deps.ps1' to the -File parameter does not exist` | Estás noutra pasta que não contém o projeto | Verifica onde extraíste/clonaste a app e corre `cd C:\...\finance-zen-ios-33136-main` antes de executares o comando. |
| Erro ao instalar dependências nativas do Capacitor | `pod`/Xcode não configurados | Instala o Xcode completo e corre `sudo xcode-select --switch /Applications/Xcode.app`. |
| Site abre mas está vazio | Cache antigo do IndexedDB | No browser, abre DevTools → Application → Storage e limpa o IndexedDB, ou corre `localStorage.clear()` no console. |

Seguindo estes passos consegues experimentar todos os automatismos (planeamento mensal, indicadores, saldos) diretamente no Mac ou no iPhone sem necessidade de hospedar a app.
