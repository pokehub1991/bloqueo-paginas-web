$WshShell = New-Object -ComObject WScript.Shell
$directories = [System.Collections.Generic.List[string]]::new()

$commonDesktop = [Environment]::GetFolderPath('CommonDesktopDirectory')
if ($commonDesktop -and (Test-Path $commonDesktop)) { $directories.Add($commonDesktop) }

$commonStartMenu = [Environment]::GetFolderPath('CommonStartMenu')
if ($commonStartMenu -and (Test-Path $commonStartMenu)) { 
    $directories.Add($commonStartMenu) 
    $directories.Add("$commonStartMenu\Programs")
}

$programDataStart = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs"
if (Test-Path $programDataStart) { $directories.Add($programDataStart) }

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
$unpatchedCount = 0

foreach ($dir in ($directories | Select-Object -Unique)) {
    if (Test-Path $dir) {
        $shortcuts = Get-ChildItem -Path $dir -Filter '*.lnk' -Recurse -ErrorAction SilentlyContinue
        foreach ($scItem in $shortcuts) {
            try {
                $sc = $WshShell.CreateShortcut($scItem.FullName)
                $targetName = [System.IO.Path]::GetFileName($sc.TargetPath).ToLower()
                if ($targetBrowsers -contains $targetName) {
                    $args = $sc.Arguments
                    if ($args -and ($args -like '*--load-extension*')) {
                        $cleanArgs = ($args -replace '--load-extension="[^"]+"\s*', '') -replace '--load-extension=[^\s]+\s*', ''
                        $sc.Arguments = $cleanArgs.Trim()
                        $sc.Save()
                        $unpatchedCount++
                    }
                }
            } catch {
                # Ignorar accesos directos protegidos por el sistema
            }
        }
    }
}

Write-Host "Accesos directos restaurados: $unpatchedCount" -ForegroundColor Green
