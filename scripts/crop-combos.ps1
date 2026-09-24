Add-Type -AssemblyName System.Drawing

$src = "C:\Users\hantu\.gemini\antigravity-ide\brain\f7eb44b9-5a41-4c4e-bb49-499424246ba2\.user_uploaded\media_1790006631275.png"
$img = [System.Drawing.Bitmap]::FromFile($src)

$outDir = "c:\Users\hantu\thoitrang\public\combos"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

# Top row has 3 columns (Combo 1, Combo 2, Combo 3) from Y=0 to Y=512
# Bottom row has 2 columns (Combo 4, Combo 5) from Y=512 to Y=1024

$crops = @(
    @{ Name = "combo-1.jpg"; X = 0;   Y = 0;   W = 256; H = 512 },
    @{ Name = "combo-2.jpg"; X = 256; Y = 0;   W = 256; H = 512 },
    @{ Name = "combo-3.jpg"; X = 512; Y = 0;   W = 256; H = 512 },
    @{ Name = "combo-4.jpg"; X = 0;   Y = 512; W = 384; H = 512 },
    @{ Name = "combo-5.jpg"; X = 384; Y = 512; W = 384; H = 512 }
)

foreach ($c in $crops) {
    $rect = New-Object System.Drawing.Rectangle($c.X, $c.Y, $c.W, $c.H)
    $cropped = $img.Clone($rect, $img.PixelFormat)
    $dest = Join-Path $outDir $c.Name
    $cropped.Save($dest, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $cropped.Dispose()
    Write-Host "Saved $($c.Name)"
}

$img.Dispose()
