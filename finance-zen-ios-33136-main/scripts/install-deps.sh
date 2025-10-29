#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "📦 Finance Zen - Instalar dependências"
echo "Este script prepara o ambiente para testar a app no macOS."
echo

# Detect macOS
ios_name="$(uname -s)"
if [[ "$ios_name" != "Darwin" ]]; then
  echo "⚠️  Detetámos '$ios_name'. Este script só automatiza passos no macOS."
  echo "    Continua manualmente seguindo docs/local-testing.md."
  exit 1
fi

# Helper to install node via nvm if brew missing
install_node_via_nvm() {
  local nvm_dir="$HOME/.nvm"
  if [[ ! -d "$nvm_dir" ]]; then
    echo "🔄 A instalar nvm (Node Version Manager)..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  else
    echo "✅ nvm já se encontra instalado."
  fi

  export NVM_DIR="$nvm_dir"
  # shellcheck disable=SC1091
  if [[ -s "$nvm_dir/nvm.sh" ]]; then
    source "$nvm_dir/nvm.sh"
  else
    echo "❌ Não encontrámos $nvm_dir/nvm.sh. Verifica a instalação do nvm."
    exit 1
  fi
  echo "🔄 A instalar Node LTS via nvm..."
  nvm install --lts
  nvm use --lts
}

ensure_node() {
  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    echo "✅ Node.js e npm já estão disponíveis."
    return
  fi

  if command -v brew >/dev/null 2>&1; then
    echo "🔄 A instalar Node via Homebrew..."
    brew install node
  else
    echo "🍺 Homebrew não encontrado. Vamos usar nvm."
    if ! command -v curl >/dev/null 2>&1; then
      echo "❌ curl não está disponível, não conseguimos instalar nvm automaticamente."
      echo "   Instala manualmente curl ou segue as instruções em docs/local-testing.md."
      exit 1
    fi
    install_node_via_nvm
  fi
}

PACKAGE_MANAGER="npm"

echo "➡️  A verificar Node.js/npm..."
ensure_node

if ! command -v npm >/dev/null 2>&1; then
  if command -v bun >/dev/null 2>&1; then
    echo "⚠️  npm continua indisponível mas Bun foi encontrado."
    echo "    Vamos usar bun para instalar dependências."
    PACKAGE_MANAGER="bun"
  else
    echo "❌ Não foi possível garantir npm ou bun. Verifica manualmente a instalação de Node."
    exit 1
  fi
fi

cd "$PROJECT_ROOT"

echo "➡️  A instalar dependências do projeto com $PACKAGE_MANAGER..."
if [[ "$PACKAGE_MANAGER" == "npm" ]]; then
  if npm install; then
    INSTALL_NOTE="npm run dev"
  else
    echo "⚠️  'npm install' falhou. A tentar novamente com '--legacy-peer-deps'..."
    if npm install --legacy-peer-deps; then
      echo "ℹ️  Utilizámos '--legacy-peer-deps' para ultrapassar conflitos de peer dependencies."
      INSTALL_NOTE="npm run dev"
    else
      echo "❌ Não foi possível concluir 'npm install'. Consulta os logs acima para mais detalhes."
      exit 1
    fi
  fi
else
  bun install
  INSTALL_NOTE="bun dev"
fi

echo
echo "🎉 Tudo pronto! Agora podes correr '$INSTALL_NOTE' para testar localmente."
