<#
.SYNOPSIS
    Agente de Gestión de Directivas y Bloqueo Web Instantáneo para Laboratorios de Cómputo Windows.
.DESCRIPTION
    Se conecta al servidor central, registra la computadora e implementa
    las directivas de navegación (Bloquear Todo, Permitir Lista, Bloquear Lista o Navegación Libre)
    de forma 100% INMEDIATA sin necesidad de cerrar o reiniciar los navegadores (Chrome, Edge, Firefox, Opera).
    Utiliza una arquitectura multicapa:
    1. Intercepción en el kernel de red y resolución OS (C:\Windows\System32\drivers\etc\hosts).
    2. Reglas dinámicas de Windows Firewall para corte total inmediato (puertos 80, 443).
    3. Desconexión de sockets TCP activos mediante SetTcpEntry para interrumpir descargas o streaming en curso.
    4. Desactivación de QUIC y DoH (DNS sobre HTTPS) y forzado de DNS del sistema en navegadores Chromium.
    5. Directivas de registro en HKLM, HKCU y todos los SIDs de usuarios activos (incluyendo perfil Alumnos).
    6. Archivo enterprise policies.json para Mozilla Firefox.
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
$Host.UI.RawUI.WindowTitle = "UPC NetShield - Agente de Bloqueo Web Instantaneo"

# Definir notificadores nativos de Windows y control de sockets TCP (SetTcpEntry)
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

    [StructLayout(LayoutKind.Sequential)]
    public struct MIB_TCPROW {
        public uint dwState;
        public uint dwLocalAddr;
        public uint dwLocalPort;
        public uint dwRemoteAddr;
        public uint dwRemotePort;
    }

    public class NetworkHelper {
        [DllImport("iphlpapi.dll", SetLastError = true)]
        public static extern int SetTcpEntry(ref MIB_TCPROW pTcprow);

        public const uint MIB_TCP_STATE_DELETE_TCB = 12;

        public static bool CloseTcpConnection(uint localAddr, uint localPort, uint remoteAddr, uint remotePort) {
            try {
                MIB_TCPROW row = new MIB_TCPROW();
                row.dwState = MIB_TCP_STATE_DELETE_TCB;
                row.dwLocalAddr = localAddr;
                row.dwLocalPort = localPort;
                row.dwRemoteAddr = remoteAddr;
                row.dwRemotePort = remotePort;
                return SetTcpEntry(ref row) == 0;
            } catch {
                return false;
            }
        }
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
        ServerUrl = "http://10.142.240.190:5050"
        IntervaloSegundos = 2
        TiempoEsperaSegundos = 6
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
                if ($key -eq "IntervaloSegundos") { $config.IntervaloSegundos = [Math]::Max(1, [int]$val) }
                if ($key -eq "TiempoEsperaSegundos") { $config.TiempoEsperaSegundos = [int]$val }
                if ($key -eq "BloquearChrome") { $config.BloquearChrome = [int]$val }
                if ($key -eq "BloquearEdge") { $config.BloquearEdge = [int]$val }
                if ($key -eq "BloquearFirefox") { $config.BloquearFirefox = [int]$val }
                if ($key -eq "BloquearOpera") { $config.BloquearOpera = [int]$val }
            }
        }
    } else {
        Write-Log "No se encontro config.ini. Usando valores predeterminados (http://10.142.240.190:5050)." "WARN"
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
    } catch {}

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

function Get-DomainFromUrl {
    param([string]$Url)
    if (-not $Url) { return "" }
    $clean = $Url.Trim().ToLower()
    $clean = $clean -replace "^[a-z0-9]+://", ""
    $clean = $clean -replace "^\*://", ""
    $clean = $clean -replace "^[*.]+", ""
    if ($clean.Contains("/")) { $clean = $clean.Substring(0, $clean.IndexOf("/")) }
    if ($clean.Contains("?")) { $clean = $clean.Substring(0, $clean.IndexOf("?")) }
    if ($clean.Contains("#")) { $clean = $clean.Substring(0, $clean.IndexOf("#")) }
    if ($clean -match "^([^:]+):\d+$") { $clean = $Matches[1] }
    return $clean.Trim()
}

function Get-AllUserSids {
    $sids = [System.Collections.Generic.List[string]]::new()
    try {
        $keys = Get-ChildItem Registry::HKEY_USERS -ErrorAction SilentlyContinue
        foreach ($k in $keys) {
            $name = $k.PSChildName
            if ($name -match "^S-1-5-21-" -and $name -notmatch "_Classes$") {
                $sids.Add($name)
            }
        }
    } catch {}

    try {
        $profiles = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList\*" -ErrorAction SilentlyContinue
        foreach ($p in $profiles) {
            if ($p.ProfileImagePath -and $p.ProfileImagePath -like "*\Alumnos*") {
                $sidStr = Split-Path -Leaf $p.PSPath
                if ($sidStr -match "^S-1-5-21-" -and -not $sids.Contains($sidStr)) {
                    $sids.Add($sidStr)
                }
            }
        }
    } catch {}

    return @($sids | Sort-Object -Unique)
}

function Flush-NetworkCaches {
    try {
        Clear-DnsClientCache -ErrorAction SilentlyContinue
        ipconfig /flushdns 2>$null | Out-Null
        netsh interface ip delete arpcache 2>$null | Out-Null
        nbtstat -R 2>$null | Out-Null
    } catch {}
}

# --- CAPA 1: INTERCEPCIÓN EN ARCHIVO HOSTS (EFECTO INMEDIATO SIN REINICIAR NAVEGADOR) ---

function Update-HostsFile {
    param(
        [string]$PolicyMode = "block_list",
        [string[]]$BlockedUrls = @()
    )

    $hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
    if (-not (Test-Path $hostsPath)) {
        return
    }

    $markerStart = "# --- UPC_NETSHIELD_START ---"
    $markerEnd = "# --- UPC_NETSHIELD_END ---"

    try {
        $currentLines = @(Get-Content -Path $hostsPath -Encoding ASCII -ErrorAction SilentlyContinue)
        if (-not $currentLines -or $currentLines.Count -eq 0) {
            $currentLines = @(Get-Content -Path $hostsPath -ErrorAction SilentlyContinue)
        }

        # Filtrar bloque existente
        $cleanLines = [System.Collections.Generic.List[string]]::new()
        $insideBlock = $false
        foreach ($line in $currentLines) {
            if ($line.Trim() -eq $markerStart) {
                $insideBlock = $true
                continue
            }
            if ($line.Trim() -eq $markerEnd) {
                $insideBlock = $false
                continue
            }
            if (-not $insideBlock) {
                $cleanLines.Add($line)
            }
        }

        $newManagedEntries = [System.Collections.Generic.List[string]]::new()

        if ($PolicyMode -eq "block_list" -and $BlockedUrls -and $BlockedUrls.Count -gt 0) {
            $domainsToBlock = [System.Collections.Generic.HashSet[string]]::new()

            foreach ($u in $BlockedUrls) {
                $dom = Get-DomainFromUrl -Url $u
                if ($dom -and $dom -notmatch "^(localhost|127\.0\.0\.1|0\.0\.0\.0)$") {
                    $domainsToBlock.Add($dom) | Out-Null
                    if ($dom.StartsWith("www.")) {
                        $rootDom = $dom.Substring(4)
                        if ($rootDom) { $domainsToBlock.Add($rootDom) | Out-Null }
                    } else {
                        $domainsToBlock.Add("www.$dom") | Out-Null
                    }
                }
            }

            if ($domainsToBlock.Count -gt 0) {
                $newManagedEntries.Add($markerStart)
                $newManagedEntries.Add("# Bloqueo instantaneo administrado por UPC NetShield - No editar")
                foreach ($d in ($domainsToBlock | Sort-Object)) {
                    $newManagedEntries.Add("0.0.0.0 $d")
                    $newManagedEntries.Add("::1 $d")
                }
                $newManagedEntries.Add($markerEnd)
            }
        }

        $finalLines = [System.Collections.Generic.List[string]]::new($cleanLines)
        if ($newManagedEntries.Count -gt 0) {
            if ($finalLines.Count -gt 0 -and $finalLines[$finalLines.Count - 1].Trim() -ne "") {
                $finalLines.Add("")
            }
            $finalLines.AddRange($newManagedEntries)
        }

        $finalContent = ($finalLines -join "`r`n") + "`r`n"
        $currentFull = ($currentLines -join "`r`n") + "`r`n"

        if ($finalContent.Trim() -ne $currentFull.Trim()) {
            Set-ItemProperty -Path $hostsPath -Name Attributes -Value "Normal" -ErrorAction SilentlyContinue
            [System.IO.File]::WriteAllText($hostsPath, $finalContent, [System.Text.Encoding]::ASCII)
            Write-Log "Archivo hosts actualizado con directivas instantaneas de UPC NetShield." "SUCCESS"
            Flush-NetworkCaches
        }
    } catch {
        Write-Log "No se pudo actualizar el archivo hosts: $($_.Exception.Message)" "WARN"
    }
}

# --- CAPA 2: REGLAS DE FIREWALL PARA CORTE TOTAL INMEDIATO (BLOCK_ALL) ---

function Update-FirewallPolicy {
    param(
        [string]$PolicyMode = "block_list",
        [string]$ServerUrl = ""
    )

    $ruleNameBlockAll = "UPC_NetShield_BlockAll"
    $ruleNameAllowSrv = "UPC_NetShield_AllowServer"

    try {
        if ($PolicyMode -eq "block_all") {
            # Regla de excepción para el servidor central (si usa puerto HTTP/HTTPS)
            if ($ServerUrl) {
                try {
                    $srvHost = ([System.Uri]$ServerUrl).Host
                    if ($srvHost -and $srvHost -notmatch "^(localhost|127\.0\.0\.1)$") {
                        $existingAllow = netsh advfirewall firewall show rule name="$ruleNameAllowSrv" 2>$null
                        if (-not ($existingAllow -match $ruleNameAllowSrv)) {
                            netsh advfirewall firewall add rule name="$ruleNameAllowSrv" dir=out action=allow remoteip=$srvHost description="Permitir conexion de agente con servidor central UPC NetShield" 2>$null | Out-Null
                        }
                    }
                } catch {}
            }

            # Regla de bloqueo total de puertos web 80 y 443 a nivel kernel
            $existingBlock = netsh advfirewall firewall show rule name="$ruleNameBlockAll" 2>$null
            if (-not ($existingBlock -match $ruleNameBlockAll)) {
                netsh advfirewall firewall add rule name="$ruleNameBlockAll" dir=out action=block protocol=TCP remoteport=80,443 description="Bloqueo total web instantaneo por UPC NetShield" 2>$null | Out-Null
                Write-Log "Regla de Firewall activada: Toda salida web (puertos 80, 443) bloqueada al instante." "WARN"
            }
        } else {
            $existingBlock = netsh advfirewall firewall show rule name="$ruleNameBlockAll" 2>$null
            if ($existingBlock -match $ruleNameBlockAll) {
                netsh advfirewall firewall delete rule name="$ruleNameBlockAll" 2>$null | Out-Null
                Write-Log "Regla de Firewall desactivada: Salida web restablecida." "INFO"
            }
        }
    } catch {
        Write-Log "Incidencia con regla de firewall: $($_.Exception.Message)" "WARN"
    }
}

# --- CAPA 3: DESCONEXIÓN DE SOCKETS TCP ACTIVOS DE NAVEGADORES (SIN CERRAR PROCESO) ---

function Sever-ActiveBrowserSockets {
    param(
        [string]$PolicyMode = "block_list",
        [string[]]$BlockedUrls = @()
    )

    try {
        $browserProcesses = Get-Process -Name "chrome", "firefox", "msedge", "opera", "brave" -ErrorAction SilentlyContinue
        if (-not $browserProcesses -or $browserProcesses.Count -eq 0) {
            return
        }

        $pids = @($browserProcesses | Select-Object -ExpandProperty Id)
        $tcpConns = Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue |
            Where-Object { $pids -contains $_.OwningProcess }

        if (-not $tcpConns -or $tcpConns.Count -eq 0) {
            return
        }

        if ($PolicyMode -eq "block_all") {
            foreach ($conn in $tcpConns) {
                if ($conn.RemotePort -in @(80, 443)) {
                    Close-SingleTcpConnection -Conn $conn
                }
            }
        } elseif ($PolicyMode -eq "block_list" -and $BlockedUrls -and $BlockedUrls.Count -gt 0) {
            $blockedIps = [System.Collections.Generic.HashSet[string]]::new()
            foreach ($u in $BlockedUrls) {
                $dom = Get-DomainFromUrl -Url $u
                if ($dom) {
                    try {
                        $resolved = [System.Net.Dns]::GetHostAddresses($dom)
                        foreach ($r in $resolved) {
                            $blockedIps.Add($r.IPAddressToString) | Out-Null
                        }
                    } catch {}
                }
            }

            if ($blockedIps.Count -gt 0) {
                foreach ($conn in $tcpConns) {
                    if ($blockedIps.Contains($conn.RemoteAddress)) {
                        Close-SingleTcpConnection -Conn $conn
                    }
                }
            }
        }
    } catch {}
}

function Close-SingleTcpConnection {
    param($Conn)
    try {
        $localBytes = [System.Net.IPAddress]::Parse($Conn.LocalAddress).GetAddressBytes()
        $remoteBytes = [System.Net.IPAddress]::Parse($Conn.RemoteAddress).GetAddressBytes()

        if ($localBytes.Length -eq 4 -and $remoteBytes.Length -eq 4) {
            $localUint = [System.BitConverter]::ToUInt32($localBytes, 0)
            $remoteUint = [System.BitConverter]::ToUInt32($remoteBytes, 0)
            $localPortNet = [uint32](([int]$Conn.LocalPort -band 0xFF) -shl 8 -bor ([int]$Conn.LocalPort -shr 8))
            $remotePortNet = [uint32](([int]$Conn.RemotePort -band 0xFF) -shl 8 -bor ([int]$Conn.RemotePort -shr 8))

            [NetworkHelper]::CloseTcpConnection($localUint, $localPortNet, $remoteUint, $remotePortNet) | Out-Null
        }
    } catch {}
}

# --- CAPA 4: ARCHIVO POLICIES.JSON ENTERPRISE PARA MOZILLA FIREFOX ---

function Update-FirefoxPoliciesJson {
    param(
        [string]$PolicyMode = "block_list",
        [string[]]$BlockedUrls,
        [string[]]$AllowedUrls,
        [psobject]$IdentityPolicy = $null
    )

    $firefoxDirs = @(
        "C:\Program Files\Mozilla Firefox",
        "C:\Program Files (x86)\Mozilla Firefox"
    )

    foreach ($fxDir in $firefoxDirs) {
        if (Test-Path $fxDir) {
            try {
                $distDir = Join-Path $fxDir "distribution"
                if (-not (Test-Path $distDir)) {
                    New-Item -Path $distDir -ItemType Directory -Force -ErrorAction SilentlyContinue | Out-Null
                }

                $policiesFile = Join-Path $distDir "policies.json"

                $policyObj = @{
                    policies = @{
                        DNSOverHTTPS = @{
                            Enabled = $false
                        }
                    }
                }

                if ($IdentityPolicy) {
                    if ($IdentityPolicy.blockIncognito) {
                        $policyObj.policies["DisablePrivateBrowsing"] = $true
                    }
                    if ($IdentityPolicy.clearSessionOnClose) {
                        $policyObj.policies["SanitizeOnShutdown"] = $true
                    }
                }

                if ($PolicyMode -eq "block_all") {
                    $policyObj.policies["WebsiteFilter"] = @{
                        Block = @("<all_urls>")
                        Exceptions = @("*://localhost/*", "*://127.0.0.1/*", "*://*:5050/*")
                    }
                } elseif ($PolicyMode -eq "allow_list" -and $AllowedUrls -and $AllowedUrls.Count -gt 0) {
                    $fxExceptions = @("*://localhost/*", "*://127.0.0.1/*", "*://*:5050/*")
                    foreach ($u in $AllowedUrls) {
                        $fxExceptions += "*://$u/*"
                        $fxExceptions += "*://*.$u/*"
                    }
                    $policyObj.policies["WebsiteFilter"] = @{
                        Block = @("<all_urls>")
                        Exceptions = @($fxExceptions | Sort-Object -Unique)
                    }
                } elseif ($PolicyMode -eq "block_list" -and $BlockedUrls -and $BlockedUrls.Count -gt 0) {
                    $fxBlocks = @()
                    foreach ($u in $BlockedUrls) {
                        $dom = Get-DomainFromUrl -Url $u
                        if ($dom) {
                            $fxBlocks += "*://$dom/*"
                            $fxBlocks += "*://*.$dom/*"
                        }
                    }
                    $policyObj.policies["WebsiteFilter"] = @{
                        Block = @($fxBlocks | Sort-Object -Unique)
                        Exceptions = @("*://localhost/*", "*://127.0.0.1/*", "*://*:5050/*")
                    }
                }

                $jsonStr = $policyObj | ConvertTo-Json -Depth 5
                [System.IO.File]::WriteAllText($policiesFile, $jsonStr, [System.Text.Encoding]::UTF8)
            } catch {}
        }
    }
}

# --- CAPA 5: DIRECTIVAS DE REGISTRO EN HKLM, HKCU Y SIDS DE HKEY_USERS ---

$BrowserRegistryTargets = @(
    @{
        Name = "Google Chrome"
        SubKey = "SOFTWARE\Policies\Google\Chrome"
        BlocklistSub = "SOFTWARE\Policies\Google\Chrome\URLBlocklist"
        AllowlistSub = "SOFTWARE\Policies\Google\Chrome\URLAllowlist"
        WildcardValue = "*"
        EnabledSetting = "BloquearChrome"
        IsChromium = $true
    },
    @{
        Name = "Microsoft Edge"
        SubKey = "SOFTWARE\Policies\Microsoft\Edge"
        BlocklistSub = "SOFTWARE\Policies\Microsoft\Edge\URLBlocklist"
        AllowlistSub = "SOFTWARE\Policies\Microsoft\Edge\URLAllowlist"
        WildcardValue = "*"
        EnabledSetting = "BloquearEdge"
        IsChromium = $true
    },
    @{
        Name = "Mozilla Firefox"
        SubKey = "SOFTWARE\Policies\Mozilla\Firefox"
        BlocklistSub = "SOFTWARE\Policies\Mozilla\Firefox\WebsiteFilter\Block"
        AllowlistSub = "SOFTWARE\Policies\Mozilla\Firefox\WebsiteFilter\Exceptions"
        WildcardValue = "<all_urls>"
        EnabledSetting = "BloquearFirefox"
        IsChromium = $false
    },
    @{
        Name = "Opera / Opera GX"
        SubKey = "SOFTWARE\Policies\Opera Software\Opera"
        BlocklistSub = "SOFTWARE\Policies\Opera Software\Opera\URLBlocklist"
        AllowlistSub = "SOFTWARE\Policies\Opera Software\Opera\URLAllowlist"
        WildcardValue = "*"
        EnabledSetting = "BloquearOpera"
        IsChromium = $true
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
        try {
            $props = (Get-ItemProperty -Path $Path -ErrorAction SilentlyContinue).PSObject.Properties | 
                     Where-Object { $_.Name -notmatch "^PS" }
            foreach ($p in $props) {
                Remove-ItemProperty -Path $Path -Name $p.Name -ErrorAction SilentlyContinue | Out-Null
            }

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
        [hashtable]$Config,
        [psobject]$IdentityPolicy = $null
    )

    $normBlocked = @($BlockedUrls | Where-Object { $_ } | ForEach-Object { $_.Trim().ToLower() } | Sort-Object -Unique)
    $normAllowed = @($AllowedUrls | Where-Object { $_ } | ForEach-Object { $_.Trim().ToLower() } | Sort-Object -Unique)

    $policyChangedAny = $false

    # Excepciones vitales que NUNCA deben bloquearse
    $essentialAllowChromium = @(
        "http://localhost:*",
        "https://localhost:*",
        "http://127.0.0.1:*",
        "https://127.0.0.1*",
        "localhost",
        "127.0.0.1",
        "http://*:5050*",
        "https://*:5050*",
        "http://*:3000*",
        "https://*:3000*",
        "http://*:4000*",
        "https://*:4000*"
    )
    $essentialAllowFirefox = @(
        "*://localhost/*",
        "*://127.0.0.1/*",
        "*://*:5050/*",
        "*://*:3000/*",
        "*://*:4000/*"
    )

    if ($Config.ServerUrl) {
        try {
            $srvUri = [System.Uri]$Config.ServerUrl
            $srvHost = $srvUri.Host
            $srvScheme = $srvUri.Scheme
            $essentialAllowChromium += "${srvScheme}://${srvHost}:*"
            $essentialAllowChromium += "${srvScheme}://${srvHost}"
            $essentialAllowChromium += $srvHost
            $essentialAllowFirefox += "*://${srvHost}/*"
        } catch {}
    }

    $cleanEssentialChromium = @($essentialAllowChromium | Sort-Object -Unique)
    $cleanEssentialFirefox = @($essentialAllowFirefox | Sort-Object -Unique)

    # Identificar todas las raíces de registro: HKLM, HKCU y todos los SIDs de usuario (incluye Alumnos)
    $allUserSids = Get-AllUserSids
    $registryRoots = [System.Collections.Generic.List[string]]::new()
    $registryRoots.Add("HKLM:")
    $registryRoots.Add("HKCU:")
    foreach ($sid in $allUserSids) {
        $registryRoots.Add("Registry::HKEY_USERS\$sid")
    }

    foreach ($browser in $BrowserRegistryTargets) {
        if ($Config[$browser.EnabledSetting] -eq 0) {
            continue
        }

        # Calcular listas objetivo según el modo
        $targetBlockList = @()
        $targetAllowList = @()

        switch ($PolicyMode) {
            "block_all" {
                $targetBlockList = @($browser.WildcardValue)
                $targetAllowList = if ($browser.IsChromium) { $cleanEssentialChromium } else { $cleanEssentialFirefox }
            }
            "allow_list" {
                $targetBlockList = @($browser.WildcardValue)
                $baseAllow = if ($browser.IsChromium) { $cleanEssentialChromium } else { $cleanEssentialFirefox }
                $targetAllowList = @($baseAllow + $normAllowed) | Sort-Object -Unique
            }
            "block_list" {
                $targetBlockList = @($normBlocked | Where-Object { $_ -notmatch "(localhost|127\.0\.0\.1)" })
                $targetAllowList = if ($browser.IsChromium) { $cleanEssentialChromium } else { $cleanEssentialFirefox }
            }
            default {
                $targetBlockList = @()
                $targetAllowList = @()
            }
        }

        foreach ($root in $registryRoots) {
            try {
                $baseKey = "$root\$($browser.SubKey)"
                $blockKey = "$root\$($browser.BlocklistSub)"
                $allowKey = "$root\$($browser.AllowlistSub)"

                if (-not (Test-Path $baseKey)) {
                    New-Item -Path $baseKey -Force -ErrorAction SilentlyContinue | Out-Null
                }

                # Para Chromium: Forzar desactivación de QUIC, DoH y usar DNS del sistema
                if ($browser.IsChromium -and (Test-Path $baseKey)) {
                    Set-ItemProperty -Path $baseKey -Name "QuicAllowed" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue | Out-Null
                    Set-ItemProperty -Path $baseKey -Name "BuiltInDnsClientEnabled" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue | Out-Null
                    Set-ItemProperty -Path $baseKey -Name "DnsOverHttpsMode" -Value "off" -Type String -Force -ErrorAction SilentlyContinue | Out-Null
                }

                # Aplicar Directivas de Seguridad de Cuentas, Perfiles e Incógnito
                if ($IdentityPolicy) {
                    $blockIncognito = [bool]$IdentityPolicy.blockIncognito
                    $blockGoogle = [bool]$IdentityPolicy.blockGoogleLogin
                    $allowedDomains = [string]$IdentityPolicy.allowedGoogleDomains

                    if ($browser.IsChromium) {
                        # 1. Modo Incógnito / InPrivate (1 = Inhabilitado, 0 = Permitido)
                        $incognitoVal = if ($blockIncognito) { 1 } else { 0 }
                        Set-ItemProperty -Path $baseKey -Name "IncognitoModeAvailability" -Value $incognitoVal -Type DWord -Force -ErrorAction SilentlyContinue | Out-Null

                        # 2. Inicios de sesión en el Perfil de Navegador y Cuentas de Google
                        if ($blockGoogle) {
                            # Deshabilita completamente el inicio de sesión en el navegador (Browser Profile Signin)
                            Set-ItemProperty -Path $baseKey -Name "BrowserSignin" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue | Out-Null
                            Set-ItemProperty -Path $baseKey -Name "SyncDisabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue | Out-Null
                            Set-ItemProperty -Path $baseKey -Name "SigninAllowed" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue | Out-Null
                        } else {
                            if ($allowedDomains -and $allowedDomains.Trim()) {
                                $cleanDomain = $allowedDomains.Trim()
                                Set-ItemProperty -Path $baseKey -Name "BrowserSignin" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue | Out-Null
                                Set-ItemProperty -Path $baseKey -Name "RestrictSigninToPattern" -Value ".*@$cleanDomain" -Type String -Force -ErrorAction SilentlyContinue | Out-Null
                                Set-ItemProperty -Path $baseKey -Name "XGoogleAllowedDomains" -Value $cleanDomain -Type String -Force -ErrorAction SilentlyContinue | Out-Null
                                Set-ItemProperty -Path $baseKey -Name "SigninAllowed" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue | Out-Null
                            } else {
                                Remove-ItemProperty -Path $baseKey -Name "BrowserSignin" -ErrorAction SilentlyContinue | Out-Null
                                Remove-ItemProperty -Path $baseKey -Name "SyncDisabled" -ErrorAction SilentlyContinue | Out-Null
                                Remove-ItemProperty -Path $baseKey -Name "SigninAllowed" -ErrorAction SilentlyContinue | Out-Null
                                Remove-ItemProperty -Path $baseKey -Name "RestrictSigninToPattern" -ErrorAction SilentlyContinue | Out-Null
                                Remove-ItemProperty -Path $baseKey -Name "XGoogleAllowedDomains" -ErrorAction SilentlyContinue | Out-Null
                            }
                        }

                        # 3. Limpieza de datos y cookies al salir
                        if ($IdentityPolicy.clearSessionOnClose) {
                            Set-ItemProperty -Path $baseKey -Name "ClearBrowsingDataOnExitList" -Value @("cookies_and_other_site_data", "cached_images_and_files") -Type MultiString -Force -ErrorAction SilentlyContinue | Out-Null
                        } else {
                            Remove-ItemProperty -Path $baseKey -Name "ClearBrowsingDataOnExitList" -ErrorAction SilentlyContinue | Out-Null
                        }
                    } else {
                        # Firefox
                        $ffPrivVal = if ($blockIncognito) { 1 } else { 0 }
                        Set-ItemProperty -Path $baseKey -Name "DisablePrivateBrowsing" -Value $ffPrivVal -Type DWord -Force -ErrorAction SilentlyContinue | Out-Null
                    }
                }

                $currBlock = Get-RegistryStringList -Path $blockKey
                $currAllow = Get-RegistryStringList -Path $allowKey

                $blockEqual = ($currBlock.Count -eq 0 -and $targetBlockList.Count -eq 0) -or 
                              (($currBlock.Count -eq $targetBlockList.Count) -and ((Compare-Object $currBlock $targetBlockList -ErrorAction SilentlyContinue).Count -eq 0))

                $allowEqual = ($currAllow.Count -eq 0 -and $targetAllowList.Count -eq 0) -or 
                              (($currAllow.Count -eq $targetAllowList.Count) -and ((Compare-Object $currAllow $targetAllowList -ErrorAction SilentlyContinue).Count -eq 0))

                if (-not ($blockEqual -and $allowEqual)) {
                    Set-RegistryStringList -Path $blockKey -Values $targetBlockList
                    Set-RegistryStringList -Path $allowKey -Values $targetAllowList
                    $policyChangedAny = $true
                }
            } catch {}
        }
    }

    # Notificar al sistema si hubo cambios
    if ($policyChangedAny) {
        try {
            $nowTicks = [string](Get-Date).Ticks
            foreach ($root in $registryRoots) {
                foreach ($b in $BrowserRegistryTargets) {
                    $rk = "$root\$($b.SubKey)"
                    if (Test-Path $rk) {
                        Set-ItemProperty -Path $rk -Name "LastPolicyUpdate" -Value $nowTicks -Force -ErrorAction SilentlyContinue | Out-Null
                    }
                }
            }

            try {
                [PolicyNotifier]::RefreshPolicyEx($false, 1) | Out-Null
                [PolicyNotifier]::RefreshPolicyEx($true, 1) | Out-Null
            } catch {}

            [PolicyNotifier]::SendMessageTimeout([IntPtr]0xffff, 0x001A, [UIntPtr]::Zero, "Policy", 2, 300, [ref][UIntPtr]::Zero) | Out-Null
            [PolicyNotifier]::SendMessageTimeout([IntPtr]0xffff, 0x001A, [UIntPtr]::Zero, "Environment", 2, 300, [ref][UIntPtr]::Zero) | Out-Null

            Flush-NetworkCaches
        } catch {}
    }
}

# --- BUCLE PRINCIPAL DE EJECUCIÓN ---

$config = Get-IniConfig -FilePath $ConfigPath
$hostname = $env:COMPUTERNAME
$localIp = Get-LocalIpv4

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host " AGENTE DE BLOQUEO WEB INSTANTANEO - UPC NETSHIELD" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host " Estacion de trabajo: $hostname" -ForegroundColor White
Write-Host " Direccion IP local:  $localIp" -ForegroundColor White
Write-Host " Servidor central:    $($config.ServerUrl)" -ForegroundColor White
Write-Host " Frecuencia de pulso: $($config.IntervaloSegundos) segundo(s)" -ForegroundColor White
Write-Host " Modo de aplicacion:  Inmediato (sin reiniciar navegadores)" -ForegroundColor Green
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

        $identityPolicy = $response.identityPolicy

        # 1. Aplicar en hosts de Windows (efecto instantáneo al navegar)
        Update-HostsFile -PolicyMode $policyMode -BlockedUrls $blockedUrls

        # 2. Gestionar reglas de Firewall (bloqueo total instantáneo en puerto 80/443)
        Update-FirewallPolicy -PolicyMode $policyMode -ServerUrl $config.ServerUrl

        # 3. Aplicar directivas de registro en HKLM, HKCU y todos los usuarios
        Apply-BrowserPolicies -PolicyMode $policyMode -BlockedUrls $blockedUrls -AllowedUrls $allowedUrls -Config $config -IdentityPolicy $identityPolicy

        # 4. Actualizar policies.json de Firefox
        Update-FirefoxPoliciesJson -PolicyMode $policyMode -BlockedUrls $blockedUrls -AllowedUrls $allowedUrls -IdentityPolicy $identityPolicy

        # 5. Cortar sockets TCP activos hacia sitios o puertos restringidos
        Sever-ActiveBrowserSockets -PolicyMode $policyMode -BlockedUrls $blockedUrls

        $currentStateKey = "$policyMode|$($blockedUrls.Count)|$($allowedUrls.Count)|$($blockedUrls -join ',')|$($allowedUrls -join ',')"
        if ($currentStateKey -ne $previousPolicyState) {
            switch ($policyMode) {
                "block_all" {
                    Write-Log "Directiva aplicada al instante: [BLOQUEAR TODO] Toda la navegacion web inhabilitada sin reiniciar navegadores." "WARN"
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
