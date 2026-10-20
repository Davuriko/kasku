# Membuat ikon PNG Kasku (192 & 512) dengan GDI+ — desain sama seperti icon.svg
Add-Type -AssemblyName System.Drawing

function New-Icon([int]$S, [string]$Path) {
  $bmp = New-Object System.Drawing.Bitmap($S, $S)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

  $c1 = [System.Drawing.Color]::FromArgb(255, 63, 195, 168)   # #3fc3a8
  $c2 = [System.Drawing.Color]::FromArgb(255, 15, 107, 92)    # #0f6b5c
  $white = [System.Drawing.Color]::White

  # Latar: rounded square dengan gradasi
  $rad = [int]($S * 0.22)
  $bg = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $rad * 2
  $bg.AddArc(0, 0, $d, $d, 180, 90)
  $bg.AddArc($S - $d, 0, $d, $d, 270, 90)
  $bg.AddArc($S - $d, $S - $d, $d, $d, 0, 90)
  $bg.AddArc(0, $S - $d, $d, $d, 90, 90)
  $bg.CloseFigure()
  $rect = New-Object System.Drawing.Rectangle(0, 0, $S, $S)
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45)
  $g.FillPath($grad, $bg)

  # Dompet
  $wx = $S * 0.2266; $wy = $S * 0.3086; $ww = $S * 0.5469; $wh = $S * 0.3828
  $wr = $S * 0.0586; $wd = $wr * 2
  $strokeW = [float]($S * 0.039)
  $wp = New-Object System.Drawing.Drawing2D.GraphicsPath
  $wp.AddArc($wx, $wy, $wd, $wd, 180, 90)
  $wp.AddArc($wx + $ww - $wd, $wy, $wd, $wd, 270, 90)
  $wp.AddArc($wx + $ww - $wd, $wy + $wh - $wd, $wd, $wd, 0, 90)
  $wp.AddArc($wx, $wy + $wh - $wd, $wd, $wd, 90, 90)
  $wp.CloseFigure()
  $fill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(51, 13, 27, 29))
  $g.FillPath($fill, $wp)
  $penW = New-Object System.Drawing.Pen($white, $strokeW)
  $g.DrawPath($penW, $wp)

  # Garis pembatas atas dompet
  $ly = $S * 0.4141
  $penL = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(128, 255, 255, 255), $strokeW)
  $g.DrawLine($penL, [float]$wx, [float]$ly, [float]($wx + $ww), [float]$ly)

  # Koin
  $cx = $S * 0.6484; $cy = $S * 0.5859; $cr = $S * 0.0586; $ir = $S * 0.0234
  $brW = New-Object System.Drawing.SolidBrush($white)
  $g.FillEllipse($brW, [float]($cx - $cr), [float]($cy - $cr), [float]($cr * 2), [float]($cr * 2))
  $brT = New-Object System.Drawing.SolidBrush($c2)
  $g.FillEllipse($brT, [float]($cx - $ir), [float]($cy - $ir), [float]($ir * 2), [float]($ir * 2))

  $g.Dispose()
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "Saved $Path"
}

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
New-Icon 192 (Join-Path $dir 'icon-192.png')
New-Icon 512 (Join-Path $dir 'icon-512.png')
