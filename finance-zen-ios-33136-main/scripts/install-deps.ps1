#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Prepara o ambiente Windows para testar o Finance Zen localmente.
.DESCRIPTION
  Instala Node.js (via winget ou Chocolatey), tenta usar bun se npm não estiver disponível
  e executa a instalação das dependências do projeto com tratamento automático de
  conflitos de peer dependencies.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

Write-Host "📦 Finance Zen - Instalar dependências (Windows)" -ForegroundColor Cyan
Write-Host "Este script prepara o ambiente para testar a app no Windows."
Write-Host

$runningOnWindows = $env:OS -eq 'Windows_NT'
if (-not $runningOnWindows) {
  Write-Host "⚠️  Detetámos um sistema não Windows. Usa o script macOS (scripts/install-deps.sh) ou segue docs/local-testing.md."
  exit 1
}

function Add-NodePaths {
  $paths = @()

  if ($Env:NVM_SYMLINK) {
    $paths += $Env:NVM_SYMLINK
  }
  if ($Env:ProgramFiles) {
    $paths += (Join-Path $Env:ProgramFiles 'nodejs')
  }
  $programFilesX86 = ${Env:ProgramFiles(x86)}
  if ($programFilesX86) {
    $paths += (Join-Path $programFilesX86 'nodejs')
  }
  if ($Env:LOCALAPPDATA) {
    $paths += (Join-Path (Join-Path $Env:LOCALAPPDATA 'Programs') 'nodejs')
  }

  $currentPaths = ($env:Path -split ';') | ForEach-Object { $_.TrimEnd([char]92) }
  foreach ($path in $paths | Where-Object { $_ -and (Test-Path $_) }) {
    $normalized = $path.TrimEnd([char]92)
    if (-not ($currentPaths | Where-Object { $_ -ieq $normalized })) {
      $env:Path = "$normalized;$env:Path"
      $currentPaths += $normalized
    }
  }
}

function Invoke-Process {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Exe,
    [string[]] $Args = @(),
    [string] $ErrorMessage = "O comando '$Exe' falhou."
  )

  & $Exe @Args
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    throw "$ErrorMessage (código $exitCode)"
  }
}

function Use-NvmIfAvailable {
  if (-not (Get-Command nvm -ErrorAction SilentlyContinue)) {
    return $false
  }

  Write-Host "🔄 A instalar Node LTS via nvm..."
  try {
    Invoke-Process -Exe 'nvm' -Args @('install', 'lts') -ErrorMessage "nvm não conseguiu instalar o Node LTS"
    Invoke-Process -Exe 'nvm' -Args @('use', 'lts') -ErrorMessage "nvm não conseguiu ativar o Node LTS"
    Add-NodePaths
    if ((Get-Command node -ErrorAction SilentlyContinue) -and (Get-Command npm -ErrorAction SilentlyContinue)) {
      Write-Host "✅ Node.js e npm preparados via nvm."
      return $true
    }
  }
  catch {
    Write-Host "⚠️  $($_.Exception.Message)" -ForegroundColor Yellow
  }

  return $false
}

function Ensure-Node {
  if ((Get-Command node -ErrorAction SilentlyContinue) -and (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "✅ Node.js e npm já estão disponíveis."
    return
  }

  Add-NodePaths

  if ((Get-Command node -ErrorAction SilentlyContinue) -and (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "✅ Node.js e npm ficaram disponíveis após atualizar o PATH da sessão."
    return
  }

  if (Use-NvmIfAvailable) {
    return
  }

  $installedWith = $null

  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "🔄 A instalar Node LTS via winget..."
    try {
      Invoke-Process -Exe 'winget' -Args @('install', 'OpenJS.NodeJS.LTS', '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements') -ErrorMessage "winget não conseguiu instalar o Node"
      $installedWith = 'winget'
    }
    catch {
      Write-Host "⚠️  $($_.Exception.Message)" -ForegroundColor Yellow
    }
  }

  if (-not $installedWith -and (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "🔄 A instalar Node LTS via Chocolatey..."
    try {
      Invoke-Process -Exe 'choco' -Args @('install', 'nodejs-lts', '-y', '--no-progress') -ErrorMessage "Chocolatey não conseguiu instalar o Node"
      $installedWith = 'Chocolatey'
    }
    catch {
      Write-Host "⚠️  $($_.Exception.Message)" -ForegroundColor Yellow
    }
  }

  if (-not $installedWith) {
    if (Use-NvmIfAvailable) {
      return
    }

    Write-Host "❌ Não encontrámos winget nem Chocolatey para instalar o Node automaticamente."
    Write-Host "   Faz o download manual em https://nodejs.org/pt/download ou instala nvm-windows (https://github.com/coreybutler/nvm-windows)."
    throw "NodeInstallUnavailable"
  }

  Add-NodePaths

  if ((Get-Command node -ErrorAction SilentlyContinue) -and (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "✅ Node.js e npm instalados com sucesso via $installedWith."
    return
  }

  if (Use-NvmIfAvailable) {
    return
  }

  Write-Host "❌ Node.js/npm continuam indisponíveis mesmo após a instalação. Fecha e volta a abrir o PowerShell e tenta novamente."
  throw "NodeInstallFailed"
}

try {
  Ensure-Node
}
catch {
  Write-Host "❌ Não foi possível preparar o Node.js automaticamente." -ForegroundColor Red
  Write-Host "   Motivo: $($_.Exception.Message)"
  exit 1
}

$packageManager = 'npm'
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  if (Get-Command bun -ErrorAction SilentlyContinue) {
    Write-Host "⚠️  npm continua indisponível mas Bun foi encontrado. Vamos usá-lo para instalar as dependências."
    $packageManager = 'bun'
  }
  else {
    Write-Host "❌ Não foi possível encontrar npm nem bun após instalar o Node."
    Write-Host "   Confirma se abriste uma nova janela do PowerShell após a instalação ou instala manualmente a partir de https://nodejs.org/."
    exit 1
  }
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$packageJsonPath = Join-Path $projectRoot 'package.json'
if (-not (Test-Path $packageJsonPath)) {
  Write-Host "❌ Não encontrámos o ficheiro package.json ao lado do script." -ForegroundColor Red
  Write-Host "   Confirma que extraíste/clonaste o projeto completo e que estás a executar o script a partir da pasta 'scripts'."
  Write-Host "   Exemplo: powershell -ExecutionPolicy Bypass -File C:/caminho/para/finance-zen-ios-33136-main/scripts/install-deps.ps1"
  exit 1
}

Push-Location $projectRoot

try {
  if ($packageManager -eq 'npm') {
    Write-Host "➡️  A instalar dependências do projeto com npm..."
    try {
      Invoke-Process -Exe 'npm' -Args @('install') -ErrorMessage "'npm install' falhou"
      $devCommand = 'npm run dev'
    }
    catch {
      Write-Host "⚠️  'npm install' falhou. A tentar novamente com '--legacy-peer-deps'..." -ForegroundColor Yellow
      Invoke-Process -Exe 'npm' -Args @('install', '--legacy-peer-deps') -ErrorMessage "'npm install --legacy-peer-deps' falhou"
      Write-Host "ℹ️  Utilizámos '--legacy-peer-deps' para ultrapassar conflitos de peer dependencies."
      $devCommand = 'npm run dev'
    }
  }
  else {
    Write-Host "➡️  A instalar dependências do projeto com bun..."
    Invoke-Process -Exe 'bun' -Args @('install') -ErrorMessage "'bun install' falhou"
    $devCommand = 'bun dev'
  }
}
catch {
  Write-Host "❌ Não foi possível instalar as dependências do projeto." -ForegroundColor Red
  Write-Host "   Motivo: $($_.Exception.Message)"
  exit 1
}
finally {
  Pop-Location
}

Write-Host
Write-Host "🎉 Tudo pronto! Agora podes correr '$devCommand' para testar localmente." -ForegroundColor Green
