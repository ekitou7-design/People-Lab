$ErrorActionPreference = 'Stop'
$hrflowRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$hrflowData = Join-Path $hrflowRoot 'data'
$hrflowIndex = Join-Path $hrflowRoot 'server\index.mjs'
$hrflowState = Join-Path $hrflowData 'server-process.json'

function Get-HrflowHealth([int]$ServicePort) {
    try {
        return Invoke-RestMethod -Uri "http://127.0.0.1:$ServicePort/api/health" -TimeoutSec 2
    } catch { return $null }
}

function Get-HrflowProcess([int]$ProcessNumber) {
    if ($ProcessNumber -le 0) { return $null }
    return Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessNumber" -ErrorAction SilentlyContinue
}

function Test-HrflowProcess($ProcessInfo) {
    if (!$ProcessInfo -or $ProcessInfo.Name -ine 'node.exe' -or !$ProcessInfo.CommandLine) { return $false }
    return ([string]$ProcessInfo.CommandLine).IndexOf($hrflowIndex, [StringComparison]::OrdinalIgnoreCase) -ge 0
}

function Test-HrflowIdentity($Health, [int]$ProcessNumber) {
    if (!$Health -or $Health.app -ne 'hrflow-demo' -or $Health.status -ne 'ok') { return $false }
    if ([string]$Health.pid -ne [string]$ProcessNumber) { return $false }
    if (!$Health.projectRoot) { return $false }
    return [string]::Equals(([System.IO.Path]::GetFullPath([string]$Health.projectRoot)).TrimEnd('\'), $hrflowRoot, [StringComparison]::OrdinalIgnoreCase)
}

function Read-HrflowRecord {
    if (!(Test-Path -LiteralPath $hrflowState -PathType Leaf)) { return $null }
    try {
        # Windows PowerShell 5 defaults to ANSI for BOM-less files; project paths may contain Unicode.
        $hrflowRecord = Get-Content -LiteralPath $hrflowState -Raw -Encoding UTF8 | ConvertFrom-Json
        if (![string]::Equals([string]$hrflowRecord.projectRoot, $hrflowRoot, [StringComparison]::OrdinalIgnoreCase)) { return $null }
        if (![string]::Equals([string]$hrflowRecord.indexPath, $hrflowIndex, [StringComparison]::OrdinalIgnoreCase)) { return $null }
        if ([int]$hrflowRecord.pid -le 0 -or [int]$hrflowRecord.port -le 0) { return $null }
        return $hrflowRecord
    } catch { return $null }
}

function Save-HrflowRecord([int]$ProcessNumber, [int]$ServicePort) {
    $hrflowRecord = [ordered]@{
        pid = $ProcessNumber
        port = $ServicePort
        projectRoot = $hrflowRoot
        indexPath = $hrflowIndex
        recordedAt = [DateTime]::UtcNow.ToString('o')
    }
    [IO.File]::WriteAllText($hrflowState, ($hrflowRecord | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
}

function Test-HrflowPortBusy([int]$ServicePort) {
    $hrflowSocket = New-Object Net.Sockets.TcpClient
    try {
        $hrflowConnection = $hrflowSocket.ConnectAsync('127.0.0.1', $ServicePort)
        if (!$hrflowConnection.Wait(800)) { return $false }
        return $hrflowSocket.Connected
    } catch { return $false }
    finally { $hrflowSocket.Dispose() }
}
