# ============================================================
#  TEMPLATE - Creer des tables Dataverse
# ============================================================
#  Usage : powershell -ExecutionPolicy Bypass -File .\template-create-tables.ps1
#
#  COMMENT UTILISER CE TEMPLATE :
#  1. Copie ce fichier et renomme-le (ex: create-my-tables.ps1)
#  2. Modifie la section "CONFIGURATION" avec tes tables
#  3. Ajoute tes colonnes, choices et lookups
#  4. Lance le script
#
#  TYPES DE COLONNES DISPONIBLES (Add-DvColumn -Type "xxx") :
#    String       → Texte court (max 4000 car.)
#    Email        → Adresse email (format valide)
#    Url          → Lien URL (format cliquable)
#    Phone        → Numero de telephone
#    RichText     → Texte riche HTML
#    Memo         → Texte long multi-lignes (max 1M car.)
#    Integer      → Nombre entier
#    Decimal      → Nombre decimal (precision configurable)
#    Float        → Nombre a virgule flottante
#    Money        → Montant en devise
#    Boolean      → Oui/Non
#    DateTime     → Date et heure
#    DateOnly     → Date seule (sans heure)
#    Image        → Image (JPG/PNG, max 10 Mo par defaut)
#    File         → Fichier joint (max 128 Mo)
#
#  FONCTIONS SPECIALES :
#    Add-DvChoice       → Liste de choix simple (Picklist)
#    Add-DvMultiChoice  → Choix multiples (MultiSelect)
#    Add-DvLookup       → Relation vers une autre table
# ============================================================

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# --- Auth ---
if (-not $headers) {
    . "$scriptDir\_auth-helper.ps1"
}

# ============================================================
# CONFIGURATION - Modifie ici
# ============================================================
$publisherPrefix = "pf"   # Prefixe de ton publisher Dataverse

# ============================================================
# FONCTIONS UTILITAIRES (ne pas modifier)
# ============================================================

function Make-Label([string]$Text) {
    return @{
        "@odata.type" = "Microsoft.Dynamics.CRM.Label"
        LocalizedLabels = @(@{
            "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"
            Label = $Text
            LanguageCode = 1036   # 1036 = francais, 1033 = anglais
        })
    }
}

function New-DvTable {
    param(
        [string]$Name,           # ex: "product"  → deviendra pf_product
        [string]$DisplayName,    # ex: "Product"
        [string]$PluralName,     # ex: "Products"
        [string]$Description     # ex: "Table des produits"
    )
    $fullName = "${publisherPrefix}_${Name}"

    Write-Host "  Creation table '$DisplayName'..." -ForegroundColor Yellow

    $table = @{
        "@odata.type"          = "Microsoft.Dynamics.CRM.EntityMetadata"
        SchemaName             = $fullName
        LogicalName            = $fullName
        DisplayName            = (Make-Label $DisplayName)
        DisplayCollectionName  = (Make-Label $PluralName)
        Description            = (Make-Label $Description)
        HasNotes               = $true
        HasActivities          = $false
        OwnershipType          = "UserOwned"
        IsActivity             = $false
        PrimaryNameAttribute   = "${fullName}_name"
        Attributes = @(@{
            "@odata.type"      = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
            SchemaName         = "${fullName}_name"
            LogicalName        = "${fullName}_name"
            IsPrimaryName      = $true
            DisplayName        = (Make-Label "Nom")
            RequiredLevel      = @{ Value = "ApplicationRequired"; ManagedPropertyLogicalName = "canmodifyrequirementlevelsettings" }
            MaxLength          = 200
            FormatName         = @{ Value = "Text" }
            AttributeType      = "String"
            AttributeTypeName  = @{ Value = "StringType" }
        })
    }

    try {
        Invoke-RestMethod -Method Post -Uri "$apiUrl/EntityDefinitions" -Headers $headers -Body ($table | ConvertTo-Json -Depth 15) | Out-Null
        Write-Host "  [OK] Table '$DisplayName' creee" -ForegroundColor Green
        Start-Sleep -Seconds 10   # Attendre que Dataverse propage
    } catch {
        if ($_.ErrorDetails.Message -match "already exists") {
            Write-Host "  [~] Table '$DisplayName' existe deja" -ForegroundColor DarkYellow
        } else {
            Write-Host "  [X] ERREUR: $($_.ErrorDetails.Message)" -ForegroundColor Red
            throw
        }
    }
}

function Add-DvColumn {
    param(
        [string]$TableName,      # ex: "product" (sans prefixe)
        [string]$ColumnName,     # ex: "price" (sans prefixe)
        [string]$DisplayName,    # ex: "Prix"
        [string]$Type,           # String, Email, Url, Phone, RichText, Memo, Integer, Decimal, Float, Money, Boolean, DateTime, DateOnly, Image, File
        [int]$MaxLength = 200,   # Pour String/Memo
        [int]$Precision = 2,     # Pour Decimal/Money/Float
        [int]$MaxSizeInKB = 10240  # Pour Image (10Mo) / File (32Mo par defaut, max 128Mo)
    )
    $fullTable = "${publisherPrefix}_${TableName}"
    $fullColumn = "${publisherPrefix}_${ColumnName}"

    $colBody = switch ($Type) {
        "String" {
            @{
                "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
                SchemaName    = $fullColumn
                LogicalName   = $fullColumn.ToLower()
                DisplayName   = (Make-Label $DisplayName)
                RequiredLevel = @{ Value = "None" }
                MaxLength     = $MaxLength
                FormatName    = @{ Value = "Text" }
            }
        }
        "Email" {
            @{
                "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
                SchemaName    = $fullColumn
                LogicalName   = $fullColumn.ToLower()
                DisplayName   = (Make-Label $DisplayName)
                RequiredLevel = @{ Value = "None" }
                MaxLength     = if ($MaxLength -ne 200) { $MaxLength } else { 320 }
                FormatName    = @{ Value = "Email" }
            }
        }
        "Url" {
            @{
                "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
                SchemaName    = $fullColumn
                LogicalName   = $fullColumn.ToLower()
                DisplayName   = (Make-Label $DisplayName)
                RequiredLevel = @{ Value = "None" }
                MaxLength     = if ($MaxLength -ne 200) { $MaxLength } else { 500 }
                FormatName    = @{ Value = "Url" }
            }
        }
        "Phone" {
            @{
                "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
                SchemaName    = $fullColumn
                LogicalName   = $fullColumn.ToLower()
                DisplayName   = (Make-Label $DisplayName)
                RequiredLevel = @{ Value = "None" }
                MaxLength     = if ($MaxLength -ne 200) { $MaxLength } else { 40 }
                FormatName    = @{ Value = "Phone" }
            }
        }
        "RichText" {
            @{
                "@odata.type" = "Microsoft.Dynamics.CRM.MemoAttributeMetadata"
                SchemaName    = $fullColumn
                LogicalName   = $fullColumn.ToLower()
                DisplayName   = (Make-Label $DisplayName)
                RequiredLevel = @{ Value = "None" }
                MaxLength     = if ($MaxLength -ne 200) { $MaxLength } else { 10000 }
                Format        = "RichText"
            }
        }
        "Memo" {
            @{
                "@odata.type" = "Microsoft.Dynamics.CRM.MemoAttributeMetadata"
                SchemaName    = $fullColumn
                LogicalName   = $fullColumn.ToLower()
                DisplayName   = (Make-Label $DisplayName)
                RequiredLevel = @{ Value = "None" }
                MaxLength     = if ($MaxLength -ne 200) { $MaxLength } else { 10000 }
                Format        = "TextArea"
            }
        }
        "Integer" {
            @{
                "@odata.type" = "Microsoft.Dynamics.CRM.IntegerAttributeMetadata"
                SchemaName    = $fullColumn
                LogicalName   = $fullColumn.ToLower()
                DisplayName   = (Make-Label $DisplayName)
                RequiredLevel = @{ Value = "None" }
                Format        = "None"
            }
        }
        "Decimal" {
            @{
                "@odata.type" = "Microsoft.Dynamics.CRM.DecimalAttributeMetadata"
                SchemaName    = $fullColumn
                LogicalName   = $fullColumn.ToLower()
                DisplayName   = (Make-Label $DisplayName)
                RequiredLevel = @{ Value = "None" }
                Precision     = $Precision
            }
        }
        "Float" {
            @{
                "@odata.type" = "Microsoft.Dynamics.CRM.DoubleAttributeMetadata"
                SchemaName    = $fullColumn
                LogicalName   = $fullColumn.ToLower()
                DisplayName   = (Make-Label $DisplayName)
                RequiredLevel = @{ Value = "None" }
                Precision     = $Precision
            }
        }
        "Money" {
            @{
                "@odata.type" = "Microsoft.Dynamics.CRM.MoneyAttributeMetadata"
                SchemaName    = $fullColumn
                LogicalName   = $fullColumn.ToLower()
                DisplayName   = (Make-Label $DisplayName)
                RequiredLevel = @{ Value = "None" }
                Precision     = $Precision
            }
        }
        "Boolean" {
            @{
                "@odata.type" = "Microsoft.Dynamics.CRM.BooleanAttributeMetadata"
                SchemaName    = $fullColumn
                LogicalName   = $fullColumn.ToLower()
                DisplayName   = (Make-Label $DisplayName)
                RequiredLevel = @{ Value = "None" }
                OptionSet     = @{
                    TrueOption  = @{ Value = 1; Label = (Make-Label "Oui") }
                    FalseOption = @{ Value = 0; Label = (Make-Label "Non") }
                }
            }
        }
        "DateTime" {
            @{
                "@odata.type"    = "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata"
                SchemaName       = $fullColumn
                LogicalName      = $fullColumn.ToLower()
                DisplayName      = (Make-Label $DisplayName)
                RequiredLevel    = @{ Value = "None" }
                Format           = "DateAndTime"
                DateTimeBehavior = @{ Value = "UserLocal" }
            }
        }
        "DateOnly" {
            @{
                "@odata.type"    = "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata"
                SchemaName       = $fullColumn
                LogicalName      = $fullColumn.ToLower()
                DisplayName      = (Make-Label $DisplayName)
                RequiredLevel    = @{ Value = "None" }
                Format           = "DateOnly"
                DateTimeBehavior = @{ Value = "DateOnly" }
            }
        }
        "Image" {
            @{
                "@odata.type"     = "Microsoft.Dynamics.CRM.ImageAttributeMetadata"
                SchemaName        = $fullColumn
                LogicalName       = $fullColumn.ToLower()
                DisplayName       = (Make-Label $DisplayName)
                RequiredLevel     = @{ Value = "None" }
                IsPrimaryImage    = $false
                MaxSizeInKB       = $MaxSizeInKB
                CanStoreFullImage = $true
            }
        }
        "File" {
            @{
                "@odata.type" = "Microsoft.Dynamics.CRM.FileAttributeMetadata"
                SchemaName    = $fullColumn
                LogicalName   = $fullColumn.ToLower()
                DisplayName   = (Make-Label $DisplayName)
                RequiredLevel = @{ Value = "None" }
                MaxSizeInKB   = $MaxSizeInKB
            }
        }
    }

    try {
        Invoke-RestMethod -Method Post -Uri "$apiUrl/EntityDefinitions(LogicalName='$fullTable')/Attributes" -Headers $headers -Body ($colBody | ConvertTo-Json -Depth 10) | Out-Null
        Write-Host "    + $DisplayName ($Type)" -ForegroundColor DarkGray
    } catch {
        if ($_.ErrorDetails.Message -match "already exists") {
            Write-Host "    ~ $DisplayName existe deja" -ForegroundColor DarkGray
        } else {
            Write-Host "    X $DisplayName ERREUR: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
}

function Add-DvChoice {
    param(
        [string]$TableName,      # ex: "product"
        [string]$ColumnName,     # ex: "status"
        [string]$DisplayName,    # ex: "Statut"
        [hashtable[]]$Options    # ex: @(@{Value=100000000; Label="actif"}, @{Value=100000001; Label="inactif"})
    )
    $fullTable = "${publisherPrefix}_${TableName}"
    $fullColumn = "${publisherPrefix}_${ColumnName}"

    $optionsList = $Options | ForEach-Object {
        @{ Value = $_.Value; Label = (Make-Label $_.Label) }
    }

    $choiceBody = @{
        "@odata.type" = "Microsoft.Dynamics.CRM.PicklistAttributeMetadata"
        SchemaName    = $fullColumn
        LogicalName   = $fullColumn.ToLower()
        DisplayName   = (Make-Label $DisplayName)
        RequiredLevel = @{ Value = "None" }
        OptionSet     = @{
            "@odata.type"  = "Microsoft.Dynamics.CRM.OptionSetMetadata"
            IsGlobal       = $false
            OptionSetType  = "Picklist"
            Options        = @($optionsList)
        }
    }

    try {
        Invoke-RestMethod -Method Post -Uri "$apiUrl/EntityDefinitions(LogicalName='$fullTable')/Attributes" -Headers $headers -Body ($choiceBody | ConvertTo-Json -Depth 15) | Out-Null
        Write-Host "    + $DisplayName (Choice: $($Options.Count) options)" -ForegroundColor DarkGray
    } catch {
        if ($_.ErrorDetails.Message -match "already exists") {
            Write-Host "    ~ $DisplayName existe deja" -ForegroundColor DarkGray
        } else {
            Write-Host "    X $DisplayName ERREUR: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
}

function Add-DvMultiChoice {
    param(
        [string]$TableName,      # ex: "product"
        [string]$ColumnName,     # ex: "tags"
        [string]$DisplayName,    # ex: "Tags"
        [hashtable[]]$Options    # ex: @(@{Value=100000000; Label="promo"}, @{Value=100000001; Label="nouveau"})
    )
    $fullTable = "${publisherPrefix}_${TableName}"
    $fullColumn = "${publisherPrefix}_${ColumnName}"

    $optionsList = $Options | ForEach-Object {
        @{ Value = $_.Value; Label = (Make-Label $_.Label) }
    }

    $body = @{
        "@odata.type" = "Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata"
        SchemaName    = $fullColumn
        LogicalName   = $fullColumn.ToLower()
        DisplayName   = (Make-Label $DisplayName)
        RequiredLevel = @{ Value = "None" }
        OptionSet     = @{
            "@odata.type"  = "Microsoft.Dynamics.CRM.OptionSetMetadata"
            IsGlobal       = $false
            OptionSetType  = "Picklist"
            Options        = @($optionsList)
        }
    }

    try {
        Invoke-RestMethod -Method Post -Uri "$apiUrl/EntityDefinitions(LogicalName='$fullTable')/Attributes" -Headers $headers -Body ($body | ConvertTo-Json -Depth 15) | Out-Null
        Write-Host "    + $DisplayName (MultiChoice: $($Options.Count) options)" -ForegroundColor DarkGray
    } catch {
        if ($_.ErrorDetails.Message -match "already exists") {
            Write-Host "    ~ $DisplayName existe deja" -ForegroundColor DarkGray
        } else {
            Write-Host "    X $DisplayName ERREUR: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
}

function Add-DvLookup {
    param(
        [string]$FromTable,      # ex: "order"       (table qui CONTIENT le lookup)
        [string]$ToTable,        # ex: "customer"    (table CIBLE)
        [string]$LookupName,     # ex: "customerid"  (nom de la colonne lookup)
        [string]$DisplayName     # ex: "Client"
    )
    $fullFrom = "${publisherPrefix}_${FromTable}"
    $fullTo = "${publisherPrefix}_${ToTable}"
    $fullLookup = "${publisherPrefix}_${LookupName}"

    $lookup = @{
        "@odata.type"     = "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata"
        SchemaName        = "${fullFrom}_${fullTo}_${LookupName}"
        ReferencedEntity  = $fullTo
        ReferencingEntity = $fullFrom
        Lookup = @{
            "@odata.type" = "Microsoft.Dynamics.CRM.LookupAttributeMetadata"
            SchemaName    = $fullLookup
            LogicalName   = $fullLookup.ToLower()
            DisplayName   = (Make-Label $DisplayName)
            RequiredLevel = @{ Value = "None" }
        }
    }

    try {
        Invoke-RestMethod -Method Post -Uri "$apiUrl/RelationshipDefinitions" -Headers $headers -Body ($lookup | ConvertTo-Json -Depth 15) | Out-Null
        Write-Host "    + Lookup: $FromTable → $ToTable ($DisplayName)" -ForegroundColor DarkGray
    } catch {
        if ($_.ErrorDetails.Message -match "already exists") {
            Write-Host "    ~ Lookup $DisplayName existe deja" -ForegroundColor DarkGray
        } else {
            Write-Host "    X Lookup ERREUR: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
}

# ============================================================
#  TES TABLES ICI - Exemples a adapter
# ============================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CREATION DES TABLES" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ------ TABLE 1 : Exemple "category" ------
New-DvTable -Name "category" -DisplayName "Category" -PluralName "Categories" -Description "Categories de produits"
Add-DvColumn -TableName "category" -ColumnName "description" -DisplayName "Description" -Type "Memo" -MaxLength 5000
Add-DvColumn -TableName "category" -ColumnName "icon"        -DisplayName "Icone"       -Type "String" -MaxLength 50
Add-DvColumn -TableName "category" -ColumnName "sortorder"   -DisplayName "Ordre"       -Type "Integer"
Add-DvColumn -TableName "category" -ColumnName "photo"       -DisplayName "Photo"       -Type "Image" -MaxSizeInKB 5120

# ------ TABLE 2 : Exemple "product" ------
New-DvTable -Name "product" -DisplayName "Product" -PluralName "Products" -Description "Catalogue produits"
Add-DvColumn      -TableName "product" -ColumnName "description"  -DisplayName "Description"  -Type "Memo" -MaxLength 10000
Add-DvColumn      -TableName "product" -ColumnName "details"      -DisplayName "Details HTML" -Type "RichText"
Add-DvColumn      -TableName "product" -ColumnName "price"        -DisplayName "Prix"         -Type "Money" -Precision 2
Add-DvColumn      -TableName "product" -ColumnName "weight"       -DisplayName "Poids (kg)"   -Type "Float" -Precision 3
Add-DvColumn      -TableName "product" -ColumnName "quantity"     -DisplayName "Quantite"     -Type "Integer"
Add-DvColumn      -TableName "product" -ColumnName "isactive"     -DisplayName "Actif"        -Type "Boolean"
Add-DvColumn      -TableName "product" -ColumnName "releasedate"  -DisplayName "Date sortie"  -Type "DateOnly"
Add-DvColumn      -TableName "product" -ColumnName "updatedat"    -DisplayName "Mis a jour"   -Type "DateTime"
Add-DvColumn      -TableName "product" -ColumnName "website"      -DisplayName "Site web"     -Type "Url"
Add-DvColumn      -TableName "product" -ColumnName "contact"      -DisplayName "Email"        -Type "Email"
Add-DvColumn      -TableName "product" -ColumnName "phone"        -DisplayName "Telephone"    -Type "Phone"
Add-DvColumn      -TableName "product" -ColumnName "photo"        -DisplayName "Photo"        -Type "Image"
Add-DvColumn      -TableName "product" -ColumnName "fiche"        -DisplayName "Fiche PDF"    -Type "File" -MaxSizeInKB 32768
Add-DvChoice      -TableName "product" -ColumnName "status" -DisplayName "Statut" -Options @(
    @{ Value = 100000000; Label = "brouillon" },
    @{ Value = 100000001; Label = "publie" },
    @{ Value = 100000002; Label = "archive" }
)
Add-DvMultiChoice -TableName "product" -ColumnName "tags" -DisplayName "Tags" -Options @(
    @{ Value = 100000000; Label = "promo" },
    @{ Value = 100000001; Label = "nouveau" },
    @{ Value = 100000002; Label = "bestseller" },
    @{ Value = 100000003; Label = "eco" }
)
# Lookup : product → category
Add-DvLookup -FromTable "product" -ToTable "category" -LookupName "categoryid" -DisplayName "Categorie"

# ============================================================
# PUBLICATION
# ============================================================

Write-Host "`n  Publication..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Method Post -Uri "$apiUrl/PublishAllXml" -Headers $headers -Body "{}"
    Write-Host "  [OK] Publie !" -ForegroundColor Green
} catch {
    Write-Host "  [!] Erreur publication (non bloquant)" -ForegroundColor DarkYellow
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  TABLES CREEES !" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
