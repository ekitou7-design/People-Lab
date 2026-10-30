. (Join-Path $PSScriptRoot 'windows-common.ps1')

try {
    $hrflowRecord = Read-HrflowRecord
    if (!$hrflowRecord) {
        if (Test-Path -LiteralPath $hrflowState) {
            Remove-Item -LiteralPath $hrflowState -Force
            Write-Host 'Removed an invalid PID record. No process was stopped.'
        } else { Write-Host 'No managed HRFlow server is recorded.' }
        exit 0
    }
    $hrflowTarget = Get-HrflowProcess ([int]$hrflowRecord.pid)
    if (!$hrflowTarget) {
        Remove-Item -LiteralPath $hrflowState -Force
        Write-Host 'HRFlow is already stopped. Removed its stale PID record.'
        exit 0
    }
    if (!(Test-HrflowProcess $hrflowTarget)) {
        Remove-Item -LiteralPath $hrflowState -Force
        Write-Host 'The recorded PID now belongs to another process. It was left untouched; the stale record was removed.'
        exit 0
    }
    $hrflowHealth = Get-HrflowHealth ([int]$hrflowRecord.port)
    if (!(Test-HrflowIdentity $hrflowHealth ([int]$hrflowRecord.pid))) {
        throw 'The health endpoint could not confirm this process and project. Nothing was stopped. Inspect the PID record and logs manually.'
    }
    # Re-check immediately before stopping, including process creation time, to guard against a recycled PID.
    $hrflowVerifiedTarget = Get-HrflowProcess ([int]$hrflowRecord.pid)
    if (!(Test-HrflowProcess $hrflowVerifiedTarget) -or $hrflowVerifiedTarget.CreationDate -ne $hrflowTarget.CreationDate) {
        throw 'The process changed during verification. Nothing was stopped.'
    }
    Stop-Process -Id ([int]$hrflowRecord.pid) -ErrorAction Stop
    Wait-Process -Id ([int]$hrflowRecord.pid) -Timeout 5 -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $hrflowState -Force
    Write-Host 'HRFlow stopped. Your local business data was retained.'
} catch {
    Write-Host ("HRFlow stop failed: " + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
