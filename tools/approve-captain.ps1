# Approve captain created with the simulate script
$API = "http://localhost:4000"
$adminEmail = "admin@local.test"
$adminPass = "adminpass"
$targetCaptainEmail = "driver@example.com"

function Admin-Login($email,$pass){
    try{
        $body = @{ email=$email; password=$pass } | ConvertTo-Json
        $res = Invoke-RestMethod -Method Post -Uri "$API/admin/login" -Body $body -ContentType 'application/json' -ErrorAction Stop
        return $res
    } catch { Write-Host "Admin login failed:" $_.Exception.Message -ForegroundColor Red; return $null }
}

$admin = Admin-Login -email $adminEmail -pass $adminPass
if (-not $admin) { Write-Host "Cannot proceed without admin login"; exit 1 }
$adminToken = $admin.token
Write-Host "Admin logged in" -ForegroundColor Green

# Get pending drivers
try{
    $pending = Invoke-RestMethod -Method Get -Uri "$API/admin/drivers/pending" -Headers @{ Authorization = "Bearer $adminToken" } -ErrorAction Stop
    Write-Host "Pending response keys: $($pending | Get-Member -MemberType NoteProperty | ForEach-Object { $_.Name } | Out-String)"
    $driversList = $pending.drivers
    Write-Host "Found $($driversList.Count) pending drivers"
} catch { Write-Host "Failed to fetch pending drivers:" $_.Exception.Message -ForegroundColor Red; exit 1 }

 $target = $driversList | Where-Object { $_.email -eq $targetCaptainEmail }
if (-not $target) { Write-Host "No pending captain matching $targetCaptainEmail"; exit 1 }
$targetId = $target._id
Write-Host "Approving captain id: $targetId" -ForegroundColor Cyan

try{
    $approve = Invoke-RestMethod -Method Patch -Uri "$API/admin/drivers/$targetId/approve" -Headers @{ Authorization = "Bearer $adminToken" } -ErrorAction Stop
    Write-Host "Approve response:" (ConvertTo-Json $approve -Depth 3) -ForegroundColor Green
} catch { Write-Host "Approve failed:" $_.Exception.Message -ForegroundColor Red }
