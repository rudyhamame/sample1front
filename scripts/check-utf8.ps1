param(
  [string]$Root = "src"
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$targetRoot = Join-Path $repoRoot $Root
if (-not (Test-Path $targetRoot)) {
  Write-Error "Path not found: $targetRoot"
  exit 1
}

$extensions = @('*.js','*.jsx','*.ts','*.tsx','*.css','*.scss','*.html','*.json','*.md')
$files = foreach ($pattern in $extensions) {
  Get-ChildItem -Path $targetRoot -Recurse -File -Filter $pattern -ErrorAction SilentlyContinue
}

$mojibakePattern = 'Ø|Ù|Ã|â|\uFFFD'
$issues = @()

foreach ($file in $files | Sort-Object FullName -Unique) {
  try {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
  }
  catch {
    $issues += [pscustomobject]@{ File = $file.FullName; Issue = 'Unreadable as UTF-8' }
    continue
  }

  if ($content -match $mojibakePattern) {
    $issues += [pscustomobject]@{ File = $file.FullName; Issue = 'Possible mojibake sequence found' }
  }
}

if ($issues.Count -gt 0) {
  $issues | Format-Table -AutoSize
  exit 1
}

Write-Host "UTF-8 check passed for $($files.Count) files under $Root"
