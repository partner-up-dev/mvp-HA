$ErrorActionPreference = 'Stop'

$gitOpenSslBin = 'C:\Program Files\Git\usr\bin'
if (Test-Path -LiteralPath (Join-Path $gitOpenSslBin 'openssl.exe')) {
  $env:Path = "$gitOpenSslBin;$env:Path"
}

& portless @args
exit $LASTEXITCODE
