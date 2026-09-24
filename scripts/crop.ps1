Add-Type -AssemblyName System.Drawing

$src = "C:\Users\hantu\.gemini\antigravity-ide\brain\f7eb44b9-5a41-4c4e-bb49-499424246ba2\.user_uploaded\media_1790006631275.png"
$img = [System.Drawing.Image]::FromFile($src)
Write-Host "Width: $($img.Width), Height: $($img.Height)"
$img.Dispose()
