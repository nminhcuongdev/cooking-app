<#
.SYNOPSIS
  Tạo ảnh minh họa cho các món ăn bằng Codex CLI (chạy trên Windows).

.DESCRIPTION
  Với mỗi món trong tools/image_prompts.json:
    1. Ghi mô tả ảnh ra images/raw/<id>.prompt.txt (UTF-8, tránh lỗi tiếng Việt khi truyền tham số).
    2. Gọi "codex exec" để tạo ảnh và lưu vào images/raw/<id>.png.
    3. Thu nhỏ ảnh về 800x800 rồi lưu JPEG vào images/<id>.jpg (dùng System.Drawing có sẵn trên Windows).
  Món nào đã có images/<id>.jpg thì bỏ qua (trừ khi dùng -Force). Kết quả ghi ở images/gen-log.txt.

.EXAMPLE
  # Chạy thử 2 món trước để xem Codex có tạo ảnh đúng chỗ không
  powershell -ExecutionPolicy Bypass -File tools\gen_images.ps1 -Limit 2

.EXAMPLE
  # Tạo các món còn thiếu, chọn model cụ thể
  powershell -ExecutionPolicy Bypass -File tools\gen_images.ps1 -Model gpt-5-codex-mini

.EXAMPLE
  # Làm lại một vài món
  powershell -ExecutionPolicy Bypass -File tools\gen_images.ps1 -Only canh-chua-ca-loc,bo-luc-lac -Force
#>
param(
  [string]$Model = "",            # Để trống = model mặc định của Codex. Gõ /model trong codex để xem danh sách.
  [string]$Effort = "low",        # Mức suy luận của model: low | medium | high (low là đủ cho việc tạo ảnh)
  [string]$Quality = "medium",    # Chất lượng ảnh yêu cầu: low | medium | high
  [int]$Limit = 0,                # Chỉ tạo tối đa N ảnh (0 = tất cả)
  [string[]]$Only = @(),          # Chỉ tạo các món có id trong danh sách
  [switch]$Force,                 # Tạo lại kể cả khi đã có ảnh
  [int]$Size = 800,               # Kích thước ảnh JPEG cuối cùng (px)
  [int]$JpegQuality = 82
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Write-Host "Không tìm thấy lệnh 'codex'. Cài bằng: npm install -g @openai/codex  rồi chạy: codex login" -ForegroundColor Red
  exit 1
}

Add-Type -AssemblyName System.Drawing
$Utf8 = New-Object System.Text.UTF8Encoding($false)
$RawDir = Join-Path $Root "images\raw"
$OutDir = Join-Path $Root "images"
New-Item -ItemType Directory -Force -Path $RawDir | Out-Null
$Log = Join-Path $OutDir "gen-log.txt"

function Save-Jpeg([string]$src, [string]$dst) {
  $img = [System.Drawing.Image]::FromFile($src)
  try {
    # Cắt vuông ở giữa rồi thu nhỏ
    $side = [Math]::Min($img.Width, $img.Height)
    $sx = [int](($img.Width - $side) / 2); $sy = [int](($img.Height - $side) / 2)
    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $Size, $Size), (New-Object System.Drawing.Rectangle $sx, $sy, $side, $side), [System.Drawing.GraphicsUnit]::Pixel)
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $params = New-Object System.Drawing.Imaging.EncoderParameters 1
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$JpegQuality)
    $bmp.Save($dst, $codec, $params)
    $g.Dispose(); $bmp.Dispose()
  } finally { $img.Dispose() }
}

$items = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "tools\image_prompts.json") | ConvertFrom-Json
if ($Only.Count -gt 0) { $items = $items | Where-Object { $Only -contains $_.id } }

$done = 0; $ok = 0; $fail = 0
foreach ($it in $items) {
  if ($Limit -gt 0 -and $done -ge $Limit) { break }
  $jpg = Join-Path $OutDir "$($it.id).jpg"
  $png = Join-Path $RawDir "$($it.id).png"
  if ((Test-Path $jpg) -and -not $Force) { continue }
  $done++

  $brief = @"
$($it.prompt)

Image size: 1024x1024. Image quality: $Quality.
"@
  $briefFile = Join-Path $RawDir "$($it.id).prompt.txt"
  [System.IO.File]::WriteAllText($briefFile, $brief, $Utf8)
  if (Test-Path $png) { Remove-Item $png -Force }

  # Lời dặn cho Codex chỉ dùng ký tự ASCII; mô tả tiếng Việt nằm trong file .prompt.txt.
  $instruction = "Generate ONE image from the brief in the file images/raw/$($it.id).prompt.txt (read it first; it is UTF-8). " +
                 "Use your image generation tool. Save the final image as PNG to exactly this path: images/raw/$($it.id).png . " +
                 "Do not create, edit or delete any other file. When the PNG is saved, reply DONE."

  $cargs = @("exec", "--full-auto", "--skip-git-repo-check", "-c", "model_reasoning_effort=$Effort")
  if ($Model) { $cargs += @("-m", $Model) }
  $cargs += $instruction

  Write-Host ("[{0}] {1} ..." -f $done, $it.title) -ForegroundColor Cyan
  $t0 = Get-Date
  & codex @cargs 2>&1 | Out-File -Append -Encoding utf8 (Join-Path $RawDir "$($it.id).codex.log")
  $sec = [int]((Get-Date) - $t0).TotalSeconds

  if (Test-Path $png) {
    try {
      Save-Jpeg $png $jpg
      $kb = [int]((Get-Item $jpg).Length / 1KB)
      Write-Host ("    OK  {0}s  -> images\{1}.jpg ({2} KB)" -f $sec, $it.id, $kb) -ForegroundColor Green
      Add-Content -Encoding utf8 $Log ("OK   {0}  {1}s  {2} KB" -f $it.id, $sec, $kb)
      $ok++
    } catch {
      Write-Host "    LỖI khi chuyển sang JPEG: $_" -ForegroundColor Red
      Add-Content -Encoding utf8 $Log ("FAIL {0}  convert: {1}" -f $it.id, $_)
      $fail++
    }
  } else {
    Write-Host ("    KHÔNG thấy images\raw\{0}.png sau {1}s. Xem log: images\raw\{0}.codex.log" -f $it.id, $sec) -ForegroundColor Yellow
    Add-Content -Encoding utf8 $Log ("FAIL {0}  no png after {1}s" -f $it.id, $sec)
    $fail++
  }
}

$total = (Get-ChildItem $OutDir -Filter *.jpg).Count
Write-Host ""
Write-Host ("Xong: {0} thành công, {1} lỗi. Hiện có {2}/{3} món có ảnh trong thư mục images\." -f $ok, $fail, $total, (Get-Content -Raw -Encoding UTF8 (Join-Path $Root "tools\image_prompts.json") | ConvertFrom-Json).Count)
if ($ok -gt 0) {
  Write-Host "Tiếp theo: git add images/*.jpg ; git commit -m 'Add dish images' ; git push" -ForegroundColor Cyan
}
