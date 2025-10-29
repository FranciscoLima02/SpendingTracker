# Guia rápido: testar o Finance Zen no teu Mac

Este passo-a-passo assume que ainda não tens nada instalado. Segue a ordem e deverás ver a app a correr em poucos minutos.

## 1. Instalar Node.js (ou Bun)

Escolhe uma das opções abaixo. Basta uma vez.

### Opção A — Homebrew (mais simples)
```sh
brew install node
```

### Opção B — nvm (se queres gerir várias versões)
```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# fecha e volta a abrir o terminal, ou executa:
source ~/.zshrc
nvm install --lts
nvm use --lts
```

### Opção C — Bun (alternativa mais rápida)
```sh
curl -fsSL https://bun.sh/install | bash
```

> 💡 Depois de instalar, confirma que tudo está disponível com `node -v` e `npm -v` (ou `bun -v`). Se algum comando não aparecer, fecha e reabre o terminal.

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
| Erro ao instalar dependências nativas do Capacitor | `pod`/Xcode não configurados | Instala o Xcode completo e corre `sudo xcode-select --switch /Applications/Xcode.app`. |
| Site abre mas está vazio | Cache antigo do IndexedDB | No browser, abre DevTools → Application → Storage e limpa o IndexedDB, ou corre `localStorage.clear()` no console. |

Seguindo estes passos consegues experimentar todos os automatismos (planeamento mensal, indicadores, saldos) diretamente no Mac ou no iPhone sem necessidade de hospedar a app.
