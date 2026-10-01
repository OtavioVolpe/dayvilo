param(
  [string]$Mysqldump = 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqldump.exe'
)

$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$pasta = Join-Path (Split-Path $repo -Parent) 'dayvilo-backups'
$identificador = [guid]::NewGuid().ToString('N')
$nome = 'dayvilo-local-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + $identificador
$configuracao = Join-Path $pasta ($identificador + '.cnf')
$parcial = Join-Path $pasta ($nome + '.sql.partial')
$destino = Join-Path $pasta ($nome + '.sql')

if (!(Test-Path -LiteralPath $Mysqldump -PathType Leaf)) { throw 'Informe o caminho do mysqldump com -Mysqldump.' }
New-Item -ItemType Directory -Path $pasta -Force | Out-Null
Push-Location $repo
try {
  # Node carrega o .env sem imprimir credenciais. O arquivo temporário é removido no finally.
  @'
import {writeFileSync} from 'node:fs';
const env = process.env;
if (!['127.0.0.1', 'localhost', '::1'].includes(env.MYSQL_HOST) || env.MYSQL_DATABASE !== 'dayvilo') {
  throw new Error('Este script aceita somente o banco local dayvilo.');
}
const escapar = s => '"' + String(s).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n').replaceAll('\r', '\\r') + '"';
const campos = {host: env.MYSQL_HOST, port: env.MYSQL_PORT || 3306, user: env.MYSQL_USER, password: env.MYSQL_PASSWORD};
if (!campos.user || !campos.password) throw new Error('Configuração local incompleta.');
writeFileSync(process.argv[2], '[client]\n' + Object.entries(campos).map(([k,v]) => k + '=' + escapar(v)).join('\n') + '\n', {flag: 'wx', mode: 0o600});
'@ | node --env-file-if-exists=server/.env --input-type=module - $configuracao
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar a conexão local.' }

  & $Mysqldump "--defaults-extra-file=$configuracao" --single-transaction --quick --skip-lock-tables --no-tablespaces --set-gtid-purged=OFF --column-statistics=0 --hex-blob --skip-add-drop-table --default-character-set=utf8mb4 "--result-file=$parcial" dayvilo
  if ($LASTEXITCODE -ne 0) { throw 'O backup falhou. O arquivo .partial não deve ser usado.' }
  if ((Get-Item -LiteralPath $parcial).Length -eq 0) { throw 'O backup ficou vazio.' }

  Move-Item -LiteralPath $parcial -Destination $destino
  $hash = (Get-FileHash -LiteralPath $destino -Algorithm SHA256).Hash
  Set-Content -LiteralPath ($destino + '.sha256') -Value $hash -Encoding ascii
  Write-Output "Backup criado: $destino"
  Write-Output 'Guarde em local privado. A restauração ainda precisa ser testada.'
} finally {
  if (Test-Path -LiteralPath $configuracao) { Remove-Item -LiteralPath $configuracao -Force }
  Pop-Location
}
