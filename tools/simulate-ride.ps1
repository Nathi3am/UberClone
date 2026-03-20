# Simulation script for full ride lifecycle
# Adjust emails/passwords below to match your test accounts
$API = "http://localhost:4000"
$userEmail = "rider@example.com"
$userPass = "riderpass"
$captainEmail = "driver@example.com"
$captainPass = "driverpass"

Write-Host "API: $API"

try {
    $cBody = @{ email = $captainEmail; password = $captainPass; fullname = @{ firstname = "Test"; lastname = "Driver" }; vehicle = @{ color = "White"; plate = "DEV123"; capacity = 4; vehicleType = "car" } } | ConvertTo-Json -Depth 5
    Invoke-RestMethod -Method Post -Uri "$API/captain/register" -Body $cBody -ContentType 'application/json' -ErrorAction SilentlyContinue | Out-Null
    Write-Host "Tried creating test captain (may already exist)" -ForegroundColor DarkGray
} catch { }

Try {
    $cBody = @{ email = $captainEmail; password = $captainPass; fullname = @{ firstname = "Test"; lastname = "Driver" }; vehicle = @{ color = "White"; plate = "DEV123"; capacity = 4; vehicleType = "car" } } | ConvertTo-Json -Depth 5
    Invoke-RestMethod -Method Post -Uri "$API/captains/register" -Body $cBody -ContentType 'application/json' -ErrorAction SilentlyContinue | Out-Null
    Write-Host "Tried creating test captain (may already exist)" -ForegroundColor DarkGray
} catch { }

function Try-LoginUser($email, $password) {
    try {
        $body = @{ email = $email; password = $password } | ConvertTo-Json
        $res = Invoke-RestMethod -Method Post -Uri "$API/users/login" -Body $body -ContentType 'application/json' -ErrorAction Stop
        return $res
    } catch {
        Write-Host "User login failed:" $_.Exception.Message -ForegroundColor Red
        return $null
    }
}

function Try-LoginCaptain($email, $password) {
    try {
        $body = @{ email = $email; password = $password } | ConvertTo-Json
        $res = Invoke-RestMethod -Method Post -Uri "$API/captain/login" -Body $body -ContentType 'application/json' -ErrorAction Stop
        return $res
    } catch {
        Write-Host "Captain login (/captain/login) failed:" $_.Exception.Message -ForegroundColor Yellow
        return $null
    }
}

# 1) Login user
$userLogin = Try-LoginUser -email $userEmail -password $userPass
if (-not $userLogin) { Write-Host "Aborting: user login failed"; exit 1 }
$userToken = $userLogin.token
$userId = $userLogin.user._id
Write-Host "User logged in: $userId" -ForegroundColor Green

# 2) Login captain
$capLogin = Try-LoginCaptain -email $captainEmail -password $captainPass
if (-not $capLogin) { Write-Host "Aborting: captain login failed"; exit 1 }
$capToken = $capLogin.token
# captain route may return captain or user key
 $captainId = $null
 if ($capLogin -and $capLogin.captain -and $capLogin.captain._id) { $captainId = $capLogin.captain._id }
 if (-not $captainId -and $capLogin -and $capLogin.user -and $capLogin.user._id) { $captainId = $capLogin.user._id }
Write-Host "Captain logged in: $captainId" -ForegroundColor Green

# 3) Create ride as user
$createBody = @{
  pickupAddress = "100 Main St"
  dropAddress   = "200 Market Ave"
  distance      = 5
  pickupCoords  = @{ lat = -26.0; lng = 28.0 }
  dropCoords    = @{ lat = -26.01; lng = 28.01 }
  paymentMethod = "card"
}
try {
    $created = Invoke-RestMethod -Method Post -Uri "$API/rides/create" -Headers @{ Authorization = "Bearer $userToken" } -Body ($createBody | ConvertTo-Json -Depth 5) -ContentType 'application/json' -ErrorAction Stop
    $rideId = $created._id
    Write-Host "Ride created: $rideId" -ForegroundColor Green
} catch {
    Write-Host "Create ride failed:" $_.Exception.Message -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# 4) Captain accept the ride (PATCH /rides/:id/accept)
try {
    $accept = Invoke-RestMethod -Method Patch -Uri "$API/rides/$rideId/accept" -Headers @{ Authorization = "Bearer $capToken" } -ErrorAction Stop
    Write-Host "Ride accepted (server returned):" (ConvertTo-Json $accept -Depth 3) -ForegroundColor Green
} catch {
    Write-Host "Accept ride failed:" $_.Exception.Message -ForegroundColor Red
}

Start-Sleep -Seconds 1

# 5) Captain start the ride (GET /rides/start-ride?rideId=...&otp=000000)
try {
    $start = Invoke-RestMethod -Method Get -Uri "$API/rides/start-ride?rideId=$rideId&otp=000000" -Headers @{ Authorization = "Bearer $capToken" } -ErrorAction Stop
    Write-Host "Ride started (server returned):" (ConvertTo-Json $start -Depth 3) -ForegroundColor Green
} catch {
    Write-Host "Start ride failed:" $_.Exception.Message -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

# 6) Captain complete the ride (PUT /rides/complete/:id)
try {
    $complete = Invoke-RestMethod -Method Put -Uri "$API/rides/complete/$rideId" -Headers @{ Authorization = "Bearer $capToken" } -ErrorAction Stop
    Write-Host "Ride completed (server returned):" (ConvertTo-Json $complete -Depth 4) -ForegroundColor Green
} catch {
    Write-Host "Complete ride failed, trying POST /rides/complete/:rideId fallback:" $_.Exception.Message -ForegroundColor Yellow
    try {
        $complete2 = Invoke-RestMethod -Method Post -Uri "$API/rides/complete/$rideId" -Headers @{ Authorization = "Bearer $capToken" } -ErrorAction Stop
        Write-Host "Ride completed (fallback POST returned):" (ConvertTo-Json $complete2 -Depth 4) -ForegroundColor Green
    } catch {
        Write-Host "Complete ride POST fallback also failed:" $_.Exception.Message -ForegroundColor Red
        exit 1
    }
}

Start-Sleep -Seconds 1

# 7) Fetch user ride history
try {
    $history = Invoke-RestMethod -Method Get -Uri "$API/rides/my-rides" -Headers @{ Authorization = "Bearer $userToken" } -ErrorAction Stop
    Write-Host "User ride history count: $($history.rides.Count)" -ForegroundColor Cyan
    Write-Host "Latest ride status: $($history.rides[0].status)" -ForegroundColor Cyan
} catch {
    Write-Host "Fetch history failed:" $_.Exception.Message -ForegroundColor Yellow
}

Write-Host "Simulation finished." -ForegroundColor Magenta
