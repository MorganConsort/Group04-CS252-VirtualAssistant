$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$pathlyNode = Get-Command node -ErrorAction SilentlyContinue
$pathlyBundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if ($pathlyNode) { $pathlyNodePath = $pathlyNode.Source }
elseif (Test-Path -LiteralPath $pathlyBundledNode) { $pathlyNodePath = $pathlyBundledNode }
else { throw 'Node.js is required. Install Node.js 24 LTS, then run npm install in this folder.' }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js'))) {
    throw 'Dependencies are missing. Run npm install or pnpm install in the ui folder first.'
}
& $pathlyNodePath (Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js') --host 127.0.0.1 --port 5173
