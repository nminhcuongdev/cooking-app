<#
.SYNOPSIS
  Tạo ảnh minh họa cho các món ăn bằng Codex CLI (chạy trên Windows), nhiều ảnh song song.

.DESCRIPTION
  Với mỗi món trong tools/image_prompts.json:
    1. Ghi mô tả ảnh ra images/raw/<id>.prompt.txt (UTF-8, tránh lỗi tiếng Việt khi truyền tham số).
    2. Gọi "codex exec" để tạo ảnh và lưu vào images/raw/<id>.png. Chạy tối đa -Parallel lượt cùng lúc.
    3. Thu nhỏ ảnh về 800x800 rồi lưu JPEG vào images/<id>.jpg (dùng System.Drawing có sẵn trên Windows).
  Món nào đã có images/<id>.jpg thì bỏ qua (trừ khi dùng -Force). Kết quả ghi ở images/gen-log.txt.

.EXAMPLE
  # Chạy thử 2 món
  powershell -ExecutionPolicy Bypass -File tools\gen_images.ps1 -Limit 2 -Model gpt-6-luna

.EXAMPLE
  # Tạo tất cả món còn thiếu, 6 ảnh cùng lúc
  powershell -ExecutionPolicy Bypass -File tools\gen_images.ps1 -Model gpt-6-luna -Parallel 6

.EXAMPLE
  # Làm lại một vài món
  powershell -ExecutionPolicy Bypass -File tools\gen_images.ps1 -Model gpt-6-luna -Only canh-chua-ca-loc,bo-luc-lac -Force
#>
param(
  [string]$Model = "",            # Để trống = model mặc định của Codex.
  [string]$Effort = "low",        # Mức suy luận: low | medium | high
  [string]$Quality = "medium",    # Chất lượng ảnh yêu cầu: low | medium | high
  [int]$Parallel = 4,             # Số ảnh tạo cùng lúc. Bị báo rate limit thì giảm xuống.
  [int]$Limit = 0,                # Chỉ tạo tối đa N ảnh (0 = tất cả)
  [string[]]$Only = @(),          # Chỉ tạo các món có id trong danh sách
  [switch]$Force,                 # Tạo lại kể cả khi đã có ảnh
  [int]$Size = 800,               # Kích thước ảnh JPEG cuối cùng (px)
  [int]$JpegQuality = 82,
  [int]$TimeoutMin = 15,          # Quá thời gian này mà chưa xong thì dừng lượt đó
  # Cờ cho "codex exec". Bản Codex mới đã bỏ --full-auto; mặc định chỉ cho phép ghi file trong thư mục repo.
  [string[]]$CodexFlags = @("--sandbox", "workspace-write", "--skip-git-repo-check")
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

# Dùng codex.cmd (bản shim của npm) để chạy được nhiều tiến trình song song bằng Start-Process.
$CodexCmd = Get-Command codex.cmd -ErrorAction SilentlyContinue
if (-not $CodexCmd) { $CodexCmd = Get-Command codex -ErrorAction SilentlyContinue }
if (-not $CodexCmd) {
  Write-Host "Không tìm thấy lệnh 'codex'. Cài bằng: npm install -g @openai/codex  rồi chạy: codex login" -ForegroundColor Red
  exit 1
}
$CodexExe = $CodexCmd.Source

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

function Quote([string]$a) {
  if ($a -match '[\s"]') { return '"' + ($a -replace '"', '\"') + '"' }
  return $a
}

function Start-Dish($it) {
  $png = Join-Path $RawDir "$($it.id).png"
  $brief = "$($it.prompt)`r`n`r`nImage size: 1024x1024. Image quality: $Quality."
  [System.IO.File]::WriteAllText((Join-Path $RawDir "$($it.id).prompt.txt"), $brief, $Utf8)
  if (Test-Path $png) { Remove-Item $png -Force }

  # Lời dặn cho Codex chỉ dùng ký tự ASCII; mô tả tiếng Việt nằm trong file .prompt.txt.
  $instruction = "Generate ONE image from the brief in the file images/raw/$($it.id).prompt.txt (read it first; it is UTF-8). " +
                 "Use your image generation tool. Save the final image as PNG to exactly this path: images/raw/$($it.id).png . " +
                 "Do not create, edit or delete any other file. When the PNG is saved, reply DONE."
  $cargs = @("exec") + $CodexFlags + @("-c", "model_reasoning_effort=$Effort")
  if ($Model) { $cargs += @("-m", $Model) }
  $cargs += $instruction

  $out = Join-Path $RawDir "$($it.id).codex.log"
  $err = Join-Path $RawDir "$($it.id).codex.err.log"
  $p = Start-Process -FilePath $CodexExe -ArgumentList (($cargs | ForEach-Object { Quote $_ }) -join " ") `
        -WorkingDirectory $Root -NoNewWindow -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
  $null = $p.Handle   # giữ handle để đọc được ExitCode sau khi tiến trình kết thúc
  return [pscustomobject]@{ Item = $it; Proc = $p; Start = Get-Date; Out = $out; Err = $err; Png = $png }
}

function Read-Logs($job) {
  $a = Get-Content -Raw -Encoding UTF8 $job.Out -ErrorAction SilentlyContinue
  $b = Get-Content -Raw -Encoding UTF8 $job.Err -ErrorAction SilentlyContinue
  return "$a`n$b"
}

$all = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "tools\image_prompts.json") | ConvertFrom-Json
$items = $all
if ($Only.Count -gt 0) { $items = $items | Where-Object { $Only -contains $_.id } }
$queue = New-Object System.Collections.Queue
foreach ($it in $items) {
  if ((Test-Path (Join-Path $OutDir "$($it.id).jpg")) -and -not $Force) { continue }
  if ($Limit -gt 0 -and $queue.Count -ge $Limit) { break }
  $queue.Enqueue($it)
}
$total = $queue.Count
if ($total -eq 0) { Write-Host "Tất cả món đã có ảnh. Dùng -Force để tạo lại." -ForegroundColor Green; exit 0 }
Write-Host ("Cần tạo {0} ảnh, chạy {1} lượt song song." -f $total, $Parallel) -ForegroundColor Cyan

$running = New-Object System.Collections.ArrayList
$ok = 0; $fail = 0; $finished = 0; $stop = $false
$tStart = Get-Date

while ($queue.Count -gt 0 -or $running.Count -gt 0) {
  while (-not $stop -and $queue.Count -gt 0 -and $running.Count -lt $Parallel) {
    $job = Start-Dish $queue.Dequeue()
    [void]$running.Add($job)
    Write-Host ("  > Bắt đầu: {0}" -f $job.Item.title)
  }
  if ($stop) { $queue.Clear() }

  Start-Sleep -Seconds 2
  foreach ($job in @($running)) {
    $p = $job.Proc
    $sec = [int]((Get-Date) - $job.Start).TotalSeconds
    if (-not $p.HasExited) {
      if ($sec -gt $TimeoutMin * 60) { try { $p.Kill() } catch {} } else { continue }
    }
    $running.Remove($job)
    $finished++
    $it = $job.Item
    $code = $p.ExitCode
    $jpg = Join-Path $OutDir "$($it.id).jpg"
    $logText = Read-Logs $job

    if ($code -ne 0 -and $logText -match "unexpected argument|unrecognized|invalid value|model .*not (found|supported)|does not exist") {
      Write-Host ("  x {0}: Codex từ chối câu lệnh (mã thoát {1}). Dừng tạo thêm. Trích log:" -f $it.title, $code) -ForegroundColor Red
      ($logText -split "`n" | Select-String -Pattern "error|unexpected|invalid|model" | Select-Object -First 5) | ForEach-Object { Write-Host "      $_" -ForegroundColor Red }
      Add-Content -Encoding utf8 $Log ("FAIL {0}  codex rejected command" -f $it.id)
      $fail++; $stop = $true; continue
    }
    if ($logText -match "rate limit|429|Too Many Requests") {
      Write-Host "  ! Bị giới hạn tốc độ (rate limit). Nên chạy lại với -Parallel nhỏ hơn." -ForegroundColor Yellow
    }

    if (Test-Path $job.Png) {
      try {
        Save-Jpeg $job.Png $jpg
        $kb = [int]((Get-Item $jpg).Length / 1KB)
        Write-Host ("  OK [{0}/{1}] {2}  {3}s, {4} KB" -f $finished, $total, $it.title, $sec, $kb) -ForegroundColor Green
        Add-Content -Encoding utf8 $Log ("OK   {0}  {1}s  {2} KB" -f $it.id, $sec, $kb)
        $ok++
      } catch {
        Write-Host ("  x [{0}/{1}] {2}: lỗi chuyển JPEG: {3}" -f $finished, $total, $it.title, $_) -ForegroundColor Red
        Add-Content -Encoding utf8 $Log ("FAIL {0}  convert: {1}" -f $it.id, $_)
        $fail++
      }
    } else {
      Write-Host ("  x [{0}/{1}] {2}: không thấy PNG sau {3}s (mã thoát {4}). Log: images\raw\{5}.codex.log" -f $finished, $total, $it.title, $sec, $code, $it.id) -ForegroundColor Yellow
      Add-Content -Encoding utf8 $Log ("FAIL {0}  no png after {1}s, exit {2}" -f $it.id, $sec, $code)
      $fail++
    }
  }
}

$mins = [Math]::Round(((Get-Date) - $tStart).TotalMinutes, 1)
$have = (Get-ChildItem $OutDir -Filter *.jpg).Count
Write-Host ""
Write-Host ("Xong sau {0} phút: {1} thành công, {2} lỗi. Hiện có {3}/{4} món có ảnh." -f $mins, $ok, $fail, $have, $all.Count)
if ($fail -gt 0) { Write-Host "Chạy lại đúng lệnh vừa rồi để thử lại các món lỗi." -ForegroundColor Yellow }
if ($ok -gt 0) { Write-Host "Tiếp theo: git pull ; git add images/*.jpg ; git commit -m 'Add dish images' ; git push" -ForegroundColor Cyan }
