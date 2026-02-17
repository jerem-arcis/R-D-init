# ============================================================
#  TEMPLATE - Supprimer des donnees et/ou des tables Dataverse
# ============================================================
#  Usage :
#    # Vider les donnees (garder les tables)
#    powershell -ExecutionPolicy Bypass -File .\template-delete.ps1
#
#    # Supprimer les tables aussi
#    powershell -ExecutionPolicy Bypass -File .\template-delete.ps1 -DropTables
#
#  COMMENT UTILISER CE TEMPLATE :
#  1. Copie ce fichier et renomme-le (ex: delete-my-tables.ps1)
#  2. Modifie la liste $tables avec tes tables
#  3. IMPORTANT : l'ordre compte ! Supprime d'abord les tables enfants
#     (celles qui ont des lookups) avant les tables parents.
#     Sinon Dataverse refusera la suppression (contraintes).
# ============================================================

param(
    [switch]$DropTables   # Ajouter -DropTables pour supprimer les tables aussi
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# --- Auth ---
if (-not $headers) {
    . "$scriptDir\_auth-helper.ps1"
}

# ============================================================
# CONFIGURATION - Modifie ici
# ============================================================
$publisherPrefix = "pf"

# ORDRE IMPORTANT : enfants d'abord, parents ensuite
# Chaque entree : Name = nom logique, PluralName = entity set, IdField = champ ID primaire
$tables = @(
    @{ Name = "${publisherPrefix}_product";  PluralName = "${publisherPrefix}_products";  IdField = "${publisherPrefix}_productid";  Display = "Products" },
    @{ Name = "${publisherPrefix}_category"; PluralName = "${publisherPrefix}_categorys"; IdField = "${publisherPrefix}_categoryid"; Display = "Categories" }
)

# ============================================================
# FONCTIONS UTILITAIRES (ne pas modifier)
# ============================================================

function Remove-AllRecords {
    param(
        [string]$PluralName,
        [string]$IdField,
        [string]$Display
    )
    Write-Host "  > Vidage de $Display..." -ForegroundColor Gray
    try {
        $records = Invoke-RestMethod -Method Get -Uri "$apiUrl/$PluralName" -Headers $headers
        $count = 0
        foreach ($record in $records.value) {
            $id = $record.$IdField
            Invoke-RestMethod -Method Delete -Uri "$apiUrl/$PluralName($id)" -Headers $headers | Out-Null
            $count++
        }
        Write-Host "    [OK] $count enregistrements supprimes" -ForegroundColor Green
    } catch {
        if ($_.ErrorDetails.Message -match "does not exist|Resource not found") {
            Write-Host "    [~] Table n'existe pas ou deja vide" -ForegroundColor DarkGray
        } else {
            Write-Host "    [!] Erreur: $($_.Exception.Message)" -ForegroundColor DarkYellow
        }
    }
}

function Remove-Table {
    param(
        [string]$LogicalName,
        [string]$Display
    )
    Write-Host "  > Suppression table $Display..." -ForegroundColor Gray
    try {
        Invoke-RestMethod -Method Delete -Uri "$apiUrl/EntityDefinitions(LogicalName='$LogicalName')" -Headers $headers | Out-Null
        Write-Host "    [OK] Table $Display supprimee" -ForegroundColor Green
    } catch {
        if ($_.ErrorDetails.Message -match "does not exist") {
            Write-Host "    [~] Table $Display n'existe pas" -ForegroundColor DarkGray
        } else {
            Write-Host "    [X] ERREUR: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
}

# ============================================================
# EXECUTION
# ============================================================

Write-Host "`n========================================" -ForegroundColor Cyan
if ($DropTables) {
    Write-Host "  SUPPRESSION TABLES + DONNEES" -ForegroundColor Red
} else {
    Write-Host "  VIDAGE DES DONNEES" -ForegroundColor Yellow
}
Write-Host "========================================`n" -ForegroundColor Cyan

# Etape 1 : Vider les donnees
Write-Host "[ETAPE 1] Vidage des donnees..." -ForegroundColor Yellow
Write-Host ""

foreach ($table in $tables) {
    Remove-AllRecords -PluralName $table.PluralName -IdField $table.IdField -Display $table.Display
}

# Etape 2 : Supprimer les tables (si demande)
if ($DropTables) {
    Write-Host "`n[ETAPE 2] Suppression des tables..." -ForegroundColor Yellow
    Write-Host ""

    foreach ($table in $tables) {
        Remove-Table -LogicalName $table.Name -Display $table.Display
    }

    # Publication
    Write-Host "`n  Publication..." -ForegroundColor Yellow
    try {
        Invoke-RestMethod -Method Post -Uri "$apiUrl/PublishAllXml" -Headers $headers -Body "{}"
        Write-Host "  [OK] Publie !" -ForegroundColor Green
    } catch {
        Write-Host "  [!] Erreur publication (non bloquant)" -ForegroundColor DarkYellow
    }
}

# ============================================================
# RESUME
# ============================================================

Write-Host "`n========================================" -ForegroundColor Green
if ($DropTables) {
    Write-Host "  TABLES ET DONNEES SUPPRIMEES !" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Pour recreer : .\template-create-tables.ps1" -ForegroundColor Gray
} else {
    Write-Host "  DONNEES SUPPRIMEES !" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Tables conservees (vides)." -ForegroundColor Gray
    Write-Host "  Pour re-remplir : .\template-seed-data.ps1" -ForegroundColor Gray
}
Write-Host ""
