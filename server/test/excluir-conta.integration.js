import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import { createServer } from 'node:net';
import { randomUUID, randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import { criarAplicacao } from '../src/app.js';
import { criarServicoAutenticacao } from '../src/servicos/autenticacao.js';
import { criarServicoMinhaConta } from '../src/servicos/minha-conta.js';
import { criarServicoMetaSemanal } from '../src/servicos/meta-semanal.js';
import { verificarMissoes } from './metas-fixture.js';

// Instância nova, sem .env, sem credenciais ou dados de desenvolvimento/produção.
test('exclusão: todas as tabelas, isolamento, autenticação, CSRF e rollback em MySQL descartável', { timeout: 120000 }, async () => {
  assert.equal(process.platform, 'win32');
  const pasta = await mkdtemp(join(tmpdir(), 'dayvilo-exclusao-'));
  const bin = 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqld.exe';
  let processo, pool, admin, servidor;
  try {
    const dados = join(pasta, 'dados'); await mkdir(dados);
    const init = spawn(bin, ['--no-defaults', '--initialize-insecure', `--datadir=${dados}`], { windowsHide: true, stdio: 'ignore' });
    assert.equal((await once(init, 'exit'))[0], 0);
    const sonda = createServer().listen(0, '127.0.0.1'); await once(sonda, 'listening');
    const port = sonda.address().port; await new Promise(r => sonda.close(r));
    processo = spawn(bin, ['--no-defaults', `--datadir=${dados}`, '--bind-address=127.0.0.1', `--port=${port}`, '--mysqlx=OFF'], { windowsHide: true, stdio: 'ignore' });
    const conexao = { host: '127.0.0.1', port, user: 'root', password: '', multipleStatements: true };
    for (let i = 0; i < 60; i++) {
      try { admin = await mysql.createConnection(conexao); break; } catch { await new Promise(r => setTimeout(r, 250)); }
    }
    assert.ok(admin, 'A instância descartável deve iniciar');
    await admin.query('CREATE DATABASE teste CHARACTER SET utf8mb4');
    await admin.query('USE teste');
    const migrations = new URL('../migrations/', import.meta.url);
    for (const nome of (await readdir(migrations)).filter(n => n.endsWith('.sql')).sort()) {
      if (nome==='032_preservar_meta_semanal.sql') {
        const [u]=await admin.query("INSERT INTO usuarios(nome) VALUES ('Migração teste')");
        await admin.execute("INSERT INTO metas_semanais(usuario_id,tipo,titulo,dias,semana_manual,dias_manuais) VALUES (?,'manual','Meta preservada',3,'2026-10-19','[\"2026-10-20\"]')",[u.insertId]);
        await admin.query(await readFile(new URL(nome,migrations),'utf8'));
        const [[m]]=await admin.execute('SELECT titulo,medida,quantidade,dias_manuais FROM metas WHERE usuario_id=?',[u.insertId]);
        assert.equal(m.titulo,'Meta preservada');assert.equal(m.medida,'dias');assert.equal(m.quantidade,3);assert.deepEqual(typeof m.dias_manuais==='string'?JSON.parse(m.dias_manuais):m.dias_manuais,['2026-10-20']);
        await admin.execute('DELETE FROM usuarios WHERE id=?',[u.insertId]);
      } else await admin.query(await readFile(new URL(nome, migrations), 'utf8'));
    }
    pool = mysql.createPool({ ...conexao, database: 'teste', multipleStatements: false });
    // Reproduz o modo do Aiven: aspas duplas são identificadores, não texto.
    pool.on('connection', c => c.query("SET SESSION sql_mode = CONCAT(@@SESSION.sql_mode, ',ANSI_QUOTES')"));
    const auth = criarServicoAutenticacao(pool), senha = 'Minha senha de teste 123!';
    const b = await auth.cadastrar({ nome: 'B', email: 'b@example.test', senha });
    async function preencher(sessao) {
      const u = (await auth.consultar(sessao.token)).id;
      const [[c]] = await pool.execute('SELECT id FROM contas WHERE usuario_id=?', [u]);
      const inserir = async (sql, params) => (await pool.execute(sql, params))[0].insertId;
      const t = await inserir('INSERT INTO tarefas(usuario_id,titulo) VALUES (?,?)', [u, 'Tarefa']);
      const f = await inserir('INSERT INTO fichas_treino(usuario_id,nome,exercicios) VALUES (?,?,?)', [u, 'Treino', '[]']);
      await inserir('INSERT INTO sessoes_treino(tarefa_id,ficha_id,planejado,realizado) VALUES (?,?,?,?)', [t, f, '[]', '[]']);
      const inv = await inserir('INSERT INTO financeiro_investimentos(usuario_id,tipo,nome,instituicao,detalhes) VALUES (?,?,?,?,?)', [u, 'fixa', 'Teste', 'Teste', '{}']);
      const l = await inserir('INSERT INTO financeiro_lancamentos(usuario_id,tipo,descricao,categoria,valor_centavos,data_prevista,investimento_id) VALUES (?,?,?,?,?,?,?)', [u, 'despesa', 'Teste', 'Teste', 100, '2026-10-22', inv]);
      await inserir('INSERT INTO financeiro_registros(investimento_id,tipo,valor_centavos,data,lancamento_id) VALUES (?,?,?,?,?)', [inv, 'aporte', 100, '2026-10-22', l]);
      await inserir('INSERT INTO financeiro_lembretes(lancamento_id,tarefa_id) VALUES (?,?)', [l, t]);
      await inserir('INSERT INTO refeicoes(tarefa_id,nota) VALUES (?,?)', [t, 'Teste']);
      const livro = await inserir('INSERT INTO livros(usuario_id,titulo) VALUES (?,?)', [u, 'Teste']);
      await inserir('INSERT INTO notas_leitura(livro_id,texto) VALUES (?,?)', [livro, 'Teste']);
      await inserir('INSERT INTO leituras_agendadas(tarefa_id,livro_id) VALUES (?,?)', [t, livro]);
      await inserir('INSERT INTO agua_metas(usuario_id,desde,ml) VALUES (?,?,?)', [u, '2026-10-22', 2000]);
      await inserir('INSERT INTO agua_registros(usuario_id,dia,ml,chave) VALUES (?,?,?,?)', [u, '2026-10-22', 200, randomUUID()]);
      await inserir('INSERT INTO feedback(usuario_id,envio_id,tipo,area,mensagem) VALUES (?,?,?,?,?)', [u, randomUUID(), 'sugestao', 'rotina', 'Teste']);
      await inserir('INSERT INTO atalhos_usuario(usuario_id,areas) VALUES (?,?)', [u, '[]']);
      await inserir('INSERT INTO metas_semanais(usuario_id,tipo,titulo,dias,semana_manual,dias_manuais) VALUES (?,?,?,?,?,?)', [u, 'manual', 'Praticar violão', 3, '2026-10-19', '["2026-10-22"]']);
      await inserir('INSERT INTO metas(id,usuario_id,tipo,periodo,medida,titulo,quantidade,origem,dias_manuais) VALUES (?,?,?,?,?,?,?,?,?)', [randomUUID(),u,'manual','mensal','dias','Violão',10,'pessoal','[]']);
      const serie = randomUUID();
      await inserir('INSERT INTO configuracoes_series(serie_id,usuario_id,tipo,ate) VALUES (?,?,?,?)', [serie, u, 'diaria', '2026-10-22']);
      await inserir('INSERT INTO ocorrencias_series(tarefa_id,serie_id) VALUES (?,?)', [t, serie]);
      await inserir('INSERT INTO vinculos_conta(usuario_id,codigo_hash,expira_em) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY))', [u, randomBytes(32).toString('hex')]);
      for (const tabela of ['recuperacoes_senha', 'confirmacoes_email']) await inserir(`INSERT INTO ${tabela}(conta_id,token_hash,criado_em,expira_em) VALUES (?,?,UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY))`, [c.id, randomBytes(32).toString('hex')]);
      await inserir('INSERT INTO alteracoes_email(conta_id,novo_email,token_hash,criado_em,expira_em) VALUES (?,?,?,UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY))', [c.id, `${u}@example.test`, randomBytes(32).toString('hex')]);
      return u;
    }
    await preencher(b);
    const [lista] = await pool.query('SHOW TABLES');
    const tabelas = lista.map(v => Object.values(v)[0]);
    async function retrato() {
      return Object.fromEntries(await Promise.all(tabelas.map(async tabela => [tabela, (await pool.query(`SELECT * FROM \`${tabela}\``))[0]])));
    }
    const somenteB = await retrato();
    const a = await auth.cadastrar({ nome: 'A', email: 'a@example.test', senha });
    const a2 = await auth.entrar({ email: 'a@example.test', senha });
    const ua = await preencher(a);
    const antes = await retrato();
    servidor = criarAplicacao({ banco: pool, enviarEmail: async () => {} }).listen(0, '127.0.0.1'); await once(servidor, 'listening');
    await verificarMissoes({pool,servidor,a,b,usuarioId:ua});
    const metas = criarServicoMetaSemanal(pool);
    async function chamarMeta(method, body, sessao = a, csrf = sessao?.csrf) {
      const r = await fetch(`http://127.0.0.1:${servidor.address().port}/api/meta-semanal`, { method, headers: { 'Content-Type': 'application/json', 'X-Dayvilo': '1', ...(sessao ? { Cookie: `dayvilo_sessao=${sessao.token}`, 'X-CSRF-Token': csrf } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: r.status, dados: await r.json() };
    }
    assert.equal((await chamarMeta('GET', null, null)).status, 401);
    assert.equal((await chamarMeta('PUT', { tipo: 'rotina', dias: 4 }, a, b.csrf)).status, 403);
    assert.equal((await chamarMeta('PUT', { tipo: 'rotina', dias: 4, usuario_id: ua + 1 })).status, 400);
    assert.equal((await chamarMeta('PUT', { tipo: 'rotina', dias: 4 })).status, 200);
    assert.equal((await chamarMeta('GET', null, b)).dados.meta.titulo, 'Praticar violão');
    // Datas repetidas contam uma vez; futuras e puladas não contam.
    const inseridos = [];
    for (const [dia, situacao] of [['2026-10-19','concluida'], ['2026-10-19','concluida'], ['2026-10-20','concluida'], ['2026-10-21','pulada'], ['2026-10-25','concluida']]) {
      const [r] = await pool.execute('INSERT INTO tarefas(usuario_id,titulo,data_prevista,situacao,concluida_em) VALUES (?,?,?,?,?)', [ua, 'Meta teste', dia, situacao, situacao === 'concluida' ? '2026-10-22 12:00:00' : null]); inseridos.push(r.insertId);
    }
    assert.deepEqual((await metas.consultar(ua, '2026-10-23')).meta.cumpridos, ['2026-10-19','2026-10-20']);
    await pool.execute("UPDATE tarefas SET situacao='pendente',concluida_em=NULL WHERE id=?", [inseridos[2]]);
    assert.deepEqual((await metas.consultar(ua, '2026-10-23')).meta.cumpridos, ['2026-10-19']);
    assert.deepEqual((await metas.consultar(ua, '2026-10-26')).meta.cumpridos, []);
    for (const tipo of ['treino', 'leitura', 'casa']) {
      await metas.salvar(ua, { tipo, dias: 3 });
      assert.deepEqual((await metas.consultar(ua, '2026-10-23')).meta.cumpridos, []);
    }
    const [[fichaMeta]] = await pool.execute('SELECT id FROM fichas_treino WHERE usuario_id=?', [ua]);
    const [[livroMeta]] = await pool.execute('SELECT id FROM livros WHERE usuario_id=?', [ua]);
    await pool.execute('INSERT INTO sessoes_treino(tarefa_id,ficha_id,planejado,realizado) VALUES (?,?,?,?)', [inseridos[0], fichaMeta.id, '[]', '[]']);
    await pool.execute('INSERT INTO leituras_agendadas(tarefa_id,livro_id) VALUES (?,?)', [inseridos[0], livroMeta.id]);
    await pool.execute("UPDATE tarefas SET area='casa',ambiente='Sala' WHERE id=?", [inseridos[0]]);
    for (const tipo of ['treino', 'leitura', 'casa']) {
      await metas.salvar(ua, { tipo, dias: 3 });
      assert.deepEqual((await metas.consultar(ua, '2026-10-23')).meta.cumpridos, ['2026-10-19']);
      await assert.rejects(metas.marcar(ua, '2026-10-23', { dia: '2026-10-23', cumprido: true }), { status: 400 });
    }
    await metas.salvar(ua, { tipo: 'manual', titulo: 'Praticar violão', dias: 3 });
    await Promise.all(['2026-10-20','2026-10-21'].map(dia => metas.marcar(ua, '2026-10-23', { dia, cumprido: true })));
    assert.deepEqual((await metas.consultar(ua, '2026-10-23')).meta.cumpridos, ['2026-10-20','2026-10-21']);
    await metas.marcar(ua, '2026-10-23', { dia: '2026-10-20', cumprido: true });
    assert.equal((await metas.consultar(ua, '2026-10-23')).meta.cumpridos.length, 2);
    await metas.marcar(ua, '2026-10-23', { dia: '2026-10-20', cumprido: false });
    assert.deepEqual((await metas.consultar(ua, '2026-10-23')).meta.cumpridos, ['2026-10-21']);
    await assert.rejects(metas.marcar(ua, '2026-10-23', { dia: '2026-10-24', cumprido: true }), { status: 400 });
    await assert.rejects(metas.marcar(ua, '2026-10-23', { dia: '2026-10-18', cumprido: true }), { status: 400 });
    assert.deepEqual((await metas.consultar(ua, '2026-10-26')).meta.cumpridos, []);
    await metas.marcar(ua, '2026-10-26', { dia: '2026-10-26', cumprido: true });
    assert.deepEqual((await metas.consultar(ua, '2026-10-26')).meta.cumpridos, ['2026-10-26']);
    assert.equal((await chamarMeta('DELETE')).status, 200);
    assert.equal((await chamarMeta('GET')).dados.meta, null);
    assert.equal((await chamarMeta('GET', null, b)).dados.meta.titulo, 'Praticar violão');
    for (const id of inseridos) await pool.execute('DELETE FROM tarefas WHERE id=?', [id]);
    // Restaura o retrato inicial para conferir rollback e cascata de todas as tabelas.
    await pool.execute('INSERT INTO metas_semanais(usuario_id,tipo,titulo,dias,semana_manual,dias_manuais) VALUES (?,?,?,?,?,?)', [ua, 'manual', 'Praticar violão', 3, '2026-10-19', '["2026-10-22"]']);
    assert.deepEqual(await retrato(), antes);
    async function chamar(body, sessao = a, csrf = sessao?.csrf) {
      const r = await fetch(`http://127.0.0.1:${servidor.address().port}/api/contas/perfil`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-Dayvilo': '1', ...(sessao ? { Cookie: `dayvilo_sessao=${sessao.token}`, 'X-CSRF-Token': csrf } : {}) }, body: JSON.stringify(body) });
      return { status: r.status, cookie: r.headers.get('set-cookie'), dados: await r.json() };
    }
    const body = { senha_atual: senha, confirmacao: 'EXCLUIR' };
    assert.equal((await chamar(body, null)).status, 401);
    assert.equal((await chamar(body, a, b.csrf)).status, 403);
    assert.equal((await chamar({ ...body, senha_atual: 'errada' })).status, 400);
    assert.equal((await chamar({ ...body, confirmacao: '' })).status, 400);
    assert.equal((await chamar({ ...body, usuario_id: 999 })).status, 400);
    await assert.rejects(criarServicoMinhaConta(pool).excluir(ua, b.token, body), { status: 409 });
    assert.deepEqual(await retrato(), antes);
    // Uma falha depois dos DELETEs iniciais deve restaurar todos os dados.
    await admin.query("CREATE TRIGGER impedir_exclusao BEFORE DELETE ON livros FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'falha de teste'");
    await assert.rejects(criarServicoMinhaConta(pool).excluir(ua, a.token, body));
    assert.deepEqual(await retrato(), antes);
    await admin.query('DROP TRIGGER impedir_exclusao');
    const resultado = await chamar(body);
    assert.equal(resultado.status, 200); assert.match(resultado.cookie, /dayvilo_sessao=;.*Expires=Thu, 01 Jan 1970/);
    assert.equal(await auth.consultar(a.token), null); assert.equal(await auth.consultar(a2.token), null);
    assert.ok(await auth.consultar(b.token));
    await assert.rejects(auth.entrar({ email: 'a@example.test', senha }), { status: 401 });
    const depois = await retrato();
    for (const tabela of tabelas) {
      assert.ok(antes[tabela].length >= 2, tabela);
      assert.equal(depois[tabela].length, 1, tabela);
      assert.deepEqual(depois[tabela], somenteB[tabela], `outra conta preservada: ${tabela}`);
    }
    assert.equal((await chamar(body)).status, 401);
  } finally {
    if (servidor) { servidor.closeAllConnections(); await new Promise(r => servidor.close(r)); }
    if (pool) await pool.end();
    if (admin) { try { await admin.query('SHUTDOWN'); } catch {} await admin.end().catch(() => {}); }
    if (processo && processo.exitCode === null) { const fim = once(processo, 'exit'); processo.kill(); await fim; }
    const rel = relative(resolve(tmpdir()), resolve(pasta));
    assert.ok(rel.startsWith('dayvilo-exclusao-') && !rel.includes('/') && !rel.includes('\\'));
    await rm(pasta, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
});
