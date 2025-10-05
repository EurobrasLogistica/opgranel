require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const app = express();

const xml2js = require('xml2js');
const { Base64 } = require('js-base64');
const fs = require('fs');
const jsdom = require('jsdom');
const axios = require('axios');
const cron = require('node-cron');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const pdf = require('html-pdf');

//const API_PREFIX = '';
const API_PREFIX = '/api';

// ====== DB: mysql2/promise + pool ======
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Teste inicial de conexão (async)
(async () => {
  try {
    const [rows] = await db.query('SELECT 1 AS ok');
    console.log('Conexão DB ok?', rows[0]?.ok === 1);
  } catch (err) {
    console.error('Falha ao conectar no DB:', err.message);
    process.exit(1);
  }
})();

// ====== Mail (env) ======
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.office365.com',
  port: Number(process.env.MAIL_PORT || 587),
  secure: false, // STARTTLS
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  },
  tls: { rejectUnauthorized: false }
});

// ====== Middlewares (CORS robusto) ======
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://opgranel.eurobraslogistica.com.br',
];

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // Postman/curl/SSR sem Origin
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
    if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // responde preflight de tudo

// ajuda proxies/cache a variar por origem
app.use((req, res, next) => {
  res.setHeader('Vary', 'Origin');
  next();
});

app.use(express.json()); // JSON body
app.use(express.urlencoded({ extended: true })); // form-encoded se precisar

app.use(session({
  secret: process.env.SESSION_SECRET || 'mude-este-valor',
  resave: true,
  saveUninitialized: true
}));

// log simples
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'n/a'}`);
  next();
});

// Primeira pesagem — retorna JSON com mensagem de sucesso
app.post(`${API_PREFIX}/pesagem/primeirapesagem`, async (req, res) => {
  try {
    const {
      COD_CARGA,
      COD_OPERACAO,
      PLACA_CAVALO,
      COD_MOTORISTA,
      PLACA_CARRETA,
      PLACA_CARRETA2,
      PLACA_CARRETA3,
      TIPO_VEICULO,
      COD_TRANSP,
      COD_DESTINO,
      PESO_TARA,
      DATA_TARA,
      USUARIO_TARA,
      STATUS_CARREG,
      USUARIO,
      DATA_CADASTRO,
      NR_PEDIDO,
      TIPO_PESAGEM,
    } = req.body || {};

    // validação mínima
    if (!COD_CARGA || !COD_OPERACAO || !PLACA_CAVALO || !COD_MOTORISTA || !COD_DESTINO || !DATA_TARA) {
      return res.status(400).json({ ok: false, error: "Campos obrigatórios ausentes." });
    }

    const sql = `
      INSERT INTO CARREGAMENTO (
        COD_CARGA, COD_OPERACAO, PLACA_CAVALO, COD_MOTORISTA,
        PLACA_CARRETA, PLACA_CARRETA2, PLACA_CARRETA3, TIPO_VEICULO,
        COD_TRANSP, COD_DESTINO, PESO_TARA, DATA_TARA, USUARIO_TARA,
        STATUS_CARREG, USUARIO, DATA_CADASTRO, PEDIDO_MIC, TIPO_PESAGEM
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    const params = [
      COD_CARGA, COD_OPERACAO, PLACA_CAVALO, COD_MOTORISTA,
      PLACA_CARRETA, PLACA_CARRETA2, PLACA_CARRETA3, TIPO_VEICULO,
      COD_TRANSP, COD_DESTINO, PESO_TARA, DATA_TARA, USUARIO_TARA,
      STATUS_CARREG, USUARIO, DATA_CADASTRO, NR_PEDIDO, TIPO_PESAGEM
    ];

    // >>>> AQUI: usa o pool correto (db)
    const [result] = await db.query(sql, params);

    console.log("Pesagem inserida. ID:", result?.insertId);

    // sucesso conclusivo
    return res.status(201).json({
      ok: true,
      id: result?.insertId,
      message: "Pesagem cadastrada com sucesso",
    });
  } catch (err) {
    console.error("[/pesagem/primeirapesagem][ERR]", err);
    return res.status(500).json({
      ok: false,
      error: "Erro interno ao registrar a primeira pesagem.",
      detail: err?.sqlMessage || err?.message || String(err),
    });
  }
});


// =================== ROTAS ===================

// TRANSPORTADORA
app.get(`${API_PREFIX}/transportadora`, async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM TRANSPORTADORA ORDER BY NOME_TRANSP');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// GET TIPOS DE VEÍCULOS
app.get(`${API_PREFIX}/tipoveiculo`, async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT COD_TIPO, DESC_TIPO_VEICULO FROM TIPO_VEICULO ORDER BY DESC_TIPO_VEICULO;'
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /tipoveiculo][ERR]', err);
    res.status(500).json({ ok: false, message: 'Erro ao buscar tipos de veículo.' });
  }
});

app.get(`${API_PREFIX}/transportadora/alterar`, async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT COD_TRANSP, NOME_TRANSP FROM TRANSPORTADORA ORDER BY NOME_TRANSP;'
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /transportadora/alterar][ERR]', err);
    res.status(500).json({ ok: false, message: 'Erro ao buscar transportadoras.' });
  }
});

// DOCUMENTO (para alterar)
app.get(`${API_PREFIX}/documento/alterar/:id`, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await db.query(
      'SELECT * FROM CARGA WHERE COD_OPERACAO = ?;',
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /documento/alterar/:id][ERR]', err);
    res.status(500).json({ ok: false, message: 'Erro ao buscar documentos da operação.' });
  }
});


// ====== CARGA: CRIAR (para resolver CORS do POST) ======
app.post(`${API_PREFIX}/carga/criar`, async (req, res) => {
  try {
    const {
      operacao,
      tipo,
      perigo,           // 'S' | 'N'
      numero,           // ex: "23/2335128-0" (com máscara) OU algo sem "/"
      emissao,          // 'YYYY-MM-DD'
      cliente,          // COD_CLIENTE
      referencia,       // pode vir vazio -> calculamos
      produto,          // COD_PRODUTO
      ncm,              // COD_NCM
      cemercante,
      manifestado,      // número
      emitirNF,         // 'S' | 'N'
      usuario,
      // datacadastro/status: mantemos NOW() e 1 na SQL
    } = req.body;

    // validações mínimas
    if (!operacao || !tipo || !numero || !emissao || !cliente || !produto || !ncm || !manifestado || !usuario) {
      return res.status(400).json({ ok: false, message: 'Campos obrigatórios ausentes.' });
    }

    // --- Derivador robusto de referência ---
    const deriveReferencia = (num) => {
      if (!num) return null;
      const s = String(num).toUpperCase().trim();
      // Se tiver "/", pega a parte após a barra
      const afterSlash = s.includes('/') ? s.split('/')[1] : s;

      // Caso ideal: termina com "####-X"
      const mEnd = afterSlash.match(/(\d{4}-[A-Z0-9])$/);
      if (mEnd) return mEnd[1];

      // Procura qualquer ocorrência "####-X"
      const mAny = afterSlash.match(/\d{4}-[A-Z0-9]/);
      if (mAny) return mAny[0];

      // Fallback: pega os últimos 5 dígitos e formata "####-X"
      const digits = afterSlash.replace(/\D/g, '');
      if (digits.length >= 5) {
        const last5 = digits.slice(-5);            // ex: "51280"
        return last5.slice(0, 4) + '-' + last5.slice(4); // "5128-0"
      }
      return null;
    };

    const numeroDoc = String(numero).toUpperCase().trim();   // grava exatamente o que veio (com máscara)
    const referenciaFinal = (referencia && String(referencia).trim())
      ? String(referencia).toUpperCase().trim()
      : deriveReferencia(numeroDoc);

    if (!referenciaFinal) {
      return res.status(400).json({
        ok: false,
        message: 'REFERENCIA não pôde ser derivada do número do documento. Informe no formato "##/#######-#" (ex.: 23/2335128-0).'
      });
    }

    const sql = `
      INSERT INTO CARGA (
        COD_OPERACAO, TIPO_DOC, NUMERO_DOC, DATA_EMISSAO, COD_CLIENTE,
        REFERENCIA, COD_PRODUTO, NCM, CE_MERCANTE, IND_CARGAIMO,
        QTDE_MANIFESTADA, EMITIR_NF, USUARIO, DATA_CADASTRO, STATUS_CARGA
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)
    `;

    const params = [
      operacao,                 // COD_OPERACAO
      tipo,                     // TIPO_DOC
      numeroDoc,                // NUMERO_DOC (com máscara)
      emissao,                  // DATA_EMISSAO
      cliente,                  // COD_CLIENTE
      referenciaFinal,          // REFERENCIA (nunca null)
      produto,                  // COD_PRODUTO
      ncm,                      // NCM
      cemercante || null,       // CE_MERCANTE
      perigo || 'N',            // IND_CARGAIMO
      Number(manifestado) || 0, // QTDE_MANIFESTADA
      emitirNF || 'N',          // EMITIR_NF
      usuario                   // USUARIO
      // DATA_CADASTRO -> NOW()
      // STATUS_CARGA  -> 1
    ];

    const [result] = await db.query(sql, params);

    res.set('Cache-Control', 'no-store');
    return res.status(201).json({
      ok: true,
      message: 'Carga criada com sucesso.',
      id: result?.insertId
    });
  } catch (err) {
    console.error('[CARGA_CRIAR][ERR]', err);
    return res.status(400).json({ ok: false, message: err?.sqlMessage || err?.message || 'Erro ao criar carga.' });
  }
});


// ====== CARGA: DELETE (para resolver CORS do DELETE) ======
app.delete(`${API_PREFIX}/carga/delete/:id`, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'ID inválido.' });
    }

    const [result] = await db.query('DELETE FROM CARGA WHERE COD_CARGA = ?', [id]);

    if ((result?.affectedRows || 0) === 0) {
      return res.status(404).json({ ok: false, message: 'Carga não encontrada.' });
    }

    console.log('[CARGA_DELETE] id:', id, 'affectedRows:', result.affectedRows);
    res.set('Cache-Control', 'no-store');
    return res.json({ ok: true, message: 'Carga deletada com sucesso.', affectedRows: result.affectedRows });
  } catch (err) {
    if (err?.code === 'ER_ROW_IS_REFERENCED_2' || err?.errno === 1451) {
      return res.status(409).json({
        ok: false,
        message: 'Não é possível excluir: há registros relacionados a esta carga.',
        code: err.code
      });
    }
    console.error('[CARGA_DELETE][ERR]', err);
    return res.status(500).json({ ok: false, message: err?.message || 'Erro ao deletar carga.' });
  }
});

// CARGAS PRO GRÁFICO
app.get(`${API_PREFIX}/grafico/:id`, async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await db.query(
      `
      SELECT CA.COD_OPERACAO,
             CA.TIPO_DOC,    
             CA.NUMERO_DOC,
             CL.NOME_REDUZIDO,
             SUM(DISTINCT CA.QTDE_MANIFESTADA) AS MANIFESTADO,
             SUM(CR.PESO_BRUTO - CR.PESO_TARA) AS PESO_CARREGADO,
             SUM(CR.PESO_CARREGADO) AS PESO_MOEGA,
             SUM(DISTINCT CA.QTDE_MANIFESTADA) - SUM(CR.PESO_BRUTO - CR.PESO_TARA) AS SALDO,
             ROUND(((SUM(CR.PESO_BRUTO - CR.PESO_TARA) / SUM(DISTINCT CA.QTDE_MANIFESTADA)) * 100),2) AS PERC
        FROM CARGA CA
        JOIN CARREGAMENTO CR
          ON CR.COD_OPERACAO = CA.COD_OPERACAO
         AND CR.COD_CARGA = CA.COD_CARGA
        JOIN CLIENTE CL 
          ON CL.COD_CLIENTE = CA.COD_CLIENTE
       WHERE CA.COD_OPERACAO = ?
         AND CR.PESO_CARREGADO > 0
         AND CR.STATUS_CARREG = 3
       GROUP BY CA.COD_OPERACAO, CA.TIPO_DOC, CA.NUMERO_DOC, CA.COD_CARGA, CL.NOME_REDUZIDO
      `,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// PORÃO PRO GRÁFICO
app.get(`${API_PREFIX}/grafico/porao/:id`, async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await db.query(
      `
      SELECT PL.COD_OPERACAO,
             PL.PORAO,
             PR.PRODUTO,
             FORMAT(SUM(DISTINCT PL.QTDE_MANIFESTADA/1000), 3, 'de_DE') AS MANIFESTADO,
             FORMAT(SUM(CR.PESO_BRUTO - CR.PESO_TARA)/1000, 3, 'de_DE') AS PESO_CARREGADO,
             FORMAT(SUM(CR.PESO_CARREGADO)/1000, 3, 'de_DE') AS PESO_MOEGA,
             FORMAT((SUM(DISTINCT PL.QTDE_MANIFESTADA) - SUM(CR.PESO_BRUTO - CR.PESO_TARA))/1000, 3, 'de_DE') AS SALDO,
             ROUND(((SUM(CR.PESO_BRUTO - CR.PESO_TARA) / SUM(DISTINCT PL.QTDE_MANIFESTADA)) * 100),2) AS PERC
        FROM PLANO_CARGA PL
        JOIN CARREGAMENTO CR
          ON CR.COD_OPERACAO = PL.COD_OPERACAO
         AND CR.PORAO = PL.PORAO
        JOIN PRODUTO PR
          ON PR.COD_PRODUTO = PL.COD_PRODUTO
       WHERE PL.COD_OPERACAO = ?
         AND CR.PESO_CARREGADO > 0
         AND CR.STATUS_CARREG = 3
       GROUP BY PL.COD_OPERACAO, PL.PORAO, PR.PRODUTO
      `,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// GRÁFICO PORTAL DO CLIENTE (usa ?usuario= na query string)
app.get(`${API_PREFIX}/grafico/portal/:id`, async (req, res) => {
  try {
    const id = req.params.id;
    const usuario = req.query.usuario; // <- vem na URL: /grafico/portal/123?usuario=fertiparmg

    if (!usuario) {
      return res.status(400).json({ ok: false, message: 'Parâmetro "usuario" é obrigatório.' });
    }

    const [rows] = await db.query(
      `
      SELECT CA.COD_OPERACAO,
             CA.TIPO_DOC,    
             CA.NUMERO_DOC,
             CL.NOME_REDUZIDO,
             SUM(DISTINCT CA.QTDE_MANIFESTADA) AS MANIFESTADO,
             SUM(CR.PESO_BRUTO - CR.PESO_TARA) AS PESO_CARREGADO,
             SUM(CR.PESO_CARREGADO) AS PESO_MOEGA,
             SUM(DISTINCT CA.QTDE_MANIFESTADA) - SUM(CR.PESO_BRUTO - CR.PESO_TARA) AS SALDO,
             ROUND(((SUM(CR.PESO_BRUTO - CR.PESO_TARA) / SUM(DISTINCT CA.QTDE_MANIFESTADA)) * 100),2) AS PERC
        FROM CARGA CA
        JOIN CARREGAMENTO CR
          ON CR.COD_OPERACAO = CA.COD_OPERACAO
         AND CR.COD_CARGA = CA.COD_CARGA
        JOIN CLIENTE CL 
          ON CL.COD_CLIENTE = CA.COD_CLIENTE
        JOIN EMPRESA_USUARIO EU
          ON EU.COD_EMPRESA = CA.COD_CLIENTE
         AND EU.TIPO_EMPRESA = 'C'
         AND EU.USUARIO = ?
       WHERE CA.COD_OPERACAO = ?
         AND CR.PESO_CARREGADO > 0
         AND CR.STATUS_CARREG = 3
       GROUP BY CA.COD_OPERACAO, CA.TIPO_DOC, CA.NUMERO_DOC, CA.COD_CARGA, CL.NOME_REDUZIDO
      `,
      [usuario, id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// DOCUMENTOS por operação
app.get(`${API_PREFIX}/documentos/:id`, async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await db.query(
      'SELECT COD_CARGA, NUMERO_DOC AS DOCUMENTO FROM CARGA WHERE COD_OPERACAO = ?',
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// NAVIOS
app.get(`${API_PREFIX}/navio`, async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM NAVIO');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// CRIAR NAVIO (com console.log detalhado)
app.post(`${API_PREFIX}/navio/criar`, async (req, res) => {
  const t0 = Date.now();
  const { nome, imo, bandeira, status, usuario } = req.body;

  // metadados úteis pra auditoria rápida
  const clientIp = (req.headers['x-forwarded-for']?.split(',')[0] || '').trim() || req.ip;
  const userAgent = req.headers['user-agent'] || '';
  const ts = new Date().toISOString();

  // Log de entrada da requisição
  console.log('[NAVIO_CREATE:REQ]', {
    ts, clientIp, userAgent, payload: { nome, imo, bandeira, status, usuario }
  });

  try {
    if (!nome || !imo || !bandeira || !status || !usuario) {
      console.warn('[NAVIO_CREATE:WARN] Campos obrigatórios ausentes');
      return res.status(400).json({ ok: false, message: 'Campos obrigatórios ausentes.' });
    }

    const sql = `
      INSERT INTO NAVIO (NOME_NAVIO, IMO_NAVIO, BANDEIRA, STATUS, USUARIO)
      VALUES (?,?,?,?,?)
    `;
    const params = [nome, imo, bandeira, status, usuario];

    const [result] = await db.query(sql, params);

    // Logs sobre o resultado do INSERT
    console.log('[NAVIO_CREATE:DB]', {
      affectedRows: result?.affectedRows,
      insertId: result?.insertId
    });

    const ms = Date.now() - t0;
    console.log('[NAVIO_CREATE:OK]', {
      id: result?.insertId, duration_ms: ms
    });

    return res.status(201).json({
      ok: true,
      message: 'Navio cadastrado com sucesso',
      id: result?.insertId
    });
  } catch (err) {
    const ms = Date.now() - t0;
    console.error('[NAVIO_CREATE:ERR]', {
      duration_ms: ms,
      code: err?.code,
      message: err?.message,
      sqlMessage: err?.sqlMessage
    });
    return res.status(400).json({
      ok: false,
      message: err?.sqlMessage || err?.message || 'Erro ao cadastrar navio',
      code: err?.code
    });
  }
});



//CRIAR UMA TRANSPORTADORA
app.post(`${API_PREFIX}/transportadora/criar`, (req, res) => {
    const nome = req.body.nome;
    const cnpj = req.body.cnpj;
  

    db.query('INSERT INTO TRANSPORTADORA (NOME_TRANSP, CNPJ_TRANSP) VALUES (?,?)',
        [nome, cnpj], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Transportadora adicionada!');
            }
        }
    )
});

//CRIAR UMA IMPORTADOR
app.post(`${API_PREFIX}/importador/criar`, (req, res) => {
    const nome = req.body.nome;
    const cnpj = req.body.cnpj;
    const nomereduzido = req.body.nomereduzido

    db.query('INSERT INTO CLIENTE (NOME_CLIENTE, CNPJ_CLIENTE, NOME_REDUZIDO) VALUES (?,?,?)',
        [nome, cnpj, nomereduzido], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Importador adicionado!');
            }
        }
    )
});


//CRIAR UMA DESTINO
app.post(`${API_PREFIX}/destino/criar`, (req, res) => {
    const nome = req.body.nome;
  

    db.query('INSERT INTO DESTINO (NOME_DESTINO) VALUES (?)',
        [nome], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Destino adicionado!');
            }
        }
    )
});


//CRIAR UMA NCM
app.post(`${API_PREFIX}/ncm/criar`, (req, res) => {
    const codncm = req.body.codncm;
    const descricao = req.body.descricao;
  

    db.query('INSERT INTO NCM (COD_NCM, DESCRICAO_NCM) VALUES (?,?)',
        [codncm, descricao], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('NCM adicionado!');
            }
        }
    )
});

//CRIAR UMA PRODUTO
app.post(`${API_PREFIX}/produto/criar`, (req, res) => {
    const produto = req.body.codncm;
    const unidade = 'KG';
    const ind_carga = 'N';
  

    db.query('INSERT INTO PRODUTO (PRODUTO, UN_MEDIDA, IND_CARGA_IMO) VALUES (?,?, ?)',
        [produto, unidade, ind_carga], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Produto adicionado!');
            }
        }
    )
});


//CRIAR UM PEDIDO
app.post(`${API_PREFIX}/pedido/criar`, (req, res) => {
    const operacao = req.body.operacao;
    const pedido = req.body.pedido;
    const documento = req.body.pedido;
    const transportadora = req.body.pedido;
    db.query('INSERT INTO PEDIDO ( COD_OPERACAO, NR_PEDIDO, COD_CARGA, COD_TRANSP) VALUES (?,?, ?,?)',
        [operacao, pedido, documento, transportadora], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Pedido adicionado!');
            }
        }
    )
});

// pedido - Consultar todas as pedidos
app.get(`${API_PREFIX}/pedido/consultar`, (req, res) => {
    const query = "SELECT * FROM PEDIDO ORDER BY ID_PEDIDO DESC;";
    db.query(query, (err, result) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(result);
        }
    });
});

// Transportadora - Consultar todas as transportadoras
app.get(`${API_PREFIX}/transportadora/consultar`, async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM TRANSPORTADORA ORDER BY NOME_TRANSP'
    );
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(rows);
  } catch (err) {
    console.error('[GET /api/transportadora/consultar][ERR]', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});



// Importador - Consultar todos os importadores
app.get(`${API_PREFIX}/importador/consultar`, async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM CLIENTE ORDER BY NOME_CLIENTE'
    );
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(rows);
  } catch (err) {
    console.error('[GET /importador/consultar][ERR]', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});


// Destino - Consultar todos os destinos
app.get(`${API_PREFIX}/destino/consultar`, async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM DESTINO ORDER BY NOME_DESTINO'
    );
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(rows);
  } catch (err) {
    console.error('[GET /destino/consultar][ERR]', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// NCM - Consultar todos os NCMs
app.get(`${API_PREFIX}/ncm/consultar`, async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT COD_NCM, DESCRICAO_NCM FROM NCM ORDER BY DESCRICAO_NCM'
    );
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(rows);
  } catch (err) {
    console.error('[GET /ncm/consultar][ERR]', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Produto - Consultar todos os produtos
app.get(`${API_PREFIX}/produto/consultar`, async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT COD_PRODUTO, PRODUTO, UN_MEDIDA FROM PRODUTO ORDER BY PRODUTO'
    );
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(rows);
  } catch (err) {
    console.error('[GET /produto/consultar][ERR]', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});



// EMPRESAS (mysql2/promise)
app.get(`${API_PREFIX}/empresas`, async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT COD_EMPRESA, NOME_EMPRESA FROM EMPRESA ORDER BY NOME_EMPRESA'
    );
    res.json(rows);
  } catch (err) {
    console.error('[EMPRESAS][ERR]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});


// AGENTES (mysql2/promise)
app.get(`${API_PREFIX}/agentes`, async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT COD_AGENTE, NOME_AGENTE FROM AGENTE ORDER BY NOME_AGENTE'
    );
    res.set('Cache-Control', 'no-store'); // opcional: evita 304
    res.json(rows);
  } catch (err) {
    console.error('[AGENTES][ERR]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// BERÇOS (mysql2/promise)
app.get(`${API_PREFIX}/bercos`, async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT COD_BERCO, NOME_BERCO FROM BERCO ORDER BY NOME_BERCO'
    );
    res.set('Cache-Control', 'no-store'); // opcional: evita 304
    res.json(rows);
  } catch (err) {
    console.error('[BERCOS][ERR]', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});


//AGENTE
app.get(`${API_PREFIX}/agentes`, (req, res) => {
    db.query("SELECT * FROM AGENTE;", (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

// === CLIENTES (lista com busca/ordem/paginação) ===
app.get(`${API_PREFIX}/clientes`, async (req, res) => {
  try {
    const {
      q = '',                 // busca por nome
      orderBy = 'NOME_CLIENTE',
      order = 'ASC',
      page = 1,
      pageSize = 200,
    } = req.query;

    const off = (Number(page) - 1) * Number(pageSize);
    const ordCol = ['NOME_CLIENTE','COD_CLIENTE','CNPJ_CLIENTE'].includes(orderBy) ? orderBy : 'NOME_CLIENTE';
    const ordDir = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const like = `%${q}%`;

    const [rows] = await db.query(
      `
      SELECT COD_CLIENTE, NOME_CLIENTE, CNPJ_CLIENTE
        FROM CLIENTE
       WHERE (? = '' OR NOME_CLIENTE LIKE ?)
       ORDER BY ${ordCol} ${ordDir}
       LIMIT ? OFFSET ?
      `,
      [q, like, Number(pageSize), off]
    );

    res.set('Cache-Control', 'no-store');
    return res.json(rows);
  } catch (err) {
    console.error('[CLIENTES][ERR]', err);
    return res.status(500).json({ ok:false, message: err.message });
  }
});


// === NCM (lista com busca/ordem/paginação) ===
app.get(`${API_PREFIX}/ncm`, async (req, res) => {
  try {
    const {
      q = '',                 // busca por código/descrição
      orderBy = 'COD_NCM',
      order = 'ASC',
      page = 1,
      pageSize = 200,
    } = req.query;

    const off = (Number(page) - 1) * Number(pageSize);
    const ordCol = ['COD_NCM','DESCRICAO_NCM'].includes(orderBy) ? orderBy : 'COD_NCM';
    const ordDir = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const like = `%${q}%`;

    const [rows] = await db.query(
      `
      SELECT COD_NCM, DESCRICAO_NCM
        FROM NCM
       WHERE (? = '' OR COD_NCM LIKE ? OR DESCRICAO_NCM LIKE ?)
       ORDER BY ${ordCol} ${ordDir}
       LIMIT ? OFFSET ?
      `,
      [q, like, like, Number(pageSize), off]
    );

    res.set('Cache-Control', 'no-store');
    return res.json(rows);
  } catch (err) {
    console.error('[NCM][ERR]', err);
    return res.status(500).json({ ok:false, message: err.message });
  }
});


// === PRODUTOS (lista com busca/ordem/paginação) ===
app.get(`${API_PREFIX}/produtos`, async (req, res) => {
  try {
    const {
      q = '',                 // busca por nome/código
      orderBy = 'PRODUTO',
      order = 'ASC',
      page = 1,
      pageSize = 200,
    } = req.query;

    const off = (Number(page) - 1) * Number(pageSize);
    const ordCol = ['PRODUTO','COD_PRODUTO','UN_MEDIDA'].includes(orderBy) ? orderBy : 'PRODUTO';
    const ordDir = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const like = `%${q}%`;

    const [rows] = await db.query(
      `
      SELECT COD_PRODUTO, PRODUTO, UN_MEDIDA
        FROM PRODUTO
       WHERE (? = '' OR PRODUTO LIKE ? OR COD_PRODUTO LIKE ?)
       ORDER BY ${ordCol} ${ordDir}
       LIMIT ? OFFSET ?
      `,
      [q, like, like, Number(pageSize), off]
    );

    res.set('Cache-Control', 'no-store');
    return res.json(rows);
  } catch (err) {
    console.error('[PRODUTOS][ERR]', err);
    return res.status(500).json({ ok:false, message: err.message });
  }
});


// LISTAR OPERAÇÕES (simples)
app.get(`${API_PREFIX}/operacao`, async (_req, res) => {
  try {
    const sql = `
      SELECT
        op.COD_OPERACAO,
        nv.NOME_NAVIO,
        be.NOME_BERCO,
        op.RAP,
        op.STATUS_OPERACAO,
        op.ETA,
        op.ATRACACAO_PREV,
        op.ATRACACAO,
        COALESCE(op.ATRACACAO, op.ATRACACAO_PREV, op.ETA) AS dataOrdenacao
      FROM OPERACAO op
      JOIN NAVIO nv        ON nv.COD_NAVIO = op.COD_NAVIO
      LEFT JOIN BERCO be   ON be.COD_BERCO = op.COD_BERCO
      ORDER BY COALESCE(op.ATRACACAO, op.ATRACACAO_PREV, op.ETA) DESC
    `;

    const [rows] = await db.query(sql);

    // (Opcional) normalizar datas para 'YYYY-MM-DD HH:mm:ss'
    const toIso = d => (d ? new Date(d).toISOString().slice(0, 19).replace('T', ' ') : null);
    const data = rows.map(r => ({
      ...r,
      ETA: toIso(r.ETA),
      ATRACACAO_PREV: toIso(r.ATRACACAO_PREV),
      ATRACACAO: toIso(r.ATRACACAO),
      dataOrdenacao: toIso(r.dataOrdenacao),
    }));

    res.set('Cache-Control', 'no-store');
    return res.json(data);
  } catch (err) {
    console.error('[OPERACAO_LIST_SIMPLE][ERR]', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});



// MOTIVOS DE PARALISAÇÃO
app.get(`${API_PREFIX}/motivos`, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM MOTIVO_PAR;');
    res.send(rows);
  } catch (err) {
    console.error('[GET /motivos][ERR]', err);
    res.status(500).json({ ok: false, message: 'Erro ao buscar motivos.' });
  }
});

// COMPLEMENTOS DE PARALISAÇÃO
app.get(`${API_PREFIX}/complementos`, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM COMPLEMENTO_PAR;');
    res.send(rows);
  } catch (err) {
    console.error('[GET /complementos][ERR]', err);
    res.status(500).json({ ok: false, message: 'Erro ao buscar complementos.' });
  }
});



// CRIAR OPERAÇÃO (mysql2/promise)
app.post(`${API_PREFIX}/operacao/criar`, async (req, res) => {
  const t0 = Date.now();

  // Extrai o payload
  const {
    empresa,
    navio,
    rap,
    agente,
    berco,
    eta,        // esperado: 'YYYY-MM-DD HH:mm'
    previsao,   // esperado: 'YYYY-MM-DD HH:mm'
    status,
    usuario,
    tipo,
    data        // esperado: 'YYYY-MM-DD HH:mm' (ou já com segundos)
  } = req.body;

  // Normaliza datas para 'YYYY-MM-DD HH:mm:ss'
  const toSec = (s) =>
    s && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s) ? `${s}:00` : s;

  const etaSec      = toSec(eta);
  const prevSec     = toSec(previsao);
  const cadastroSec = toSec(data);

  // Log de entrada (útil p/ auditoria)
  console.log('[OPERACAO_CREATE:REQ]', {
    ts: new Date().toISOString(),
    payload: {
      empresa, navio, rap, agente, berco,
      eta: etaSec, previsao: prevSec,
      status, usuario, tipo, data: cadastroSec
    }
  });

  try {
    // Validação básica
    if (!empresa || !navio || !agente || !berco || !etaSec || !prevSec || !status || !usuario || !tipo || !cadastroSec) {
      console.warn('[OPERACAO_CREATE:WARN] Campos obrigatórios ausentes');
      return res.status(400).json({
        ok: false,
        message: 'Campos obrigatórios ausentes.'
      });
    }

    // Monta o INSERT
    const sql = `
      INSERT INTO OPERACAO
        (COD_EMPRESA, COD_NAVIO, RAP, COD_AGENTE, COD_BERCO,
         ETA, ATRACACAO_PREV, STATUS_OPERACAO, USUARIO, TIPO, DAT_CADASTRO)
      VALUES (?,?,?,?,?,
              ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      empresa,
      navio,
      rap || null,
      agente,
      berco,
      etaSec,
      prevSec,
      status,
      usuario,
      tipo,
      cadastroSec
    ];

    const [result] = await db.query(sql, params);

    // Logs de saída
    const ms = Date.now() - t0;
    console.log('[OPERACAO_CREATE:DB]', {
      affectedRows: result?.affectedRows,
      insertId: result?.insertId
    });
    console.log('[OPERACAO_CREATE:OK]', { duration_ms: ms });

    return res.status(201).json({
      ok: true,
      message: 'Operação cadastrada com sucesso',
      id: result?.insertId
    });
  } catch (err) {
    const ms = Date.now() - t0;
    console.error('[OPERACAO_CREATE:ERR]', {
      duration_ms: ms,
      code: err?.code,
      message: err?.message,
      sqlMessage: err?.sqlMessage
    });
    return res.status(400).json({
      ok: false,
      message: err?.sqlMessage || err?.message || 'Erro ao cadastrar operação',
      code: err?.code
    });
  }
});


// Concluir documentação da operação -> atualiza STATUS_OPERACAO
app.put(`${API_PREFIX}/operacao/concluir/docs`, async (req, res) => {
  try {
    const { id, status } = req.body;

    const opId = Number(id);
    if (!Number.isInteger(opId) || opId <= 0) {
      return res.status(400).json({ ok: false, message: 'ID inválido.' });
    }

    // Se quiser permitir passar outro status via body:
    const newStatus = (typeof status === 'string' && status.trim())
      ? status.trim().toUpperCase()
      : 'AGUARDANDO ATRACAÇÃO';

    const [result] = await db.query(
      'UPDATE OPERACAO SET STATUS_OPERACAO = ? WHERE COD_OPERACAO = ?',
      [newStatus, opId]
    );

    if ((result?.affectedRows || 0) === 0) {
      return res.status(404).json({ ok: false, message: 'Operação não encontrada.' });
    }

    res.set('Cache-Control', 'no-store');
    return res.json({
      ok: true,
      message: 'Status atualizado com sucesso.',
      affectedRows: result.affectedRows,
      status: newStatus,
      id: opId
    });
  } catch (err) {
    console.error('[OPERACAO_CONCLUIR_DOCS][ERR]', err);
    return res.status(500).json({ ok: false, message: err?.message || 'Erro ao atualizar status da operação.' });
  }
});




app.put(`${API_PREFIX}/login`, (req, res) => {
    const usuario = req.body.usuario;
    const moega = req.body.moega;

    db.query("UPDATE USUARIO SET COD_MOEGA = ? WHERE USUARIO = ?",
        [usuario, moega],
        (err, result) => {
            if (err) {
                console.log(err)


                res.send(result)
            } else {
                res.send(result)
            }
        }
    )
})

app.put(`${API_PREFIX}/alterar/eta`, (req, res) => {
    const id = req.body.id;
    const eta = req.body.eta;

    db.query("UPDATE OPERACAO set ETA = ? WHERE COD_OPERACAO = ?;",
        [id, eta],
        (err, result) => {
            if (err) {
                console.log(err)
                res.send(result)
            } else {
                res.send(result)
            }
        }
    )
})

app.put(`${API_PREFIX}/operacao/status/paralisado`, (req, res) => {
    const id = req.body.id;

    db.query("UPDATE OPERACAO SET STATUS_OPERACAO = 'PARALISADO' WHERE COD_OPERACAO = ?",
        id,
        (err, result) => {
            if (err) {
                console.log(err)
                res.send(result)
            } else {
                res.send(result)
                console.log('status alterado')

            }
        }
    )
})

// Normaliza "2025-09-29T14:30" -> "2025-09-29 14:30:00"
function toMySQLDateTime(s) {
  if (!s) return null;
  let x = String(s).trim().replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(x)) x += ':00';
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(x)) return null;
  return x;
}

app.put(`${API_PREFIX}/operacao/registrar/atracacao`, (req, res) => {
  const { date, id } = req.body;

  const opId = Number(id);
  if (!Number.isInteger(opId) || opId <= 0) {
    return res.status(400).json({ ok: false, message: 'ID inválido.' });
  }

  const atracacao = toMySQLDateTime(date);
  if (!atracacao) {
    return res.status(400).json({
      ok: false,
      message: 'Data/hora inválida. Envie no formato "YYYY-MM-DDTHH:MM" (datetime-local).'
    });
  }

  db.query(
    "UPDATE OPERACAO SET ATRACACAO = ?, STATUS_OPERACAO = 'OPERANDO' WHERE COD_OPERACAO = ?",
    [atracacao, opId],
    (err, result) => {
      if (err) {
        console.error('[OPERACAO/REGISTRAR_ATRACACAO][ERR]', err);
        return res.status(500).json({ ok: false, message: err.message || 'Erro ao atualizar operação.' });
      }

      if (!result || result.affectedRows === 0) {
        return res.status(404).json({ ok: false, message: 'Operação não encontrada.' });
      }

      res.set('Cache-Control', 'no-store');
      return res.json({
        ok: true,
        message: 'Atracação registrada com sucesso.',
        id: opId,
        atracacao,
        status: 'OPERANDO',
        affectedRows: result.affectedRows
      });
    }
  );
});


// PERIODOS (mysql2/promise)
app.get(`${API_PREFIX}/periodos/horarios`, async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COD_PERIODO, DEN_PERIODO
         FROM PERIODO
         ORDER BY DEN_PERIODO`
    );
    res.set("Cache-Control", "no-store");
    return res.json(rows);
  } catch (err) {
    console.error("[PERIODOS][ERR]", err);
    return res.status(500).json({
      ok: false,
      message: err?.message || "Erro ao listar períodos."
    });
  }
});


// PERIODO - CRIAR (mysql2/promise)
app.post(`${API_PREFIX}/periodo/criar`, async (req, res) => {
  try {
    const {
      operacao,
      periodo,
      inicio,       // vindo de <input type="datetime-local"> (ex: "2025-09-29T07:30")
      berco,
      qtbordo,
      qtterra,
      porao,
      moega,
      conexo,
      requisicao,
      gerador,
      grab,
      usuario,
      dtcadastro    // "YYYY-MM-DD HH:mm:ss" (front já envia)
    } = req.body;

    // ---- validações mínimas
    if (
      !operacao || !periodo || !inicio || !berco || !qtbordo || !qtterra ||
      !porao || !moega || !gerador || !grab || !usuario
    ) {
      return res.status(400).json({ ok: false, message: 'Campos obrigatórios ausentes.' });
    }

    // ---- normalizações
    const opId      = Number(operacao);
    const perId     = Number(periodo);
    const bercoId   = Number(berco);
    const bordoNum  = Number(qtbordo);
    const terraNum  = Number(qtterra);
    const poraoNum  = Number(porao);
    const moegaId   = Number(moega);

    if (
      !Number.isFinite(opId)   || !Number.isFinite(perId)   || !Number.isFinite(bercoId) ||
      !Number.isFinite(bordoNum) || !Number.isFinite(terraNum) || !Number.isFinite(poraoNum) ||
      !Number.isFinite(moegaId)
    ) {
      return res.status(400).json({ ok: false, message: 'IDs/quantidades inválidos.' });
    }

    // DAT_INI_PERIODO: converter "YYYY-MM-DDTHH:mm" -> "YYYY-MM-DD HH:mm:ss"
    let inicioSql = String(inicio).trim();
    if (inicioSql.includes('T')) inicioSql = inicioSql.replace('T', ' ');
    // acrescenta segundos se vier sem
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(inicioSql)) {
      inicioSql = `${inicioSql}:00`;
    }

    const sql = `
      INSERT INTO PERIODO_OPERACAO (
        COD_OPERACAO,
        COD_PERIODO,
        DAT_INI_PERIODO,
        COD_BERCO,
        QTDE_BORDO,
        QTDE_TERRA,
        PORAO,
        COD_MOEGA,
        CONEXO,
        REQUISICAO,
        GERADOR,
        GRAB,
        USUARIO,
        DAT_CADASTRO
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      opId,
      perId,
      inicioSql,
      bercoId,
      bordoNum,
      terraNum,
      poraoNum,
      moegaId,
      conexo || null,
      requisicao || null,
      gerador || null,
      grab || null,
      String(usuario),
      dtcadastro || null, // se quiser usar NOW() no banco, troque por NOW() no SQL
    ];

    const [result] = await db.query(sql, params);

    res.set('Cache-Control', 'no-store');
    return res.status(201).json({
      ok: true,
      message: 'Período criado com sucesso.',
      id: result?.insertId
    });
  } catch (err) {
    console.error('[PERIODO_CRIAR][ERR]', err);
    // erros de chave estrangeira / integridade
    if (err?.code === 'ER_NO_REFERENCED_ROW_2' || err?.errno === 1452) {
      return res.status(409).json({
        ok: false,
        message: 'Referência inválida (operacao/periodo/berco/moega). Verifique os IDs.',
        code: err.code
      });
    }
    return res.status(500).json({
      ok: false,
      message: err?.sqlMessage || err?.message || 'Erro ao criar período.'
    });
  }
});


app.get(`${API_PREFIX}/periodo/busca/:id`, (req, res) => {
  const id = req.params.id;

  db.query(
    `
    SELECT
    COALESCE(
        (SELECT 
            CASE WHEN OP.DAT_FIM_PERIODO IS NULL THEN 1 ELSE 0 END
         FROM PERIODO_OPERACAO OP
         WHERE OP.COD_OPERACAO = ?
         ORDER BY OP.DAT_INI_PERIODO DESC, OP.SEQ_PERIODO_OP DESC
         LIMIT 1),
    0) AS EXISTE;
    `,
    [id],
    (err, result) => {
      if (err) {
        console.error('[GET /periodo/busca/:id][ERR]', err);
        return res
          .status(500)
          .json({ ok: false, message: err.sqlMessage || 'Erro ao verificar período.' });
      }
      res.set('Cache-Control', 'no-store');

      if (!result || result.length === 0) {
        return res.send([{ EXISTE: 0 }]); // sem períodos, considera fechado
      }

      return res.send(result); // [{ EXISTE: 1|0 }]
    }
  );
});

app.get(`${API_PREFIX}/portal/periodo/busca/:id`, (req, res) => {
  const id = req.params.id;

  db.query(
    `
     SELECT
    COALESCE(
        (SELECT 
            CASE WHEN OP.DAT_FIM_PERIODO IS NULL THEN 1 ELSE 0 END
         FROM PERIODO_OPERACAO OP
         WHERE OP.COD_OPERACAO = ?
         ORDER BY OP.DAT_INI_PERIODO DESC, OP.SEQ_PERIODO_OP DESC
         LIMIT 1),
    0) AS EXISTE;
    `,
    [id],
    (err, result) => {
      if (err) {
        console.error('[GET /portal/periodo/busca/:id][ERR]', err);
        return res
          .status(500)
          .json({ ok: false, message: err.sqlMessage || 'Erro ao verificar período.' });
      }
      res.set('Cache-Control', 'no-store');

      if (!result || result.length === 0) {
        return res.send([{ EXISTE: 0 }]);
      }

      return res.send(result); // [{ EXISTE: 1|0 }]
    }
  );
});


// GET /periodo/status/:id  -> retorna { cod_operacao, em_andamento }
app.get(`${API_PREFIX}/periodo/status/:id`, async (req, res) => {
  const id = Number(req.params.id);

  const sql = `
    SELECT 
      OP.COD_OPERACAO,
      CASE WHEN OP.DAT_FIM_PERIODO IS NULL THEN 1 ELSE 0 END AS EM_ANDAMENTO
    FROM PERIODO_OPERACAO OP
    WHERE OP.COD_OPERACAO = ?
    ORDER BY OP.DAT_INI_PERIODO DESC, OP.SEQ_PERIODO_OP DESC
    LIMIT 1
  `;

  try {
    const [rows] = await db.query(sql, [id]);
    res.set('Cache-Control', 'no-store');

    if (!rows || rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'Operação não encontrada.' });
    }

    // Ex.: { COD_OPERACAO: 104, EM_ANDAMENTO: 1 }
    const row = rows[0];
    return res.status(200).json({
      cod_operacao: row.COD_OPERACAO,
      em_andamento: row.EM_ANDAMENTO
    });
  } catch (err) {
    console.error('[GET /periodo/status/:id][ERR]', err);
    return res
      .status(500)
      .json({ ok: false, message: err.sqlMessage || 'Erro ao buscar status do período.' });
  }
});



app.get(`${API_PREFIX}/periodo/dashboard/:id`, async (req, res) => {
  const id = Number(req.params.id);

  const sql = `
    SELECT
      OP.SEQ_PERIODO_OP,
      OP.COD_OPERACAO,
      N.NOME_NAVIO,
      P.STATUS_OPERACAO,
      PE.DEN_PERIODO,
      SUM(CA.QTDE_MANIFESTADA) AS MANIFESTADO,
      OP.DAT_INI_PERIODO AS INI_PERIODO,
      BE.NOME_BERCO,
      MO.DESC_EQUIPAMENTO AS MOEGA,
      FC_PERIODO_CARREGAMENTO(OP.DAT_INI_PERIODO) AS PERIODO
    FROM PERIODO_OPERACAO OP
      JOIN PERIODO PE        ON PE.COD_PERIODO     = OP.COD_PERIODO
      JOIN OPERACAO P        ON P.COD_OPERACAO     = OP.COD_OPERACAO
      JOIN CARGA CA          ON CA.COD_OPERACAO    = OP.COD_OPERACAO
      JOIN NAVIO N           ON N.COD_NAVIO        = P.COD_NAVIO
      JOIN BERCO BE          ON BE.COD_BERCO       = OP.COD_BERCO
      JOIN EQUIPAMENTO MO    ON MO.COD_EQUIPAMENTO = OP.COD_MOEGA
    WHERE
      OP.COD_OPERACAO = ?
    GROUP BY
      OP.SEQ_PERIODO_OP,
      OP.COD_OPERACAO,
      N.NOME_NAVIO,
      P.STATUS_OPERACAO,
      PE.DEN_PERIODO,
      OP.DAT_INI_PERIODO,
      BE.NOME_BERCO,
      MO.DESC_EQUIPAMENTO,
      FC_PERIODO_CARREGAMENTO(OP.DAT_INI_PERIODO)
  `;

  try {
    const [rows] = await db.query(sql, [id]);
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(rows);
  } catch (err) {
    console.error('[GET /periodo/dashboard/:id][ERR]', err);
    return res
      .status(500)
      .json({ ok: false, message: err.sqlMessage || 'Erro ao buscar dashboard.' });
  }
});




app.put(`${API_PREFIX}/periodo/finalizar`, (req, res) => {
    const id = req.body.id;
    const data = req.body.data;
    const data_carreg = req.body.data_carreg
    const cod_operacao = req.body.cod_operacao; // Recebendo o COD_OPERACAO
console.log(data);

    // Primeiro: realizar o update no período de operação
    db.query(
        "UPDATE PERIODO_OPERACAO SET DAT_FIM_PERIODO = ? WHERE SEQ_PERIODO_OP = ?;",
        [data, id],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Erro ao finalizar o período.');
            }

            // Após o sucesso do UPDATE, realizar a QUERY1 desejada

            db.query(`
                  SELECT NA.NOME_NAVIO AS NAVIO,
                                                  BE.NOME_BERCO AS BERCO,
                                                  (SELECT MIN(FC_PERIODO_CARREGAMENTO(CA3.DATA_CARREGAMENTO))
                                                                 FROM CARREGAMENTO CA3
                                                               WHERE CA3.COD_OPERACAO = CG.COD_OPERACAO
                                                                  AND CA3.PESO_CARREGADO > 0
                                                                  AND CA3.STATUS_CARREG = 3
                                                                  AND FC_PERIODO_CARREGAMENTO(CA3.DATA_CARREGAMENTO) = ?
                                                               ) AS PERIODO,
                                                  CONCAT(PR.PRODUTO, ' (', CG.NCM, ')') AS PRODUTO,
                                                  CG.COD_CLIENTE,
                                                  CL.NOME_CLIENTE AS CLIENTE,
                                                  CG.NUMERO_DOC AS NUM_DI,
                                                  FORMAT(CG.QTDE_MANIFESTADA/1000, 3, 'de_DE') AS QTDE_MANIFESTADA,
                                                  (SELECT FORMAT(SUM(CG2.QTDE_MANIFESTADA/1000), 3, 'de_DE')
                                                                  FROM CARGA CG2
                                                                 WHERE CG2.COD_OPERACAO = CG.COD_OPERACAO
                                                               ) AS MANIFESTADO_NAVIO,
                                                  (SELECT FORMAT(SUM(CA3.PESO_CARREGADO/1000), 3, 'de_DE')
                                                                 FROM CARREGAMENTO CA3
                                                               WHERE CA3.COD_OPERACAO = CG.COD_OPERACAO
                                                                  AND CA3.PESO_CARREGADO > 0
                                                                  AND CA3.STATUS_CARREG = 3
                                                                  AND FC_PERIODO_CARREGAMENTO(CA3.DATA_CARREGAMENTO) = ?
                                                               ) AS CARREGADO_PERIODO,
                                                  (SELECT COUNT(CA2.ID_CARREGAMENTO)
                                                                  FROM CARREGAMENTO CA2
                                                                 WHERE CA2.COD_OPERACAO = CG.COD_OPERACAO
                                                                               AND CA2.PESO_CARREGADO > 0
                                                                               AND CA2.STATUS_CARREG = 3
                                                                               AND FC_PERIODO_CARREGAMENTO(CA2.DATA_CARREGAMENTO) = ?
                                                               ) AS QTDE_AUTOS_PERIODO,
                                                  (SELECT COUNT(CA.ID_CARREGAMENTO)
                                                                  FROM CARREGAMENTO CA
                                                                 WHERE CA.COD_OPERACAO = CG.COD_OPERACAO
                                                                               AND CA.COD_CARGA = CG.COD_CARGA
                                                                               AND CA.PESO_CARREGADO > 0
                                                                               AND CA.STATUS_CARREG = 3
                                                                               AND FC_PERIODO_CARREGAMENTO(CA.DATA_CARREGAMENTO) = ?
                                                               ) AS QTDE_AUTOS_DI,
                                                  IFNULL((SELECT FORMAT(SUM(CA.PESO_CARREGADO/1000), 3, 'de_DE')
                                                                  FROM CARREGAMENTO CA
                                                                 WHERE CA.COD_OPERACAO = CG.COD_OPERACAO
                                                                               AND CA.COD_CARGA = CG.COD_CARGA
                                                                               AND CA.PESO_CARREGADO > 0
                                                                               AND CA.STATUS_CARREG = 3
                                                                               AND FC_PERIODO_CARREGAMENTO(CA.DATA_CARREGAMENTO) = ?
                                                               ), 0) AS PESO_CARREGADO_DI,
                                                  IFNULL((SELECT FORMAT(SUM(CA4.PESO_CARREGADO/1000), 3, 'de_DE')
                                                                  FROM CARREGAMENTO CA4
                                                                 WHERE CA4.COD_OPERACAO = CG.COD_OPERACAO
                                                                               AND CA4.COD_CARGA = CG.COD_CARGA
                                                                               AND CA4.PESO_CARREGADO > 0
                                                                               AND CA4.STATUS_CARREG = 3
                                                                               AND CA4.DATA_CARREGAMENTO <= FC_DATA_FIM_PERIODO(?)
                                                               ), 0) AS MOV_DI_ATE_PERIODO,
                                                  IFNULL((SELECT FORMAT(SUM(CA4.PESO_CARREGADO/1000), 3, 'de_DE')
                                                                 FROM CARREGAMENTO CA4
                                                               WHERE CA4.COD_OPERACAO = CG.COD_OPERACAO
                                                                  AND CA4.PESO_CARREGADO > 0
                                                                  AND CA4.STATUS_CARREG = 3
                                                                  AND CA4.DATA_CARREGAMENTO <= FC_DATA_FIM_PERIODO(?)
                                                               ), 0) AS MOV_ATE_PERIODO,
                                                  FORMAT(FC_CALCULAR_SALDO_NAVIO(CG.COD_OPERACAO, ?)/1000, 3, 'de_DE') AS SALDO_NAVIO,
                                                  FORMAT((CG.QTDE_MANIFESTADA - IFNULL((SELECT SUM(CA.PESO_CARREGADO)
                                                                                                                                                                                                                FROM CARREGAMENTO CA
                                                                                                                                                                                                               WHERE CA.COD_OPERACAO = CG.COD_OPERACAO
                                                                                                                                                                                                                            AND CA.COD_CARGA = CG.COD_CARGA
                                                                                                                                                                                                                            AND CA.PESO_CARREGADO > 0
                                                                                                                                                                                                                            AND CA.STATUS_CARREG = 3
                                                                                                                                                                                                                            AND DATA_CARREGAMENTO <= FC_DATA_FIM_PERIODO(?)
                                                                                                                ), 0))/1000, 3, 'de_DE') AS SALDO_DI_ATE_PERIODO,
                                                  CONCAT(TIME_FORMAT(FC_DATA_FIM_PERIODO(?), "%H"), 'h') AS HORA
                                 FROM CARGA CG
                                 JOIN OPERACAO OP
                                               ON OP.COD_OPERACAO = CG.COD_OPERACAO
                                 JOIN NAVIO NA
                                               ON NA.COD_NAVIO = OP.COD_NAVIO
                                 JOIN BERCO BE
                                               ON BE.COD_BERCO = OP.COD_BERCO
                                 JOIN CLIENTE CL
                                               ON CL.COD_CLIENTE = CG.COD_CLIENTE
                                 JOIN PRODUTO PR
                                               ON PR.COD_PRODUTO = CG.COD_PRODUTO
                               WHERE CG.COD_OPERACAO = ?;`,
                [data_carreg, data_carreg, data_carreg, data_carreg, data_carreg, data_carreg, data_carreg, data_carreg, data_carreg, data_carreg, cod_operacao],
                (err, result1) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send('Erro ao realizar a consulta.');
                    }

                    // Gerar a tabela em HTML com os resultados da QUERY1
                    let tableHTML1 = `
                        <table border="1" cellspacing="0" cellpadding="5" style="border-collapse: collapse; width: 100%;">
                            <thead>
                                <tr style="background-color: #ced4d9">
                                    <th style="border: 1px solid #000000; padding: 8px; background-color: #f1c40f;">Documento</th>
                                    <th style="border: 1px solid #000000; padding: 8px;">Produto</th>
                                    <th style="border: 1px solid #000000; padding: 8px;">Manifestado (TON)</th>
                                    <th style="border: 1px solid #000000; padding: 8px;">Volume movimentado no período (TON)</th>
                                    <th style="border: 1px solid #000000; padding: 8px;">Autos</th>
                                    <th style="border: 1px solid #000000; padding: 8px;">Total movimentado desde o início da descarga (TON)</th>
                                    <th style="border: 1px solid #000000; padding: 8px;">Saldo por DI (TON)</th>
                                </tr>
                            </thead>
                            <tbody>`;

                        let previousPeriod = null;
                        let rowCount = 0;
                        let startRowIndex = 0;
                        let totalManifestado = 0;
                        let totalVolume = 0;
                        let totalAutos = 0;
                        let totalMovimentado = 0;
                        let totalSaldo = 0;
                        
                        result1.forEach((row, index) => {
                            totalManifestado = (row.MANIFESTADO_NAVIO) || 0;
                            totalVolume = (row.CARREGADO_PERIODO) || 0;
                            totalAutos = (row.QTDE_AUTOS_PERIODO) || 0;
                            totalMovimentado = (row.MOV_ATE_PERIODO) || 0;
                            totalSaldo = (row.SALDO_NAVIO) || 0;

                        if (row.PERIODO === previousPeriod) {
                            rowCount++; // Contando quantas linhas têm o mesmo período
                        } else {
                            // Se o período mudou e houve repetição do período anterior, unificar as células anteriores
                            if (rowCount > 0) {
                                tableHTML1 = tableHTML1.replace(`{{ROWSPAN_${startRowIndex}}}`, `rowspan="${rowCount + 1}"`);
                            }
                            // Resetando o contador e marcando o início do novo período
                            previousPeriod = row.PERIODO;
                            rowCount = 0;
                            startRowIndex = index;
                        }

                        tableHTML1 += `
                            <tr>
                               
                            <td style="border: 1px solid #000000; padding: 8px; background-color: #f1c40f;">${row.NUM_DI}</td>
                            <td style="border: 1px solid #000000; padding: 8px;">${row.PRODUTO}</td>
                            <td style="border: 1px solid #000000; padding: 8px;">${row.QTDE_MANIFESTADA}</td>
                            <td style="border: 1px solid #000000; padding: 8px;">${row.PESO_CARREGADO_DI}</td>
                            <td style="border: 1px solid #000000; padding: 8px;">${row.QTDE_AUTOS_DI}</td>
                            <td style="border: 1px solid #000000; padding: 8px;">${row.MOV_DI_ATE_PERIODO}</td>
                            <td style="border: 1px solid #000000; padding: 8px;">${row.SALDO_DI_ATE_PERIODO}</td>
                            </tr>`;
                    });
                    tableHTML1 += `
                    <tr style="background-color: #f1c40f;">
                       <td style="border: 1px solid #000000; padding: 8px; font-weight: bold;">TOTAIS</td>
    <td style="border: 1px solid #000000; padding: 8px; font-weight: bold;">-</td>
    <td style="border: 1px solid #000000; padding: 8px; font-weight: bold;">${totalManifestado}</td>
    <td style="border: 1px solid #000000; padding: 8px; font-weight: bold;">${totalVolume}</td>
    <td style="border: 1px solid #000000; padding: 8px; font-weight: bold;">${totalAutos}</td>
    <td style="border: 1px solid #000000; padding: 8px; font-weight: bold;">${totalMovimentado}</td>
    <td style="border: 1px solid #000000; padding: 8px; font-weight: bold;">${totalSaldo}</td>
                    </tr>`;
                

                    // Para o último período
                    if (rowCount > 0) {
                        tableHTML1 = tableHTML1.replace(`{{ROWSPAN_${startRowIndex}}}`, `rowspan="${rowCount + 1}"`);
                    }

                    // Remover placeholders não utilizados
                    tableHTML1 = tableHTML1.replace(/{{ROWSPAN_\d+}}/g, '');

                    tableHTML1 += `
                            </tbody>
                        </table>`;
 

                             // Executar a QUERY3
                    db.query(
                        `SELECT NA.NOME_NAVIO AS NAVIO,
		CL.NOME_CLIENTE AS CLIENTE,
		DE.NOME_DESTINO AS DESTINO,
        COUNT(CA.ID_CARREGAMENTO) AS QTDE_AUTOS,
        FORMAT(SUM(CA.PESO_CARREGADO/1000), 3, 'de_DE') AS PESO_CARREGADO
   FROM CARREGAMENTO CA
   JOIN CARGA CG
     ON CG.COD_CARGA = CA.COD_CARGA AND CG.COD_OPERACAO = CA.COD_OPERACAO
	JOIN CLIENTE CL
      ON CL.COD_CLIENTE = CG.COD_CLIENTE
	JOIN OPERACAO OP
      ON OP.COD_OPERACAO = CA.COD_OPERACAO
	JOIN NAVIO NA
      ON NA.COD_NAVIO = OP.COD_NAVIO
	JOIN DESTINO DE
      ON DE.COD_DESTINO = CA.COD_DESTINO
 WHERE CA.PESO_CARREGADO > 0
   AND CA.STATUS_CARREG = 3
   AND CA.COD_OPERACAO = ?
GROUP BY NA.NOME_NAVIO, CL.NOME_CLIENTE , CG.NUMERO_DOC, DE.NOME_DESTINO

UNION

 SELECT '' AS NAVIO, '' AS CLIENTE, 'TOTAL:' AS DESTINO, COUNT(CA.ID_CARREGAMENTO) AS QTDE_AUTOS, FORMAT(SUM(CA.PESO_CARREGADO/1000), 3, 'de_DE') AS PESO_CARREGADO
   FROM CARREGAMENTO CA
 WHERE CA.PESO_CARREGADO > 0
   AND CA.STATUS_CARREG = 3
   AND CA.COD_OPERACAO = ?;`,
                        [cod_operacao, cod_operacao],
                        (err, result3) => {
                            if (err) {
                                console.log(err);
                                return res.status(500).send('Erro ao realizar a consulta 2.');
                            }

                            // Gerar as tabelas em HTML com os resultados da QUERY3
                          let tableHTML3 =   `
                            <table border="1" cellspacing="0" cellpadding="5" style="border-collapse: collapse; width: 100%;">
                                <thead>
                                    <tr style="background-color: #ced4d9">
                                        <th style="border: 1px solid #000000; padding: 8px; background-color: #f1c40f;">Destino</th>
                                        <th style="border: 1px solid #000000; padding: 8px;">Autos</th>
                                        <th style="border: 1px solid #000000; padding: 8px;">Peso Descarregado (TON)</th>
                                    </tr>
                                </thead>
                                <tbody>`;
                        
                        result3.forEach((row, index) => {
                            // Verifica se é a última linha
                            const isLastRow = index === result3.length - 1;
                        
                            tableHTML3 += `
                                <tr style="${isLastRow ? 'background-color: #f1c40f;' : ''}">
                                    <td style="border: 1px solid #000000; padding: 8px;">${row.DESTINO || '-'}</td>
                                    <td style="border: 1px solid #000000; padding: 8px; text-align: center;">${row.QTDE_AUTOS}</td>
                                    <td style="border: 1px solid #000000; padding: 8px; text-align: right;">${row.PESO_CARREGADO}</td>
                                </tr>`;
                        });
                        
                        // Encerrando a tabela
                        tableHTML3 += `
                                </tbody>
                            </table>`;
                            
                        //Executar a QUERY4
                            db.query(
                                `SELECT NA.NOME_NAVIO AS NAVIO,
		CL.NOME_CLIENTE AS CLIENTE,
		DE.NOME_DESTINO AS DESTINO,
        COUNT(CA.ID_CARREGAMENTO) AS QTDE_AUTOS,
        FORMAT(SUM(CA.PESO_CARREGADO/1000), 3, 'de_DE') AS PESO_CARREGADO
   FROM CARREGAMENTO CA
   JOIN CARGA CG
     ON CG.COD_CARGA = CA.COD_CARGA AND CG.COD_OPERACAO = CA.COD_OPERACAO
	JOIN CLIENTE CL
      ON CL.COD_CLIENTE = CG.COD_CLIENTE
	JOIN OPERACAO OP
      ON OP.COD_OPERACAO = CA.COD_OPERACAO
	JOIN NAVIO NA
      ON NA.COD_NAVIO = OP.COD_NAVIO
	JOIN DESTINO DE
      ON DE.COD_DESTINO = CA.COD_DESTINO
 WHERE CA.PESO_CARREGADO > 0
   AND CA.STATUS_CARREG = 3
   AND CA.COD_OPERACAO = ?
      AND FC_PERIODO_CARREGAMENTO(CA.DATA_CARREGAMENTO) = ?
GROUP BY NA.NOME_NAVIO, CL.NOME_CLIENTE , CG.NUMERO_DOC, DE.NOME_DESTINO

UNION

 SELECT '' AS NAVIO, '' AS CLIENTE, 'TOTAL:' AS DESTINO, COUNT(CA.ID_CARREGAMENTO) AS QTDE_AUTOS, FORMAT(SUM(CA.PESO_CARREGADO/1000), 3, 'de_DE') AS PESO_CARREGADO
   FROM CARREGAMENTO CA
 WHERE CA.PESO_CARREGADO > 0
   AND CA.STATUS_CARREG = 3
   AND CA.COD_OPERACAO = ?
    AND FC_PERIODO_CARREGAMENTO(CA.DATA_CARREGAMENTO) = ?;`,
                                [cod_operacao, data_carreg, cod_operacao, data_carreg],
                                (err, result4) => {
                                    if (err) {
                                        console.log(err);
                                        return res.status(500).send('Erro ao realizar a consulta 2.');
                                    }
        
                                    // Gerar as tabelas em HTML com os resultados da QUERY3
                                  let tableHTML4 =   `
                                    <table border="1" cellspacing="0" cellpadding="5" style="border-collapse: collapse; width: 100%;">
                                        <thead>
                                            <tr style="background-color: #ced4d9">
                                                <th style="border: 1px solid #000000; padding: 8px; background-color: #f1c40f;">Destino</th>
                                                <th style="border: 1px solid #000000; padding: 8px;">Autos</th>
                                                <th style="border: 1px solid #000000; padding: 8px;">Peso Descarregado (TON)</th>
                                            </tr>
                                        </thead>
                                        <tbody>`;
                                
                                result4.forEach((row, index) => {
                                    // Verifica se é a última linha
                                    const isLastRow = index === result4.length - 1;
                                
                                    tableHTML4 += `
                                            <tr style="${isLastRow ? 'background-color: #f1c40f; ' : ''}">
                                            <td style="border: 1px solid #000000; padding: 8px;">${row.DESTINO || '-'}</td>
                                            <td style="border: 1px solid #000000; padding: 8px; text-align: center;">${row.QTDE_AUTOS}</td>
                                            <td style="border: 1px solid #000000; padding: 8px; text-align: right;">${row.PESO_CARREGADO}</td>
                                        </tr>`;
                                });
                                
                                // Encerrando a tabela
                                tableHTML4 += `
                                        </tbody>
                                    </table>`;
                                    
        
                    // Executar a QUERY2
                    db.query(
                        `SELECT 
                            FC_PERIODO_CARREGAMENTO(CA.DATA_CARREGAMENTO) AS PERIODO,
                            FORMAT(CA.PESO_CARREGADO / 1000, 3, 'de_DE') AS PESO_CARREGADO,
                            CONCAT(PR.PRODUTO, ' (', CG.NCM, ')') AS PRODUTO,
                            CL.NOME_REDUZIDO AS CLIENTE,
                            CG.NUMERO_DOC AS NUM_DI,
                            FORMAT(CG.QTDE_MANIFESTADA / 1000, 3, 'de_DE') AS QTDE_MANIFESTADA,
                            CA.ID_CARREGAMENTO,
                            CA.PLACA_CAVALO,
                            CA.PLACA_CARRETA,
                            DATE_FORMAT(CA.DATA_CARREGAMENTO, '%d/%m/%Y %H:%i') AS DATA_CARREGAMENTO,
                            FORMAT(CA.PESO_TARA / 1000, 3, 'de_DE') AS PESO_TARA,
                            FORMAT(CA.PESO_BRUTO / 1000, 3, 'de_DE') AS PESO_BRUTO,
                            FORMAT(CA.PESO_LIQUIDO / 1000, 3, 'de_DE') AS PESO_LIQUIDO,
                            CA.STATUS_CARREG
                        FROM 
                            CARREGAMENTO CA
                        JOIN 
                            CARGA CG ON CA.COD_CARGA = CG.COD_CARGA
                        JOIN 
                            PRODUTO PR ON CG.COD_PRODUTO = PR.COD_PRODUTO
                        JOIN 
                            CLIENTE CL ON CG.COD_CLIENTE = CL.COD_CLIENTE
                        JOIN 
                            PERIODO_OPERACAO PO ON CA.COD_OPERACAO = PO.COD_OPERACAO
                                                AND CA.DATA_CARREGAMENTO BETWEEN PO.DAT_INI_PERIODO AND COALESCE(PO.DAT_FIM_PERIODO, NOW())
                        WHERE 
                            CA.COD_OPERACAO = ?
                            AND PO.SEQ_PERIODO_OP = ?
                            AND CA.PESO_CARREGADO > 0
                            AND CA.STATUS_CARREG = 3
                        ORDER BY 
                            CA.DATA_CARREGAMENTO;`,
                        [cod_operacao, id],
                        (err, result2) => {
                            if (err) {
                                console.log(err);
                                return res.status(500).send('Erro ao realizar a consulta 2.');
                            }

                            // Gerar as tabelas em HTML com os resultados da QUERY2
                            let tableHTML2 = '';

                            // Agrupar por PERÍODO para cada tabela
                            let currentPeriod = null;
                            let currentTable = '';

                            result2.forEach((row, index) => {
                                // Verifica se o período mudou
                                if (row.PERIODO !== currentPeriod) {
                                    // Se houver uma tabela em construção, finalize-a e adicione ao HTML final
                                    if (currentTable !== '') {
                                        currentTable += `</tbody></table>`;
                                        tableHTML2 += `<h3><br>Período ${currentPeriod}</h3>${currentTable}`;
                                    }

                                    // Comece uma nova tabela para o novo período
                                    currentPeriod = row.PERIODO;
                                    currentTable = `
                                        <table border="1" cellspacing="0" cellpadding="5" style="border-collapse: collapse; width: 100%;">
                                            <thead>
                                                <tr style="background-color: #95a5a6;">
                                                    <th style="border: 1px solid #ddd; padding: 8px;">Ticket</th>
                                                    <th style="border: 1px solid #ddd; padding: 8px;">DI Número</th>
                                                    <th style="border: 1px solid #ddd; padding: 8px;">Peso Carregado (Tons)</th>
                                                    <th style="border: 1px solid #ddd; padding: 8px;">Placa Cavalo</th>
                                                    <th style="border: 1px solid #ddd; padding: 8px;">Placa Carreta</th>
                                                </tr>
                                            </thead>
                                            <tbody>`;
                                }

                                // Adicione a linha atual à tabela em construção
                                currentTable += `
                                    <tr>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${row.ID_CARREGAMENTO}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${row.NUM_DI}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${row.PESO_CARREGADO}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${row.PLACA_CAVALO}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${row.PLACA_CARRETA}</td>
                                    </tr>`;
                            });

                            // Adicione a última tabela ao HTML final
                            if (currentTable !== '') {
                                currentTable += `</tbody></table>`;
                                tableHTML2 += `<h3> ${currentPeriod}</h3>${currentTable}`;
                            }
                           
                           
                     
                            const nomeNavio = result1.length > 0 ? result1[0].NAVIO : 'Indisponível';
                            const periodo = currentPeriod || 'Indisponível';
                            const berco = result1.length > 0 ? result1[0].BERCO : 'Indisponível';
                            const total_movimentado = result1.length > 0 ? result1[0].MOV_ATE_PERIODO : 'Indisponível';
                            const total_saldo = result1.length > 0 ? result1[0].SALDO_NAVIO : 'Indisponível'; 
                            const hora = result1.length > 0 ? result1[0].HORA : 'Indisponível'; 
                            // Configurar o e-mail
                            const mailOptions = {
                                from: 'e-service.crm@rodrimar.com.br',
                                // to: 'jmichelotto@eurobraslogistica.com.br',
                                to: 'e-service.crm@rodrimar.com.br',
                                cc: 'jmichelotto@eurobraslogistica.com.br',
                                subject: `Fechamento de período - Navio ${nomeNavio} - ${periodo}`,
                                html: `

                                    <p>Olá!</p>
                                    <p>Seguem dados da operação até o momento:</p>
                                    <p>Período:<strong> ${periodo} </strong><br>
                                     🚢 Navio:<strong> ${nomeNavio} </strong></p>
                                    <p>Berço: <strong> ${berco} </strong> </p>
                                    <p>Total movimentado desde o início da descarga:<strong> ${total_movimentado} </strong><br>
                                     Saldo do Navio:<strong> ${nomeNavio} </strong> = <strong> ${total_saldo} TON </strong></p>
                                    <h3>Resumo Geral:</h3>
                                    ${tableHTML1}
                                    <h3>📍 Saldo descarregado por Destino do período ${periodo}:</h3>
                                    ${tableHTML4}
                                    <h3>⚓ Saldo descarregado por Destino do Navio ${nomeNavio}:</h3>
                                    ${tableHTML3}
                                    <h3>🚛 Autos carregados no período:</h3>
                                    ${tableHTML2}
                                    <p>Atenciosamente,
                                    <br>Eurobras S/A Logística Aduaneira.</p>
                                `
                            };
                            

                            // Enviar o e-mail
                            transporter.sendMail(mailOptions, (err, info) => {
                                if (err) {
                                    console.log(err);
                                    const logMessage = `Erro ao enviar e-mail para ${mailOptions.to} em ${new Date().toISOString()}: ${err.message}\n`;

                                    // Registrar erro no log
                                    fs.appendFile('email_log.txt', logMessage, (fsErr) => {
                                        if (fsErr) console.log('Erro ao registrar o log:', fsErr);
                                    });

                                    return res.status(500).send('Erro ao enviar o e-mail.');
                                }

                                // Registrar sucesso no log
                                const logMessage = `E-mail enviado com sucesso para ${mailOptions.to} em ${new Date().toISOString()}\n`;
                                fs.appendFile('email_log.txt', logMessage, (fsErr) => {
                                    if (fsErr) console.log('Erro ao registrar o log:', fsErr);
                                });

                                // Log no console
                                console.log(`E-mail enviado com sucesso para ${mailOptions.to} em ${new Date().toISOString()}`);

                                // Retornar a resposta de sucesso
                                res.send('Período finalizado e e-mail enviado com sucesso.');
                             });
                            }
                            );
                        }
                        );
                    }
                );
            }
        );
    }
    );
});

app.post(`${API_PREFIX}/periodo/dadosEmail`, (req, res) => {
    const { id, data } = req.body;

    console.log('Recebido ID para obter dados do email:', id);
    console.log('Recebido Data para obter dados do email:', data);

    const query = `
         SELECT NA.NOME_NAVIO AS NAVIO,
                                                  BE.NOME_BERCO AS BERCO,
                                                  (SELECT MIN(FC_PERIODO_CARREGAMENTO(CA3.DATA_CARREGAMENTO))
                                                                 FROM CARREGAMENTO CA3
                                                               WHERE CA3.COD_OPERACAO = CG.COD_OPERACAO
                                                                  AND CA3.PESO_CARREGADO > 0
                                                                  AND CA3.STATUS_CARREG = 3
                                                                  AND FC_PERIODO_CARREGAMENTO(CA3.DATA_CARREGAMENTO) = ?
                                                               ) AS PERIODO,
                                                  CONCAT(PR.PRODUTO, ' (', CG.NCM, ')') AS PRODUTO,
                                                  CG.COD_CLIENTE,
                                                  CL.NOME_CLIENTE AS CLIENTE,
                                                  CG.NUMERO_DOC AS NUM_DI,
                                                  FORMAT(CG.QTDE_MANIFESTADA/1000, 3, 'de_DE') AS QTDE_MANIFESTADA,
                                                  (SELECT FORMAT(SUM(CG2.QTDE_MANIFESTADA/1000), 3, 'de_DE')
                                                                  FROM CARGA CG2
                                                                 WHERE CG2.COD_OPERACAO = CG.COD_OPERACAO
                                                               ) AS MANIFESTADO_NAVIO,
                                                  (SELECT FORMAT(SUM(CA3.PESO_CARREGADO/1000), 3, 'de_DE')
                                                                 FROM CARREGAMENTO CA3
                                                               WHERE CA3.COD_OPERACAO = CG.COD_OPERACAO
                                                                  AND CA3.PESO_CARREGADO > 0
                                                                  AND CA3.STATUS_CARREG = 3
                                                                  AND FC_PERIODO_CARREGAMENTO(CA3.DATA_CARREGAMENTO) = ?
                                                               ) AS CARREGADO_PERIODO,
                                                  (SELECT COUNT(CA2.ID_CARREGAMENTO)
                                                                  FROM CARREGAMENTO CA2
                                                                 WHERE CA2.COD_OPERACAO = CG.COD_OPERACAO
                                                                               AND CA2.PESO_CARREGADO > 0
                                                                               AND CA2.STATUS_CARREG = 3
                                                                               AND FC_PERIODO_CARREGAMENTO(CA2.DATA_CARREGAMENTO) = ?
                                                               ) AS QTDE_AUTOS_PERIODO,
                                                  (SELECT COUNT(CA.ID_CARREGAMENTO)
                                                                  FROM CARREGAMENTO CA
                                                                 WHERE CA.COD_OPERACAO = CG.COD_OPERACAO
                                                                               AND CA.COD_CARGA = CG.COD_CARGA
                                                                               AND CA.PESO_CARREGADO > 0
                                                                               AND CA.STATUS_CARREG = 3
                                                                               AND FC_PERIODO_CARREGAMENTO(CA.DATA_CARREGAMENTO) = ?
                                                               ) AS QTDE_AUTOS_DI,
                                                  IFNULL((SELECT FORMAT(SUM(CA.PESO_CARREGADO/1000), 3, 'de_DE')
                                                                  FROM CARREGAMENTO CA
                                                                 WHERE CA.COD_OPERACAO = CG.COD_OPERACAO
                                                                               AND CA.COD_CARGA = CG.COD_CARGA
                                                                               AND CA.PESO_CARREGADO > 0
                                                                               AND CA.STATUS_CARREG = 3
                                                                               AND FC_PERIODO_CARREGAMENTO(CA.DATA_CARREGAMENTO) = ?
                                                               ), 0) AS PESO_CARREGADO_DI,
                                                  IFNULL((SELECT FORMAT(SUM(CA4.PESO_CARREGADO/1000), 3, 'de_DE')
                                                                  FROM CARREGAMENTO CA4
                                                                 WHERE CA4.COD_OPERACAO = CG.COD_OPERACAO
                                                                               AND CA4.COD_CARGA = CG.COD_CARGA
                                                                               AND CA4.PESO_CARREGADO > 0
                                                                               AND CA4.STATUS_CARREG = 3
                                                                               AND CA4.DATA_CARREGAMENTO <= FC_DATA_FIM_PERIODO(?)
                                                               ), 0) AS MOV_DI_ATE_PERIODO,
                                                  IFNULL((SELECT FORMAT(SUM(CA4.PESO_CARREGADO/1000), 3, 'de_DE')
                                                                 FROM CARREGAMENTO CA4
                                                               WHERE CA4.COD_OPERACAO = CG.COD_OPERACAO
                                                                  AND CA4.PESO_CARREGADO > 0
                                                                  AND CA4.STATUS_CARREG = 3
                                                                  AND CA4.DATA_CARREGAMENTO <= FC_DATA_FIM_PERIODO(?)
                                                               ), 0) AS MOV_ATE_PERIODO,
                                                  FORMAT(FC_CALCULAR_SALDO_NAVIO(CG.COD_OPERACAO, ?)/1000, 3, 'de_DE') AS SALDO_NAVIO,
                                                  FORMAT((CG.QTDE_MANIFESTADA - IFNULL((SELECT SUM(CA.PESO_CARREGADO)
                                                                                                                                                                                                                FROM CARREGAMENTO CA
                                                                                                                                                                                                               WHERE CA.COD_OPERACAO = CG.COD_OPERACAO
                                                                                                                                                                                                                            AND CA.COD_CARGA = CG.COD_CARGA
                                                                                                                                                                                                                            AND CA.PESO_CARREGADO > 0
                                                                                                                                                                                                                            AND CA.STATUS_CARREG = 3
                                                                                                                                                                                                                            AND DATA_CARREGAMENTO <= FC_DATA_FIM_PERIODO(?)
                                                                                                                ), 0))/1000, 3, 'de_DE') AS SALDO_DI_ATE_PERIODO,
                                                  CONCAT(TIME_FORMAT(FC_DATA_FIM_PERIODO(?), "%H"), 'h') AS HORA
                                 FROM CARGA CG
                                 JOIN OPERACAO OP
                                               ON OP.COD_OPERACAO = CG.COD_OPERACAO
                                 JOIN NAVIO NA
                                               ON NA.COD_NAVIO = OP.COD_NAVIO
                                 JOIN BERCO BE
                                               ON BE.COD_BERCO = OP.COD_BERCO
                                 JOIN CLIENTE CL
                                               ON CL.COD_CLIENTE = CG.COD_CLIENTE
                                 JOIN PRODUTO PR
                                               ON PR.COD_PRODUTO = CG.COD_PRODUTO
                               WHERE CG.COD_OPERACAO = ?;

    `;

    db.query(query, [data, data, data, data, data, data, data, data, data, data, id], (err, navioResult) => {
        if (err) {
            console.log('Erro ao obter informações do navio:', err);
            return res.status(500).json({ message: 'Erro ao obter informações do navio' });
        }

        if (navioResult.length === 0) {
            console.log('Nenhum resultado encontrado para o período especificado');
            return res.status(404).json({ message: 'Nenhum resultado encontrado para o período especificado' });
        }

        const navio = navioResult[0];
        console.log('Resultado da consulta:', navioResult);
        res.json(navioResult);
    });
});





// VEÍCULOS QUE JÁ FIZERAM TARA
app.get(`${API_PREFIX}/dashboard/veiculos/:id`, async (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      CA.ID_CARREGAMENTO,
      MT.NOME_MOTORISTA,
      CA.PLACA_CAVALO,
      CA.PESO_TARA,
      CA.PLACA_CARRETA,
      CA.PLACA_CARRETA2,
      CA.PLACA_CARRETA3,
      CA.DATA_TARA,
      CA.TIPO_VEICULO,
      TV.DESC_TIPO_VEICULO,
      CA.PEDIDO_MIC,
      CG.TIPO_DOC,
      CG.NUMERO_DOC,
      CA.COD_TRANSP,
      TP.NOME_TRANSP,
      COALESCE(CA.STATUS_NOTA_MIC, 1) AS STATUS_NOTA_MIC,
      CA.OBS_NOTA,
      CA.STATUS_CARREG,
      CA.PESO_CARREGADO,
      CA.TICKET,
      CA.DATA_CARREGAMENTO
    FROM CARREGAMENTO CA
      LEFT JOIN MOTORISTA      MT ON MT.COD_MOTORISTA  = CA.COD_MOTORISTA
      LEFT JOIN TIPO_VEICULO   TV ON TV.COD_TIPO       = CA.TIPO_VEICULO
      LEFT JOIN TRANSPORTADORA TP ON TP.COD_TRANSP     = CA.COD_TRANSP
      LEFT JOIN CARGA          CG ON CG.COD_OPERACAO   = CA.COD_OPERACAO
                                  AND CG.COD_CARGA     = CA.COD_CARGA
    WHERE
      CA.COD_OPERACAO = ?
      AND (
        CA.STATUS_CARREG = 1
        OR (
          CA.STATUS_CARREG = 3
          AND CA.PESO_TARA = 1000
          AND COALESCE(CA.STATUS_NOTA_MIC, 1) <> 6
        )
      )
    ORDER BY COALESCE(CA.DATA_TARA, CA.DATA_CARREGAMENTO) DESC
  `;

  try {
    const [rows] = await db.query(sql, [id]);
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(rows);
  } catch (err) {
    console.error('[GET /dashboard/veiculos/:id][ERR]', err);
    return res.status(500).json({
      ok: false,
      message: err.sqlMessage || 'Erro ao buscar veículos.'
    });
  }
});

// Buscar dados do carregamento para Alteração Cadastral
app.get(`${API_PREFIX}/alteracaocadastral/veiculos/:id`, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, message: 'ID inválido.' });
    }

    const sql = `
      SELECT
        CA.ID_CARREGAMENTO,
        CA.COD_OPERACAO,
        MT.NOME_MOTORISTA,
        CA.PLACA_CAVALO,
        CA.PESO_TARA,
        CA.PLACA_CARRETA,
        CA.PLACA_CARRETA2,
        CA.PLACA_CARRETA3,
        CA.DATA_TARA,
        CA.TIPO_VEICULO,
        TV.DESC_TIPO_VEICULO,
        CA.PEDIDO_MIC,
        CG.TIPO_DOC,
        CG.NUMERO_DOC,
        CA.COD_TRANSP,
        TP.NOME_TRANSP,
        CA.OBS_NOTA,
        CA.STATUS_CARREG,
        CA.PESO_CARREGADO,
        CA.TICKET,
        CA.DATA_CARREGAMENTO
      FROM CARREGAMENTO CA
        LEFT JOIN MOTORISTA      MT ON MT.COD_MOTORISTA  = CA.COD_MOTORISTA
        LEFT JOIN TIPO_VEICULO   TV ON TV.COD_TIPO       = CA.TIPO_VEICULO
        LEFT JOIN TRANSPORTADORA TP ON TP.COD_TRANSP     = CA.COD_TRANSP
        LEFT JOIN CARGA          CG ON CG.COD_OPERACAO   = CA.COD_OPERACAO
                                   AND CG.COD_CARGA      = CA.COD_CARGA
      WHERE CA.ID_CARREGAMENTO = ?
    `;

    const [rows] = await db.query(sql, [id]);
    res.set('Cache-Control', 'no-store');

    // Mantém array para compatibilidade com o front,
    // mas retorna 404 se não achar nada:
    if (!rows || rows.length === 0) {
      return res.status(404).json([]);
    }

    return res.status(200).json(rows);
  } catch (err) {
    console.error('[GET /alteracaocadastral/veiculos/:id][ERR]', err);
    return res.status(500).json({ ok: false, message: err.message || 'Erro ao buscar carregamento.' });
  }
});



// TOTAL DESCARREGADO NA OPERAÇÃO
app.get(`${API_PREFIX}/dashboard/descarregado/:id`, async (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      COALESCE(SUM(PESO_BRUTO - PESO_TARA), 0) AS DESCARREGADO
    FROM CARREGAMENTO
    WHERE COD_OPERACAO = ?
      AND PESO_CARREGADO > 0
      AND STATUS_CARREG = 3
  `;

  try {
    const [rows] = await db.query(sql, [id]);
    // Mantém compatível com o front (acessa res.data[0].DESCARREGADO)
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(rows);
  } catch (err) {
    console.error('[GET /dashboard/descarregado/:id][ERR]', err);
    return res.status(500).json({
      ok: false,
      message: err.sqlMessage || 'Erro ao obter total descarregado.'
    });
  }
});


// HORA A HORA NA OPERAÇÃO
app.get('/hora/autos/:id', (req, res) => {
  const { id } = req.params;

  const sql = `
  SELECT
  T.HORA,
  SUM(T.QUANTIDADE_AUTOS) AS QUANTIDADE_AUTOS
FROM (
  /* Autos efetivamente carregados por hora dentro do período aberto */
  SELECT
    (
      CASE
        WHEN HOUR(CAR.DATA_CARREGAMENTO) = 23 THEN '23:00 à 00:00'
        WHEN HOUR(CAR.DATA_CARREGAMENTO) = 0  THEN '00:00 à 01:00'
        ELSE CONCAT(
          LPAD(HOUR(CAR.DATA_CARREGAMENTO), 2, '0'), ':00 às ',
          LPAD(HOUR(CAR.DATA_CARREGAMENTO) + 1, 2, '0'), ':00'
        )
      END
    ) COLLATE utf8mb4_unicode_ci AS HORA,
    COUNT(*) AS QUANTIDADE_AUTOS,
    HOR.ORDEM
  FROM CARREGAMENTO CAR
  INNER JOIN VW_HORARIOS_2 HOR
    ON HOR.HORA = HOUR(CAR.DATA_CARREGAMENTO)
  WHERE CAR.STATUS_CARREG = 3
    AND CAR.PESO_BRUTO > 0
    AND CAR.COD_OPERACAO = ?
    AND CAR.DATA_CARREGAMENTO >= (
      SELECT PO.DAT_INI_PERIODO
      FROM PERIODO_OPERACAO PO
      WHERE PO.COD_OPERACAO = CAR.COD_OPERACAO
        AND PO.DAT_FIM_PERIODO IS NULL
      ORDER BY PO.DAT_INI_PERIODO DESC
      LIMIT 1
    )
    AND CAR.DATA_CARREGAMENTO <= (
      SELECT CASE
        WHEN TIME_FORMAT(PO.DAT_INI_PERIODO, '%H:%i:%s') BETWEEN '19:00:00' AND '23:59:59'
          THEN CONCAT(DATE_FORMAT(DATE_ADD(PO.DAT_INI_PERIODO, INTERVAL 1 DAY), '%Y-%m-%d'), ' ', PE.FIM_PERIODO, ':00')
        ELSE CONCAT(DATE_FORMAT(PO.DAT_INI_PERIODO, '%Y-%m-%d'), ' ', PE.FIM_PERIODO, ':00')
      END
      FROM PERIODO_OPERACAO PO
      INNER JOIN PERIODO PE ON PE.COD_PERIODO = PO.COD_PERIODO
      WHERE PO.COD_OPERACAO = CAR.COD_OPERACAO
        AND PO.DAT_FIM_PERIODO IS NULL
      ORDER BY PO.DAT_INI_PERIODO DESC
      LIMIT 1
    )
  GROUP BY 1, HOR.ORDEM

  UNION

  /* Linha base com todos os horários possíveis do período aberto */
  SELECT
    (H.HORARIO) COLLATE utf8mb4_unicode_ci AS HORA,
    H.QUANTIDADE_AUTOS,
    H.ORDEM
  FROM VW_HORARIOS_2 H
  WHERE H.INI_PERIODO = (
    SELECT HOUR(PO.DAT_INI_PERIODO)
    FROM PERIODO_OPERACAO PO
    INNER JOIN PERIODO PE ON PE.COD_PERIODO = PO.COD_PERIODO
    WHERE PO.COD_OPERACAO = 104
      AND PO.DAT_FIM_PERIODO IS NULL
    ORDER BY PO.DAT_INI_PERIODO DESC
    LIMIT 1
  )
) T
GROUP BY T.HORA, T.ORDEM
ORDER BY T.ORDEM;

  `;

  db.query(sql, [id, id], (err, rows) => {
    if (err) {
      console.error('[hora/autos][ERR]', err);
      return res.status(500).json({ ok: false, message: 'Erro ao calcular autos por hora.' });
    }
    res.send(rows);
  });
});




// SALDO TOTAL NA OPERAÇÃO
app.get(`${API_PREFIX}/dashboard/saldo/:id`, async (req, res) => {
  const { id } = req.params;

  // Soma manifestada - soma efetivamente carregada (em toneladas, 3 casas)
  const sql = `
    SELECT ROUND((
      COALESCE((
        SELECT SUM(QTDE_MANIFESTADA)
        FROM CARGA
        WHERE COD_OPERACAO = ?
      ), 0)
      -
      COALESCE((
        SELECT SUM(PESO_BRUTO - PESO_TARA)
        FROM CARREGAMENTO
        WHERE COD_OPERACAO = ?
          AND PESO_BRUTO > 0
          AND STATUS_CARREG = 3
      ), 0)
    ) / 1000, 3) AS SALDO
  `;

  try {
    const [rows] = await db.query(sql, [id, id]);
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(rows); // front espera array com [0].SALDO
  } catch (err) {
    console.error('[GET /dashboard/saldo/:id][ERR]', err);
    return res.status(500).json({
      ok: false,
      message: err.sqlMessage || 'Erro ao calcular saldo.'
    });
  }
});



// PARALISAÇÃO — criar (promise/async)
app.post(`${API_PREFIX}/paralisacao/criar`, async (req, res) => {
  const {
    operacao,
    periodo,
    motivo,
    obs,
    dtinicio,
    usuario,
    dtcadastro
  } = req.body;

  // Complemento ainda fixo como no código original
  const complemento = '1';

  const sql = `
    INSERT INTO PARALISACAO
      (COD_OPERACAO, SEQ_PERIODO_OP, COD_MOTIVO, COD_COMPL, OBSERVACAO, DATA_INICIO, USUARIO, DAT_CADASTRO)
    VALUES
      (?,?,?,?,?,?,?,?)
  `;

  try {
    const [result] = await db.query(sql, [
      Number(operacao),
      Number(periodo),
      Number(motivo),
      Number(complemento),
      obs ?? null,
      dtinicio,
      usuario,
      dtcadastro
    ]);

    res.status(201).json({
      ok: true,
      message: 'Paralisação criada com sucesso.',
      id: result.insertId,
      affectedRows: result.affectedRows
    });
  } catch (err) {
    console.error('[POST /paralisacao/criar][ERR]', err);
    res
      .status(500)
      .json({ ok: false, message: err.sqlMessage || 'Erro ao criar paralisação.' });
  }
});


// Lista paralisações do período (usando promise/async)
app.get(`${API_PREFIX}/paralisacao/periodo/:id`, async (req, res) => {
  const id = Number(req.params.id);

  const sql = `
    SELECT
      PA.SEQ_PARALISACAO,
      PA.COD_OPERACAO,
      MT.DESC_MOTIVO,
      TIMESTAMPDIFF(MINUTE, PA.DATA_INICIO, IFNULL(PA.DATA_TERMINO, NOW())) AS DURACAO
    FROM PARALISACAO PA
    JOIN MOTIVO_PAR MT
      ON MT.COD_MOTIVO = PA.COD_MOTIVO
    WHERE PA.SEQ_PERIODO_OP = ?
    ORDER BY PA.DAT_CADASTRO DESC
  `;

  try {
    const [rows] = await db.query(sql, [id]);
    res.set('Cache-Control', 'no-store');
    // Mantém compatibilidade: retorna array puro
    return res.status(200).json(rows);
  } catch (err) {
    console.error('[GET /paralisacao/periodo/:id][ERR]', err);
    return res
      .status(500)
      .json({ ok: false, message: err.sqlMessage || 'Erro ao listar paralisações.' });
  }
});



// Verifica se há paralisação em aberto para a operação
app.get(`${API_PREFIX}/verifica/paralisacao/:id`, async (req, res) => {
  const id = Number(req.params.id);

  const sql = `
    SELECT COUNT(*) AS count
    FROM PARALISACAO
    WHERE COD_OPERACAO = ?
      AND DATA_TERMINO IS NULL
  `;

  try {
    const [rows] = await db.query(sql, [id]);
    const raw = rows?.[0]?.count ?? rows?.[0]?.COUNT ?? 0;
    const count = Number(raw) || 0;

    res.set('Cache-Control', 'no-store');
    return res.json({ ok: true, count, exists: count > 0 });
  } catch (err) {
    console.error('[GET /verifica/paralisacao/:id][ERR]', err);
    return res
      .status(500)
      .json({ ok: false, message: err.sqlMessage || 'Erro ao verificar paralisação.' });
  }
});



// Verifica se existe carregamento (peso > 0) para a operação
app.get(`${API_PREFIX}/verifica/carregamento/:id`, async (req, res) => {
  const id = Number(req.params.id);

  const sql = `
    SELECT COUNT(*) AS count
    FROM CARREGAMENTO
    WHERE COD_OPERACAO = ?
      AND PESO_CARREGADO > 0
  `;

  try {
    const [rows] = await db.query(sql, [id]);
    const raw = rows?.[0]?.count ?? rows?.[0]?.COUNT ?? 0;
    const count = Number(raw) || 0;

    res.set('Cache-Control', 'no-store');
    return res.json({ ok: true, count, exists: count > 0 });
  } catch (err) {
    console.error('[GET /verifica/carregamento/:id][ERR]', err);
    return res
      .status(500)
      .json({ ok: false, message: err.sqlMessage || 'Erro ao verificar carregamento.' });
  }
});



// Encerrar paralisação
app.put(`${API_PREFIX}/encerrar/paralisacao`, (req, res) => {
  const { id, data } = req.body;

  if (!id || !data) {
    return res.status(400).json({ ok: false, message: 'Parâmetros obrigatórios: id e data.' });
  }

  const sql = `
    UPDATE PARALISACAO
       SET DATA_TERMINO = ?
     WHERE SEQ_PARALISACAO = ?
  `;

  db.query(sql, [data, id], (err, result) => {
    if (err) {
      console.error('[encerrar/paralisacao][ERR]', err);
      return res.status(500).json({ ok: false, message: 'Erro ao encerrar paralisação.' });
    }
    res.json({ ok: true, affectedRows: result?.affectedRows ?? 0 });
  });
});


// EQUIPAMENTOS (mysql2/promise)
app.get(`${API_PREFIX}/equipamentos`, async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COD_EQUIPAMENTO, DESC_EQUIPAMENTO
         FROM EQUIPAMENTO
         ORDER BY DESC_EQUIPAMENTO`
    );
    res.set("Cache-Control", "no-store");
    return res.json(rows);
  } catch (err) {
    console.error("[EQUIPAMENTOS][ERR]", err);
    return res.status(500).json({
      ok: false,
      message: err?.message || "Erro ao listar equipamentos."
    });
  }
});

// LISTAR DESTINOS
app.get(`${API_PREFIX}/destinos`, async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT
        COD_DESTINO,
        NOME_DESTINO
      FROM DESTINO
      ORDER BY NOME_DESTINO
      `
    );

    // Sempre retorna array (mesmo vazio) e evita cache
    res.set("Cache-Control", "no-store");
    return res.status(200).json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("[GET /destinos][ERR]", err);
    return res.status(500).json({
      ok: false,
      error: "Erro interno ao listar destinos.",
      detail: err?.sqlMessage || err?.message || String(err),
    });
  }
});


//VEICULOS
app.post(`${API_PREFIX}/motorista/criar`, (req, res) => {
    const nome = req.body.nome
    const cnh = null
    const cpf = req.body.cpf
    const usuario = req.body.usuario

    db.query('INSERT INTO MOTORISTA (NOME_MOTORISTA, CPF_MOTORISTA, CNH_MOTORISTA, USUARIO) VALUES (?,?,?,?)',
        [nome, cpf, cnh, usuario], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('motorista adicionado!');
            }
        }
    )
})

// Buscar motorista por CPF (usando cliente de promessa do mysql2)
app.get(`${API_PREFIX}/motorista/busca/:cpf`, async (req, res) => {
  // normaliza CPF para apenas dígitos
  const cpf = String(req.params.cpf || '').replace(/\D/g, '');

  const sql = 'SELECT * FROM MOTORISTA WHERE CPF_MOTORISTA = ?';

  try {
    const [rows] = await db.query(sql, [cpf]);
    res.set('Cache-Control', 'no-store');
    // Mantém compatibilidade com o front: retorna array (vazio ou com registros)
    return res.status(200).json(rows);
  } catch (err) {
    console.error('[GET /motorista/busca/:cpf][ERR]', err);
    return res
      .status(500)
      .json({ ok: false, message: err.sqlMessage || 'Erro ao buscar motorista.' });
  }
});

//consulta se ID CARREGAMENTO esta apto 

app.get(`${API_PREFIX}/valida/ticket/:idCarregamento`, (req, res) => {
    const idCarregamento = req.params.idCarregamento;

    db.query('SELECT ID_CARREGAMENTO, PESO_CARREGADO, PLACA_CAVALO FROM CARREGAMENTO WHERE ID_CARREGAMENTO = ?',
        idCarregamento, (err, result) => {
            if (err) {
                res.send(err)
                idCarregamento = {}
                console.log(err)
            } else {

                res.send(result)
                console.log(result);
            }
        }
    )
})

//informações enviada do banco - integração  
/*
app.put('/integrar/:idCarregamento', (req, res) => {
    const idCarregamento = req.params.idCarregamento;
    const peso2 = req.body.peso2
    const data = req.body.data
    const peso3 = req.body.peso3
    const usuario = req.body.usuario
    const moega = req.body.moega
    
    db.query(`
        UPDATE CARREGAMENTO
        SET PESO_CARREGADO = ?, 
        DATA_CARREGAMENTO  = ?, 
        PESO_LIQUIDO  =  (CASE TIPO_PESAGEM WHEN 'M' THEN ? WHEN 'C' THEN 0 END), 
        USUARIO_CARREG  = ?,
        STATUS_CARREG =  (CASE TIPO_PESAGEM WHEN 'M' THEN 3 WHEN 'C' THEN 2 END),
        INTEGRADO = 'S',
        COD_MOEGA = ?
        WHERE ID_CARREGAMENTO = ?
    `,[ peso2,
        data,
        peso3,
        usuario, 
        moega, 
        idCarregamento],
     (err, result) => {
        if (err){
            res.send(err)
            console.log(err)
        } else {
            
            res.send(result)
            console.log(result);
        }
    });

}) 
*/

// envia informações para ticket 

app.get(`${API_PREFIX}/impressao/busca/:idCarregamento`, (req, res) => {
    const idCarregamento = req.params.idCarregamento;

    db.query('SELECT * FROM VW_TICKET_CARREGAMENTO WHERE ID_CARREG = ?',
        idCarregamento, (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send(result)
                console.log(result);
            }
        }
    )
})

// exemplo com mysql2/promise (pool)
app.get(`${API_PREFIX}/ultimapesagem/busca/:id`, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Parâmetro :id inválido" });
    }

    const sql = `
      SELECT 
          -- Collate opcional para evitar conflitos quando a função retornar texto
          FC_PERIODO_CARREGAMENTO(CAR.DATA_TARA) COLLATE utf8mb4_unicode_ci       AS PERIODO_TARA,
          CAR.ID_CARREGAMENTO,
          MO.NOME_MOTORISTA,
          CAR.PLACA_CAVALO,
          CAR.PESO_TARA,
          CAR.DATA_TARA,
          CAR.PLACA_CARRETA,
          CAR.PLACA_CARRETA2,
          CAR.PLACA_CARRETA3,
          CAR.PEDIDO_MIC,
          CAR.TICKET,
          TV.DESC_TIPO_VEICULO AS TIPO_VEICULO,
          CG.TIPO_DOC, 
          CG.NUMERO_DOC,
          CAR.COD_DESTINO,
          CAR.PESO_CARREGADO,
          CAR.DATA_CARREGAMENTO,
          FC_PERIODO_CARREGAMENTO(CAR.DATA_CARREGAMENTO) COLLATE utf8mb4_unicode_ci AS PERIODO_CARREGAMENTO,
          COALESCE(CAR.STATUS_NOTA_MIC, 1) AS STATUS_NOTA_MIC,
          CAR.DATA_BRUTO,
          CAR.OBS_NOTA,
          CAR.STATUS_CARREG
      FROM CARREGAMENTO CAR
      JOIN MOTORISTA   MO ON MO.COD_MOTORISTA = CAR.COD_MOTORISTA
      JOIN TIPO_VEICULO TV ON TV.COD_TIPO     = CAR.TIPO_VEICULO
      JOIN CARGA       CG ON CG.COD_CARGA     = CAR.COD_CARGA
                          AND CG.COD_OPERACAO = CAR.COD_OPERACAO
      WHERE 
          CAR.COD_OPERACAO = ?
          AND (
            CAR.STATUS_CARREG = 2
            OR (
              CAR.STATUS_CARREG = 3
              AND CAR.PESO_TARA <> 1000
              AND COALESCE(CAR.STATUS_NOTA_MIC, 1) <> 6
            )
          )
      ORDER BY COALESCE(CAR.DATA_BRUTO, CAR.DATA_CARREGAMENTO, CAR.DATA_TARA) DESC
      LIMIT 200;
    `;

    const [rows] = await pool.execute(sql, [id]);

    if (!rows || rows.length === 0) {
      return res.status(204).send(); // sem conteúdo
    }

    return res.status(200).json(rows);
  } catch (err) {
    console.error("Erro em /ultimapesagem/busca/:id", err);
    return res.status(500).json({
      error: "Erro interno ao buscar última pesagem",
      detail: err?.sqlMessage || err?.message || String(err),
    });
  }
});


app.put(`${API_PREFIX}/segundapesagem`, (req, res) => {
    const id = req.body.id
    const peso2 = req.body.peso2
    const data = req.body.data
    const usuario = req.body.usuario
    const status = 2
    const ticket = req.body.ticket

    db.query(`
        UPDATE 
            CARREGAMENTO 
        SET 
            PESO_CARREGADO = ?, 
            DATA_CARREGAMENTO = ?, 
            USUARIO_CARREG = ?, 
            STATUS_CARREG = ?, 
            TICKET = ? 
        WHERE 
            ID_CARREGAMENTO = ?`,
        [
            peso2,
            data,
            usuario,
            status,
            ticket,
            id,
        ], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Segunda pesagem cadastrada!');
            }
        }
    )
})

app.put(`${API_PREFIX}/operacao/concluir/docs`, (req, res) => {
    const id = req.body.id;
    const status = req.body.nome;

    db.query("UPDATE OPERACAO SET STATUS_OPERACAO = 'AGUARDANDO ATRACAÇÃO' WHERE COD_OPERACAO = ?",
        [id, status],
        (err, result) => {
            if (err) {
                console.log(err)
                res.send(result)
            } else {
                res.send(result)
            }
        }
    )
})

app.put(`${API_PREFIX}/ultimapesagem`, (req, res) => {
    const peso3 = req.body.peso3
    const data = req.body.data
    const usuario = req.body.usuario
    const status = 3
    const id = req.body.id

    db.query(`
        UPDATE 
            CARREGAMENTO 
        SET 
            PESO_LIQUIDO = ?, 
            DATA_BRUTO = ?, 
            USUARIO_BRUTO = ?, 
            STATUS_CARREG = ? 
        WHERE ID_CARREGAMENTO = ?`,
        [
            peso3,
            data,
            usuario,
            status,
            id
        ], (err, result) => {
            console.log();

            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Ultima pesagem cadastrada!');
                console.log(result);
            }
        }
    )
})
// BUSCAR CARGAS POR OPERAÇÃO (mysql2/promise)
app.get(`${API_PREFIX}/carga/busca/:id`, async (req, res) => {
  try {
    // validação do parâmetro
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, message: 'Parâmetro "id" inválido.' });
    }

    const sql = `
      SELECT 
          CA.COD_CARGA,
          CA.COD_OPERACAO,
          NV.NOME_NAVIO,
          NV.IMO_NAVIO,
          NV.BANDEIRA,
          NV.STATUS,
          CA.TIPO_DOC       AS TIPO,
          CA.NUMERO_DOC     AS NUMERO,
          CA.REFERENCIA,
          CL.NOME_CLIENTE   AS IMPORTADOR,
          CA.DATA_EMISSAO,
          PR.PRODUTO,
          CA.NCM,
          CA.CE_MERCANTE,
          CA.IND_CARGAIMO   AS PERIGOSO,
          CA.QTDE_MANIFESTADA
      FROM operacaogranel.CARGA CA
      JOIN operacaogranel.OPERACAO OP ON OP.COD_OPERACAO = CA.COD_OPERACAO
      JOIN operacaogranel.NAVIO    NV ON NV.COD_NAVIO    = OP.COD_NAVIO
      JOIN operacaogranel.CLIENTE  CL ON CL.COD_CLIENTE  = CA.COD_CLIENTE
      JOIN operacaogranel.PRODUTO  PR ON PR.COD_PRODUTO  = CA.COD_PRODUTO
      WHERE CA.COD_OPERACAO = ?
      ORDER BY CA.COD_CARGA DESC
    `;

    const [rows] = await db.query(sql, [id]);

    // evita cache agressivo do browser
    res.set('Cache-Control', 'no-store');
    return res.json(rows);
  } catch (err) {
    console.error('[CARGA_BUSCA][ERR]', { id: req.params.id, code: err?.code, message: err?.message });
    return res.status(500).json({ ok: false, message: err?.message || 'Erro ao buscar cargas.' });
  }
});


app.post(`${API_PREFIX}/periodo/carregamentos/:id`, (req, res) => {
    const id = req.params.id;
    const { data } = req.body;  //DD/MM/YYYY 13h⁰⁰/19h⁰⁰ formato que deve ser passado a data e periodo '10/05/2023 13h⁰⁰/19h⁰⁰'

    db.query(`
    SELECT 
    CAR.ID_CARREGAMENTO,
MO.NOME_MOTORISTA,
CAR.ID_CARREGAMENTO,
CAR.PLACA_CAVALO,
CAR.PESO_TARA,
CAR.PESO_CARREGADO,
FC_PERIODO_CARREGAMENTO(CAR.DATA_CARREGAMENTO) AS PERIODO_CARREGAMENTO,
CAR.PESO_BRUTO,
CAR.DATA_BRUTO,
CONCAT(CG.TIPO_DOC, " ", CG.NUMERO_DOC ) AS DOCUMENTO,
FC_PERIODO_CARREGAMENTO(CAR.DATA_BRUTO) AS PERIODO_BRUTO,
(CAR.PESO_BRUTO - CAR.PESO_TARA) AS PESO_LIQUIDO,
(CAR.PESO_BRUTO - CAR.PESO_TARA - CAR.PESO_CARREGADO) AS DIFERENCA,
ROUND((((CAR.PESO_BRUTO - CAR.PESO_TARA - CAR.PESO_CARREGADO) / CAR.PESO_CARREGADO) * 100), 2) AS PERCENTUAL,
CAR.STATUS_CARREG,
COALESCE(CAR.STATUS_NOTA_MIC, 1) as STATUS_NOTA_MIC
FROM CARREGAMENTO CAR 
JOIN MOTORISTA MO 
 ON MO.COD_MOTORISTA = CAR.COD_MOTORISTA
JOIN TIPO_VEICULO TV 
 ON TV.COD_TIPO = CAR.TIPO_VEICULO
JOIN CARGA CG
 ON CG.COD_OPERACAO = CAR.COD_OPERACAO
AND CG.COD_CARGA = CAR.COD_CARGA 
WHERE 
CAR.STATUS_CARREG = 3 
AND CAR.PESO_BRUTO > 0 
AND CAR.COD_OPERACAO = ?
AND FC_PERIODO_CARREGAMENTO(CAR.DATA_CARREGAMENTO) = ? 
ORDER BY 
DATA_CARREGAMENTO

    `, [id, data], (err, result) => {
        if (err) {
            console.log(err)
        } else {
            console.log(id, data);
            res.send(result)

        }
    });
});

app.post(`${API_PREFIX}/portal/relatorios/:id`, (req, res) => {
    const id = req.params.id;
    const { data } = req.body;
    const usuario = req.body.usuario

    db.query(`
    SELECT 
    CAR.ID_CARREGAMENTO,
MO.NOME_MOTORISTA,
CAR.ID_CARREGAMENTO,
CAR.PLACA_CAVALO,
CAR.PESO_TARA,
CAR.PESO_CARREGADO,
FC_PERIODO_CARREGAMENTO(CAR.DATA_CARREGAMENTO) AS PERIODO_CARREGAMENTO,
CAR.PESO_BRUTO,
CAR.DATA_BRUTO,
CONCAT(CG.TIPO_DOC, " ", CG.NUMERO_DOC ) AS DOCUMENTO,
FC_PERIODO_CARREGAMENTO(CAR.DATA_BRUTO) AS PERIODO_BRUTO,
(CAR.PESO_BRUTO - CAR.PESO_TARA) AS PESO_LIQUIDO,
(CAR.PESO_BRUTO - CAR.PESO_TARA - CAR.PESO_CARREGADO) AS DIFERENCA,
ROUND((((CAR.PESO_BRUTO - CAR.PESO_TARA - CAR.PESO_CARREGADO) / CAR.PESO_CARREGADO) * 100), 2) AS PERCENTUAL,
CAR.STATUS_CARREG,
COALESCE(CAR.STATUS_NOTA_MIC, 1) as STATUS_NOTA_MIC
FROM CARREGAMENTO CAR 
JOIN MOTORISTA MO 
 ON MO.COD_MOTORISTA = CAR.COD_MOTORISTA
JOIN TIPO_VEICULO TV 
 ON TV.COD_TIPO = CAR.TIPO_VEICULO
JOIN CARGA CG
 ON CG.COD_OPERACAO = CAR.COD_OPERACAO
AND CG.COD_CARGA = CAR.COD_CARGA
JOIN EMPRESA_USUARIO EU
  ON EU.COD_EMPRESA = CG.COD_CLIENTE
 AND EU.TIPO_EMPRESA = 'C'
 AND EU.USUARIO = ?
WHERE 
CAR.STATUS_CARREG = 3 
AND CAR.PESO_BRUTO > 0 
AND CAR.COD_OPERACAO = ?
AND FC_PERIODO_CARREGAMENTO(CAR.DATA_CARREGAMENTO) = ?
ORDER BY 
DATA_CARREGAMENTO

    `, [id, data, usuario], (err, result) => {
        if (err) {
            console.log(err)
        } else {
            console.log(id, data);
            res.send(result)

        }
    });
});

app.post(`${API_PREFIX}/periodo/documentos/:id`, (req, res) => {
  const id = Number(req.params.id);
  const rawPeriodo = (req.body && req.body.data) || ""; // ex.: '01/07/2023 01h00/07h00'
  const periodo = String(rawPeriodo).trim();

  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "Parâmetro :id inválido" });
  }
  if (!periodo) {
    return res.status(400).json({ error: "Campo 'data' (período) é obrigatório" });
  }

  // Use a collation ÚNICA e CONSISTENTE. Aqui, padronizei para utf8mb4_0900_ai_ci (MySQL 8).
  // Se o seu servidor estiver em utf8mb4_unicode_ci, troque TODAS as ocorrências abaixo por utf8mb4_unicode_ci.
  const sql = `
    SELECT
      CA2.PERIODO,
      CA2.DOCUMENTO AS DOC_CARGA,
      COUNT(CA2.ID_CARREGAMENTO) AS QTDE_AUTOS_CARGA,
      SUM(CA2.PESO_LIQUIDO)      AS PESO_LIQUIDO_CARGA
    FROM (
      SELECT
        -- Normaliza o documento para a MESMA collation do resto
        (CONCAT(CG.TIPO_DOC, ' ', CG.NUMERO_DOC) COLLATE utf8mb4_0900_ai_ci) AS DOCUMENTO,
        CAR.ID_CARREGAMENTO,
        -- Normaliza o período calculado da função
        FC_PERIODO_CARREGAMENTO(CAR.DATA_CARREGAMENTO) COLLATE utf8mb4_0900_ai_ci AS PERIODO,
        (CAR.PESO_BRUTO - CAR.PESO_TARA) AS PESO_LIQUIDO
      FROM CARREGAMENTO CAR
      JOIN CARGA CG
        ON CG.COD_OPERACAO = CAR.COD_OPERACAO
       AND CG.COD_CARGA    = CAR.COD_CARGA
      WHERE CAR.STATUS_CARREG  = 3
        AND CAR.PESO_BRUTO     > 0
        AND CAR.COD_OPERACAO   = ?
        -- >>> AQUI é onde o erro acontece sem normalização <<<
        AND FC_PERIODO_CARREGAMENTO(CAR.DATA_CARREGAMENTO) COLLATE utf8mb4_0900_ai_ci
            = CONVERT(? USING utf8mb4) COLLATE utf8mb4_0900_ai_ci
      ORDER BY CAR.DATA_CARREGAMENTO
    ) CA2
    GROUP BY CA2.DOCUMENTO, CA2.PERIODO
  `;

  db.query(sql, [id, id], (err, rows) => {
    if (err) {
      console.error("Erro em /periodo/documentos/:id", err);
      return res.status(500).json({
        error: "Erro interno ao buscar documentos por período",
        detail: err?.sqlMessage || err?.message || String(err),
      });
    }
    return res.status(200).json(Array.isArray(rows) ? rows : []);
  });
});



app.post(`${API_PREFIX}/periodo/autos/:id`, (req, res) => {
  const id = Number(req.params.id);
  const rawPeriodo = (req.body && req.body.data) || "";
  const periodo = String(rawPeriodo).trim(); // exemplo: '03/12/2024 01h00/07h00'

  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "Parâmetro :id inválido" });
  }
  if (!periodo) {
    return res.status(400).json({ error: "Campo 'data' (período) é obrigatório" });
  }

  // Se o seu MySQL usa utf8mb4_0900_ai_ci, troque *todas* as ocorrências de utf8mb4_unicode_ci
  // por utf8mb4_0900_ai_ci abaixo.
  const sql = `
    WITH base AS (
      SELECT
        CAR.ID_CARREGAMENTO,
        FC_PERIODO_CARREGAMENTO(CAR.DATA_CARREGAMENTO) COLLATE utf8mb4_unicode_ci AS PERIODO,
        (CAR.PESO_BRUTO - CAR.PESO_TARA) AS PESO_LIQUIDO
      FROM CARREGAMENTO CAR
      WHERE CAR.STATUS_CARREG  = 3
        AND CAR.PESO_CARREGADO > 0
        AND CAR.COD_OPERACAO   = ?
        AND FC_PERIODO_CARREGAMENTO(CAR.DATA_CARREGAMENTO) COLLATE utf8mb4_unicode_ci
            = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci
    )
    SELECT 
      b.PERIODO,
      COUNT(b.ID_CARREGAMENTO) AS QTDE_AUTOS,
      SUM(b.PESO_LIQUIDO)      AS PESO_LIQUIDO
    FROM base b
    GROUP BY b.PERIODO

    UNION ALL

    SELECT
      CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci AS PERIODO,
      0 AS QTDE_AUTOS,
      0 AS PESO_LIQUIDO
    FROM DUAL
    WHERE NOT EXISTS (SELECT 1 FROM base);
  `;

  // params:
  // 1) id (numérico)
  // 2) periodo para filtrar
  // 3) periodo para a linha fallback zerada
  db.query(sql, [id, id, id], (err, rows) => {
    if (err) {
      console.error("Erro em /periodo/autos/:id", err);
      return res.status(500).json({
        error: "Erro interno ao buscar autos por período",
        detail: err?.sqlMessage || err?.message || String(err),
      });
    }

    // Agora sempre retornamos 200. Se não havia dados, vem 1 linha zerada.
    return res.status(200).json(rows || []);
  });
});



app.put(`${API_PREFIX}/alterar/docs`, (req, res) => {
    const { id, data, tara, usuario } = req.body

    db.query("UPDATE CARREGAMENTO SET `PESO_TARA` = ? WHERE (`ID_CARREGAMENTO` = ?);",
        [tara, data, usuario, id], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Tara atualizada!');
            }
        }
    )
})

app.put(`${API_PREFIX}/alterar/tara`, (req, res) => {
    const { id, data, tara, usuario } = req.body

    db.query("UPDATE CARREGAMENTO SET `PESO_TARA` = ?, `DATA_TARA` = ?, `USUARIO_TARA` = ? WHERE (`ID_CARREGAMENTO` = ?);",
        [tara, data, usuario, id], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Tara atualizada!');
            }
        }
    )
})


app.put(`${API_PREFIX}/alterarultima/tara`, (req, res) => {
    const { id, tara, usuario } = req.body

    db.query("UPDATE CARREGAMENTO SET `PESO_TARA` = ?,  `USUARIO_TARA` = ? WHERE (`ID_CARREGAMENTO` = ?);",
        [tara, usuario, id], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Tara atualizada!');
            }
        }
    )
})

app.put(`${API_PREFIX}/alterar/pesomoega`, (req, res) => {
    const { id, moega, usuario } = req.body

    db.query("UPDATE CARREGAMENTO SET  `PESO_CARREGADO` = ?, `USUARIO_CARREG` = ? WHERE (`ID_CARREGAMENTO` = ?);",
        [moega, usuario, id], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Peso moega atualizado!');
            }
        }
    )
})

//carga/criar
app.put(`${API_PREFIX}/alterar/cavalo`, (req, res) => {
    const { placa, id } = req.body

    db.query("UPDATE CARREGAMENTO SET `PLACA_CAVALO` = ? WHERE (`ID_CARREGAMENTO` = ?);",
        [placa, id], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Placa cavalo alterada!');
            }
        }
    )
})

//veiculo/atualiza
app.put(`${API_PREFIX}/alterar/carreta1`, (req, res) => {
    const { id, placa } = req.body

    db.query("UPDATE CARREGAMENTO SET `PLACA_CARRETA` = ? WHERE (`ID_CARREGAMENTO` = ?);",
        [placa, id], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Placa 1 alterada! !');
            }
        }
    )
})

app.put(`${API_PREFIX}/alterar/carreta2`, (req, res) => {
    const { id, placa } = req.body

    db.query("UPDATE CARREGAMENTO SET `PLACA_CARRETA2` = ? WHERE (`ID_CARREGAMENTO` = ?);",
        [placa, id], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Placa 2 alterada! ');
            }
        }
    )
})

app.put(`${API_PREFIX}/alterar/carreta3`, (req, res) => {
    const { placa, id } = req.body

    db.query("UPDATE CARREGAMENTO SET `PLACA_CARRETA3` = ? WHERE (`ID_CARREGAMENTO` = ?);",
        [placa, id], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Placa 3 alterada!');
            }
        }
    )
})

app.put(`${API_PREFIX}/transporadora/atualiza`, (req, res) => {
    const { transporadora, id } = req.body

    db.query("UPDATE CARREGAMENTO SET `COD_TRANSP` = ? WHERE (`ID_CARREGAMENTO` = ?);",
        [transporadora, id], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Tipo do veiculo alterado!');
            }
        }
    )
});

app.put(`${API_PREFIX}/documento/atualiza`, (req, res) => {
    const { documento, id } = req.body

    db.query("UPDATE CARREGAMENTO SET `COD_CARGA` = ? WHERE (`ID_CARREGAMENTO` = ?);",
        [doumento, id], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('DI/BL alterado!');
            }
        }
    )
});

app.put(`${API_PREFIX}/veiculo/atualiza`, (req, res) => {
    const { tipoveiculo, id } = req.body

    db.query("UPDATE CARREGAMENTO SET `TIPO_VEICULO` = ? WHERE (`ID_CARREGAMENTO` = ?);",
        [tipoveiculo, id], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Tipo do veiculo alterado!');
            }
        }
    )
});

app.put(`${API_PREFIX}/documentos/atualiza`, (req, res) => {
    const { pedido, id } = req.body


    db.query("UPDATE CARREGAMENTO SET `PEDIDO_MIC` = ? WHERE (`ID_CARREGAMENTO` = ?);",
        [pedido, id], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Pedido alterado!');
            }
        }
    )
});

app.put(`${API_PREFIX}/carregamento/excluir`, (req, res) => {
    const { motivo, usuario, data_exclusao, id } = req.body


    db.query("UPDATE CARREGAMENTO SET STATUS_CARREG = 8, MOTIVO_EXCLUSAO = ?, USUARIO_EXCLUSAO = ?, DATA_EXCLUSAO = ? WHERE (`ID_CARREGAMENTO` = ?);",
        [motivo, usuario, data_exclusao, id ], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Pedido alterado!');
            }
        }
    )
});


//CARGAS PRO GRAFICO
app.get(`${API_PREFIX}/relatorios`, (req, res) => {
    db.query(`
        SELECT CA.COD_OPERACAO,
            NA.NOME_NAVIO,
            CA.TIPO_DOC,
            CA.NUMERO_DOC,
            SUM(CA.QTDE_MANIFESTADA) AS MANIFESTADO,
            SUM(CR.PESO_CARREGADO) AS PESO_CARREGADO,
            SUM(CA.QTDE_MANIFESTADA) - SUM(CR.PESO_CARREGADO) AS SALDO,
            (SUM(CR.PESO_CARREGADO) / SUM(CA.QTDE_MANIFESTADA) * 100) AS SALDO
        FROM CARGA CA
            INNER JOIN CARREGAMENTO CR
                ON CR.COD_OPERACAO = CA.COD_OPERACAO
                AND CR.COD_CARGA = CA.COD_CARGA
            INNER JOIN OPERACAO OP
                ON OP.COD_OPERACAO = CA.COD_OPERACAO
            INNER JOIN NAVIO NA
                ON NA.COD_NAVIO = OP.COD_NAVIO
        GROUP BY 
            CA.COD_OPERACAO, NA.NOME_NAVIO, CA.TIPO_DOC, CA.NUMERO_DOC
        `, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})




// Listar navios para relatório
app.get(`${API_PREFIX}/relatorios/operacoes`, async (_req, res) => {
  try {
    const sql = `
      SELECT
        op.COD_OPERACAO,
        nv.NOME_NAVIO,
        nv.IMO_NAVIO,
        op.RAP,
        op.ATRACACAO,
        op.ATRACACAO_PREV,
        op.ETA,
        nv.BANDEIRA
      FROM OPERACAO op
      JOIN NAVIO nv ON nv.COD_NAVIO = op.COD_NAVIO
      ORDER BY COALESCE(op.ATRACACAO, op.ATRACACAO_PREV, op.ETA) DESC
    `;
    const [rows] = await db.query(sql);
    res.set('Cache-Control', 'no-store');
    return res.json(rows);
  } catch (err) {
    console.error('[relatorios/operacoes][ERR]', err);
    return res.status(500).json({
      ok: false,
      message: err.sqlMessage || 'Erro ao listar operações para relatório.',
    });
  }
});



// Períodos para relatório
app.get(`${API_PREFIX}/periodos/gerais/:id`, async (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      O.COD_OPERACAO,
      O.COD_NAVIO,
      CONCAT(N.NOME_NAVIO, ' (', O.RAP, ')') AS NAVIO,
      PO.SEQ_PERIODO_OP,
      FC_PERIODO_CARREGAMENTO(PO.DAT_INI_PERIODO) AS PERIODO
    FROM OPERACAO O
    INNER JOIN NAVIO N
      ON N.COD_NAVIO = O.COD_NAVIO
    INNER JOIN PERIODO_OPERACAO PO
      ON PO.COD_OPERACAO = O.COD_OPERACAO
    WHERE O.COD_OPERACAO = ?
    ORDER BY PO.SEQ_PERIODO_OP DESC
  `;

  try {
    const [rows] = await db.query(sql, [id]);
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(rows);
  } catch (err) {
    console.error('[GET /periodos/gerais/:id][ERR]', err);
    return res.status(500).json({
      ok: false,
      message: err.sqlMessage || 'Erro ao listar períodos.'
    });
  }
});



app.get('/portal/periodos/gerais/:id', (req, res) => {
    const id = req.params.id;

    db.query(`   
        SELECT O.COD_OPERACAO,
        O.COD_NAVIO,
        CONCAT(N.NOME_NAVIO, " (", O.RAP, ")") AS NAVIO,
        PO.SEQ_PERIODO_OP,
        FC_PERIODO_CARREGAMENTO(PO.DAT_INI_PERIODO) AS PERIODO
        FROM operacaogranel.OPERACAO O
        INNER JOIN operacaogranel.NAVIO N
        ON N.COD_NAVIO = O.COD_NAVIO
        INNER JOIN operacaogranel.PERIODO_OPERACAO PO
        ON PO.COD_OPERACAO = O.COD_OPERACAO
        WHERE O.COD_OPERACAO = ?
        ORDER BY PERIODO DESC;         
    `, id, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    }
    )
})



app.post('/operacao/paralisacao/:id', (req, res) => {
    const id = req.params.id;
    const { data } = req.body;  //DD/MM/YYYY 13h⁰⁰/19h⁰⁰ formato que deve ser passado a data e periodo '10/05/2023 13h⁰⁰/19h⁰⁰'

    db.query(`
    SELECT PA2.COD_OPERACAO,
    PA2.MOTIVO,
    TIME_FORMAT(SEC_TO_TIME(SUM(PA2.DURACAO)), "%H:%i") AS HORAS
FROM ( SELECT PA.COD_OPERACAO,
            MO.DESC_MOTIVO AS MOTIVO,
            TIME_TO_SEC(TIMEDIFF(PA.DATA_TERMINO, PA.DATA_INICIO)) AS DURACAO
       FROM PARALISACAO PA
            JOIN MOTIVO_PAR MO ON MO.COD_MOTIVO = PA.COD_MOTIVO
      WHERE PA.COD_OPERACAO = ?
     ) PA2
GROUP BY PA2.COD_OPERACAO, PA2.MOTIVO
ORDER BY COD_OPERACAO, MOTIVO;

    `, [id, data], (err, result) => {
        if (err) {
            console.log(err)
        } else {
            console.log(id, data);
            res.send(result)

        }
    });
});

app.post('/login/user', (req, res) => {
    const usuario = req.body.usuario;
    const senha = req.body.senha;

    console.log('Recebendo requisição para usuário:', usuario);
    console.log('Senha recebida:', senha);

    db.query(` SELECT * FROM USUARIO WHERE USUARIO = ? AND SENHA = ?`, [usuario, senha], (err, result) => {
        if (err) {
            console.error('Erro ao verificar o usuário: ' + err);
            res.status(500).json({ message: 'Erro interno ao verificar o usuário. Tente novamente.' });
        } else {
            if (result.length > 0) {
                console.log('Usuário conectou');
                req.session.user = usuario;
                res.status(200).json({ message: 'Login bem-sucedido' });
            } else {
                res.status(400).json({ message: 'Login falhou. Verifique suas credenciais.' });
            }
        }
    });
});

// Puxa a última placa usada pelo motorista (histórico mais recente)
app.get('/pesageminicial/historico/:cpf', async (req, res) => {
  try {
    const { cpf } = req.params;

    // Normaliza CPF removendo ., - e espaços (tanto no banco quanto no parâmetro)
    const sql = `
      SELECT
        M.COD_MOTORISTA,
        M.NOME_MOTORISTA,
        M.CPF_MOTORISTA,
        O.COD_OPERACAO,
        N.NOME_NAVIO,
        O.RAP AS VIAGEM,
        C.TIPO_VEICULO,
        C.DATA_TARA,
        C.PLACA_CAVALO,
        C.PLACA_CARRETA,
        C.PLACA_CARRETA2,
        C.PLACA_CARRETA3
      FROM MOTORISTA M
      JOIN CARREGAMENTO C ON M.COD_MOTORISTA = C.COD_MOTORISTA
      JOIN OPERACAO O     ON C.COD_OPERACAO = O.COD_OPERACAO
      JOIN NAVIO N        ON O.COD_NAVIO    = N.COD_NAVIO
      WHERE REPLACE(REPLACE(REPLACE(M.CPF_MOTORISTA, '.', ''), '-', ''), ' ', '') =
            REPLACE(REPLACE(REPLACE(?,                '.', ''), '-', ''), ' ', '')
      ORDER BY C.DATA_TARA DESC, C.ID_CARREGAMENTO DESC
      LIMIT 1;
    `;

    const [rows] = await db.query(sql, [cpf]);
    res.set('Cache-Control', 'no-store');
    // Mantém compatível com o front (espera array e lê rows[0])
    return res.json(rows);
  } catch (err) {
    console.error('[GET /pesageminicial/historico/:cpf][ERR]', err);
    return res.status(500).json({ ok: false, message: err.message || 'Erro ao buscar histórico do motorista.' });
  }
});



app.post('/operacao/complemento/:id', (req, res) => {
    const id = req.params.id;
    const { data } = req.body;  //DD/MM/YYYY 13h⁰⁰/19h⁰⁰ formato que deve ser passado a data e periodo '10/05/2023 13h⁰⁰/19h⁰⁰'

    db.query(`
    SELECT PA2.COD_OPERACAO,
    PA2.COMPLEMENTO,
    PA2.OBSERVACAO,
    TIME_FORMAT(SEC_TO_TIME(SUM(PA2.DURACAO)), "%H:%i") AS HORA
FROM ( SELECT PA.COD_OPERACAO,
            CO.DESC_COMPL AS COMPLEMENTO,
            PA.OBSERVACAO AS OBSERVACAO,
            TIME_TO_SEC(TIMEDIFF(PA.DATA_TERMINO, PA.DATA_INICIO)) AS DURACAO
       FROM PARALISACAO PA
            JOIN COMPLEMENTO_PAR CO ON CO.COD_COMPL = PA.COD_COMPL
      WHERE PA.COD_OPERACAO = ?
     ) PA2
GROUP BY PA2.COD_OPERACAO, PA2.COMPLEMENTO, PA2.OBSERVACAO
ORDER BY COD_OPERACAO, COMPLEMENTO;


    `, [id, data], (err, result) => {
        if (err) {
            console.log(err)
        } else {
            console.log(id, data);
            res.send(result)

        }
    });
});

//Relatorio Por Operação 
app.get('/operacao/gerais/:id', (req, res) => {
    const id = req.params.id;

    db.query(`   
    SELECT O.COD_OPERACAO,
    O.COD_NAVIO,
    CONCAT(N.NOME_NAVIO, " (", O.RAP, ")") AS NAVIO
    FROM operacaogranel.OPERACAO O
    INNER JOIN operacaogranel.NAVIO N
    ON N.COD_NAVIO = O.COD_NAVIO
    WHERE O.COD_OPERACAO = ?;        
    `, id, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    }
    )
})

app.post('/operacao/autos/:id', (req, res) => {
    const id = req.params.id;
    const { data } = req.body;  //DD/MM/YYYY 13h⁰⁰/19h⁰⁰ formato que deve ser passado a data e periodo '10/05/2023 13h⁰⁰/19h⁰⁰'

    db.query(`
      SELECT CAR.COD_OPERACAO,
	   COUNT(CAR.ID_CARREGAMENTO) AS QTDE_AUTOS,
       SUM(DISTINCT CG.QTDE_MANIFESTADA) AS MANIFESTADO,
	   SUM(CAR.PESO_BRUTO - CAR.PESO_TARA) AS PESO_LIQUIDO,
       IFNULL((SELECT SUM(CG.QTDE_MANIFESTADA)
		 	     FROM CARGA CG
			    WHERE CG.COD_OPERACAO = CAR.COD_OPERACAO
			  ), 0) - SUM(CAR.PESO_BRUTO - CAR.PESO_TARA) AS SALDO,
       SUM(CAR.PESO_CARREGADO) AS PESO_MOEGA
  FROM CARREGAMENTO CAR 
  JOIN CARGA CG
   ON CG.COD_CARGA = CAR.COD_CARGA
 WHERE CAR.STATUS_CARREG = 3
   AND CAR.PESO_BRUTO > 0
   AND CAR.COD_OPERACAO = ?
 GROUP BY CAR.COD_OPERACAO
    `, [id, data], (err, result) => {
        if (err) {
            console.log(err)
        } else {
            console.log(id, data);
            res.send(result)

        }
    });
});

// Rota para obter o conteúdo do arquivo de motivação baseado no ID
app.get('/motivacao/conteudo/:id', async (req, res) => {
    const { id } = req.params; // Aqui, id já é '51.txt'

    const fileName = id.endsWith('.txt') ? id : `${id}.txt`;
    const filePath = `\\\\10.10.3.57\\Public\\GC\\TI\\MOTIVAÇÃO\\${fileName}`;


    try {
        const content = await fsp.readFile(filePath, 'utf8'); // Lê o arquivo como uma string UTF-8
        res.send({ content });
    } catch (error) {
        console.error('Erro ao ler o arquivo:', error);
        res.status(500).send('Erro ao ler o arquivo');
    }
});

app.post('/executarPuppeteer', async (req, res) => {

    const { COD_OPERACAO, COD_MOTORISTA, ID_CARREGAMENTO, CPF_MOTORISTA } = req.body;
    const queryResult = await new Promise((resolve, reject) => {
        db.query(`
            SELECT 
                MOTORISTA.CPF_MOTORISTA,
                NAVIO.NOME_NAVIO,
                MOTORISTA.NOME_MOTORISTA
            FROM 
                CARREGAMENTO
            JOIN 
                MOTORISTA ON CARREGAMENTO.COD_MOTORISTA = MOTORISTA.COD_MOTORISTA
            JOIN 
                OPERACAO ON CARREGAMENTO.COD_OPERACAO = OPERACAO.COD_OPERACAO
            JOIN 
                NAVIO ON OPERACAO.COD_NAVIO = NAVIO.COD_NAVIO
            WHERE 
                CARREGAMENTO.ID_CARREGAMENTO = ?
        `,
            [ID_CARREGAMENTO], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result[0]);
                }
            });
    });

    console.log("RESULTADO DO GET: ", queryResult)

    try {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        await page.goto('http://www.codesp.com.br/asp/login.asp');

        await page.evaluate(() => {
            document.querySelector('input[name="nr_cnpj"]').value = '28673764000167';
            document.querySelector('input[name="nm_usuario"]').value = '17430193862';
            document.querySelector('input[name="nm_senha"]').value = 'Tania@23';
            document.querySelector('input[type="submit"]').click();
        });


        await page.waitForNavigation();


        await page.goto('http://www.codesp.com.br/asp/manutencao/adicionar_locais_pessoas.asp');


        await page.focus('textarea[name="cpfs"]');

        await page.keyboard.type(queryResult.CPF_MOTORISTA);


        await page.click('input[type="submit"]');
        await page.click('input[type="checkbox"][name="loc"][value="5"]');
        await page.click('input[type="checkbox"][name="loc"][value="6"]');
        const currentDate = new Date().toLocaleDateString('pt-BR');

        await page.type('input[name="datainicial_d"]', currentDate);

        const nextDay = new Date();
        nextDay.setDate(nextDay.getDate() + 1);

        const nextDayFormatted = nextDay.toLocaleDateString('pt-BR');

        await page.type('input[name="datafinal_d"]', nextDayFormatted);

        await page.type('textarea[name="justificativa"]', `Operação no navio ${queryResult.NOME_NAVIO}`);

        // Clique no botão <input> com type="submit", name="sub" e valor "SIM"
        await page.click('input[type="submit"][name="sub"][value="SIM"]');

        // Aguarde um pequeno atraso para garantir que o texto esteja carregado (ajuste conforme necessário)
        await page.waitForTimeout(1000);

        // Selecione e copie o texto desejado
        const selectedText = await page.evaluate(() => {
            const textToSelect = document.body.innerText;
            const startIndex = textToSelect.indexOf("COMPROVANTE MECÂNICO PARA ACESSO");
            const endIndex = textToSelect.indexOf("CODESP");
            return textToSelect.substring(startIndex, endIndex + "CODESP".length);
        });

        // Copie o texto para a área de transferência
        await page.evaluate((selectedText) => {
            const tempTextArea = document.createElement('textarea');
            tempTextArea.value = selectedText;
            document.body.appendChild(tempTextArea);
            tempTextArea.select();
            document.execCommand('copy');
            document.body.removeChild(tempTextArea);
        }, selectedText);

        console.log("Texto copiado para a área de transferência:");
        console.log(selectedText);

        const filePath = `\\\\10.10.3.57\Public\GC\\TI\MOTIVAÇÃO\\${ID_CARREGAMENTO}.txt`;

        // Escreva o texto no arquivo
        fs.writeFileSync(filePath, selectedText);

        console.log(`Texto copiado e salvo em ${filePath}`);


        // Feche o navegador
        await browser.close();

        res.status(200).send('Código Puppeteer executado com sucesso!');
    } catch (error) {
        console.error('Erro ao executar o código Puppeteer:', error);
        res.status(500).send('Erro ao executar o código Puppeteer');
    }
});

// app.post('/motivacao/registrar', async (req, res) => {
//     try {
//         const { codBercoSpa, cpfMotivados, dataInicial, dataFinal, usuarioCadastro, registroMotivacao } = req.body;

//         const query = `
//             INSERT INTO MOTIVACAO
//             (COD_BERCO_SPA, CPF_MOTIVADOS, DATA_INICIAL, DATA_FINAL, USUARIO_CADASTRO, DATA_CADASTRO, REGISTRO_MOTIVACAO)
//             VALUES (?, ?, ?, ?, ?, NOW(), ?)
//         `;


//         db.query(
//             query,
//             [codBercoSpa, cpfMotivados, dataInicial, dataFinal, usuarioCadastro, registroMotivacao],
//             async (err, result) => {
//                 if (err) {
//                     console.error('Erro ao registrar motivação:', err);
//                     res.status(500).send({ message: 'Erro ao registrar motivação.', error: err.message });
//                     return;
//                 }

//                 console.log('Motivação registrada com sucesso!');

//                 try {
//                     const browser = await puppeteer.launch({ headless: false });
//                     const page = await browser.newPage();
//                     await page.goto('http://www.codesp.com.br/asp/login.asp');

//                     await page.evaluate(() => {
//                         document.querySelector('input[name="nr_cnpj"]').value = '28673764000167';
//                         document.querySelector('input[name="nm_usuario"]').value = '17430193862';
//                         document.querySelector('input[name="nm_senha"]').value = 'Tania@23';
//                         document.querySelector('form').submit();
//                     });

//                     await page.waitForNavigation();
//                     await page.goto('http://www.codesp.com.br/asp/manutencao/adicionar_locais_pessoas.asp');
//                     await page.focus('textarea[name="cpfs"]');
//                     await page.keyboard.type(cpfMotivados); // Assegure-se de que cpfMotivados é a string que você quer digitar
//                     await page.waitForTimeout(1000); // Ajuste o tempo de espera conforme necessário
//                     await browser.close();

//                     res.json({ success: true, message: 'Motivação registrada com sucesso e ação Puppeteer concluída.' });
//                 } catch (error) {
//                     console.error('Erro durante a execução do Puppeteer:', error);
//                     res.status(500).send({ message: 'Erro durante a execução do Puppeteer.', error: error.message });
//                 }
//             }
//         );
//     } catch (error) {
//         console.error('Erro ao preparar a motivação:', error);
//         res.status(500).send({ message: 'Erro ao preparar a motivação.', error: error.message });
//     }
// });


app.post('/operacao/documentos/:id', (req, res) => {
    const id = req.params.id;
    const { data } = req.body;

    db.query(`
    SELECT CAR.COD_OPERACAO,
    CONCAT(CG.TIPO_DOC, " ", CG.NUMERO_DOC) AS DOCUMENTO,
    SUM(DISTINCT CG.QTDE_MANIFESTADA) AS QTDE_MANIFESTADA,
    COUNT(CAR.ID_CARREGAMENTO) AS QTDE_AUTOS,
       SUM(CAR.PESO_BRUTO - CAR.PESO_TARA) AS PESO_LIQUIDO
   -- SUM(CAR.PESO_BRUTO - CAR.PESO_TARA) - SUM(DISTINCT CG.QTDE_MANIFESTADA)  AS DIFERENCA
    FROM CARREGAMENTO CAR
    JOIN CARGA CG
      ON CG.COD_OPERACAO = CAR.COD_OPERACAO AND CG.COD_CARGA = CAR.COD_CARGA
    WHERE CAR.STATUS_CARREG = 3
    AND CAR.PESO_BRUTO > 0
    AND CAR.COD_OPERACAO = ?
    GROUP BY CAR.COD_OPERACAO, CG.TIPO_DOC, CG.NUMERO_DOC

    `, [id, data], (err, result) => {
        if (err) {
            console.log(err)
        } else {
            console.log(id, data);
            res.send(result)

        }
    });
});


// CRIAR UM DESTINO
app.post(`${API_PREFIX}/destino/criar`, async (req, res) => {
  try {
    const nome = (req.body?.nome || "").trim();

    if (!nome) {
      return res.status(400).json({ ok: false, error: "O campo 'nome' é obrigatório." });
    }

    // Opcional: impedir duplicados (case-insensitive)
    const [existe] = await db.query(
      `SELECT COD_DESTINO FROM DESTINO WHERE UPPER(NOME_DESTINO) = UPPER(?) LIMIT 1`,
      [nome]
    );
    if (Array.isArray(existe) && existe.length > 0) {
      return res.status(409).json({ ok: false, error: "Já existe um destino com esse nome." });
    }

    const [result] = await db.query(
      `INSERT INTO DESTINO (NOME_DESTINO) VALUES (?)`,
      [nome]
    );

    return res.status(201).json({
      ok: true,
      id: result?.insertId,
      message: "Destino adicionado com sucesso",
    });
  } catch (err) {
    console.error("[/destino/criar][ERR]", err);
    // ER_DUP_ENTRY (caso haja índice único no banco)
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, error: "Destino já cadastrado." });
    }
    return res.status(500).json({
      ok: false,
      error: "Erro interno ao criar destino.",
      detail: err?.sqlMessage || err?.message || String(err),
    });
  }
});



// BUSCAR PEDIDOS POR OPERAÇÃO
app.get(`${API_PREFIX}/buscar/pedidos/:id`, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: "Parâmetro :id inválido." });
    }

    const [rows] = await db.query(
      `
      SELECT
        ID_PEDIDO,
        NR_PEDIDO,
        COD_OPERACAO
      FROM PEDIDO
      WHERE COD_OPERACAO = ?
      ORDER BY NR_PEDIDO
      `,
      [id]
    );

    // compat: sempre retorna array (vazio quando não há registros)
    res.set("Cache-Control", "no-store");
    return res.status(200).json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("[GET /buscar/pedidos/:id][ERR]", err);
    return res.status(500).json({
      ok: false,
      error: "Erro interno ao buscar pedidos.",
      detail: err?.sqlMessage || err?.message || String(err),
    });
  }
});


//MIC SISTEMAS - API NF-e
app.post("/gerarnfe", (req, res) => {
    const id = req.body.id;
    const cnh = req.body.cnh;
    const cnpj = req.body.cnpj;
    const cnpjTrasnp = req.body.cnpjTrasnp;
    const hr = req.body.hr;
    const carreta1 = req.body.carreta1;
    const carreta2 = req.body.carreta2;
    const carreta3 = req.body.carreta3;
    const cavalo = req.body.cavalo;
    const di = req.body.di;
    const pedido = req.body.pedido;
    const bruto = req.body.bruto;
    const liquido = req.body.liquido;
    const tara = req.body.tara;
  
    const options = {
      method: "POST",
      Accept: "application/xml",
      "Content-Type": "application/xml",
    };
  
    const data = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ejb="http://ejb.postos.notafiscal.micsistemas.com.br/">
          <soap:Header/>
          <soap:Body>
              <ejb:tiqueteConsultaV2>
                  <tiqueteConsultaV2>
                      <autenticacao>
                      <password>tiquete</password>
                      <user>eurobrascodesp</user>
                      </autenticacao>
                      <cdTiquete>128099916</cdTiquete>
                      <nrDI>22/0692175-7</nrDI>
                  </tiqueteConsultaV2>
              </ejb:tiqueteConsultaV2>
          </soap:Body>
          </soap:Envelope>`;
    let result = "";
    const request = http.request(micUrl, options, (response) => {
      console.log(response.statusCode);
  
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        result += chunk;
      });
  
      response.on("end", () => {
        let json = convert.xml2js(result);
        json =
          json.elements[0].elements[0].elements[0].elements[0].elements[0].text;
        console.log(json);
        res.send(json);
      });
    });
  
    request.on("error", (e) => {
      console.error(e);
    });
  
    request.write(data);
    request.end();
  });
  
  // MIC SISTEMAS - GERAR NOTA
  app.post("/gerarnotamic/:id", async (req, res) => {
    const id = req.params.id;
  
    saveLog(id, "gerar_nota_body", req.body);
  
    // Buscar CNPJ do cliente e da transportadora
    const db_result = await new Promise((resolve, reject) =>
      db.query(
        `
        SELECT 
            T.CNPJ_TRANSP, CLI.CNPJ_CLIENTE 
        FROM 
            CARREGAMENTO CARREG
            JOIN TRANSPORTADORA T ON CARREG.COD_TRANSP = T.COD_TRANSP
            JOIN CARGA CARG ON CARREG.COD_CARGA = CARG.COD_CARGA
            JOIN CLIENTE CLI ON CARG.COD_CLIENTE = CLI.COD_CLIENTE
        WHERE 
            CARREG.ID_CARREGAMENTO = ?;
        `,
        id,
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      )
    );
  
    const usuario = "eurobrascodesp";
    const senha = "tiquete";
  
    const codTiquete = req.body.codTiquete;
    const placa1 = req.body.placa1;
    const placa2 = req.body.placa2;
    const placa3 = req.body.placa3;
    const placaCavalo = req.body.placaCavalo;
    const num_DI = req.body.num_DI;
    const pedido_mic = req.body.pedido_mic;
    const peso_bruto = req.body.peso_bruto / 1000;
    const peso_liquido = req.body.peso_liquido / 1000;
    const tara = req.body.tara;
    const cnpjEmpresa = db_result[0].CNPJ_CLIENTE;
    const cnpjTransportadora = db_result[0].CNPJ_TRANSP;
    const dtTiquete = new Date(req.body.data).toISOString().slice(0, 19);
  
    // Buscar nome reduzido do produto e cod_carga
    const produto_result = await new Promise((resolve, reject) =>
      db.query(
        `
        SELECT P.NOME_REDUZIDO_PRODUTO, C.COD_CARGA
        FROM CARREGAMENTO CARREG
        JOIN CARGA C ON CARREG.COD_CARGA = C.COD_CARGA
        JOIN PRODUTO P ON C.COD_PRODUTO = P.COD_PRODUTO
        WHERE CARREG.ID_CARREGAMENTO = ?
        `,
        id,
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      )
    );
  
    const nomeProduto = produto_result?.[0]?.NOME_REDUZIDO_PRODUTO || null;
    const codCarga = produto_result?.[0]?.COD_CARGA || null;
  
    // Buscar selo do exército se for NAM
    let nrSeloExercito = "";
    if (nomeProduto === "NAM") {
      const selo_result = await new Promise((resolve, reject) =>
        db.query(
          `
          SELECT NR_SELO_EXERCITO
          FROM SELO_EXERCITO
          WHERE COD_CARGA = ? AND ID_CARREGAMENTO IS NULL AND NR_SELO_EXERCITO IS NOT NULL
          ORDER BY ID_SELO_EXERCITO ASC
          LIMIT 1
          `,
          codCarga,
          (err, result) => {
            if (err) return reject(err);
            resolve(result);
          }
        )
      );
      nrSeloExercito = selo_result?.[0]?.NR_SELO_EXERCITO || "";
    }
  
    const data = `
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ejb="http://ejb.postos.notafiscal.micsistemas.com.br/">
      <soap:Header/>
      <soap:Body>
        <ejb:tiqueteRecepcao>
          <tiquete>
            <autenticacao>
              <password>${senha}</password>
              <user>${usuario}</user>
            </autenticacao>
            <cdTiquete>${codTiquete}</cdTiquete>
            <cnhMotorista/>
            <cnpjEmpresa>${cnpjEmpresa}</cnpjEmpresa>
            <cnpjTransportadora>${cnpjTransportadora}</cnpjTransportadora>
            <dtHrTiquete>${dtTiquete}</dtHrTiquete>
            <idBalanca/>
            <idCarreta1>${placa1}</idCarreta1>
            <idCarreta2>${placa2}</idCarreta2>
            <idCarreta3>${placa3}</idCarreta3>
            <idCavalo>${placaCavalo}</idCavalo>
            <idVagao/>
            <nrDI>${num_DI}</nrDI>
            <nrPedido>${pedido_mic}</nrPedido>
            ${nrSeloExercito ? `<nrSeloExercito>${nrSeloExercito}</nrSeloExercito>` : ""}
            <observacao/>
            <qtBruto>${peso_bruto}</qtBruto>
            <qtLiquido>${peso_liquido}</qtLiquido>
            <qtTara>${tara}</qtTara>
          </tiquete>
        </ejb:tiqueteRecepcao>
      </soap:Body>
    </soap:Envelope>`;
  
    saveLog(id, "gerar_nota_request_xml", data);
  
    await axios
      .post(
        "http://webservice.hom.micsistemas.com.br/NFECentralEAR-NFECentral/TiqueteImpl?WSDL",
        data,
        {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            Authorization: "Basic ZXVyb2JyYXNjb2Rlc3A6dGlxdWV0ZQ==",
            Accept: "application/xml",
          },
        }
      )
      .then((response) => {
        const xml_result = response.data;
        saveLog(id, "gerar_nota_response_xml", xml_result);
  
        const result_message = new jsdom.JSDOM(xml_result).window.document
          .querySelector("return")
          .textContent.trim();
  
        if (result_message.includes("REJEICAO:") || response.status !== 200) {
          const errorMap = {
            "REJEICAO: Selo do exercito obrigatorio": "Selo do exército é obrigatório para produto NAM",
            "REJEICAO: usuario ou senha invalidos": "Falha na autenticação do usuário",
            "REJEICAO: cdTiquete nao pode estar vazio": "Campo cdTiquete vazio",
            "REJEICAO: cdCnpjEmpresa nao pode estar vazio": "Campo cnpjEmpresa vazio",
            "REJEICAO: cdCnpjTransportadora nao pode estar vazio": "Campo cnpjTransportadora vazio",
            "REJEICAO: dtHrTiquete nao pode estar vazio": "Campo dtHrTiquete vazio",
            "REJEICAO: nrDi nao pode estar vazio": "Campo nrDI vazio",
            "REJEICAO: qtTara nao pode estar vazio": "Campo Tara vazio",
            "REJEICAO: qtBruto nao pode estar vazio": "Campo Peso Bruto vazio",
            "REJEICAO: qtLiquido nao pode estar vazio": "Campo Peso Líquido vazio",
            "REJEICAO: cnpjEmpresa nao encontrado": "Empresa não encontrada na base da mic sistemas",
            "REJEICAO: cnpjTransportadora nao encontrado": "Transportadora não encontrada na base da mic sistemas",
            "REJEICAO: DI nao encontrada": "DI não encontrada na base da mic sistemas",
            "REJEICAO: DI nao pertence empresa indicada": "DI não pertence à empresa indicada",
            "REJEICAO: Pedido nao pertence a DI": "Pedido não pertence a DI",
            "REJEICAO: Transportadora nao foi cadastrada para o pedido": "Transportadora não foi cadastrada para o pedido",
            "REJEICAO: Tiquete ja foi cadastrado anteriormente": "O Tiquete já foi cadastrado anteriormente com o mesmo cdTiquete",
            "REJEICAO: Pesos inválidos": "Bruto diferente de Tara + Liquido",
            "REJEICAO: Sem identificacao do veiculo": "Caso todos os seguintes campos não estejam preenchidos: idVagao, idCavalo, idCarreta1",
            "REJEICAO: qtTara deve ter valor positivo": "Campo qtTara deve ser positivo",
            "REJEICAO: qtBruto deve ter valor positivo": "Campo qtBruto deve ser positivo",
            "REJEICAO: qtLiquido deve ter valor positivo": "Campo qtLiquido deve ser positivo",
            "REJEICAO: qtBruto deve ser maior que qtTara": "Campo qtBruto deve ter valor maior que qtTara. ",
            "REJEICAO: DI nao pertence ao LOCAL de emissao": "DI não pertence ao LOCAL de emissão.",
            "REJEICAO: Quantidade muito baixa": "Caso qtLiquido seja inferior a 0.2",
  
          };
          const error_message = errorMap[result_message] || result_message;
          throw new Error(error_message);
        }
  
        // Atualizar status de nota
        db.query(
          `UPDATE CARREGAMENTO SET STATUS_NOTA_MIC = 2, OBS_NOTA = 'Nota está sendo processada' WHERE ID_CARREGAMENTO = ?`,
          id,
          (err) => {
            if (err) throw new Error(`Erro ao atualizar BD(${err}).`);
          }
        );
  
        // Atualizar selo como utilizado
        if (nrSeloExercito) {
          db.query(
            `
            UPDATE SELO_EXERCITO
            SET ID_CARREGAMENTO = ?
            WHERE NR_SELO_EXERCITO = ? AND ID_CARREGAMENTO IS NULL
            `,
            [id, nrSeloExercito],
            (err) => {
              if (err) console.log("Erro ao atualizar selo:", err);
            }
          );
        }
  
        res.status(200).send(result_message);
      })
      .catch((error) => {
        console.log(error.message);
        saveLog(id, "gerar_nota_response_error", error.message);
  
        db.query(
          `UPDATE CARREGAMENTO SET STATUS_NOTA_MIC = 3, OBS_NOTA = ? WHERE ID_CARREGAMENTO = ?`,
          [error.message, id],
          () => res.status(400).send(error.message)
        );
      });
  });


const saveLog = (idCarregamento, filename, data) => {
  var dir = `/app/logs/${idCarregamento}`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  fs.writeFile(
    `${dir}/${filename}.txt`,
    JSON.stringify(data, null, 4),
    (error) => {
      if (error) throw error;
    }
  );
};

// MIC SISTEMAS - CONSULTAR NOTA
// app.post('/consultarnotamic/:id', async (req, res) => {
// EXECUTA A CADA MINUTO
cron.schedule("*/1 * * * *", async () => {
    const db_result = await new Promise((resolve, reject) =>
      db.query(
        `
        SELECT 
          CARREG.TICKET, 
          CARG.NUMERO_DOC, 
          CARREG.ID_CARREGAMENTO, 
          CARREG.OBS_NOTA, 
          NA.NOME_NAVIO, 
          OPER.RAP
        FROM 
          CARREGAMENTO CARREG
          JOIN OPERACAO OPER ON CARREG.COD_OPERACAO = OPER.COD_OPERACAO
          JOIN NAVIO NA ON OPER.COD_NAVIO = NA.COD_NAVIO
          JOIN CARGA CARG ON CARREG.COD_CARGA = CARG.COD_CARGA
        WHERE 
          CARREG.STATUS_NOTA_MIC IN (2, 5)
        ORDER BY CARREG.ID_CARREGAMENTO
        `,
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      )
    );
  
    if (!db_result || db_result.length === 0) return;
  
    const usuario = "eurobrascodesp";
    const senha = "tiquete";
    const url = "http://webservice.hom.micsistemas.com.br/NFECentralEAR-NFECentral/TiqueteImpl?WSDL";
    const headers = {
      "Content-Type": "text/xml; charset=utf-8",
      Authorization: "Basic ZXVyb2JyYXNjb2Rlc3A6dGlxdWV0ZQ==",
      Accept: "application/xml",
    };
  
    for (const carregamento of db_result) {
      let hasContent = true;
      const codTiquete = carregamento.TICKET;
      const num_DI = carregamento.NUMERO_DOC;
      const idCarregamento = carregamento.ID_CARREGAMENTO;
      const obsNota = carregamento.OBS_NOTA;
      const codRAP = carregamento.RAP;
  
      const produto_result = await new Promise((resolve, reject) =>
        db.query(
          `
          SELECT P.NOME_REDUZIDO_PRODUTO
          FROM CARREGAMENTO CARREG
          JOIN CARGA C ON CARREG.COD_CARGA = C.COD_CARGA
          JOIN PRODUTO P ON C.COD_PRODUTO = P.COD_PRODUTO
          WHERE CARREG.ID_CARREGAMENTO = ?
          `,
          idCarregamento,
          (err, result) => {
            if (err) return reject(err);
            resolve(result);
          }
        )
      );
  
      const nomeProduto = produto_result?.[0]?.NOME_REDUZIDO_PRODUTO || "";
      if (nomeProduto === "NAM") {
        saveLog(idCarregamento, "consultar_nota_contexto", "Produto NAM - exige selo do exército");
      }
  
      const data = `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ejb="http://ejb.postos.notafiscal.micsistemas.com.br/">
        <soap:Header/>
        <soap:Body>
          <ejb:tiqueteConsultaV2>
            <tiqueteConsultaV2>
              <autenticacao>
                <password>${senha}</password>
                <user>${usuario}</user>
              </autenticacao>
              <cdTiquete>${codTiquete}</cdTiquete>
              <nrDI>${num_DI}</nrDI>
            </tiqueteConsultaV2>
          </ejb:tiqueteConsultaV2>
        </soap:Body>
      </soap:Envelope>`;
  
      saveLog(idCarregamento, "consultar_nota_request", data);
  
      try {
        const response = await axios.post(url, data, { headers });
        const xml_result = response.data;
        saveLog(idCarregamento, "consultar_nota_response", xml_result);
  
        const result_message = new jsdom.JSDOM(xml_result).window.document
          .querySelector("mensagem")
          .textContent.trim();
  
        const waiting =
          result_message ===
          "REJEICAO: NF referente ao tiquete ainda nao foi emitida ou autorizada";
  
        if ((!waiting && result_message.includes("REJEICAO:")) || response.status !== 200) {
          throw new Error(result_message);
        }
  
        if (waiting && obsNota !== "Nota está sendo processada") {
          db.query(
            `
            UPDATE CARREGAMENTO
            SET STATUS_NOTA_MIC = 2, OBS_NOTA = 'Nota está sendo processada'
            WHERE ID_CARREGAMENTO = ?
          `,
            idCarregamento
          );
        }
  
        if (!waiting) {
          const mic_document = new jsdom.JSDOM(xml_result).window.document;
          const dir = `${API_PREFIX}/app/Files/Notas_Fiscais/${codRAP}`;
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
          if (mic_document.querySelector("pdf")) {
            const pdf_b64 = mic_document.querySelector("pdf").textContent.trim();
            if (pdf_b64.length === 0) hasContent = false;
  
            const pdf = js_base64.Base64.atob(pdf_b64);
            fs.writeFileSync(`${dir}/Nota Fiscal ${idCarregamento}.pdf`, pdf, "binary");
          }
  
          if (mic_document.querySelector("xml")) {
            const xml_b64 = mic_document.querySelector("xml").textContent.trim();
            if (xml_b64.length === 0) hasContent = false;
  
            const xml = js_base64.Base64.atob(xml_b64);
            fs.writeFileSync(`${dir}/Nota Fiscal ${idCarregamento}.xml`, xml, "binary");
          }
  
          if (nomeProduto === "NAM") {
            const codCarga_result = await new Promise((resolve, reject) =>
              db.query(
                `SELECT COD_CARGA FROM CARREGAMENTO WHERE ID_CARREGAMENTO = ?`,
                idCarregamento,
                (err, result) => {
                  if (err) return reject(err);
                  resolve(result);
                }
              )
            );
  
            const codCarga = codCarga_result?.[0]?.COD_CARGA;
            if (codCarga) {
              const selo_result = await new Promise((resolve, reject) =>
                db.query(
                  `
                  SELECT NR_SELO_EXERCITO
                  FROM SELO_EXERCITO
                  WHERE COD_CARGA = ? AND ID_CARREGAMENTO IS NULL
                  ORDER BY ID_SELO_EXERCITO ASC
                  LIMIT 1
                  `,
                  codCarga,
                  (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                  }
                )
              );
  
              const nrSeloExercito = selo_result?.[0]?.NR_SELO_EXERCITO;
              if (nrSeloExercito) {
                db.query(
                  `
                  UPDATE SELO_EXERCITO 
                  SET ID_CARREGAMENTO = ? 
                  WHERE NR_SELO_EXERCITO = ? AND ID_CARREGAMENTO IS NULL
                  `,
                  [idCarregamento, nrSeloExercito],
                  (err) => {
                    if (err) console.log("Erro ao atualizar selo na consulta:", err);
                    else console.log(`Selo ${nrSeloExercito} vinculado ao carregamento ${idCarregamento}`);
                  }
                );
              }
            }
          }
  
          if (hasContent) {
            db.query(
              `
              UPDATE CARREGAMENTO
              SET STATUS_NOTA_MIC = 4, OBS_NOTA = 'Nota gerada com sucesso'
              WHERE ID_CARREGAMENTO = ?
            `,
              idCarregamento
            );
          }
        }
      } catch (error) {
        saveLog(idCarregamento, "consultar_nota_response_error", error.message);
        if (error.response?.data?.includes("Unmarshalling Error:"))
          error.message = "Faltam parametros na requisição";
  
        saveLog(idCarregamento, "consultar_nota_response_error_pre_db", error.message);
  
        if (hasContent) {
          db.query(
            `
            UPDATE CARREGAMENTO
            SET STATUS_NOTA_MIC = 5, OBS_NOTA = ?
            WHERE ID_CARREGAMENTO = ?
          `,
            [error.message, idCarregamento]
          );
        }
  
        saveLog(idCarregamento, "consultar_nota_response_error_pos_db", error.message);
      }
    }
  
    //console.log("Consulta MIC finalizada");
  });

// MIC SISTEMAS - ENTREGAR NOTA
app.post('/entregarnotamic/:id', async (req, res) => {
    console.log(req.params)
    const idCarregamento = req.params.id;

    // NOTA ENTREGUE
    db.query(`
        UPDATE CARREGAMENTO
        SET STATUS_NOTA_MIC = 6, OBS_NOTA = 'Nota entregue ao motorista'
        WHERE ID_CARREGAMENTO = ?
    `, idCarregamento, (err, result) => {
        if (err)
            res.status(400).send(`Erro ao atualizar BD(${err}).`);
    });

    res.status(200).send();
})

app.post('/baixarnota', async (req, res) => {
    console.log(req.body)

    const idCarregamento = req.body.idCarregamento

    let db_result = await new Promise((resolve, reject) => db.query(`
        SELECT 
            NA.NOME_NAVIO, OPER.RAP
        FROM 
            CARREGAMENTO CARREG
            JOIN OPERACAO OPER
                ON CARREG.COD_OPERACAO = OPER.COD_OPERACAO
            JOIN NAVIO NA
                ON OPER.COD_NAVIO = NA.COD_NAVIO
        WHERE 
            CARREG.ID_CARREGAMENTO = ?
        `, idCarregamento, (err, result) => {
        if (err)
            reject(err)

        resolve(result)
    }
    ));

    console.log(db_result)

    const nomeNavio = db_result[0].NOME_NAVIO
    const codRAP = db_result[0].RAP

      const networkPath = path.join(
    __dirname,
    "Files",
    "Notas_Fiscais",
    `${nomeNavio}-${codRAP}`,
    `Nota Fiscal ${idCarregamento}.pdf`
  );
console.log(networkPath);
    var file_data = {}

    try {
    var filepath = `${networkPath}`;

        file_data = {
            'status': 'gerado',
            'filename': file,
            'pdf': fs.readFileSync(filepath, { encoding: 'base64' })
        }

        res.status(200).send(file_data);
    }
    catch (err) {
        file_data = {
            'status': 'erro',
            'mensagem': err
        }
        res.status(400).send(file_data);
    }
})

//RODAR API
app.listen(3009, () => { console.log("Servidor rodando na porta 3009...") });