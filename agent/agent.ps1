<#
.SYNOPSIS
    Agente de Gestión de Directivas de Navegación Web para Windows.
.DESCRIPTION
    Se conecta al servidor central, registra la computadora e implementa
    las directivas de bloqueo de URLs en Chrome, Edge, Firefox y Opera
    utilizando las políticas de registro del sistema (Enterprise Policies).
#>

[CmdletBinding()]
param(
    [switch]$Once,
    [string]$ConfigPath = "$PSScriptRoot\config.ini"
)

# Configurar salida UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Agente de Bloqueo Web - Activo"

# --- FUNCIONES DE UTILIDAD ---

function Write-Log {
    param(
        [string]$Message,
        [string]$Type = "INFO"
    )
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    switch ($Type) {
        "SUCCESS" { Write-Host "[$timestamp] [OK] $Message" -ForegroundColor Green }
        "WARN"    { Write-Host "[$timestamp] [AVISO] $Message" -ForegroundColor Yellow }
        "ERROR"   { Write-Host "[$timestamp] [ERROR] $Message" -ForegroundColor Red }
        "SYNC"    { Write-Host "[$timestamp] [SINCRONIZANDO] $Message" -ForegroundColor Cyan }
        default   { Write-Host "[$timestamp] [INFO] $Message" -ForegroundColor Gray }
    }
}

function Get-IniConfig {
    param([string]$FilePath)
    $config = @{
        ServerUrl = "http://localhost:3000"
        IntervaloSegundos = 30
        TiempoEsperaSegundos = 10
        BloquearChrome = 1
        BloquearEdge = 1
        BloquearFirefox = 1
        BloquearOpera = 1
    }

    if (Test-Path $FilePath) {
        Get-Content $FilePath | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith(";") -and -not $line.StartsWith("#") -and $line.Contains("=")) {
                $parts = $line -split "=", 2
                $key = $parts[0].Trim()
                $val = $parts[1].Trim()
                if ($key -eq "ServerUrl") { $config.ServerUrl = $val }
                if ($key -eq "IntervaloSegundos") { $config.IntervaloSegundos = [int]$val }
                if ($key -eq "TiempoEsperaSegundos") { $config.TiempoEsperaSegundos = [int]$val }
                if ($key -eq "BloquearChrome") { $config.BloquearChrome = [int]$val }
                if ($key -eq "BloquearEdge") { $config.BloquearEdge = [int]$val }
                if ($key -eq "BloquearFirefox") { $config.BloquearFirefox = [int]$val }
                if ($key -eq "BloquearOpera") { $config.BloquearOpera = [int]$val }
            }
        }
    } else {
        Write-Log "No se encontro config.ini. Usando valores predeterminados (http://localhost:3000)." "WARN"
    }

    return $config
}

function Get-LocalIpv4 {
    try {
        $ipObj = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias * -ErrorAction SilentlyContinue |
            Where-Object { 
                $_.IPAddress -ne "127.0.0.1" -and 
                -not $_.IPAddress.StartsWith("169.254.") -and 
                $_.ValidLifetime -gt 0 
            } | Select-Object -First 1

        if ($ipObj) { return $ipObj.IPAddress }
    } catch {
        # Fallback vía DNS si Get-NetIPAddress falla
    }

    try {
        $dnsIps = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
            Where-Object { 
                $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and 
                $_.IPAddressToString -ne "127.0.0.1" -and 
                -not $_.IPAddressToString.StartsWith("169.254.") 
            }
        if ($dnsIps.Count -gt 0) { return $dnsIps[0].IPAddressToString }
    } catch {}

    return "127.0.0.1"
}

# --- RUTAS DE DIRECTIVAS EN EL REGISTRO DE WINDOWS ---
$BrowserRegistryTargets = @(
    @{
        Name = "Google Chrome"
        KeyPath = "HKLM:\SOFTWARE\Policies\Google\Chrome\URLBlocklist"
        UserFallback = "HKCU:\SOFTWARE\Policies\Google\Chrome\URLBlocklist"
        EnabledSetting = "BloquearChrome"
    },
    @{
        Name = "Microsoft Edge"
        KeyPath = "HKLM:\SOFTWARE\Policies\Microsoft\Edge\URLBlocklist"
        UserFallback = "HKCU:\SOFTWARE\Policies\Microsoft\Edge\URLBlocklist"
        EnabledSetting = "BloquearEdge"
    },
    @{
        Name = "Mozilla Firefox"
        KeyPath = "HKLM:\SOFTWARE\Policies\Mozilla\Firefox\WebsiteFilter\Block"
        UserFallback = "HKCU:\SOFTWARE\Policies\Mozilla\Firefox\WebsiteFilter\Block"
        EnabledSetting = "BloquearFirefox"
    },
    @{
        Name = "Opera / Opera GX"
        KeyPath = "HKLM:\SOFTWARE\Policies\Opera Software\Opera\URLBlocklist"
        UserFallback = "HKCU:\SOFTWARE\Policies\Opera Software\Opera\URLBlocklist"
        EnabledSetting = "BloquearOpera"
    }
)

function Get-CurrentBlockedFromRegistry {
    param([string]$Path)
    $list = @()
    if (Test-Path $Path) {
        $item = Get-ItemProperty -Path $Path -ErrorAction SilentlyContinue
        if ($item) {
            foreach ($prop in $item.PSObject.Properties) {
                if ($prop.Name -notmatch "^PS" -and $prop.Value) {
                    $list += [string]$prop.Value
                }
            }
        }
    }
    return ($list | Sort-Object -Unique)
}

function Apply-BrowserBlocklist {
    param(
        [string[]]$Urls,
        [hashtable]$Config
    )

    $normalizedNewUrls = @($Urls | Where-Object { $_ } | ForEach-Object { $_.Trim().ToLower() } | Sort-Object -Unique)

    foreach ($browser in $BrowserRegistryTargets) {
        # Verificar si este navegador está habilitado en config
        if ($Config[$browser.EnabledSetting] -eq 0) {
            continue
        }

        $targetPath = $browser.KeyPath

        # Probar si podemos acceder/crear en HKLM, si no intentar en HKCU
        $writePath = $targetPath
        $canWriteHklm = $true
        try {
            if (-not (Test-Path $targetPath)) {
                New-Item -Path $targetPath -Force -ErrorAction Stop | Out-Null
            }
        } catch {
            $canWriteHklm = $false
            $writePath = $browser.UserFallback
            if (-not (Test-Path $writePath)) {
                New-Item -Path $writePath -Force -ErrorAction SilentlyContinue | Out-Null
            }
        }

        # 1. Comprobar estado actual para idempotencia
        $currentUrls = Get-CurrentBlockedFromRegistry -Path $writePath
        $areEqual = ($normalizedNewUrls.Count -eq $currentUrls.Count) -and 
                     ((Compare-Object $normalizedNewUrls $currentUrls).Count -eq 0)

        if ($areEqual) {
            # Ya está idéntico, no escribir innecesariamente
            continue
        }

        # 2. Si hay diferencias, mutar el registro
        try {
            # Limpiar entradas numéricas existentes
            if (Test-Path $writePath) {
                $props = (Get-ItemProperty -Path $writePath).PSObject.Properties | 
                         Where-Object { $_.Name -notmatch "^PS" }
                foreach ($p in $props) {
                    Remove-ItemProperty -Path $writePath -Name $p.Name -ErrorAction SilentlyContinue
                }
            }

            # Si hay URLs nuevas, escribirlas con índices 1, 2, 3...
            if ($normalizedNewUrls.Count -gt 0) {
                if (-not (Test-Path $writePath)) {
                    New-Item -Path $writePath -Force | Out-Null
                }
                for ($i = 0; $i -lt $normalizedNewUrls.Count; $i++) {
                    $valName = [string]($i + 1)
                    Set-ItemProperty -Path $writePath -Name $valName -Value $normalizedNewUrls[$i] -Type String -Force
                }
                Write-Log "[$($browser.Name)] Directivas aplicadas: $($normalizedNewUrls.Count) pagina(s) restringida(s)." "SUCCESS"
            } else {
                Write-Log "[$($browser.Name)] Se removieron todas las restricciones. Navegacion libre." "SUCCESS"
            }
        } catch {
            Write-Log "No se pudieron escribir directivas para $($browser.Name): $($_.Exception.Message)" "ERROR"
        }
    }
}

# --- BUCLE PRINCIPAL DE EJECUCIÓN ---

$config = Get-IniConfig -FilePath $ConfigPath
$hostname = $env:COMPUTERNAME
$localIp = Get-LocalIpv4

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host " AGENTE DE BLOQUEO WEB - ESTACION WINDOWS LOCAL" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host " Nombre de este equipo: $hostname" -ForegroundColor White
Write-Host " Direccion IP local:    $localIp" -ForegroundColor White
Write-Host " Servidor central:      $($config.ServerUrl)" -ForegroundColor White
Write-Host " Intervalo de chequeo:  $($config.IntervaloSegundos) segundos" -ForegroundColor White
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

$previousRuleCount = -1

do {
    try {
        # Actualizar IP por si cambió de red Wi-Fi o cable
        $localIp = Get-LocalIpv4

        $payload = @{
            hostname = $hostname
            ip = $localIp
            os = [System.Environment]::OSVersion.VersionString
        } | ConvertTo-Json

        $endpoint = "$($config.ServerUrl.TrimEnd('/'))/api/agent/heartbeat"

        # Petición HTTP al servidor
        $response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $payload `
            -ContentType "application/json; charset=utf-8" `
            -TimeoutSec $config.TiempoEsperaSegundos -ErrorAction Stop

        $blockedUrls = @()
        if ($response.blockedUrls) {
            $blockedUrls = @($response.blockedUrls)
        }

        # Aplicar directivas en navegadores
        Apply-BrowserBlocklist -Urls $blockedUrls -Config $config

        if ($blockedUrls.Count -ne $previousRuleCount) {
            if ($blockedUrls.Count -gt 0) {
                Write-Log "Reglas sincronizadas: $($blockedUrls.Count) pagina(s) bloqueadas ($($blockedUrls -join ', '))" "SUCCESS"
            } else {
                Write-Log "Sin restricciones asignadas en este momento." "INFO"
            }
            $previousRuleCount = $blockedUrls.Count
        } else {
            Write-Log "Conexion verificada. Reglas al dia ($($blockedUrls.Count) activas)." "INFO"
        }

    } catch [System.Net.WebException], [System.Net.Http.HttpRequestException] {
        Write-Log "No se pudo contactar al servidor central en $($config.ServerUrl). Se reintentara en $($config.IntervaloSegundos)s..." "WARN"
    } catch {
        Write-Log "Ocurrio una incidencia: $($_.Exception.Message)" "ERROR"
    }

    if (-not $Once) {
        Start-Sleep -Seconds $config.IntervaloSegundos
    }
} while (-not $Once)
