#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CliPath = Join-Path -Path $ScriptDir -ChildPath "../dist/cli.js"

if (-not (Test-Path $CliPath)) {
    Write-Error "dist/cli.js not found. Please run 'npm run build' first."
    exit 1
}

# Invoke Node with CLI and forward all arguments
# PowerShell splatting doesn't work directly with native executables the same way.
# We use & to invoke node.
# Arguments: Pass directly.
& node "$CliPath" $args
