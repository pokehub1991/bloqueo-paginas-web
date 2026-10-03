param(
    [string]$ExtensionDir
)

# Si no se pasó parámetro, usar el directorio del script
if (-not $ExtensionDir) {
    $ExtensionDir = $PSScriptRoot
}

# Normalizar ruta sin barra final
$ExtensionDir = $ExtensionDir.TrimEnd('\').TrimEnd('/')

Write-Host "Directorio de extension a inyectar: $ExtensionDir" -ForegroundColor Cyan

$WshShell = New-Object -ComObject WScript.Shell
$directories = [System.Collections.Generic.List[string]]::new()

# Directorios de accesos directos para todos los usuarios (Public / AllUsers)
$commonDesktop = [Environment]::GetFolderPath('CommonDesktopDirectory')
if ($commonDesktop -and (Test-Path $commonDesktop)) { $directories.Add($commonDesktop) }

$commonStartMenu = [Environment]::GetFolderPath('CommonStartMenu')
if ($commonStartMenu -and (Test-Path $commonStartMenu)) { 
    $directories.Add($commonStartMenu) 
    $directories.Add("$commonStartMenu\Programs")
}

$programDataStart = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs"
if (Test-Path $programDataStart) { $directories.Add($programDataStart) }

# Escanear los perfiles de usuario en C:\Users para alcanzar el Escritorio y Menu Inicio de cada alumno
$systemUsers = @('All Users', 'Default', 'Default User', 'Public')
if (Test-Path "C:\Users") {
    $userDirs = Get-ChildItem -Path "C:\Users" -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -notin $systemUsers }
    foreach ($u in $userDirs) {
        $uDesk = "$($u.FullName)\Desktop"
        if (Test-Path $uDesk) { $directories.Add($uDesk) }

        $uStart = "$($u.FullName)\AppData\Roaming\Microsoft\Windows\Start Menu\Programs"
        if (Test-Path $uStart) { $directories.Add($uStart) }

        $uTaskbar = "$($u.FullName)\AppData\Roaming\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar"
        if (Test-Path $uTaskbar) { $directories.Add($uTaskbar) }
    }
}

$targetBrowsers = @('chrome.exe', 'msedge.exe', 'brave.exe', 'opera.exe')
$patchedCount = 0

foreach ($dir in ($directories | Select-Object -Unique)) {
    if (Test-Path $dir) {
        $shortcuts = Get-ChildItem -Path $dir -Filter '*.lnk' -Recurse -ErrorAction SilentlyContinue
        foreach ($scItem in $shortcuts) {
            try {
                $sc = $WshShell.CreateShortcut($scItem.FullName)
                $targetName = [System.IO.Path]::GetFileName($sc.TargetPath).ToLower()
                if ($targetBrowsers -contains $targetName) {
                    $args = $sc.Arguments
                    if (-not $args) { $args = "" }

                    # Limpiar argumentos anteriores de extension
                    $cleanArgs = ($args -replace '--load-extension="[^"]+"\s*', '') -replace '--load-extension=[^\s]+\s*', ''
                    $cleanArgs = $cleanArgs.Trim()

                    # Inyectar el argumento apuntando a la carpeta de la extension
                    $newArgs = "--load-extension=`"$ExtensionDir`" $cleanArgs".Trim()
                    $sc.Arguments = $newArgs
                    $sc.Save()
                    $patchedCount++
                }
            } catch {
                # Ignorar accesos directos protegidos por el sistema
            }
        }
    }
}

Write-Host "Accesos directos actualizados exitosamente: $patchedCount" -ForegroundColor Green
