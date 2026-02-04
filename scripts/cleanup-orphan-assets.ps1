param(
    [Parameter(Mandatory = $true)]
    [string]$AccountId,

    [Parameter(Mandatory = $true)]
    [string]$Token,

    [string[]]$AssetIds,

    [switch]$DetectOrphans
)

function Get-OrphanAssetIds {
    param(
        [string]$AccountId
    )

    $query = @"
        SELECT a.id
        FROM assets a
        LEFT JOIN template_assets ta ON ta.asset_id = a.id
        LEFT JOIN message_assets ma ON ma.asset_id = a.id
        LEFT JOIN plan_assets pa ON pa.asset_id = a.id
        WHERE a.account_id = '$AccountId'
        GROUP BY a.id
        HAVING COUNT(ta.asset_id) + COUNT(ma.asset_id) + COUNT(pa.asset_id) = 0;
"@.Trim()

    Write-Host "[cleanup] Detectando assets huérfanos para la cuenta $AccountId ..."
    $output = docker exec fluxcore-db psql -U postgres -d fluxcore -t -A -c "$query"
    $ids = $output.Split("`n") | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
    return $ids
}

function Remove-AssetViaApi {
    param(
        [string]$AccountId,
        [string]$Token,
        [string]$AssetId
    )

    $uri = "http://localhost:3000/api/assets/$AssetId?accountId=$AccountId"
    try {
        Invoke-WebRequest -Method Delete -Uri $uri -Headers @{ Authorization = "Bearer $Token" } -ContentType 'application/json' -Body '{}' | Out-Null
        Write-Host "[cleanup] $AssetId -> eliminado" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "[cleanup] $AssetId -> fallo: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

if ($DetectOrphans) {
    $AssetIds = Get-OrphanAssetIds -AccountId $AccountId
    if (-not $AssetIds -or $AssetIds.Count -eq 0) {
        Write-Host "[cleanup] No se encontraron assets huérfanos." -ForegroundColor Yellow
        return
    }
}

if (-not $AssetIds -or $AssetIds.Count -eq 0) {
    Write-Error "Debes especificar AssetIds manualmente o usar -DetectOrphans."
    exit 1
}

Write-Host "[cleanup] Eliminando $($AssetIds.Count) assets para la cuenta $AccountId ..."
$success = 0
$failed = 0

foreach ($assetId in $AssetIds) {
    if (Remove-AssetViaApi -AccountId $AccountId -Token $Token -AssetId $assetId) {
        $success++
    }
    else {
        $failed++
    }
}

Write-Host "[cleanup] Resumen: $success eliminados, $failed fallidos." -ForegroundColor Cyan
if ($failed -gt 0) {
    exit 2
}
