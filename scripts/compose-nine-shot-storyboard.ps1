param(
    [Parameter(Mandatory = $true)]
    [ValidateCount(9, 9)]
    [string[]]$Sources,

    [Parameter(Mandatory = $true)]
    [string]$OutputDir,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-zA-Z0-9_-]+$')]
    [string]$Prefix,

    [ValidateRange(320, 3840)]
    [int]$CellWidth = 960,

    [ValidateRange(134, 1607)]
    [int]$CellHeight = 402,

    [ValidateRange(0, 64)]
    [int]$Gap = 8
)

$ErrorActionPreference = 'Stop'

if ($Sources.Count -ne 9) {
    throw "Exactly 9 source images are required; received $($Sources.Count)."
}

foreach ($source in $Sources) {
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Missing source image: $source"
    }
}

Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

function Draw-ImageFit {
    param(
        [Parameter(Mandatory = $true)]
        [System.Drawing.Graphics]$Graphics,

        [Parameter(Mandatory = $true)]
        [System.Drawing.Image]$Image,

        [Parameter(Mandatory = $true)]
        [int]$X,

        [Parameter(Mandatory = $true)]
        [int]$Y,

        [Parameter(Mandatory = $true)]
        [int]$Width,

        [Parameter(Mandatory = $true)]
        [int]$Height
    )

    $scale = [Math]::Min(
        $Width / [double]$Image.Width,
        $Height / [double]$Image.Height
    )
    $drawWidth = [Math]::Max(1, [int][Math]::Round($Image.Width * $scale))
    $drawHeight = [Math]::Max(1, [int][Math]::Round($Image.Height * $scale))
    $drawX = $X + [int][Math]::Floor(($Width - $drawWidth) / 2)
    $drawY = $Y + [int][Math]::Floor(($Height - $drawHeight) / 2)
    $Graphics.DrawImage($Image, $drawX, $drawY, $drawWidth, $drawHeight)
}

$loaded = New-Object System.Collections.Generic.List[System.Drawing.Image]
try {
    for ($i = 0; $i -lt 9; $i++) {
        try {
            $image = [System.Drawing.Image]::FromFile($Sources[$i])
            if ($image.Width -lt 1 -or $image.Height -lt 1) {
                throw "Unreadable image dimensions."
            }
            $loaded.Add($image)
        }
        catch {
            throw "Unable to read source image $($Sources[$i]): $($_.Exception.Message)"
        }

        $destination = Join-Path $OutputDir ('{0}_shot{1:D2}.png' -f $Prefix, ($i + 1))
        Copy-Item -LiteralPath $Sources[$i] -Destination $destination -Force
    }

    for ($group = 0; $group -lt 3; $group++) {
        $triptychWidth = $CellWidth * 2
        $triptychCellHeight = [int][Math]::Round($triptychWidth / 2.39)
        $triptychHeight = ($triptychCellHeight * 3) + ($Gap * 2)
        $triptych = New-Object System.Drawing.Bitmap($triptychWidth, $triptychHeight)
        $graphics = [System.Drawing.Graphics]::FromImage($triptych)
        try {
            $graphics.Clear([System.Drawing.Color]::Black)
            $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

            for ($slot = 0; $slot -lt 3; $slot++) {
                $index = ($group * 3) + $slot
                $y = $slot * ($triptychCellHeight + $Gap)
                Draw-ImageFit -Graphics $graphics -Image $loaded[$index] -X 0 -Y $y -Width $triptychWidth -Height $triptychCellHeight
            }

            $triptychPath = Join-Path $OutputDir ('{0}_triptych_{1}.png' -f $Prefix, ($group + 1))
            $triptych.Save($triptychPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $graphics.Dispose()
            $triptych.Dispose()
        }
    }

    $sheetWidth = ($CellWidth * 3) + ($Gap * 2)
    $sheetHeight = ($CellHeight * 3) + ($Gap * 2)
    $sheet = New-Object System.Drawing.Bitmap($sheetWidth, $sheetHeight)
    $sheetGraphics = [System.Drawing.Graphics]::FromImage($sheet)
    try {
        $sheetGraphics.Clear([System.Drawing.Color]::Black)
        $sheetGraphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $sheetGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $sheetGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $sheetGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

        for ($i = 0; $i -lt 9; $i++) {
            $column = $i % 3
            $row = [int][Math]::Floor($i / 3)
            $x = $column * ($CellWidth + $Gap)
            $y = $row * ($CellHeight + $Gap)
            Draw-ImageFit -Graphics $sheetGraphics -Image $loaded[$i] -X $x -Y $y -Width $CellWidth -Height $CellHeight
        }

        $sheetPath = Join-Path $OutputDir ('{0}_3x3_contact_sheet.png' -f $Prefix)
        $sheet.Save($sheetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $sheetGraphics.Dispose()
        $sheet.Dispose()
    }
}
finally {
    foreach ($image in $loaded) {
        $image.Dispose()
    }
}

$resultFiles = Get-ChildItem -LiteralPath $OutputDir -File |
    Where-Object { $_.Name -like "$Prefix*" } |
    Sort-Object Name

[pscustomobject]@{
    SourceCount = 9
    ShotCount = @($resultFiles | Where-Object { $_.Name -match '_shot\d{2}\.png$' }).Count
    TriptychCount = @($resultFiles | Where-Object { $_.Name -match '_triptych_\d\.png$' }).Count
    ContactSheet = Join-Path $OutputDir ($Prefix + '_3x3_contact_sheet.png')
    ContactWidth = $sheetWidth
    ContactHeight = $sheetHeight
}
