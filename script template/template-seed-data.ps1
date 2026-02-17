# ============================================================
#  TEMPLATE - Inserer des donnees dans Dataverse
# ============================================================
#  Usage : powershell -ExecutionPolicy Bypass -File .\template-seed-data.ps1
#
#  COMMENT UTILISER CE TEMPLATE :
#  1. Copie ce fichier et renomme-le (ex: seed-my-data.ps1)
#  2. Modifie la section "TES DONNEES ICI"
#  3. Pour les relations (lookups), utilise le format OData bind :
#     "pf_categoryid@odata.bind" = "/pf_categorys($categoryGuid)"
#  4. Pour les Choice/Picklist, utilise la valeur numerique :
#     100000000, 100000001, etc.
#  5. Lance le script
#
#  FONCTIONS DISPONIBLES :
#    New-DvRecord  → Insere un enregistrement, retourne le record cree
#    Get-DvRecords → Recupere des enregistrements (avec filtre optionnel)
# ============================================================

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# --- Auth ---
if (-not $headers) {
    . "$scriptDir\_auth-helper.ps1"
}

# ============================================================
# CONFIGURATION
# ============================================================
$publisherPrefix = "pf"

# ============================================================
# FONCTIONS UTILITAIRES (ne pas modifier)
# ============================================================

# Insere un record et retourne le resultat (avec l'ID genere)
function New-DvRecord {
    param(
        [string]$TablePluralName,   # ex: "pf_products" (nom pluriel de l'entity set)
        [hashtable]$Data            # ex: @{ pf_name = "Mon produit"; pf_price = 19.99 }
    )
    $body = $Data | ConvertTo-Json -Depth 5 -Compress
    try {
        $result = Invoke-RestMethod -Method Post -Uri "$apiUrl/$TablePluralName" -Headers $headers -Body $body
        return $result
    } catch {
        Write-Host "    [X] ERREUR: $($_.ErrorDetails.Message)" -ForegroundColor Red
        return $null
    }
}

# Recupere des records (retourne un tableau)
function Get-DvRecords {
    param(
        [string]$TablePluralName,   # ex: "pf_products"
        [string]$Filter = "",       # ex: "pf_status eq 100000001"
        [string]$Select = "",       # ex: "pf_name,pf_productid"
        [int]$Top = 100             # Nombre max de records
    )
    $uri = "$apiUrl/$TablePluralName"
    $queryParts = @()
    if ($Filter) { $queryParts += "`$filter=$Filter" }
    if ($Select) { $queryParts += "`$select=$Select" }
    $queryParts += "`$top=$Top"
    $uri += "?" + ($queryParts -join "&")

    try {
        $result = Invoke-RestMethod -Method Get -Uri $uri -Headers $headers
        return $result.value
    } catch {
        Write-Host "    [X] ERREUR GET: $($_.ErrorDetails.Message)" -ForegroundColor Red
        return @()
    }
}

# Helper pour afficher la progression
function Write-Seed {
    param([string]$Section, [string]$Detail)
    if ($Detail) {
        Write-Host "    > $Detail" -ForegroundColor DarkGray
    } else {
        Write-Host "`n  [$Section]" -ForegroundColor Yellow
    }
}

# ============================================================
#  TES DONNEES ICI - Exemples a adapter
# ============================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  INSERTION DES DONNEES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ------ 1. CATEGORIES (table parent, sans lookups) ------
Write-Seed "1/3" "Insertion des categories..."

$categories = @(
    @{ name = "Electronique";  description = "Appareils et gadgets electroniques"; icon = "laptop";  sortorder = 1 },
    @{ name = "Vetements";     description = "Mode et accessoires";                icon = "shirt";   sortorder = 2 },
    @{ name = "Alimentation";  description = "Produits alimentaires";              icon = "utensils"; sortorder = 3 }
)

$categoryIds = @{}   # Stocker les IDs pour les lookups
foreach ($cat in $categories) {
    Write-Seed "" $cat.name
    $record = @{
        "${publisherPrefix}_name"        = $cat.name
        "${publisherPrefix}_description" = $cat.description
        "${publisherPrefix}_icon"        = $cat.icon
        "${publisherPrefix}_sortorder"   = $cat.sortorder
    }
    $result = New-DvRecord -TablePluralName "${publisherPrefix}_categorys" -Data $record
    if ($result) {
        $categoryIds[$cat.name] = $result."${publisherPrefix}_categoryid"
    }
}
Write-Host "  [OK] $($categories.Count) categories inserees" -ForegroundColor Green

# ------ 2. PRODUCTS (avec lookup vers category) ------
Write-Seed "2/3" "Insertion des produits..."

$products = @(
    @{ name = "Laptop Pro 15";    description = "Ordinateur portable haut de gamme"; price = 1299.99; quantity = 50;  status = 100000001; category = "Electronique" },
    @{ name = "Smartphone X";     description = "Telephone derniere generation";     price = 899.00;  quantity = 120; status = 100000001; category = "Electronique" },
    @{ name = "T-shirt Basic";    description = "T-shirt coton bio";                 price = 29.90;   quantity = 500; status = 100000001; category = "Vetements" },
    @{ name = "Cafe Premium 1kg"; description = "Cafe arabica moulu";                price = 15.50;   quantity = 200; status = 100000000; category = "Alimentation" }
)

$productIds = @{}
foreach ($prod in $products) {
    Write-Seed "" $prod.name
    $record = @{
        "${publisherPrefix}_name"        = $prod.name
        "${publisherPrefix}_description" = $prod.description
        "${publisherPrefix}_price"       = $prod.price
        "${publisherPrefix}_quantity"    = $prod.quantity
        "${publisherPrefix}_status"      = $prod.status
        "${publisherPrefix}_isactive"    = $true
        "${publisherPrefix}_createdat"   = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    # Ajouter le lookup vers category si l'ID existe
    $catId = $categoryIds[$prod.category]
    if ($catId) {
        $record["${publisherPrefix}_categoryid@odata.bind"] = "/${publisherPrefix}_categorys($catId)"
    }
    $result = New-DvRecord -TablePluralName "${publisherPrefix}_products" -Data $record
    if ($result) {
        $productIds[$prod.name] = $result."${publisherPrefix}_productid"
    }
}
Write-Host "  [OK] $($products.Count) produits inseres" -ForegroundColor Green

# ------ 3. Exemple lecture : verifier les donnees ------
Write-Seed "3/3" "Verification..."

$check = Get-DvRecords -TablePluralName "${publisherPrefix}_products" -Select "${publisherPrefix}_name" -Top 10
Write-Host "  [OK] $($check.Count) produits en base" -ForegroundColor Green

# ============================================================
# RESUME
# ============================================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  DONNEES INSEREES !" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  - $($categories.Count) categories" -ForegroundColor Gray
Write-Host "  - $($products.Count) produits" -ForegroundColor Gray
Write-Host ""
Write-Host "  Verifie sur : https://make.powerapps.com > Tables" -ForegroundColor Cyan
Write-Host ""
