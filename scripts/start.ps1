param(
    [Alias('NoBrowser')][switch]$NoOpen,
    [ValidateRange(1024, 65535)][int]$Port = 3220
)
. (Join-Path $PSScriptRoot 'windows-common.ps1')

try {
    New-Item -ItemType Directory -Path $hrflowData -Force | Out-Null
    $hrflowUrl = "http://127.0.0.1:$Port"
    $hrflowReuse = $null
    $hrflowExisting = Read-HrflowRecord
    if ($hrflowExisting) {
        $hrflowExistingProcess = Get-HrflowProcess ([int]$hrflowExisting.pid)
        if (Test-HrflowProcess $hrflowExistingProcess) {
            $hrflowExistingHealth = Get-HrflowHealth ([int]$hrflowExisting.port)
            if (Test-HrflowIdentity $hrflowExistingHealth ([int]$hrflowExisting.pid)) {
                $hrflowReuse = $hrflowExisting
                $Port = [int]$hrflowExisting.port
                $hrflowUrl = "http://127.0.0.1:$($hrflowExisting.port)"
            } else {
                throw 'The recorded HRFlow process is still running but its health check failed. No additional server was started. Inspect data/server-error.log.'
            }
        } else {
            Write-Host 'Discarding a stale PID record. No existing process will be stopped.'
            Remove-Item -LiteralPath $hrflowState -Force
        }
    } elseif (Test-Path -LiteralPath $hrflowState) {
        Write-Host 'Discarding an invalid PID record. No existing process will be stopped.'
        Remove-Item -LiteralPath $hrflowState -Force
    }

    if (!$hrflowReuse) {
        $hrflowExistingHealth = Get-HrflowHealth $Port
        if ($hrflowExistingHealth) {
            $hrflowExistingProcess = Get-HrflowProcess ([int]$hrflowExistingHealth.pid)
            if ((Test-HrflowProcess $hrflowExistingProcess) -and (Test-HrflowIdentity $hrflowExistingHealth ([int]$hrflowExistingProcess.ProcessId))) {
                Save-HrflowRecord ([int]$hrflowExistingProcess.ProcessId) $Port
                $hrflowReuse = Read-HrflowRecord
            } else { throw "Port $Port is occupied by another or unverifiable service. Nothing was stopped." }
        }
        if (!$hrflowReuse -and (Test-HrflowPortBusy $Port)) { throw "Port $Port is already in use. Nothing was stopped; close the occupying service or choose -Port." }
    }

    $hrflowNode = (Get-Command node -ErrorAction Stop).Source
    $hrflowNpm = (Get-Command npm.cmd -ErrorAction Stop).Source
    $hrflowNodeVersion = [string](& $hrflowNode --version)
    if ($hrflowNodeVersion -notmatch '^v(\d+)\.(\d+)\.') { throw 'Could not determine the Node.js version.' }
    $hrflowNodeMajor = [int]$Matches[1]
    $hrflowNodeMinor = [int]$Matches[2]
    if ($hrflowNodeMajor -lt 22 -or ($hrflowNodeMajor -eq 22 -and $hrflowNodeMinor -lt 13)) { throw 'Node.js 22.13 or newer is required (Node.js 24 LTS recommended).' }
    Push-Location $hrflowRoot
    try {
        $hrflowInstalled = $false
        & $hrflowNpm ls --depth=0 --json *> $null
        if ($LASTEXITCODE -ne 0) {
            if (!(Test-Path -LiteralPath (Join-Path $hrflowRoot 'package-lock.json'))) { throw 'package-lock.json is missing. Restore the supplied lockfile before installing.' }
            Write-Host 'Installing missing dependencies with npm ci. This first installation needs internet access.'
            & $hrflowNpm ci --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Check internet access and retry.' }
            $hrflowInstalled = $true
        }

        $hrflowDistIndex = Join-Path $hrflowRoot 'dist\index.html'
        $hrflowNeedsBuild = $hrflowInstalled -or !(Test-Path -LiteralPath $hrflowDistIndex -PathType Leaf)
        if (!$hrflowNeedsBuild) {
            $hrflowBuildTime = (Get-Item -LiteralPath $hrflowDistIndex).LastWriteTimeUtc
            $hrflowSourceFiles = @()
            foreach ($hrflowFolder in @('src', 'shared', 'public')) {
                if (Test-Path -LiteralPath (Join-Path $hrflowRoot $hrflowFolder) -PathType Container) {
                    $hrflowSourceFiles += Get-ChildItem -LiteralPath (Join-Path $hrflowRoot $hrflowFolder) -File -Recurse
                }
            }
            foreach ($hrflowFile in @('package.json', 'package-lock.json', 'index.html', 'tsconfig.json', 'vite.config.ts')) {
                $hrflowSourceFiles += Get-Item -LiteralPath (Join-Path $hrflowRoot $hrflowFile) -ErrorAction SilentlyContinue
            }
            $hrflowNeedsBuild = @($hrflowSourceFiles | Where-Object { $_.LastWriteTimeUtc -gt $hrflowBuildTime }).Count -gt 0
        }
        if ($hrflowNeedsBuild) {
            Write-Host 'Building HRFlow...'
            & $hrflowNpm run build
            if ($LASTEXITCODE -ne 0) { throw 'The build failed. No background server was started.' }
        }
    } finally { Pop-Location }

    if ($hrflowReuse) {
        $hrflowReuseHealth = Get-HrflowHealth $Port
        if (!(Test-HrflowIdentity $hrflowReuseHealth ([int]$hrflowReuse.pid))) { throw 'The existing server stopped during preparation. Run the shortcut again to start it.' }
        Write-Host "HRFlow is already running: $hrflowUrl"
        if (!$NoOpen) { Start-Process -FilePath $hrflowUrl }
        exit 0
    }

    $hrflowSavedPort = $env:PORT
    $hrflowSavedAppPort = $env:HRFLOW_PORT
    $hrflowSavedDataDir = $env:HRFLOW_DATA_DIR
    try {
        $env:PORT = [string]$Port
        $env:HRFLOW_PORT = [string]$Port
        $env:HRFLOW_DATA_DIR = $hrflowData
        $hrflowNewProcess = Start-Process -FilePath $hrflowNode -ArgumentList @(('"' + $hrflowIndex + '"'), ('"--hrflow-project-root=' + $hrflowRoot + '"')) -WorkingDirectory $hrflowRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $hrflowData 'server-output.log') -RedirectStandardError (Join-Path $hrflowData 'server-error.log')
    } finally {
        $env:PORT = $hrflowSavedPort
        $env:HRFLOW_PORT = $hrflowSavedAppPort
        $env:HRFLOW_DATA_DIR = $hrflowSavedDataDir
    }
    Save-HrflowRecord $hrflowNewProcess.Id $Port
    for ($hrflowTry = 0; $hrflowTry -lt 40; $hrflowTry++) {
        Start-Sleep -Milliseconds 250
        $hrflowNewProcess.Refresh()
        if ($hrflowNewProcess.HasExited) {
            Remove-Item -LiteralPath $hrflowState -Force
            throw 'HRFlow exited during startup. Inspect data/server-error.log.'
        }
        $hrflowHealth = Get-HrflowHealth $Port
        if (Test-HrflowIdentity $hrflowHealth $hrflowNewProcess.Id) {
            Write-Host "HRFlow ready: $hrflowUrl"
            Write-Host 'Use the stop shortcut to stop this project only.'
            if (!$NoOpen) { Start-Process -FilePath $hrflowUrl }
            exit 0
        }
    }
    throw 'HRFlow did not pass its health check. The PID record was retained for inspection; see data/server-error.log.'
} catch {
    Write-Host ("HRFlow startup failed: " + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
