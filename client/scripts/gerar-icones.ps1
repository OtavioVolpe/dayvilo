# Gera os PNGs a partir da mesma geometria do D em public/favicon.svg.
# Executar manualmente no Windows quando a marca mudar; não faz parte do build.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$destino = Join-Path $PSScriptRoot '../public/icons'
New-Item -ItemType Directory -Force -Path $destino | Out-Null
$formatos = @(
    @{ Nome = 'icon-192.png'; Tamanho = 192; Escala = 1.0 },
    @{ Nome = 'icon-512.png'; Tamanho = 512; Escala = 1.0 },
    @{ Nome = 'icon-maskable-512.png'; Tamanho = 512; Escala = 0.8 },
    @{ Nome = 'apple-touch-icon.png'; Tamanho = 180; Escala = 1.0 }
)
foreach ($formato in $formatos) {
    $bitmap = [System.Drawing.Bitmap]::new($formato.Tamanho, $formato.Tamanho)
    $grafico = [System.Drawing.Graphics]::FromImage($bitmap)
    $traco = [System.Drawing.Pen]::new([System.Drawing.Color]::White, 3)
    $ponto = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#bbdcc6'))
    $contorno = [System.Drawing.Drawing2D.GraphicsPath]::new()
    try {
        $grafico.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $grafico.Clear([System.Drawing.ColorTranslator]::FromHtml('#286348'))
        $unidade = $formato.Tamanho / 32.0
        $margem = $formato.Tamanho * (1 - $formato.Escala) / 2
        $grafico.TranslateTransform($margem, $margem)
        $grafico.ScaleTransform($unidade * $formato.Escala, $unidade * $formato.Escala)
        $contorno.AddLine(10, 8, 15, 8)
        $contorno.AddArc(7, 8, 16, 16, -90, 180)
        $contorno.AddLine(15, 24, 10, 24)
        $contorno.CloseFigure()
        $grafico.DrawPath($traco, $contorno)
        $grafico.FillEllipse($ponto, 18, 5, 6, 6)
        $bitmap.Save((Join-Path $destino $formato.Nome), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $contorno.Dispose()
        $ponto.Dispose()
        $traco.Dispose()
        $grafico.Dispose()
        $bitmap.Dispose()
    }
}
