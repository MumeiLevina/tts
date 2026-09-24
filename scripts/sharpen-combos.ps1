Add-Type -AssemblyName System.Drawing

$src = "C:\Users\hantu\.gemini\antigravity-ide\brain\f7eb44b9-5a41-4c4e-bb49-499424246ba2\.user_uploaded\media_1790006631275.png"
$img = [System.Drawing.Bitmap]::FromFile($src)

$outDir = "c:\Users\hantu\thoitrang\public\combos"

# Define crop regions from the source 768x1024 image
# Top row: 3 combos (X=0, 256, 512; W=256, H=512)
# Bottom row: 2 combos (X=0, 384; W=384, H=512)
$crops = @(
    @{ Name = "combo-1.jpg"; X = 0;   Y = 0;   W = 256; H = 512; Scale = 2 },
    @{ Name = "combo-2.jpg"; X = 256; Y = 0;   W = 256; H = 512; Scale = 2 },
    @{ Name = "combo-3.jpg"; X = 512; Y = 0;   W = 256; H = 512; Scale = 2 },
    @{ Name = "combo-4.jpg"; X = 0;   Y = 512; W = 384; H = 512; Scale = 2 },
    @{ Name = "combo-5.jpg"; X = 384; Y = 512; W = 384; H = 512; Scale = 2 }
)

# JPEG Encoder with Quality = 100
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]100)

function Sharpen-Bitmap([System.Drawing.Bitmap]$source) {
    # High-quality unsharp mask convolution kernel
    # [  0, -0.75,  0 ]
    # [ -0.75, 4.0, -0.75 ]
    # [  0, -0.75,  0 ]
    $width = $source.Width
    $height = $source.Height
    $result = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    $rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $srcData = $source.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $dstData = $result.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    $bytes = $width * $height * 4
    $srcBytes = New-Object byte[] $bytes
    $dstBytes = New-Object byte[] $bytes

    [System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $srcBytes, 0, $bytes)

    $stride = $srcData.Stride

    # Apply convolution
    $wCenter = 3.6
    $wEdge = -0.65

    for ($y = 1; $y -lt ($height - 1); $y++) {
        for ($x = 1; $x -lt ($width - 1); $x++) {
            $idx = ($y * $stride) + ($x * 4)

            for ($c = 0; $c -lt 3; $c++) { # B, G, R
                $center = [double]$srcBytes[$idx + $c]
                $top    = [double]$srcBytes[(($y - 1) * $stride) + ($x * 4) + $c]
                $bottom = [double]$srcBytes[(($y + 1) * $stride) + ($x * 4) + $c]
                $left   = [double]$srcBytes[($y * $stride) + (($x - 1) * 4) + $c]
                $right  = [double]$srcBytes[($y * $stride) + (($x + 1) * 4) + $c]

                $val = ($center * $wCenter) + (($top + $bottom + $left + $right) * $wEdge)
                if ($val -lt 0) { $val = 0 }
                if ($val -gt 255) { $val = 255 }

                $dstBytes[$idx + $c] = [byte]$val
            }
            $dstBytes[$idx + 3] = 255 # Alpha
        }
    }

    [System.Runtime.InteropServices.Marshal]::Copy($dstBytes, 0, $dstData.Scan0, $bytes)
    $source.UnlockBits($srcData)
    $result.UnlockBits($dstData)

    return $result
}

foreach ($c in $crops) {
    $rect = New-Object System.Drawing.Rectangle($c.X, $c.Y, $c.W, $c.H)
    $cropBmp = $img.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    # 2x High-Quality Bicubic Upscale
    $targetW = $c.W * $c.Scale
    $targetH = $c.H * $c.Scale
    $scaledBmp = New-Object System.Drawing.Bitmap($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    $g = [System.Drawing.Graphics]::FromImage($scaledBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $destRect = New-Object System.Drawing.Rectangle(0, 0, $targetW, $targetH)
    $g.DrawImage($cropBmp, $destRect, 0, 0, $c.W, $c.H, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $cropBmp.Dispose()

    # Apply sharpening to make details crisp
    $sharpBmp = Sharpen-Bitmap -source $scaledBmp
    $scaledBmp.Dispose()

    # Save with 100% Quality JPEG
    $dest = Join-Path $outDir $c.Name
    $sharpBmp.Save($dest, $jpegCodec, $encoderParams)
    $sharpBmp.Dispose()

    Write-Host "Processed and sharpened: $($c.Name) (${targetW}x${targetH})"
}

$img.Dispose()
Write-Host "All combo images sharpened successfully."
