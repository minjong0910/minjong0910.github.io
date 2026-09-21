# PDF 를 쪽마다 PNG 로 — 윈도우 내장 PDF 렌더러(Windows.Data.Pdf)를 쓴다 (파이썬·poppler 없이)
#   powershell -NoProfile -File 도구\PDF_쪽그림.ps1 -Pdf <pdf> -OutDir <폴더> [-Width 900]
#   ※ PowerShell 7(pwsh)이 아니라 Windows PowerShell 5.1(powershell.exe)로 돌려야 WinRT 를 쓸 수 있다.
param([string]$Pdf, [string]$OutDir, [int]$Width = 900)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$m = [System.WindowsRuntimeSystemExtensions].GetMethods()
$asOp  = ($m | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
$asAct = ($m | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' })[0]
function Await($op, [type]$t){ $task = $asOp.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }
function AwaitAct($act){ $task = $asAct.Invoke($null, @($act)); $task.Wait(-1) | Out-Null }

[Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.StorageFolder, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType=WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfPageRenderOptions, Windows.Data.Pdf, ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType=WindowsRuntime] | Out-Null

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Resolve-Path $Pdf).Path)) ([Windows.Storage.StorageFile])
$doc  = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
$dir  = Await ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync((Resolve-Path $OutDir).Path)) ([Windows.Storage.StorageFolder])
for($i = 0; $i -lt $doc.PageCount; $i++){
  $page = $doc.GetPage($i)
  $name = 'p{0:D2}.png' -f ($i + 1)
  $out  = Await ($dir.CreateFileAsync($name, [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])
  $st   = Await ($out.OpenAsync([Windows.Storage.FileAccessMode]::ReadWrite)) ([Windows.Storage.Streams.IRandomAccessStream])
  $opt  = New-Object Windows.Data.Pdf.PdfPageRenderOptions
  $opt.DestinationWidth = $Width
  AwaitAct ($page.RenderToStreamAsync($st, $opt))
  $st.Dispose(); $page.Dispose()
}
Write-Host ("{0} 쪽 -> {1}" -f $doc.PageCount, $OutDir)
