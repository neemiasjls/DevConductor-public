// Verificações próprias da varredura (plugins/seguranca/skills/varredura-seguranca/scripts/verificacoes-proprias.mjs).
// Cada regra tem um caso que acusa e um parecido que NÃO acusa; no fim, roda sobre a cópia montada da prova.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
// A prova fica fora da cópia pública do kit: sem a pasta, o teste que a usa é pulado.
const temProva = fs.existsSync(path.resolve('pilotos/prova-seguranca/montar.mjs'))
const { montar } = temProva ? await import('../../pilotos/prova-seguranca/montar.mjs') : {}

const script = path.resolve('plugins/seguranca/skills/varredura-seguranca/scripts/verificacoes-proprias.mjs')
const { verificar } = await import(pathToFileURL(script).href)
const CAMPOS = ['tipo', 'categoria', 'gravidade', 'arquivo', 'linha', 'explicacao', 'correcao']

// Cria uma pasta temporária com os arquivos dados e devolve os achados.
function rodar(arquivos, opcoes) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'verif-'))
  try {
    for (const [rel, texto] of Object.entries(arquivos)) {
      fs.mkdirSync(path.dirname(path.join(pasta, rel)), { recursive: true })
      fs.writeFileSync(path.join(pasta, rel), texto)
    }
    const t0 = performance.now()
    try { return verificar(pasta, opcoes) } finally { ultimoMs = performance.now() - t0 }
  } finally { fs.rmSync(pasta, { recursive: true, force: true }) }
}
let ultimoMs = 0 // tempo só da verificação da última chamada de rodar (sem criar e apagar a pasta)
const cats = (achados, cat) => achados.filter((a) => a.categoria === cat)

// [nome, categoria, arquivos que acusam, arquivos parecidos que não acusam]
const CASOS = [
  ['SQL C# FromSqlRaw com $"', 'injecao-sql',
    { 'a.cs': 'db.X.FromSqlRaw($"select * from x where n = {nome}");' },
    { 'a.cs': 'db.X.FromSqlInterpolated($"select * from x where n = {nome}");' }],
  ['SQL C# NpgsqlCommand com +', 'injecao-sql',
    { 'a.cs': 'var c = new NpgsqlCommand("select * from x where n = \'" + nome + "\'", con);' },
    { 'a.cs': 'var c = new NpgsqlCommand("select * from x where n = @n", con);' }],
  ['SQL JS query com crase e ${', 'injecao-sql',
    { 'a.ts': 'await db.query(`select * from x where id = ${id}`)' },
    { 'a.ts': 'await db.query(`select * from x where id = $1`, [id])' }],
  ['SQL Python execute com f"', 'injecao-sql',
    { 'a.py': 'cur.execute(f"select * from x where id = {id}")' },
    { 'a.py': 'cur.execute("select * from x where id = %s", (id,))' }],
  ['SQL Python execute com %', 'injecao-sql',
    { 'a.py': 'cur.execute("select * from x where id = %s" % id)' },
    { 'a.py': 'cur.execute("select * from x where id = %(id)s", {"id": id})' }],
  ['policy using (true)', 'regra-do-banco-aberta',
    { 'm/1.sql': 'create policy "p" on t\n  for select using (true);' },
    { 'm/1.sql': 'create policy "p" on t\n  for select using (dono = current_user);' }],
  ['tabela sem RLS em projeto com auth.uid()', 'regra-do-banco-aberta',
    { 'm/1.sql': 'create table public.a (id int);\nalter table public.a enable row level security;\ncreate policy "p" on a for select using (id = auth.uid());\ncreate table public.b (id int);' },
    { 'm/1.sql': 'create table public.a (id int);\nalter table public.a enable row level security;\ncreate policy "p" on a for select using (id = auth.uid());' }],
  ['tabela sem RLS só conta com Supabase/auth.uid()', 'regra-do-banco-aberta',
    { 'supabase/migrations/1.sql': 'create table public.b (id int);' },
    { 'm/1.sql': 'create table public.b (id int);' }],
  ['Password= na string de conexão', 'segredo-no-codigo',
    { 'appsettings.json': '{ "ConnectionStrings": { "P": "Host=x;Username=u;Password=Abc123xyz!" } }' },
    { 'appsettings.json': '{ "ConnectionStrings": { "P": "Host=x;Username=u;Password=${DB_SENHA}" } }' }],
  ['chave secret/key/token com 16+ caracteres', 'segredo-no-codigo',
    { 'appsettings.Production.json': '{ "Jwt": { "Key": "abcdefghijklmnopqrstu" } }' },
    { 'appsettings.json': '{ "Jwt": { "Issuer": "api-de-pedidos-exemplo" }, "KeysDirectory": "/var/lib/app/chaves-de-protecao", "KeyVault": "https://cofre.exemplo.invalid/segredos", "PublicKey": "abcdefghijklmnopqrstu" }' }],
  ['chave curta terminada em Key ou Password', 'segredo-no-codigo',
    { 'appsettings.json': '{ "Jwt": { "Key": "curta" } }' },
    { 'appsettings.json': '{ "Jwt": { "Key": "", "Issuer": "pedidos" }, "Smtp": { "Password": "${SMTP_SENHA}" }, "SortKey": "nome", "CacheKeyPrefix": "app" }' }],
  ['senha curta em configuração', 'segredo-no-codigo',
    { 'appsettings.json': '{ "Smtp": { "Password": "abc" } }' },
    { 'appsettings.json': '{ "Smtp": { "Password": "<definir em user-secrets>", "PasswordLength": "12" } }' }],
  ['upload sem checar extensão e tamanho', 'envio-de-arquivo-sem-validacao',
    { 'a.cs': 'app.MapPost("/up", async (IFormFile f) =>\n{\n  var d = Path.Combine("up", f.FileName);\n  await using var s = File.Create(d);\n});' },
    { 'a.cs': 'app.MapPost("/up", async (IFormFile f) =>\n{\n  if (f.Length > 1000000) return;\n  if (Path.GetExtension(f.FileName) != ".pdf") return;\n  var d = Path.Combine("up", f.FileName);\n});' }],
  ['dado sensível no log', 'dado-pessoal-em-log',
    { 'a.cs': 'log.LogInformation("Login {Email} senha {Senha}", u.Email, entrada.Senha);' },
    { 'a.cs': 'log.LogInformation("Login de {Email}", u.Email);' }],
  ['token no console do navegador', 'dado-pessoal-em-log',
    { 'a.ts': 'console.log("sessao", token)' },
    { 'a.ts': 'console.log("Token expirado, entre de novo")' }],
  ['página de erro de desenvolvimento fora do if', 'erro-detalhado',
    { 'Program.cs': 'var app = builder.Build();\napp.UseDeveloperExceptionPage();' },
    { 'Program.cs': 'var app = builder.Build();\nif (app.Environment.IsDevelopment())\n{\n    app.UseDeveloperExceptionPage();\n}' }],
  ['StackTrace devolvido ao usuário', 'erro-detalhado',
    { 'a.cs': 'catch (Exception ex) { return Results.Problem(ex.StackTrace); }' },
    { 'a.cs': 'catch (Exception ex) { log.LogError(ex, "falhou"); return Results.Problem("Erro interno"); }' }],
  ['segredo com valor padrão em C#', 'segredo-no-codigo',
    { 'a.cs': 'var k = Environment.GetEnvironmentVariable("JWT_KEY") ?? "dev-secret";' },
    { 'a.cs': 'var k = Environment.GetEnvironmentVariable("JWT_KEY") ?? throw new Exception("falta");\nvar u = Environment.GetEnvironmentVariable("API_URL") ?? "http://localhost";' }],
  ['segredo com valor padrão em JS', 'segredo-no-codigo',
    { 'a.js': "const s = process.env.SESSION_SECRET || 'troque-isto'" },
    { 'a.js': "const s = process.env.SESSION_SECRET\nconst p = process.env.PORT || '3000'" }],
  ['segredo com valor padrão em Python', 'segredo-no-codigo',
    { 'a.py': "k = os.environ.get('API_TOKEN', 'abc123')" },
    { 'a.py': "k = os.environ.get('API_TOKEN')\nh = os.getenv('HOST', 'localhost')" }],
  ['token no localStorage', 'token-exposto-ao-script',
    { 'a.ts': "localStorage.setItem('token', t)" },
    { 'a.ts': "localStorage.setItem('tema', 'escuro')\nlet token = t" }],
  ['cookie de token sem HttpOnly', 'token-exposto-ao-script',
    { 'a.cs': 'Response.Cookies.Append("jwt", t, new CookieOptions { HttpOnly = false });' },
    { 'a.cs': 'Response.Cookies.Append("jwt", t, new CookieOptions { HttpOnly = true, Secure = true });' }],
  ['login sem limite de tentativas', 'entrada-sem-limite',
    { 'a.cs': 'app.MapPost("/login", (Entrada e) => Results.Ok()).AllowAnonymous();' },
    { 'a.cs': 'builder.Services.AddRateLimiter(o => {});\napp.MapPost("/login", (Entrada e) => Results.Ok()).RequireRateLimiting("login");' }],
  ['login Node: ter o express-rate-limit instalado não basta, tem de estar na rota', 'entrada-sem-limite',
    { 'a.js': "const rateLimit = require('express-rate-limit')\napp.post('/login', entrar)", 'package.json': '{ "dependencies": { "express-rate-limit": "7.0.0" } }' },
    { 'a.js': "const limiter = rateLimit({ max: 5 })\napp.post('/login', limiter, entrar)\napp.get('/login', pagina)\nconst r = await api.post('/login', dados)" }],
  ['login Node: limitador global em app.use vale', 'entrada-sem-limite',
    { 'a.js': "app.use(express.json({ limit: '1mb' }))\napp.post('/login', entrar)" },
    { 'a.js': "app.use(limiter)\napp.post('/login', entrar)" }],
  ['login .NET: AddRateLimiter sem aplicar na rota não protege', 'entrada-sem-limite',
    { 'a.cs': 'builder.Services.AddRateLimiter(o => {});\napp.UseRateLimiter();\napp.MapPost("/login", (Entrada e) => Results.Ok());' },
    { 'a.cs': 'builder.Services.AddRateLimiter(o => { o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(c => Fixo(c)); });\napp.UseRateLimiter();\napp.MapPost("/login", (Entrada e) => Results.Ok());\napp.MapGet("/login", () => Results.Content(html));' }],
  ['login .NET: limite só em comentário não protege', 'entrada-sem-limite',
    { 'a.cs': 'app.MapPost("/login", (Entrada e) => Results.Ok())\n  // .RequireRateLimiting("login")\n  .AllowAnonymous();' },
    { 'a.cs': 'app.MapPost("/login", (Entrada e) => Results.Ok())\n  .RequireRateLimiting("login")\n  .AllowAnonymous();' }],
  ['ação Login de controller; com [Authorize] não é a porta de entrada', 'entrada-sem-limite',
    { 'C.cs': '[HttpPost("login")]\npublic async Task<IActionResult> Login(Entrada e) => Ok();' },
    { 'C.cs': '[Authorize]\n[HttpPost("login")]\npublic async Task<IActionResult> Login(Entrada e) => Ok();\nvar x = await HttpContext.SignInAsync(p);' }],
  ['[DisableRequestSizeLimit]', 'entrada-sem-limite',
    { 'a.cs': '[DisableRequestSizeLimit]\npublic IActionResult Enviar() => Ok();' },
    { 'a.cs': '[RequestSizeLimit(1000000)]\npublic IActionResult Enviar() => Ok();' }],
  ['rota sem RequireAuthorization ao lado de rotas protegidas', 'sem-autorizacao',
    { 'a.cs': 'app.MapGet("/a", () => 1).RequireAuthorization();\napp.MapDelete("/b/{id}", (int id) => 2);' },
    { 'a.cs': 'app.MapGet("/a", () => 1).RequireAuthorization();\napp.MapGet("/saude", () => 2).AllowAnonymous();' }],
  ['controller sem [Authorize] com vizinhos que têm', 'sem-autorizacao',
    { 'C/AController.cs': '[Authorize]\npublic class AController : ControllerBase {}', 'C/BController.cs': 'public class BController : ControllerBase {}' },
    { 'C/AController.cs': '[Authorize]\npublic class AController : ControllerBase {}', 'C/BController.cs': '[AllowAnonymous]\npublic class BController : ControllerBase {}' }],
  ['FallbackPolicy = null não conta como proteção', 'sem-autorizacao',
    { 'a.cs': 'o.FallbackPolicy = null;\napp.MapGet("/a", () => 1).RequireAuthorization();\napp.MapDelete("/b", Apagar);' },
    { 'a.cs': 'o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();\napp.MapGet("/a", () => 1).RequireAuthorization();\napp.MapDelete("/b", Apagar);' }],
  ['rota única que apaga, em projeto que usa autorização', 'sem-autorizacao',
    { 'Program.cs': 'builder.Services.AddAuthorization();\napp.UseAuthorization();', 'Rotas.cs': 'app.MapDelete("/pedidos/{id}", Apagar);' },
    { 'Program.cs': 'builder.Services.AddAuthorization();', 'Rotas.cs': 'app.MapPost("/login", Entrar);\napp.MapGet("/pedidos", Listar);\napp.MapPost("/webhook/pagamento", Receber).AllowAnonymous();', 'Outro.cs': 'app.MapDelete("/x/{id}", [Authorize] (int id) => 1);' }],
  ['rota única que grava só é acusada se o projeto usa autorização (comentário não conta)', 'sem-autorizacao',
    { 'Program.cs': 'app.UseAuthorization();', 'Rotas.cs': 'app.MapPost("/pedidos", Criar);' },
    { 'Program.cs': '// app.UseAuthorization();', 'Rotas.cs': 'app.MapPost("/pedidos", Criar);' }],
  ['RLS ligado só em comentário não conta', 'regra-do-banco-aberta',
    { 'm/1.sql': 'create table public.a (id int);\n-- alter table public.a enable row level security;\ncreate policy "p" on a for select using (id = auth.uid());' },
    { 'm/1.sql': 'create table public.a (id int);\nalter table public.a enable row level security; -- ligado\ncreate policy "p" on a for select using (id = auth.uid());' }],
  ['RLS desligado', 'regra-do-banco-aberta',
    { 'm/1.sql': 'alter table public.pedidos disable row level security;' },
    { 'm/1.sql': '-- alter table public.pedidos disable row level security;\n/* alter table x disable row level security; */\nalter table public.pedidos enable row level security;' }],
  ['RLS ligado em arquivo de outra pasta vale', 'regra-do-banco-aberta',
    { 'supabase/migrations/1.sql': 'create table public.b (id int);', 'supabase/politicas/2.sql': 'alter table public.c enable row level security;' },
    { 'supabase/migrations/1.sql': 'create table public.b (id int);', 'supabase/politicas/2.sql': 'alter table public.b enable row level security;' }],
  ['SQL JS com texto + valor; f"SELECT 1" sem valor não é montagem', 'injecao-sql',
    { 'a.js': 'db.query("select * from x where id=" + req.query.id)' },
    { 'a.js': 'db.query("select * from x where id = $1", [req.query.id])', 'b.py': 'cur.execute(f"SELECT 1")\ncur.execute(f"""\n  select 1\n""")' }],
  ['SQL Python f""" em várias linhas', 'injecao-sql',
    { 'a.py': 'cur.execute(f"""\n  select * from x where id = {id}\n""")' },
    { 'a.py': 'cur.execute("""\n  select * from x where id = %s\n""", (id,))' }],
  ['log em várias linhas; nome que fala do dado não é o dado', 'dado-pessoal-em-log',
    { 'a.js': 'console.log(\n  "sessao",\n  token\n)' },
    { 'a.js': 'console.log("expirou", tokenExpired)\nconsole.log(`total ${tokens.length}`)\nconsole.log(\n  "Token expirado"\n)' }],
  ['contagem de tokens de uso (outputTokens, total_tokens) não é credencial; lista de tokens é', 'dado-pessoal-em-log',
    { 'a.js': 'console.log("sessoes", authTokens)' },
    { 'a.js': 'console.log(`saida: ${uso.outputTokens}`, r.total_tokens)', 'b.py': "print(f\"{u['input_tokens']:>5}\")" }],
  ['Serilog Log.Information', 'dado-pessoal-em-log',
    { 'a.cs': 'Log.Information("Senha {Senha}", entrada.Senha);' },
    { 'a.cs': 'Log.Information("Login de {Email}", u.Email);' }],
  ['logger.info em Python', 'dado-pessoal-em-log',
    { 'a.py': 'logger.info("token %s", token)' },
    { 'a.py': 'logger.info("token recebido")\n# logger.info(token)' }],
  ['mensagem interna do erro devolvida', 'erro-detalhado',
    { 'a.cs': 'catch (Exception ex) { return Results.Problem(ex.Message); }' },
    { 'a.cs': 'catch (Exception ex)\n{\n  log.LogError(ex, ex.Message);\n  return Results.Problem("Erro interno");\n}' }],
  ['página de erro: bloco if IsDevelopment com linhas no meio é seguro; if negado não é', 'erro-detalhado',
    { 'Program.cs': 'if (!app.Environment.IsDevelopment())\n{\n    app.UseSwagger();\n    app.UseDeveloperExceptionPage();\n}' },
    { 'Program.cs': 'if (app.Environment.IsDevelopment())\n{\n    app.UseSwagger();\n    app.UseSwaggerUI();\n    if (x) { y(); }\n    app.MapOpenApi();\n    app.UseDeveloperExceptionPage();\n}' }],
  ['segredo com valor padrão em GetValue<string>(nome, padrão)', 'segredo-no-codigo',
    { 'a.cs': 'var k = config.GetValue<string>("JWT_KEY", "dev-secret");' },
    { 'a.cs': 'var i = config["Jwt:Issuer"] ?? "pedidos";\nvar p = config.GetValue<string>("CACHE_KEY_PREFIX", "app:");', 'a.js': "const p = process.env.CACHE_KEY_PREFIX || 'app:'" }],
  ['segredo com valor padrão em config["…"] ?? "…"', 'segredo-no-codigo',
    { 'a.cs': 'var k = builder.Configuration["Jwt:Key"] ?? "dev-secret";' },
    { 'a.cs': 'var k = builder.Configuration["Jwt:Key"] ?? throw new Exception("falta");' }],
  ['token em localStorage por propriedade', 'token-exposto-ao-script',
    { 'a.ts': 'localStorage.token = jwt' },
    { 'a.ts': "localStorage.setItem('authorFilter', nome)\nlocalStorage.tema = 'escuro'\nif (localStorage.token == null) sair()" }],
]

for (const [nome, cat, acusa, naoAcusa] of CASOS) {
  test(`regra: ${nome}`, () => {
    const sim = cats(rodar(acusa), cat)
    assert.ok(sim.length >= 1, `devia acusar ${cat}`)
    for (const a of sim) for (const c of CAMPOS) assert.ok(c in a, `campo ${c}`)
    assert.deepEqual(cats(rodar(naoAcusa), cat), [], 'caso parecido não pode ser acusado')
  })
}

const loginSemLimite = (arquivos) => cats(rodar(arquivos), 'entrada-sem-limite').map((a) => a.arquivo)

test('login Node: limitador em outra instância, em outro arquivo, depois da rota ou em outro caminho não protege', () => {
  assert.deepEqual(loginSemLimite({ 'admin.js': 'admin.use(rateLimiter)', 'login.js': 'app.post("/login", entrar)' }), ['login.js'], 'caso do revisor')
  assert.deepEqual(loginSemLimite({ 'admin.js': 'router.use(limiter)', 'login.js': 'router.post("/login", entrar)' }), ['login.js'], 'mesmo nome em outro arquivo não é o mesmo objeto')
  assert.deepEqual(loginSemLimite({ 'a.js': 'const admin = express()\nadmin.use(limiter)\napp.post("/login", entrar)' }), ['a.js'], 'outra instância no mesmo arquivo')
  assert.deepEqual(loginSemLimite({ 'a.js': 'app.post("/login", entrar)\napp.use(limiter)' }), ['a.js'], 'limitador aplicado depois da rota')
  assert.deepEqual(loginSemLimite({ 'a.js': 'app.use("/admin", limiter)\napp.post("/login", entrar)' }), ['a.js'], 'limitador só em outro caminho')
  assert.deepEqual(loginSemLimite({ 'a.js': 'app.use("/log", limiter)\napp.post("/login", entrar)' }), ['a.js'], 'caminho parecido não cobre')
  assert.deepEqual(loginSemLimite({ 'a.js': 'app.post("/login", entrar)\nconst limiter = rateLimit({ max: 5 })\nadmin.post("/x", limiter, h)' }), ['a.js'], 'limitador na chamada de baixo não é argumento desta rota')
  // Limitador nos argumentos da própria rota, em várias linhas ou em chamada encadeada: protege.
  assert.deepEqual(loginSemLimite({ 'a.js': 'app.post("/login",\n  loginLimiter,\n  validar(esquema),\n  entrar)\nrouter.route("/entrar")\n  .get(pagina)\n  .post(limiter, entrar)' }), [])
  // Mesmo objeto, antes da rota, sem caminho ou com caminho que cobre o dela: protege.
  assert.deepEqual(loginSemLimite({ 'a.js': 'app.use("/api", limiter)\napp.post("/api/login", entrar)\nrouter.use(apiLimiter)\nrouter.post("/login", entrar)' }), [])
  assert.deepEqual(loginSemLimite({ 'a.js': 'this.app.use(rateLimit({ max: 5 }))\nthis.app.post("/login", entrar)\napp.use("/", slowDown())\napp.put("/entrar", entrar)' }), [])
})

test('login Node: roteador montado em outro arquivo só fica protegido quando dá para ligar o limitador a ele', () => {
  const rota = 'const router = express.Router()\nrouter.post("/login", entrar)\nmodule.exports = router'
  const app = (meio) => `const auth = require('./rotas/auth')\n${meio}`
  // Ligação segura: o arquivo importa o roteador exportado e aplica o limitador no mesmo objeto antes de montar (ou na montagem).
  assert.deepEqual(loginSemLimite({ 'app.js': app("app.use(limiter)\napp.use('/auth', auth)"), 'rotas/auth.js': rota }), [])
  assert.deepEqual(loginSemLimite({ 'app.js': app("app.use('/api', limiter)\napp.use('/api/auth', cors(), auth)"), 'rotas/auth.js': rota }), [])
  assert.deepEqual(loginSemLimite({ 'src/app.ts': "import authRouter from './auth.js'\napp.use('/auth', loginLimiter, authRouter)", 'src/auth.ts': 'const router = Router()\nrouter.post("/login", entrar)\nexport default router' }), [])
  assert.deepEqual(loginSemLimite({ 'app.mjs': "import { router as auth } from './auth.mjs'\napp.use(limiter)\napp.use(auth)", 'auth.mjs': 'export const router = Router()\nrouter.post("/login", entrar)' }), [])
  // Na dúvida, acusa.
  const acusa = [
    ['limitador depois da montagem', { 'app.js': app("app.use('/auth', auth)\napp.use(limiter)"), 'rotas/auth.js': rota }],
    ['limitador em outra instância', { 'app.js': app("admin.use(limiter)\napp.use('/auth', auth)"), 'rotas/auth.js': rota }],
    ['limitador em caminho que não cobre a montagem', { 'app.js': app("app.use('/api', limiter)\napp.use('/auth', auth)"), 'rotas/auth.js': rota }],
    ['importado mas nunca montado', { 'app.js': app('app.use(limiter)\niniciar(auth)'), 'rotas/auth.js': rota }],
    ['outra montagem sem limitador', { 'app.js': app("app.use(limiter)\napp.use('/auth', auth)"), 'interno.js': "const r = require('./rotas/auth')\ninterno.use(r)", 'rotas/auth.js': rota }],
    ['o arquivo exporta outro objeto', { 'app.js': app("app.use(limiter)\napp.use('/auth', auth)"), 'rotas/auth.js': rota.replace('= router', '= outro') }],
    ['importa outro nome do arquivo', { 'app.mjs': "import { outro } from './auth.mjs'\napp.use(limiter)\napp.use(outro)", 'auth.mjs': 'export const router = Router()\nrouter.post("/login", entrar)' }],
    ['limitador só em outro arquivo, sem montagem', { 'app.js': 'app.use(limiter)', 'rotas/auth.js': rota }],
  ]
  for (const [nome, arquivos] of acusa) assert.deepEqual(loginSemLimite(arquivos), [Object.keys(arquivos).at(-1)], nome)
})

// ---- 5ª correção: mesma instância (escopo), limitador em qualquer argumento, montagens e o que não protege ----
const login = (arquivos) => cats(rodar(arquivos), 'entrada-sem-limite')
const limpo = (arquivos, nome) => assert.deepEqual(login(arquivos).map((a) => `${a.arquivo}:${a.linha}`), [], nome)
// Acusa uma vez, no arquivo esperado, com a gravidade e o motivo esperados.
function acusa(arquivos, nome, { arquivo = 'a.js', gravidade = 'medio', motivo = /./ } = {}) {
  const r = login(arquivos)
  assert.deepEqual(r.map((a) => a.arquivo), [arquivo], nome)
  assert.equal(r[0].gravidade, gravidade, `${nome}: gravidade`)
  assert.match(r[0].explicacao, motivo, `${nome}: motivo`)
  assert.match(r[0].explicacao, /^Conferir: /, nome)
}

test('login Node: mesmo nome em outro escopo é outra instância; a proteção só vale para a mesma declaração', () => {
  const outro = { motivo: /outro escopo/ }
  acusa({ 'a.js': 'function admin() {\n  const app = express();\n  app.use(rateLimiter);\n}\nconst app = express();\napp.post("/login", entrar);' }, 'caso do revisor: limitador no app de dentro da função', outro)
  acusa({ 'a.js': 'const app = express();\napp.use(rateLimiter);\nfunction admin() {\n  const app = express();\n  app.post("/login", entrar);\n}' }, 'o inverso: rota no app de dentro', outro)
  acusa({ 'a.js': 'app.use(limiter)\nmodule.exports = (app) => {\n  app.post("/login", entrar)\n}' }, 'rota no app recebido por parâmetro', outro)
  // Mesma instância: passa.
  limpo({ 'a.js': 'function criar() {\n  const app = express()\n  app.use(rateLimiter)\n  app.post("/login", entrar)\n  return app\n}' }, 'limitador e rota no mesmo app, dentro da função')
  limpo({ 'a.js': 'const app = express()\napp.use(rateLimiter)\nfunction rotas() {\n  app.post("/login", entrar)\n}' }, 'rota num bloco de dentro usa o app de fora')
  limpo({ 'a.js': 'module.exports = (app) => {\n  app.use(limiter)\n  app.post("/login", entrar)\n}' }, 'mesmo parâmetro')
  limpo({ 'a.ts': 'export function montar(app: Express): void {\n  app.use(limiter)\n  app.post("/login", entrar)\n}' }, 'parâmetro com tipo')
  limpo({ 'a.js': 'const app = express()\nconst msg = `oi ${nome} {`\nconst s = "}{"\nconst r = /\\/\\//\napp.use(limiter)\napp.post("/login", entrar)' }, 'chave dentro de texto, crase e regex não abre bloco')
  // Na dúvida, acusa como "Conferir" de gravidade baixa, com o motivo.
  const baixo = (motivo) => ({ gravidade: 'baixo', motivo })
  acusa({ 'a.js': 'const app = express()\nfunction proteger() {\n  app.use(limiter)\n}\napp.post("/login", entrar)' }, 'use dentro de função que pode não rodar', baixo(/outro bloco/))
  acusa({ 'a.js': 'class S {\n  m() { this.app.use(limiter) }\n  r() { this.app.post("/login", entrar) }\n}' }, 'métodos diferentes da classe', baixo(/outro bloco/))
  acusa({ 'a.js': 'let app = express()\napp.use(limiter)\napp = express()\napp.post("/login", entrar)' }, 'app recebe outro valor no meio', baixo(/recebe outro valor/))
  acusa({ 'a.js': 'app.use(limiter)\nfunction f() {\napp.post("/login", entrar)' }, 'chave que não fecha', baixo(/blocos/))
})

test('login Node: variável de middleware só vale pela declaração do próprio escopo', () => {
  const next = 'const protecao = (req, res, next) => next();'
  const fabrica = 'const protecao = rateLimit({ max: 5 });'
  const medio = { gravidade: 'medio', motivo: /./ }
  acusa({ 'a.js': `function outro() {\n  ${fabrica}\n}\n${next}\nconst app = express();\napp.use(protecao);\napp.post("/login", entrar);` }, 'caso do revisor: limitador de mesmo nome dentro de outra função', medio)
  acusa({ 'a.js': `function outro() {\n  ${fabrica}\n}\n${next}\nconst app = express();\napp.post("/login", protecao, entrar);` }, 'o mesmo, com o nome passado na rota', medio)
  acusa({ 'a.js': `${fabrica}\nfunction criar() {\n  ${next}\n  const app = express();\n  app.use(protecao);\n  app.post("/login", entrar);\n}` }, 'o inverso: a de dentro esconde o limitador de fora', medio)
  acusa({ 'a.js': `function outro() {\n  ${fabrica}\n}\nconst app = express();\napp.use(protecao);\napp.post("/login", entrar);` }, 'nome sem declaração neste escopo', medio)
  // A mesma declaração: passa.
  limpo({ 'a.js': `${fabrica}\nconst app = express();\napp.use(protecao);\napp.post("/login", entrar);` }, 'declarada no mesmo escopo')
  limpo({ 'a.js': `${fabrica}\nfunction criar() {\n  const app = express();\n  app.use(protecao);\n  app.post("/login", entrar);\n}` }, 'declarada fora, usada dentro')
  limpo({ 'a.js': `function outro() {\n  ${next}\n}\n${fabrica}\nconst app = express();\napp.use(protecao);\napp.post("/login", entrar);` }, 'a de outra função não atrapalha')
  // O nome recebe outro valor depois: na dúvida, "Conferir" de gravidade baixa.
  const troca = { gravidade: 'baixo', motivo: /recebe outro valor/ }
  acusa({ 'a.js': 'let protecao = rateLimit({ max: 5 });\nprotecao = (req, res, next) => next();\nconst app = express();\napp.use(protecao);\napp.post("/login", entrar);' }, 'reatribuída', troca)
  for (const op of ['&&=', '||=', '??=', '+=']) acusa({ 'a.js': `let protecao = rateLimit({ max: 5 });\nprotecao ${op} (req, res, next) => next();\nconst app = express();\napp.use(protecao);\napp.post("/login", entrar);` }, `reatribuída com ${op}`, troca)
  acusa({ 'a.js': 'var protecao = rateLimit({ max: 5 });\nvar protecao = (req, res, next) => next();\nconst app = express();\napp.use(protecao);\napp.post("/login", entrar);' }, 'declarada duas vezes no mesmo escopo', troca)
  // Import ou require escondido por variável, parâmetro ou função local de mesmo nome.
  const corpo = 'const app = express();\n  app.use(protecao);\n  app.post("/login", entrar);'
  acusa({ 'a.js': `import protecao from 'express-rate-limit';\nfunction criar() {\n  ${next}\n  ${corpo}\n}` }, 'caso do revisor: variável local esconde o import', medio)
  acusa({ 'a.js': `const protecao = require('express-rate-limit');\nfunction criar(protecao) {\n  ${corpo}\n}` }, 'parâmetro esconde o require', medio)
  acusa({ 'a.js': `import limitar from 'express-rate-limit';\nfunction criar() {\n  const limitar = () => (req, res, next) => next();\n  const app = express();\n  app.use(limitar());\n  app.post("/login", entrar);\n}` }, 'função local esconde a fábrica importada (nome fraco: fica em dúvida, não aprovado)', { gravidade: 'baixo', motivo: /não deu para confirmar/ })
  acusa({ 'a.js': `import protecao from 'express-rate-limit';\nfunction criar() {\n  function protecao(req, res, next) { next(); }\n  ${corpo}\n}` }, 'caso do revisor: função local esconde o import', medio)
  acusa({ 'a.js': `const protecao = require('express-rate-limit');\nfunction criar() {\n  class protecao {}\n  ${corpo}\n}` }, 'classe local esconde o require', medio)
  const req = "require('./middlewares/rate-limit.js');"
  acusa({ 'a.js': `let protecao = ${req}\nprotecao &&= (req, res, next) => next();\nconst app = express();\napp.use(protecao);\napp.post("/login", entrar);` }, 'caso do revisor: require reatribuído', troca)
  acusa({ 'a.js': `var protecao = ${req}\nvar protecao = (req, res, next) => next();\nconst app = express();\napp.use(protecao);\napp.post("/login", entrar);` }, 'caso do revisor: require declarado de novo', troca)
  acusa({ 'a.js': `var protecao = ${req}\nvar protecao = require('./middlewares/validar.js');\nconst app = express();\napp.use(protecao);\napp.post("/login", entrar);` }, 'caso do revisor: dois require com o mesmo nome', troca)
  acusa({ 'a.js': `import protecao from 'express-rate-limit';\nfunction criar() {\n  function protecao<T>(req: T, res, next) { next(); }\n  ${corpo}\n}` }, 'caso do revisor: função genérica esconde o import', medio)
  acusa({ 'a.js': `var protecao = ${req}\nvar protecao: any = (req, res, next) => next();\nconst app = express();\napp.use(protecao);\napp.post("/login", entrar);` }, 'caso do revisor: segunda declaração com tipo', troca)
  acusa({ 'a.js': `var criar = require('express-rate-limit');\nvar criar = () => (req, res, next) => next();\nconst protecao = criar({ max: 5 });\nconst app = express();\napp.use(protecao);\napp.post("/login", entrar);` }, 'caso do revisor: fábrica declarada de novo', medio)
  acusa({ 'a.js': `let criar = require('express-rate-limit');\ncriar = () => (req, res, next) => next();\nconst app = express();\napp.use(criar({ max: 5 }));\napp.post("/login", entrar);` }, 'fábrica que recebe outro valor', medio)
  limpo({ 'a.ts': `import rateLimit from 'express-rate-limit';\nconst protecao: RequestHandler = rateLimit({ max: 5 });\nconst app = express();\napp.use(protecao);\napp.post("/login", entrar);` }, 'declaração com tipo é lida')
  limpo({ 'a.js': `const protecao = ${req}\nfunction outra() {\n  let protecao = 1;\n  protecao = 2;\n}\nconst app = express();\napp.use(protecao);\napp.post("/login", entrar);` }, 'troca de valor em outra variável de mesmo nome não atrapalha')
  limpo({ 'a.js': `import protecao from 'express-rate-limit';\nfunction criar() {\n  const app = express();\n  app.use(protecao({ max: 5 }));\n  app.post("/login", entrar);\n}` }, 'import usado de dentro da função')
  limpo({ 'a.js': `const limitar = require('express-rate-limit');\nconst protecao = limitar({ max: 5 });\nfunction criar() {\n  ${corpo}\n}` }, 'require no topo, usado de dentro')
  limpo({ 'a.js': `const { rateLimit: limitar } = require('express-rate-limit');\nconst app = express();\napp.use(limitar({ max: 5 }));\napp.post("/login", entrar);` }, 'require desestruturado')
})

test('login Node: limitador em qualquer argumento do use() vale; use() sem limitador continua acusado', () => {
  limpo({ 'a.js': 'app.use(express.json(), rateLimiter);\napp.post("/login", entrar);' }, 'caso do revisor: segundo argumento')
  limpo({ 'a.js': 'app.use(\n  helmet(),\n  express.json({ limit: "1mb" }),\n  rateLimiter,\n)\napp.post("/login", entrar)' }, 'argumentos em várias linhas')
  limpo({ 'a.js': 'app.use("/api", cors(), apiLimiter)\napp.post("/api/login", entrar)' }, 'depois do caminho e de outro middleware')
  limpo({ 'a.js': 'app.use([helmet(), limiter])\napp.post("/login", entrar)' }, 'lista de middlewares no use')
  limpo({ 'a.js': 'app.post("/login", [loginLimiter, validar], entrar)' }, 'lista de middlewares na rota')
  acusa({ 'a.js': 'app.use(helmet(), cors(), express.json({ limit: "1mb" }))\napp.post("/login", entrar)' }, 'vários argumentos, nenhum limitador')
  acusa({ 'a.js': 'app.use("/admin", cors(), limiter)\napp.post("/login", entrar)' }, 'limitador em outro caminho')
})

test('login Node: menos ruído no Express comum (require direto na montagem, dois níveis, limitador em variável)', () => {
  const rota = "const router = require('express').Router()\nrouter.post('/login', entrar)\nmodule.exports = router"
  const meio = (antes = '') => `const router = require('express').Router()\n${antes}router.use('/auth', require('./auth'))\nmodule.exports = router`
  const app = (antes) => `const rotas = require('./routes')\n${antes}app.use('/api', rotas)`
  const naRota = { arquivo: 'routes/auth.js', motivo: /sem limitador antes/ }
  // require direto dentro do use()
  limpo({ 'app.js': "app.use(limiter)\napp.use('/auth', require('./routes/auth'))", 'routes/auth.js': rota }, 'caso do revisor: require na montagem')
  acusa({ 'app.js': "app.use(helmet())\napp.use('/auth', require('./routes/auth'))", 'routes/auth.js': rota }, 'require na montagem, sem limitador', naRota)
  acusa({ 'app.js': "app.use('/auth', require('./routes/auth'))\napp.use(limiter)", 'routes/auth.js': rota }, 'limitador depois da montagem', naRota)
  // dois níveis: app monta routes/index, que monta routes/auth
  limpo({ 'app.js': app('app.use(limiter)\n'), 'routes/index.js': meio(), 'routes/auth.js': rota }, 'limitador no app')
  limpo({ 'app.js': app("app.use('/api/auth', limiter)\n"), 'routes/index.js': meio(), 'routes/auth.js': rota }, 'limitador no caminho somado dos dois níveis')
  limpo({ 'app.js': app(''), 'routes/index.js': meio('router.use(limiter)\n'), 'routes/auth.js': rota }, 'limitador no nível do meio')
  acusa({ 'app.js': app(''), 'routes/index.js': meio(), 'routes/auth.js': rota }, 'dois níveis sem limitador', naRota)
  acusa({ 'app.js': app("app.use('/api/outra', limiter)\n"), 'routes/index.js': meio(), 'routes/auth.js': rota }, 'limitador em caminho que não cobre', naRota)
  acusa({ 'app.js': app('app.use(limiter)\n'), 'interno.js': "interno.use(require('./routes'))", 'routes/index.js': meio(), 'routes/auth.js': rota }, 'o nível do meio tem outra montagem sem limitador', naRota)
  acusa({ 'app.js': app('if (producao) app.use(limiter)\n'), 'routes/index.js': meio(), 'routes/auth.js': rota }, 'limitador condicional lá em cima', { arquivo: 'routes/auth.js', gravidade: 'baixo', motivo: /condição/ })
  // limitador guardado em variável sem "limit" no nome
  limpo({ 'a.js': 'const protecao = rateLimit({ windowMs: 60000, max: 5 })\napp.use(protecao)\napp.post("/login", entrar)' }, 'caso do revisor: variável criada por rateLimit')
  limpo({ 'a.js': "const rl = require('express-rate-limit')\nconst protecao = rl({ max: 5 })\napp.post('/login', protecao, entrar)" }, 'fábrica com apelido, limitador na rota')
  limpo({ 'a.mjs': "import protecao from './middlewares/rate-limit.js'\napp.use(protecao)\napp.post('/login', entrar)" }, 'importado de módulo de limite')
  acusa({ 'a.js': 'const protecao = helmet()\napp.use(protecao)\napp.post("/login", entrar)' }, 'variável que não é limitador')
})

test('login Node: o que não protege não é aceito (nome parecido, condição, skip sempre verdadeiro)', () => {
  const baixo = (motivo) => ({ gravidade: 'baixo', motivo })
  // nome parecido que não é limitador de requisições
  acusa({ 'a.js': 'app.use(uploadLimits)\napp.post("/login", entrar)' }, 'caso do revisor: uploadLimits', { motivo: /limite de tamanho/ })
  acusa({ 'a.js': 'app.post("/login", uploadLimits, entrar)' }, 'uploadLimits na rota', { motivo: /limite de tamanho/ })
  acusa({ 'a.js': 'app.post("/login", express.json({ limit: "1mb" }), entrar)' }, 'limite de tamanho do corpo na rota')
  acusa({ 'a.js': 'app.use(loginLimit)\napp.post("/login", entrar)' }, 'nome que não dá para confirmar', baixo(/não deu para confirmar que loginLimit/))
  acusa({ 'a.js': 'app.use(PREFIXO_ADMIN, limiter)\napp.post("/login", entrar)' }, 'caminho guardado em variável', baixo(/caminho guardado em variável/))
  acusa({ 'a.js': 'app.post("/login", talvez(limiter), entrar)' }, 'limitador dentro de outra chamada', baixo(/dentro de outra/))
  // condicional
  acusa({ 'a.js': 'if (teste) app.use(limiter)\napp.post("/login", entrar)' }, 'caso do revisor: if na mesma linha', baixo(/condição/))
  acusa({ 'a.js': 'if (teste)\n  app.use(limiter)\napp.post("/login", entrar)' }, 'if na linha de cima', baixo(/condição/))
  acusa({ 'a.js': 'teste && app.use(limiter)\napp.post("/login", entrar)' }, '&&', baixo(/condição/))
  acusa({ 'a.js': 'if (teste) {\n  app.use(limiter)\n}\napp.post("/login", entrar)' }, 'if com bloco', baixo(/outro bloco/))
  limpo({ 'a.js': 'if (producao) {\n  app.use(limiter)\n  app.post("/login", entrar)\n}' }, 'limitador e rota sob a mesma condição')
  limpo({ 'a.js': 'iniciar();\napp.use(limiter); app.post("/login", entrar)' }, 'comando anterior na mesma linha não é condição')
  // skip que devolve sempre true
  const pula = { motivo: /pular sempre/ }
  acusa({ 'a.js': 'const limiter = rateLimit({ max: 5, skip: () => true })\napp.use(limiter)\napp.post("/login", entrar)' }, 'caso do revisor: skip na declaração', pula)
  acusa({ 'a.js': 'app.use(rateLimit({\n  max: 5,\n  skip: (req) => { return true },\n}))\napp.post("/login", entrar)' }, 'skip direto no use', pula)
  acusa({ 'a.js': 'app.post("/login", rateLimit({ max: 5, skip: () => true }), entrar)' }, 'skip na rota', pula)
  limpo({ 'a.js': 'const limiter = rateLimit({ max: 5, skip: (req) => req.ip === "127.0.0.1" })\napp.use(limiter)\napp.post("/login", entrar)' }, 'skip com condição de verdade')
})

test('tempo em linha reta: formas da conferência de escopo e de montagem repetidas dezenas de milhares de vezes (< 3 s cada)', () => {
  const formas = ["if (t) app.use(limiter)\napp.post('/login', h)\n", "function f() { const app = express(); app.use(limiter) }\napp.post('/login', h)\n",
    "app.use('/y', limiter)\napp.post('/x/login', h)\n", 'app.use(limiter, ', 'a => { app.use(limiter); app.post("/login", h) } ', "app = x\napp.use(limiter)\napp.post('/login', h)\n",
    '{ app.use(limiter)\napp.post("/login", h)\n', '(a, b, c ', "app.post('/login', [a, b, ", "app.use(require('./a'))\n", 'const limiter = rateLimit({ ', '`${ ']
  const lentos = []
  for (const forma of formas) {
    rodar({ 'a.ts': forma.repeat(Math.floor(900000 / forma.length)) })
    if (ultimoMs >= 3000) lentos.push(`${JSON.stringify(forma)}: ${Math.round(ultimoMs)} ms`)
  }
  assert.deepEqual(lentos, [])
})

test('linha de comentário não é acusada', () => {
  assert.deepEqual(rodar({ 'a.cs': '// db.X.FromSqlRaw($"select {x}");' }), [])
})

test('.env versionado é acusado; .env.example não', (t) => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'verif-env-'))
  t.after(() => fs.rmSync(pasta, { recursive: true, force: true }))
  fs.writeFileSync(path.join(pasta, '.env'), 'X=1\n')
  fs.writeFileSync(path.join(pasta, '.env.example'), 'X=\n')
  const git = (...a) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@exemplo.invalid', ...a], { cwd: pasta, encoding: 'utf8' })
  if (git('init', '-q').status !== 0) return t.skip('git indisponível')
  git('add', '-A')
  const envs = cats(verificar(pasta, {}), 'segredo-no-codigo').map((a) => a.arquivo)
  assert.deepEqual(envs, ['.env'])
})

test('nunca devolve o valor do segredo', () => {
  const achados = rodar({
    'appsettings.json': '{ "C": { "P": "Host=x;Password=ValorSecreto123" },\n  "Jwt": { "Key": "OutroValorSecreto4567890" } }',
    'a.cs': 'var k = Environment.GetEnvironmentVariable("JWT_KEY") ?? "PadraoSecreto999";',
  })
  assert.equal(achados.length, 3)
  const texto = JSON.stringify(achados)
  for (const v of ['ValorSecreto123', 'OutroValorSecreto4567890', 'PadraoSecreto999']) assert.ok(!texto.includes(v), v)
})

test('ignorar tira a pasta da verificação', () => {
  const arq = { 'gerado/a.cs': 'db.X.FromSqlRaw($"select {x}");' }
  assert.equal(rodar(arq).length, 1)
  assert.deepEqual(rodar(arq, { ignorar: ['gerado/**'] }), [])
})

test('ignorar com estrelas repetidas não explode (< 200 ms) e ainda filtra o que casa', () => {
  const nome = 'a'.repeat(60) + '.cs'
  const arq = { [nome]: 'db.X.FromSqlRaw($"select {x}");', 'gerado/b.cs': 'db.X.FromSqlRaw($"select {x}");' }
  const t0 = Date.now()
  const achados = rodar(arq, { ignorar: ['*a'.repeat(8) + 'Z', 'gerado/**'] })
  assert.ok(Date.now() - t0 < 200, `demorou ${Date.now() - t0} ms`)
  assert.equal(achados.length, 1, 'o padrão patológico não casa; gerado/** casa')
})

test('regex sem tempo exponencial em linha longa', () => {
  const longa = 'app.MapPost("' + 'a'.repeat(50000) + '\nconsole.log(' + '"x",'.repeat(20000) + '\ndb.query(`' + 'x'.repeat(50000)
  const t0 = Date.now()
  rodar({ 'a.ts': longa, 'b.cs': longa, 'c.py': 'cur.execute("' + '%'.repeat(50000) })
  assert.ok(Date.now() - t0 < 3000, `demorou ${Date.now() - t0} ms`)
})

test('upload: validar só a extensão ou só o tamanho ainda acusa e diz o que falta; ler sem comparar não vale', () => {
  const rota = (meio) => ({ 'a.cs': `app.MapPost("/up", async (IFormFile f) =>\n{\n${meio}\n  var d = Path.Combine("up", f.FileName);\n});` })
  const exp = (meio) => cats(rodar(rota(meio)), 'envio-de-arquivo-sem-validacao').map((a) => a.explicacao)
  const soExtensao = exp('  if (Path.GetExtension(f.FileName) != ".pdf") return;')
  assert.equal(soExtensao.length, 1, 'só extensão validada: falta o tamanho')
  assert.match(soExtensao[0], /sem checar tamanho:/)
  const soTamanho = exp('  if (f.Length > 1000000) return;')
  assert.equal(soTamanho.length, 1, 'só tamanho validado: falta a extensão')
  assert.match(soTamanho[0], /sem checar extensão:/)
  const soLe = exp('  var tam = f.Length;\n  var ext = Path.GetExtension(f.FileName);\n  log.LogInformation("{T} {E}", tam, ext);')
  assert.equal(soLe.length, 1, 'ler tamanho e extensão sem comparar não é validar')
  assert.match(soLe[0], /sem checar extensão e tamanho:/)
  assert.deepEqual(exp('  var tam = f.Length;\n  if (tam > 1000000) return;\n  var ext = Path.GetExtension(f.FileName).ToLowerInvariant();\n  if (!permitidas.Contains(ext)) return;'), [], 'em dois passos, comparando de verdade')
  const comAtributo = { 'a.cs': '[RequestSizeLimit(1000000)]\npublic async Task<IActionResult> Enviar(IFormFile f)\n{\n  if (!f.FileName.EndsWith(".pdf")) return BadRequest();\n  var d = Path.Combine("up", f.FileName);\n  return Ok();\n}' }
  assert.deepEqual(rodar(comAtributo), [], '[RequestSizeLimit] é proteção de tamanho, não falha')
})

test('gravidade: RLS desligado é alto; rota única sem permissão é médio e pede conferência', () => {
  const rls = rodar({ 'm/1.sql': 'alter table public.pedidos disable row level security;' })
  assert.deepEqual(rls.map((a) => [a.gravidade, a.linha]), [['alto', 1]])
  const rota = cats(rodar({ 'Program.cs': 'app.UseAuthorization();', 'Rotas.cs': 'app.MapDelete("/pedidos/{id}", Apagar);' }), 'sem-autorizacao')
  assert.deepEqual(rota.map((a) => [a.gravidade, a.arquivo, /^Conferir:/.test(a.explicacao)]), [['medio', 'Rotas.cs', true]])
})

test('tempo em linha reta: "public " 140 mil vezes numa linha (< 1 s) e 20 mil console.log(token) (< 2 s)', () => {
  assert.deepEqual(rodar({ 'a.cs': 'public '.repeat(140000) }), [])
  assert.ok(ultimoMs < 1000, `linha de "public ": ${Math.round(ultimoMs)} ms`)
  const achados = rodar({ 'a.js': 'console.log(token);\n'.repeat(20000) })
  assert.ok(ultimoMs < 2000, `20 mil logs: ${Math.round(ultimoMs)} ms`)
  assert.equal(achados.length, 20000)
})

test('tempo em linha reta: o mesmo começo de regra repetido dezenas de milhares de vezes (< 3 s cada)', () => {
  const formas = {
    'a.cs': ['public async Task Login', 'Login(', 'IFormFile f {', 'UseDeveloperExceptionPage(); ', 'app.MapPost("/login", ', '_logger.LogInformation(', 'config["', 'class A : '],
    'a.ts': ["app.post('/login', ", 'console.log(', 'console.log(token, ', 'localStorage.', 'process.env.',
      'app.use(limiter); ', "app.use('/x', limiter)\napp.post('/x/login', h)\n", "app.use(limiter)\nr.post('/login', h)\n", "import a from './a'\nconst { b } = require('./a')\n", 'import a$'],
    'a.py': ['cur.execute(f"', "execute(f'''", 'logger.info('],
    'a.sql': ['create policy ', 'alter table ', "create table a ('"],
  }
  const lentos = []
  for (const [nome, lista] of Object.entries(formas)) {
    for (const forma of lista) {
      rodar({ [nome]: forma.repeat(Math.floor(900000 / forma.length)) })
      if (ultimoMs >= 3000) lentos.push(`${nome} com ${JSON.stringify(forma)}: ${Math.round(ultimoMs)} ms`)
    }
  }
  assert.deepEqual(lentos, [])
})

test('limite de arquivos, de bytes e de prazo: corta com aviso "leitura cortada", nunca calado', () => {
  const sql = 'db.X.FromSqlRaw($"select {x}");'
  const arq = { 'a.cs': sql, 'b.cs': sql, 'c.cs': sql }
  const normal = rodar(arq)
  assert.equal(normal.length, 3)
  assert.deepEqual(normal.avisos, [])
  const porArquivos = rodar(arq, { limites: { arquivos: 2 } })
  assert.equal(porArquivos.length, 2)
  assert.match(porArquivos.avisos.join(' '), /leitura cortada: .*mais de 2 arquivos/)
  const porBytes = rodar(arq, { limites: { bytes: 40 } })
  assert.equal(porBytes.length, 1)
  assert.match(porBytes.avisos.join(' '), /leitura cortada/)
  const porPrazo = rodar(arq, { limites: { prazoMs: -1 } })
  assert.equal(porPrazo.length, 0)
  assert.match(porPrazo.avisos.join(' '), /leitura cortada: prazo/)
  const grande = rodar({ 'g.js': 'x'.repeat(1024 * 1024 + 1) })
  assert.match(grande.avisos.join(' '), /leitura cortada: 1 arquivo\(s\) com mais de 1 MB/)
})

test('prova montada: F1, F4, F5, F7 e F8 achadas, nenhum controle acusado', { skip: !temProva && 'pasta da prova ausente' }, (t) => {
  const { pasta } = montar()
  t.after(() => fs.rmSync(pasta, { recursive: true, force: true }))
  const gabarito = JSON.parse(fs.readFileSync(path.resolve('pilotos/prova-seguranca/gabarito.json'), 'utf8'))
  const linhaDo = (arquivo, trecho) => {
    const linhas = fs.readFileSync(path.join(pasta, arquivo), 'utf8').split('\n')
    return linhas.findIndex((l) => l.includes(trecho)) + 1
  }
  const achados = verificar(pasta, {})
  const acusado = (arquivo, trecho) => achados.some((a) => a.arquivo === arquivo && a.linha === linhaDo(arquivo, trecho))
  for (const id of ['F1', 'F4', 'F5', 'F7', 'F8']) {
    const f = gabarito.falhas.find((x) => x.id === id)
    for (const local of [f, ...(f.outrosLocais || [])]) assert.ok(acusado(local.arquivo, local.trecho), `${id} em ${local.arquivo}`)
  }
  for (const c of gabarito.controles) assert.ok(!acusado(c.arquivo, c.trecho), `controle ${c.id} acusado`)
})
