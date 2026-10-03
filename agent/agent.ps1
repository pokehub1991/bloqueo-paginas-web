<#
.SYNOPSIS
    Agente de Gestión de Directivas de Navegación Web para Laboratorios de Cómputo Windows.
.DESCRIPTION
    Se conecta al servidor central, registra la computadora e implementa
    las directivas de navegación (Bloquear Todo, Permitir Lista, Bloquear Lista o Navegación Libre)
    en Chrome, Edge, Firefox y Opera utilizando las políticas de registro del sistema (Enterprise Policies).
#>

[CmdletBinding()]
param(
    [switch]$Once,
    [string]$ConfigPath = ""
)

# Resolver ruta de configuración de forma robusta
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }
if (-not $ConfigPath -or -not (Test-Path $ConfigPath)) {
    $defaultIni = Join-Path $scriptDir "config.ini"
    if (Test-Path $defaultIni) {
        $ConfigPath = $defaultIni
    } elseif (Test-Path ".\config.ini") {
        $ConfigPath = (Resolve-Path ".\config.ini").Path
    }
}

# Configurar salida UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "UPC NetShield - Agente de Bloqueo Web"

# Definir notificador nativo de directivas de Windows (SendMessageTimeout WM_SETTINGCHANGE)
try {
    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    public class PolicyNotifier {
        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern IntPtr SendMessageTimeout(
            IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
            uint fuFlags, uint uTimeout, out UIntPtr lpdwResult
        );

        [DllImport("userenv.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern bool RefreshPolicyEx(bool bMachine, int dwOptions);
    }
"@ -ErrorAction SilentlyContinue
} catch {}

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
        BlocklistKey = "HKLM:\SOFTWARE\Policies\Google\Chrome\URLBlocklist"
        AllowlistKey = "HKLM:\SOFTWARE\Policies\Google\Chrome\URLAllowlist"
        UserBlocklist = "HKCU:\SOFTWARE\Policies\Google\Chrome\URLBlocklist"
        UserAllowlist = "HKCU:\SOFTWARE\Policies\Google\Chrome\URLAllowlist"
        WildcardValue = "*"
        EnabledSetting = "BloquearChrome"
    },
    @{
        Name = "Microsoft Edge"
        BlocklistKey = "HKLM:\SOFTWARE\Policies\Microsoft\Edge\URLBlocklist"
        AllowlistKey = "HKLM:\SOFTWARE\Policies\Microsoft\Edge\URLAllowlist"
        UserBlocklist = "HKCU:\SOFTWARE\Policies\Microsoft\Edge\URLBlocklist"
        UserAllowlist = "HKCU:\SOFTWARE\Policies\Microsoft\Edge\URLAllowlist"
        WildcardValue = "*"
        EnabledSetting = "BloquearEdge"
    },
    @{
        Name = "Mozilla Firefox"
        BlocklistKey = "HKLM:\SOFTWARE\Policies\Mozilla\Firefox\WebsiteFilter\Block"
        AllowlistKey = "HKLM:\SOFTWARE\Policies\Mozilla\Firefox\WebsiteFilter\Exceptions"
        UserBlocklist = "HKCU:\SOFTWARE\Policies\Mozilla\Firefox\WebsiteFilter\Block"
        UserAllowlist = "HKCU:\SOFTWARE\Policies\Mozilla\Firefox\WebsiteFilter\Exceptions"
        WildcardValue = "<all_urls>"
        EnabledSetting = "BloquearFirefox"
    },
    @{
        Name = "Opera / Opera GX"
        BlocklistKey = "HKLM:\SOFTWARE\Policies\Opera Software\Opera\URLBlocklist"
        AllowlistKey = "HKLM:\SOFTWARE\Policies\Opera Software\Opera\URLAllowlist"
        UserBlocklist = "HKCU:\SOFTWARE\Policies\Opera Software\Opera\URLBlocklist"
        UserAllowlist = "HKCU:\SOFTWARE\Policies\Opera Software\Opera\URLAllowlist"
        WildcardValue = "*"
        EnabledSetting = "BloquearOpera"
    }
)

function Get-RegistryStringList {
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
    return @($list | Sort-Object -Unique)
}

function Set-RegistryStringList {
    param(
        [string]$Path,
        [string[]]$Values
    )
    if (-not (Test-Path $Path)) {
        New-Item -Path $Path -Force -ErrorAction SilentlyContinue | Out-Null
    }

    if (Test-Path $Path) {
        # Limpiar entradas numéricas existentes
        try {
            $props = (Get-ItemProperty -Path $Path -ErrorAction SilentlyContinue).PSObject.Properties | 
                     Where-Object { $_.Name -notmatch "^PS" }
            foreach ($p in $props) {
                Remove-ItemProperty -Path $Path -Name $p.Name -ErrorAction SilentlyContinue | Out-Null
            }

            # Escribir nuevos valores
            if ($Values -and $Values.Count -gt 0) {
                for ($i = 0; $i -lt $Values.Count; $i++) {
                    $valName = [string]($i + 1)
                    Set-ItemProperty -Path $Path -Name $valName -Value $Values[$i] -Type String -Force -ErrorAction SilentlyContinue | Out-Null
                }
            }
        } catch {}
    }
}

function Apply-BrowserPolicies {
    param(
        [string]$PolicyMode = "block_list",
        [string[]]$BlockedUrls,
        [string[]]$AllowedUrls,
        [hashtable]$Config
    )

    $normBlocked = @($BlockedUrls | Where-Object { $_ } | ForEach-Object { $_.Trim().ToLower() } | Sort-Object -Unique)
    $normAllowed = @($AllowedUrls | Where-Object { $_ } | ForEach-Object { $_.Trim().ToLower() } | Sort-Object -Unique)

    $policyChangedAny = $false

    foreach ($browser in $BrowserRegistryTargets) {
        if ($Config[$browser.EnabledSetting] -eq 0) {
            continue
        }

        # Excepciones vitales que NUNCA deben bloquearse (Consola de administración, localhost, intranet de UPC NetShield)
        $essentialAllowChromium = @(
            "http://localhost:*",
            "https://localhost:*",
            "http://127.0.0.1:*",
            "https://127.0.0.1*",
            "localhost",
            "127.0.0.1",
            "http://*:3000*",
            "https://*:3000*"
        )
        $essentialAllowFirefox = @(
            "*://localhost/*",
            "*://127.0.0.1/*",
            "*://*:3000/*"
        )
        if ($Config.ServerUrl) {
            try {
                $srvUri = [System.Uri]$Config.ServerUrl
                $srvHost = $srvUri.Host
                $srvScheme = $srvUri.Scheme
                $srvPort = $srvUri.Port
                $essentialAllowChromium += "${srvScheme}://${srvHost}:*"
                $essentialAllowChromium += "${srvScheme}://${srvHost}"
                $essentialAllowChromium += $srvHost
                $essentialAllowFirefox += "*://${srvHost}/*"
            } catch {}
        }

        $cleanEssentialChromium = @($essentialAllowChromium | Sort-Object -Unique)
        $cleanEssentialFirefox = @($essentialAllowFirefox | Sort-Object -Unique)

        # Calcular listas objetivo según el modo
        $targetBlockList = @()
        $targetAllowList = @()

        switch ($PolicyMode) {
            "block_all" {
                # Modo 1: Bloquear toda navegación externa excepto localhost y consola UPC NetShield
                $targetBlockList = @($browser.WildcardValue)
                $targetAllowList = if ($browser.Name -like "*Firefox*") { $cleanEssentialFirefox } else { $cleanEssentialChromium }
            }
            "allow_list" {
                # Modo 2: Permitir solo lista autorizada + localhost y consola UPC NetShield
                $targetBlockList = @($browser.WildcardValue)
                $baseAllow = if ($browser.Name -like "*Firefox*") { $cleanEssentialFirefox } else { $cleanEssentialChromium }
                $targetAllowList = @($baseAllow + $normAllowed) | Sort-Object -Unique
            }
            "block_list" {
                # Modo 3: Bloquear lista restringida protegiendo localhost
                $targetBlockList = @($normBlocked | Where-Object { $_ -notmatch "(localhost|127\.0\.0\.1)" })
                $targetAllowList = if ($browser.Name -like "*Firefox*") { $cleanEssentialFirefox } else { $cleanEssentialChromium }
            }
            default {
                # Modo libre
                $targetBlockList = @()
                $targetAllowList = @()
            }
        }

        # Escribir primero en HKCU (perfil de usuario actual, efecto inmediato sin requerir elevación)
        # y luego en HKLM (sistema)
        $targets = @(
            @{ Block = $browser.UserBlocklist; Allow = $browser.UserAllowlist; Scope = "HKCU" },
            @{ Block = $browser.BlocklistKey; Allow = $browser.AllowlistKey; Scope = "HKLM" }
        )

        foreach ($t in $targets) {
            try {
                if (-not (Test-Path $t.Block)) {
                    try { New-Item -Path $t.Block -Force -ErrorAction SilentlyContinue | Out-Null } catch {}
                }
                if (-not (Test-Path $t.Allow)) {
                    try { New-Item -Path $t.Allow -Force -ErrorAction SilentlyContinue | Out-Null } catch {}
                }

                $currBlock = Get-RegistryStringList -Path $t.Block
                $currAllow = Get-RegistryStringList -Path $t.Allow

                $blockEqual = ($currBlock.Count -eq 0 -and $targetBlockList.Count -eq 0) -or 
                              (($currBlock.Count -eq $targetBlockList.Count) -and ((Compare-Object $currBlock $targetBlockList -ErrorAction SilentlyContinue).Count -eq 0))

                $allowEqual = ($currAllow.Count -eq 0 -and $targetAllowList.Count -eq 0) -or 
                              (($currAllow.Count -eq $targetAllowList.Count) -and ((Compare-Object $currAllow $targetAllowList -ErrorAction SilentlyContinue).Count -eq 0))

                if (-not ($blockEqual -and $allowEqual)) {
                    Set-RegistryStringList -Path $t.Block -Values $targetBlockList
                    Set-RegistryStringList -Path $t.Allow -Values $targetAllowList
                    $policyChangedAny = $true
                }
            } catch {}
        }
    }

    # Si hubo cambios en las directivas, notificar de inmediato al sistema y vaciar caché DNS
    if ($policyChangedAny) {
        try {
            # 1. Tocar las claves raíz de Chromium (Chrome/Edge/Opera) para disparar RegNotifyChangeKeyValue interno
            $nowTicks = [string](Get-Date).Ticks
            $rootKeys = @(
                "HKCU:\SOFTWARE\Policies\Google\Chrome",
                "HKCU:\SOFTWARE\Policies\Microsoft\Edge",
                "HKCU:\SOFTWARE\Policies\Opera Software\Opera",
                "HKLM:\SOFTWARE\Policies\Google\Chrome",
                "HKLM:\SOFTWARE\Policies\Microsoft\Edge",
                "HKLM:\SOFTWARE\Policies\Opera Software\Opera"
            )
            foreach ($rk in $rootKeys) {
                try {
                    if (Test-Path $rk) {
                        Set-ItemProperty -Path $rk -Name "LastPolicyUpdate" -Value $nowTicks -Force -ErrorAction SilentlyContinue | Out-Null
                    }
                } catch {}
            }

            # 2. Forzar refresco inmediato de directivas a nivel de Windows Group Policy
            try {
                [PolicyNotifier]::RefreshPolicyEx($false, 1) | Out-Null
                [PolicyNotifier]::RefreshPolicyEx($true, 1) | Out-Null
            } catch {}

            # 3. Notificación broadcast a todas las ventanas y procesos de Windows (WM_SETTINGCHANGE)
            [PolicyNotifier]::SendMessageTimeout([IntPtr]0xffff, 0x001A, [UIntPtr]::Zero, "Policy", 2, 500, [ref][UIntPtr]::Zero) | Out-Null
            [PolicyNotifier]::SendMessageTimeout([IntPtr]0xffff, 0x001A, [UIntPtr]::Zero, "Environment", 2, 500, [ref][UIntPtr]::Zero) | Out-Null

            # 4. Limpieza de caché DNS para forzar resolución bajo las nuevas directivas
            Clear-DnsClientCache -ErrorAction SilentlyContinue
            ipconfig /flushdns 2>$null | Out-Null
        } catch {}
    }
}

# --- BUCLE PRINCIPAL DE EJECUCIÓN ---

$config = Get-IniConfig -FilePath $ConfigPath
$hostname = $env:COMPUTERNAME
$localIp = Get-LocalIpv4

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host " AGENTE DE BLOQUEO WEB - LABORATORIO DE COMPUTO WINDOWS" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host " Estacion de trabajo: $hostname" -ForegroundColor White
Write-Host " Direccion IP local:  $localIp" -ForegroundColor White
Write-Host " Servidor central:    $($config.ServerUrl)" -ForegroundColor White
Write-Host " Frecuencia pulso:    $($config.IntervaloSegundos) segundos" -ForegroundColor White
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

$previousPolicyState = ""

do {
    try {
        $localIp = Get-LocalIpv4

        $payload = @{
            hostname = $hostname
            ip = $localIp
            os = [System.Environment]::OSVersion.VersionString
        } | ConvertTo-Json

        $endpoint = "$($config.ServerUrl.TrimEnd('/'))/api/agent/heartbeat"

        # Petición HTTP al servidor central
        $response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $payload `
            -ContentType "application/json; charset=utf-8" `
            -TimeoutSec $config.TiempoEsperaSegundos -ErrorAction Stop

        $policyMode = if ($response.policyMode) { [string]$response.policyMode } else { "block_list" }
        $blockedUrls = @()
        if ($response.blockedUrls) { $blockedUrls = @($response.blockedUrls) }
        $allowedUrls = @()
        if ($response.allowedUrls) { $allowedUrls = @($response.allowedUrls) }

        # Aplicar directivas en navegadores
        Apply-BrowserPolicies -PolicyMode $policyMode -BlockedUrls $blockedUrls -AllowedUrls $allowedUrls -Config $config

        $currentStateKey = "$policyMode|$($blockedUrls.Count)|$($allowedUrls.Count)|$($blockedUrls -join ',')|$($allowedUrls -join ',')"
        if ($currentStateKey -ne $previousPolicyState) {
            switch ($policyMode) {
                "block_all" {
                    Write-Log "Directiva aplicada al instante: [BLOQUEAR TODO] Toda la navegacion web inhabilitada." "WARN"
                }
                "allow_list" {
                    Write-Log "Directiva aplicada al instante: [PERMITIR LISTA] Solo $($allowedUrls.Count) sitio(s) autorizados: ($($allowedUrls -join ', '))" "SUCCESS"
                }
                "block_list" {
                    if ($blockedUrls.Count -gt 0) {
                        Write-Log "Directiva aplicada al instante: [BLOQUEAR LISTA] $($blockedUrls.Count) sitio(s) restringidos: ($($blockedUrls -join ', '))" "SUCCESS"
                    } else {
                        Write-Log "Directiva aplicada al instante: [BLOQUEAR LISTA] Sin restricciones activas." "INFO"
                    }
                }
                default {
                    Write-Log "Directiva aplicada al instante: [LIBRE] Navegacion libre sin restricciones." "INFO"
                }
            }
            $previousPolicyState = $currentStateKey
        }

    } catch [System.Net.WebException] {
        Write-Log "No se pudo contactar al servidor central en $($config.ServerUrl). Se reintentara en $($config.IntervaloSegundos)s..." "WARN"
    } catch {
        $exMsg = $_.Exception.Message
        if ($exMsg -match "HttpRequestException|WebException|conectar|connect|connection|tiempo de espera|timed out|refused") {
            Write-Log "No se pudo contactar al servidor central en $($config.ServerUrl). Se reintentara en $($config.IntervaloSegundos)s..." "WARN"
        } else {
            Write-Log "Incidencia al sincronizar estacion: $exMsg" "ERROR"
        }
    }

    if (-not $Once) {
        Start-Sleep -Seconds $config.IntervaloSegundos
    }
} while (-not $Once)
