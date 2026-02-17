# ============================================================
#  Power Apps Code App - Script d'initialisation
# ============================================================
#  Usage :
#    powershell -ExecutionPolicy Bypass -File .\init.ps1
#
#  Flag : -Force  Ne pas demander de confirmation
# ============================================================

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
if (-not $projectRoot) { $projectRoot = (Get-Location).Path }

# -----------------------------------------------------------
# Helpers
# -----------------------------------------------------------
function Write-Step  { param($msg) Write-Host "`n== $msg ==" -ForegroundColor Cyan }
function Write-Ok    { param($msg) Write-Host "   [OK] $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "   [!]  $msg" -ForegroundColor Yellow }
function Write-Err   { param($msg) Write-Host "   [X]  $msg" -ForegroundColor Red }
function Write-Info  { param($msg) Write-Host "   $msg" -ForegroundColor Gray }

Write-Host ""
Write-Host "   ========================================" -ForegroundColor Cyan
Write-Host "   |  Power Apps Code App - Init          |" -ForegroundColor Cyan
Write-Host "   ========================================" -ForegroundColor Cyan
Write-Host ""

# Verifier qu'on est dans le bon repo
$packageJson = Join-Path $projectRoot "package.json"
if (-not (Test-Path $packageJson)) {
    Write-Err "package.json introuvable. Lance ce script depuis la racine du projet."
    exit 1
}

# -----------------------------------------------------------
# 1. Verification des prerequis
# -----------------------------------------------------------
Write-Step "1/4 - Verification des prerequis"

# Node.js
$nodeVersion = $null
try { $nodeVersion = (node --version 2>&1) } catch {}
if ($nodeVersion -match "^v(\d+)") {
    $major = [int]$Matches[1]
    if ($major -ge 18) {
        Write-Ok "Node.js $nodeVersion"
    } else {
        Write-Err "Node.js $nodeVersion detecte mais v18+ requis"
        exit 1
    }
} else {
    Write-Err "Node.js non trouve. Installe-le depuis https://nodejs.org"
    exit 1
}

# npm
$npmVersion = $null
try { $npmVersion = (npm --version 2>&1) } catch {}
if ($npmVersion) {
    Write-Ok "npm v$npmVersion"
} else {
    Write-Err "npm non trouve"
    exit 1
}

# PAC CLI
$pacVersion = $null
try {
    $pacCheck = pac help 2>&1
    if ($LASTEXITCODE -eq 0 -or ($pacCheck -match "Usage: pac")) {
        $pacVersion = "installed"
        Write-Ok "PAC CLI detecte"
    } else { throw "not found" }
} catch {
    Write-Warn "PAC CLI non trouve - certaines fonctions seront indisponibles"
    Write-Info "Pour l'installer : dotnet tool install --global Microsoft.PowerApps.CLI.Tool"
}

# -----------------------------------------------------------
# 2. Installation des dependances npm
# -----------------------------------------------------------
Write-Step "2/4 - Installation des dependances npm"

$nodeModules = Join-Path $projectRoot "node_modules"
$skipNpm = $false
if (Test-Path $nodeModules) {
    Write-Info "node_modules existe deja"
    if (-not $Force) {
        $reinstall = Read-Host "   Reinstaller les dependances ? (o/N)"
        if ($reinstall -ne "o") {
            Write-Ok "Dependances conservees"
            $skipNpm = $true
        }
    }
}

if (-not $skipNpm) {
    Write-Info "npm install en cours..."
    try {
        Push-Location $projectRoot
        npm install 2>&1 | Out-Null
        Pop-Location
        if ($LASTEXITCODE -ne 0) { throw "npm install a echoue" }
        Write-Ok "Dependances installees"
    } catch {
        Write-Warn "npm install a echoue, tentative avec --legacy-peer-deps..."
        try {
            Push-Location $projectRoot
            npm install --legacy-peer-deps 2>&1 | Out-Null
            Pop-Location
            if ($LASTEXITCODE -ne 0) { throw "echec" }
            Write-Ok "Dependances installees (legacy-peer-deps)"
        } catch {
            Pop-Location -ErrorAction SilentlyContinue
            Write-Err "Impossible d'installer les dependances npm"
            Write-Info "Erreur : $_"
            exit 1
        }
    }
}

# -----------------------------------------------------------
# 3. Configuration de power.config.json
# -----------------------------------------------------------
Write-Step "3/4 - Configuration de power.config.json"

$powerConfigPath = Join-Path $projectRoot "power.config.json"
$powerConfig = $null
if (Test-Path $powerConfigPath) {
    $powerConfig = Get-Content $powerConfigPath -Raw | ConvertFrom-Json
}

$needsConfig = $false
if (-not $powerConfig) {
    $needsConfig = $true
} elseif ([string]::IsNullOrWhiteSpace($powerConfig.environmentId) -or $powerConfig.environmentId -match '^\{\{') {
    $needsConfig = $true
}

if ($needsConfig) {
    Write-Info "power.config.json necessite une configuration"

    $envId = $null
    if ($pacVersion) {
        Write-Info "Recuperation des environnements Power Platform..."
        try {
            $envList = pac env list 2>&1
            Write-Host ""
            Write-Host $envList -ForegroundColor DarkGray
            Write-Host ""
            $envId = Read-Host "   Colle ton Environment ID (ou Entree pour garder l'actuel)"
        } catch {
            Write-Warn "Impossible de lister les environnements"
        }
    }

    if (-not $envId) {
        $envId = Read-Host "   Environment ID"
    }

    $appName = Read-Host "   Nom de l'app (defaut: Power Apps Code App)"
    if ([string]::IsNullOrWhiteSpace($appName)) { $appName = "Power Apps Code App" }

    if (-not $powerConfig) {
        $powerConfig = [PSCustomObject]@{
            appId            = ""
            appDisplayName   = $appName
            description      = $null
            environmentId    = $envId
            buildPath        = "./dist"
            buildEntryPoint  = "index.html"
            logoPath         = "Default"
            localAppUrl      = "http://localhost:3000/"
            region           = "prod"
            connectionReferences = @{}
            databaseReferences  = @{}
        }
    } else {
        if ($envId) { $powerConfig.environmentId = $envId }
        $powerConfig.appDisplayName = $appName
    }

    $powerConfig | ConvertTo-Json -Depth 10 | Set-Content $powerConfigPath -Encoding UTF8
    Write-Ok "power.config.json mis a jour"
} else {
    Write-Ok "power.config.json deja configure (env: $($powerConfig.environmentId))"
}

# -----------------------------------------------------------
# 4. Authentification PAC CLI
# -----------------------------------------------------------
Write-Step "4/4 - Authentification Power Platform"

if ($pacVersion) {
    $authInfo = $null
    try { $authInfo = pac auth list 2>&1 } catch {}

    if ($authInfo -match "No profiles") {
        Write-Warn "Aucun profil d'authentification"
        if (-not $Force) {
            $doAuth = Read-Host "   Se connecter maintenant ? (O/n)"
            if ($doAuth -ne "n") {
                Write-Info "Lancement de l'authentification..."
                pac auth create
                if ($LASTEXITCODE -eq 0) {
                    Write-Ok "Authentifie avec succes"
                } else {
                    Write-Warn "Authentification echouee - tu pourras le faire plus tard avec 'pac auth create'"
                }
            }
        }
    } else {
        Write-Ok "Profil d'authentification existant"
    }
} else {
    Write-Warn "PAC CLI absent - etape ignoree"
}

# -----------------------------------------------------------
# Done
# -----------------------------------------------------------
Write-Host ""
Write-Host "   ========================================" -ForegroundColor Green
Write-Host "   |  Initialisation terminee !            |" -ForegroundColor Green
Write-Host "   ========================================" -ForegroundColor Green
Write-Host ""
if ($powerConfig) {
    Write-Host "   App    : $($powerConfig.appDisplayName)" -ForegroundColor White
    Write-Host "   Env ID : $($powerConfig.environmentId)" -ForegroundColor White
    Write-Host ""
}
Write-Host "   Pour lancer le dev :" -ForegroundColor White
Write-Host "     npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Ok "Pret. Bon dev !"
Write-Host ""
