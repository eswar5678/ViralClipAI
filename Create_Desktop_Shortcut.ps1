$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "ViralClip AI.lnk"
$TargetPath = "D:\folder\ClipperTool\dist\ViralClipAI\ViralClipAI.exe"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = "D:\folder\ClipperTool"
$Shortcut.Description = "ViralClip AI - Opus Video Clipper & YouTube Auto-Poster"
$Shortcut.Save()

Write-Host "✅ Desktop shortcut created successfully at: $ShortcutPath"
