# ============================================================
# Helper : Authentification Dataverse via Azure AD
# ============================================================
# Ce script est "dot-source" par les autres scripts :
#   . "$scriptDir\_auth-helper.ps1"
#
# Il expose : $orgUrl, $apiUrl, $headers
# ============================================================

$environmentId = "ce7183b0-3bb5-ea9c-8a38-d1e340e360fc"

# Azure AD Public Client ID pour Power Platform (client officiel Microsoft)
$clientId = "51f81489-12ee-4a9e-aaae-a2591f45987d"
$tenantId = "common"

# --- Selectionner l'environnement ---
Write-Host "[AUTH] Selection de l'environnement..." -ForegroundColor Yellow
pac env select --environment $environmentId 2>$null

# --- Recuperer l'URL de l'org ---
Write-Host "[AUTH] Recuperation de l'URL Dataverse..." -ForegroundColor Yellow
$envInfo = pac env who 2>&1
$orgUrl = $null
foreach ($line in $envInfo) {
    if ($line -match "(https://[^\s]+\.dynamics\.com)") {
        $orgUrl = $Matches[1]
        break
    }
}
if (-not $orgUrl) {
    Write-Host "  > Impossible de detecter l'URL automatiquement" -ForegroundColor DarkYellow
    $orgUrl = Read-Host "URL Dataverse (ex: https://orgXXXXX.crm12.dynamics.com)"
}
# Nettoyer l'URL (retirer le / final si present)
$orgUrl = $orgUrl.TrimEnd("/")
$apiUrl = "$orgUrl/api/data/v9.2"
Write-Host "  > URL: $orgUrl" -ForegroundColor Green

# --- Obtenir un token via Azure AD Device Code Flow ---
Write-Host "[AUTH] Authentification Azure AD..." -ForegroundColor Yellow

$resource = $orgUrl
$tokenEndpoint = "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/devicecode"
$tokenRequestEndpoint = "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token"
$scope = "$resource/.default offline_access"

# Etape 1 : Demander un device code
try {
    $deviceCodeResponse = Invoke-RestMethod -Method Post -Uri $tokenEndpoint -Body @{
        client_id = $clientId
        scope     = $scope
    }
} catch {
    Write-Host "  > ERREUR lors de la demande de device code: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Afficher le message a l'utilisateur
Write-Host ""
Write-Host "  ================================================" -ForegroundColor Magenta
Write-Host "  |  AUTHENTIFICATION REQUISE                     |" -ForegroundColor Magenta
Write-Host "  ================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  $($deviceCodeResponse.message)" -ForegroundColor White
Write-Host ""

# Etape 2 : Polling jusqu'a ce que l'utilisateur se connecte
$interval = $deviceCodeResponse.interval
if (-not $interval -or $interval -lt 1) { $interval = 5 }
$expiresIn = $deviceCodeResponse.expires_in
if (-not $expiresIn) { $expiresIn = 900 }
$deadline = (Get-Date).AddSeconds($expiresIn)

$token = $null
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds $interval
    try {
        $tokenResponse = Invoke-RestMethod -Method Post -Uri $tokenRequestEndpoint -Body @{
            client_id   = $clientId
            grant_type  = "urn:ietf:params:oauth:grant-type:device_code"
            device_code = $deviceCodeResponse.device_code
        }
        $token = $tokenResponse.access_token
        break
    } catch {
        $errorBody = $null
        if ($_.ErrorDetails.Message) {
            $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        }
        if ($errorBody.error -eq "authorization_pending") {
            Write-Host "  > En attente de connexion..." -ForegroundColor DarkGray
            continue
        }
        elseif ($errorBody.error -eq "slow_down") {
            $interval += 5
            continue
        }
        else {
            Write-Host "  > ERREUR d'authentification: $($errorBody.error_description)" -ForegroundColor Red
            exit 1
        }
    }
}

if (-not $token) {
    Write-Host "  > ERREUR: Timeout - tu n'as pas valide le code a temps" -ForegroundColor Red
    exit 1
}

Write-Host "  > Authentifie avec succes !" -ForegroundColor Green
Write-Host ""

$headers = @{
    "Authorization"    = "Bearer $token"
    "Content-Type"     = "application/json; charset=utf-8"
    "OData-MaxVersion" = "4.0"
    "OData-Version"    = "4.0"
    "Accept"           = "application/json"
    "Prefer"           = "return=representation"
}
