const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();
const mysql = require('mysql')
const cors = require('cors')
const http = require("http");
const xml2js = require('xml2js');
const js_base64 = require('js-base64')
const fs = require('fs');
const jsdom = require("jsdom");
const axios = require('axios');
const { Console, log } = require('console');
const cron = require("node-cron");
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const pdf = require('html-pdf'); // Importando o módulo para gerar PDFs


app.use(cors())
app.use(express.json())
//const micUrl = 'http://webservice.hom.micsistemas.com.br/NFECentralEAR-NFECentral/TiqueteImpl?WSDL';

const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // Utiliza STARTTLS (não SSL/TLS completo)
    auth: {
        user: 'e-service.crm@rodrimar.com.br',
        pass: 'r0dr!m@r' // Substitua pela senha correta
    },
    tls: {
        rejectUnauthorized: false // Pode ser necessário se houver problemas de certificados
    }
});

module.exports = transporter;

// CONEXÃO COM BANCO
const db = mysql.createConnection({
  user: "ogdev",
  host: "mysql",
  password: "R0dr!m@rR##T",
  database: "operacaogranel",
  timezone: "-03:00", // Configurar o fuso horário da conexão
});

//TESTE DE CONEXÃO
db.connect(function (err) {
  if (err) {
    throw err;
  } else {
    console.log("Conectado a base de dados!");
  }
});

app.use(session({
    secret: 'jmichelotto',
    resave: true,
    saveUninitialized: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//TRANSPORTADORA
app.get("/api/transportadora", (req, res) => {
    db.query("SELECT * FROM TRANSPORTADORA ORDER BY NOME_TRANSP ", (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//TRANSPORTADORA
// app.get("/api/transportadora/alterar", (req, res) => {
//     db.query("SELECT * FROM TRANSPORTADORA WHERE cod_transp IN (8, 36) ORDER BY NOME_TRANSP; ", (err, result) => {
//         if (err) {
//             console.log(err)
//         } else {
//             res.send(result)
//         }
//     })
// })


app.get("/api/transportadora/alterar", (req, res) => {
    db.query("SELECT * FROM TRANSPORTADORA ORDER BY NOME_TRANSP; ", (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

app.get("/api/documento/alterar/:id", (req, res) => {
    const id = req.params.id;
    db.query("SELECT * FROM CARGA WHERE COD_OPERACAO = ?;"
        ,id,(err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//CARGAS PRO GRAFICO
app.get("/api/grafico/:id", (req, res) => {
    const id = req.params.id;
    db.query(`
    SELECT CA.COD_OPERACAO,
    CA.TIPO_DOC,    
    CA.NUMERO_DOC,
    CL.NOME_REDUZIDO,
    SUM(DISTINCT CA.QTDE_MANIFESTADA) AS MANIFESTADO,
    SUM(CR.PESO_BRUTO - CR.PESO_TARA) AS PESO_CARREGADO,
    SUM(CR.PESO_CARREGADO) AS PESO_MOEGA,
    SUM(DISTINCT CA.QTDE_MANIFESTADA) - SUM(CR.PESO_BRUTO - CR.PESO_TARA) AS SALDO,
    ROUND(((SUM(CR.PESO_BRUTO - CR.PESO_TARA) / SUM(DISTINCT CA.QTDE_MANIFESTADA)) * 100),2) AS PERC
FROM 
    CARGA CA
    JOIN CARREGAMENTO CR
    ON CR.COD_OPERACAO = CA.COD_OPERACAO
    AND CR.COD_CARGA = CA.COD_CARGA
JOIN CLIENTE CL 
    ON CL.COD_CLIENTE = CA.COD_CLIENTE
WHERE 
    CA.COD_OPERACAO = ?
    AND CR.PESO_CARREGADO > 0
    AND CR.STATUS_CARREG = 3
GROUP BY 
    CA.COD_OPERACAO, CA.TIPO_DOC, CA.NUMERO_DOC, CA.COD_CARGA, CL.NOME_REDUZIDO
        `, id, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//PORÃO PRO GRAFICO
app.get("/api/grafico/porao/:id", (req, res) => {
    const id = req.params.id;
    db.query(`
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
        `, id, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//GRAFICO PORTAL DO CLIENTE
app.get("/api/grafico/portal/:id", (req, res) => {
    const id = req.params.id;
    const usuario = req.body.usuario

    db.query(`
    SELECT CA.COD_OPERACAO,
    CA.TIPO_DOC,    
    CA.NUMERO_DOC,
    CL.NOME_REDUZIDO,
    SUM(DISTINCT CA.QTDE_MANIFESTADA) AS MANIFESTADO,
    SUM(CR.PESO_BRUTO - CR.PESO_TARA) AS PESO_CARREGADO,
    SUM(CR.PESO_CARREGADO) AS PESO_MOEGA,
    SUM(DISTINCT CA.QTDE_MANIFESTADA) - SUM(CR.PESO_BRUTO - CR.PESO_TARA) AS SALDO,
    ROUND(((SUM(CR.PESO_BRUTO - CR.PESO_TARA) / SUM(DISTINCT CA.QTDE_MANIFESTADA)) * 100),2) AS PERC
    FROM 
    CARGA CA
    JOIN CARREGAMENTO CR
    ON CR.COD_OPERACAO = CA.COD_OPERACAO
    AND CR.COD_CARGA = CA.COD_CARGA
    JOIN CLIENTE CL 
    ON CL.COD_CLIENTE = CA.COD_CLIENTE
    JOIN EMPRESA_USUARIO EU
        ON EU.COD_EMPRESA = CA.COD_CLIENTE
       AND EU.TIPO_EMPRESA = 'C'
       AND EU.USUARIO = 'fertiparmg'
        WHERE 
        CA.COD_OPERACAO = ?
        AND CR.PESO_CARREGADO > 0
        AND CR.STATUS_CARREG = 3
        GROUP BY 
        CA.COD_OPERACAO, CA.TIPO_DOC, CA.NUMERO_DOC, CA.COD_CARGA, CL.NOME_REDUZIDO;
        `, [id, usuario], (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})


app.get("/api/documentos/:id", (req, res) => {

    const id = req.params.id;
    db.query('SELECT COD_CARGA, NUMERO_DOC AS DOCUMENTO FROM CARGA WHERE COD_OPERACAO = ?',
        id, (err, result) => {
            if (err) {
                console.log(err)
            } else {
                res.send(result)
            }
        })
})

//NAVIOS
app.get("/api/navio", (req, res) => {
    db.query("SELECT * FROM NAVIO", (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

app.post('/api/navio/criar', (req, res) => {
    const nome = req.body.nome;
    const imo = req.body.imo;
    const bandeira = req.body.bandeira;
    const status = req.body.status;
    const usuario = req.body.usuario;

    db.query('INSERT INTO NAVIO (NOME_NAVIO, IMO_NAVIO, BANDEIRA, STATUS, USUARIO) VALUES (?,?,?,?,?)',
        [nome, imo, bandeira, status, usuario], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('navio adicionado!');
            }
        }
    )
});

//CRIAR UMA TRANSPORTADORA
app.post('/api/transportadora/criar', (req, res) => {
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
app.post('/api/importador/criar', (req, res) => {
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
app.post('/api/destino/criar', (req, res) => {
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
app.post('/api/ncm/criar', (req, res) => {
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
app.post('/api/produto/criar', (req, res) => {
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
app.post('/api/pedido/criar', (req, res) => {
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
app.get('/api/pedido/consultar', (req, res) => {
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
app.get('/api/transportadora/consultar', (req, res) => {
    const query = "SELECT * FROM TRANSPORTADORA ORDER BY COD_TRANSP DESC;";
    db.query(query, (err, result) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(result);
        }
    });
});

// Importador - Consultar todos os importadores
app.get('/api/importador/consultar', (req, res) => {
    const query = "SELECT * FROM CLIENTE ORDER BY COD_CLIENTE DESC;";
    db.query(query, (err, result) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(result);
        }
    });
});

// Destino - Consultar todos os destinos
app.get('/api/destino/consultar', (req, res) => {
    const query = "SELECT * FROM DESTINO ORDER BY COD_DESTINO DESC;";
    db.query(query, (err, result) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(result);
        }
    });
});

// NCM - Consultar todos os NCMs
app.get('/api/ncm/consultar', (req, res) => {
    const query = "SELECT * FROM NCM ORDER BY COD_NCM DESC;";
    db.query(query, (err, result) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(result);
        }
    });
});

// Produto - Consultar todos os produtos
app.get('/api/produto/consultar', (req, res) => {
    const query = "SELECT COD_PRODUTO, PRODUTO, UN_MEDIDA FROM PRODUTO ORDER BY COD_PRODUTO DESC;";
    db.query(query, (err, result) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(result);
        }
    });
});


//EMPRESAS
app.get("/api/empresas", (req, res) => {
    db.query("SELECT COD_EMPRESA, NOME_EMPRESA FROM EMPRESA;", (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//AGENTES
app.get("/api/agentes", (req, res) => {
    db.query("SELECT * FROM AGENTE;", (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//BERÇOS
app.get("/api/bercos", (req, res) => {
    db.query("SELECT * FROM BERCO;", (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//AGENTE
app.get("/api/agentes", (req, res) => {
    db.query("SELECT * FROM AGENTE;", (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//CLIENTES
app.get("/api/clientes", (req, res) => {
    db.query("SELECT * FROM CLIENTE;", (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//NCM
app.get("/api/ncm", (req, res) => {
    db.query("SELECT * FROM NCM;", (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//PRODUTOS
app.get("/api/produtos", (req, res) => {
    db.query("SELECT * FROM PRODUTO;", (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//OPERAÇÃO
app.get("/api/operacao", (req, res) => {
    db.query(`
      SELECT op.COD_OPERACAO,
           nv.NOME_NAVIO,
           be.NOME_BERCO,
           op.RAP,
           op.STATUS_OPERACAO
         FROM operacaogranel.OPERACAO op
         JOIN operacaogranel.NAVIO nv
        ON nv.COD_NAVIO = op.COD_NAVIO
        JOIN operacaogranel.BERCO be
        ON be.COD_BERCO = op.COD_BERCO
        ORDER BY 
        op.ATRACACAO
        DESC;
    `, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//MOTIVOS DE PARLISACAO
app.get("/api/motivos", (req, res) => {
    db.query(`SELECT * FROM MOTIVO_PAR;`, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//MOTIVOS DE PARALISACAO
app.get("/api/motivos", (req, res) => {
    db.query(`SELECT * FROM MOTIVO_PAR;`, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//COMPLEMENTO DE PARALISACAO
app.get("/api/complementos", (req, res) => {
    db.query(`SELECT * FROM COMPLEMENTO_PAR;`, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

app.post('/api/operacao/criar', (req, res) => {
    const empresa = req.body.empresa;
    const navio = req.body.navio;
    const rap = req.body.rap;
    const agente = req.body.agente;
    const berco = req.body.berco;
    const eta = req.body.eta;
    const previsao = req.body.previsao;
    const status = req.body.status;
    const usuario = req.body.usuario;
    const tipo = req.body.tipo;
    const data = req.body.data;

    db.query(`
        INSERT INTO OPERACAO (COD_EMPRESA, COD_NAVIO, RAP, COD_AGENTE, COD_BERCO, ETA, ATRACACAO_PREV, STATUS_OPERACAO, USUARIO, TIPO, DAT_CADASTRO)
        VALUES (?,?,?,?,?,?,?,?,?,?,?);
     `,
        [empresa, navio, rap, agente, berco, eta, previsao, status, usuario, tipo, data],
        (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('operação adicionada!');
            }
        }
    )
});

app.put('/operacao/concluir/docs', (req, res) => {
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



app.put('/login', (req, res) => {
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

app.put('/alterar/eta', (req, res) => {
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

app.put('/operacao/status/paralisado', (req, res) => {
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

app.put('/operacao/registrar/atracacao', (req, res) => {
    const date = req.body.date;
    const id = req.body.id;

    db.query("UPDATE OPERACAO SET ATRACACAO = ?, STATUS_OPERACAO = 'OPERANDO' WHERE COD_OPERACAO = ?",
        [date, id],
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

//PERIODOS
app.get("/api/periodos/horarios", (req, res) => {
    db.query("SELECT * FROM PERIODO;", (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
});

app.post('/api/periodo/criar', (req, res) => {
    const operacao = req.body.operacao;
    const periodo = req.body.periodo;
    const inicio = req.body.inicio;
    const berco = req.body.berco;
    const qtbordo = req.body.qtbordo;
    const qtterra = req.body.qtterra;
    const porao = req.body.porao;
    const moega = req.body.moega;
    const conexo = req.body.conexo;
    const requisicao = req.body.requisicao;
    const gerador = req.body.gerador;
    const grab = req.body.grab;
    const usuario = req.body.usuario;
    const dtcadastro = req.body.dtcadastro;
    db.query(`
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
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?);
        `, [operacao, periodo, inicio, berco, qtbordo, qtterra, porao, moega, conexo, requisicao, gerador, grab, usuario, dtcadastro],
        (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('periodo iniciado!');
            }
        }
    )
});

app.get('/api/periodo/busca/:id', (req, res) => { //verifica se existe operação aberta na op. que for fornecida
    const id = req.params.id;

    db.query(`SELECT COUNT(1) as EXISTE FROM PERIODO_OPERACAO WHERE DAT_FIM_PERIODO IS NULL AND COD_OPERACAO = ?`,
        id, (err, result) => {
            if (err) {
                console.log(err)
            } else {
                res.send(result)
            }
        }
    )
})

app.get('/api/portal/periodo/busca/:id', (req, res) => { //verifica se existe operação aberta na op. que for fornecida
    const id = req.params.id;

    db.query(`SELECT COUNT(1) as EXISTE FROM PERIODO_OPERACAO WHERE DAT_FIM_PERIODO IS NULL AND COD_OPERACAO = ?`,
        id, (err, result) => {
            if (err) {
                console.log(err)
            } else {
                res.send(result)
            }
        }
    )
})


app.get('/api/periodo/dashboard/:id', (req, res) => { //DADOS DO DASH
    const id = req.params.id;

    db.query(`
    SELECT
    OP.SEQ_PERIODO_OP,
    OP.COD_OPERACAO,
    N.NOME_NAVIO,
    P.STATUS_OPERACAO,
    PE.DEN_PERIODO,
    SUM(CA.QTDE_MANIFESTADA) as MANIFESTADO,
    OP.DAT_INI_PERIODO AS INI_PERIODO,
    BE.NOME_BERCO,
    MO.DESC_EQUIPAMENTO AS MOEGA,
    FC_PERIODO_CARREGAMENTO(OP.DAT_INI_PERIODO) AS PERIODO
FROM
    PERIODO_OPERACAO OP
    JOIN PERIODO PE
        ON PE.COD_PERIODO = OP.COD_PERIODO
    JOIN OPERACAO P
        ON P.COD_OPERACAO = OP.COD_OPERACAO
    JOIN CARGA CA
        ON CA.COD_OPERACAO = OP.COD_OPERACAO
    JOIN NAVIO N
        ON N.COD_NAVIO = P.COD_NAVIO
    JOIN BERCO BE
        ON BE.COD_BERCO = OP.COD_BERCO
    JOIN EQUIPAMENTO MO
        ON MO.COD_EQUIPAMENTO = OP.COD_MOEGA
WHERE
    OP.DAT_FIM_PERIODO IS NULL
    AND OP.COD_OPERACAO = ?
    `, id, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    }
    )
})


app.put('/periodo/finalizar', (req, res) => {
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

app.post('/api/periodo/dadosEmail', (req, res) => {
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





//VEICULOS QUE JA FIZERAM TARA
app.get('/api/dashboard/veiculos/:id', (req, res) => {
    const id = req.params.id;

    db.query(`
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
        FROM 
              CARREGAMENTO CA
                JOIN 
              MOTORISTA MT 
             ON MT.COD_MOTORISTA = CA.COD_MOTORISTA
                JOIN 
                   TIPO_VEICULO TV 
                          ON TV.COD_TIPO = CA.TIPO_VEICULO
                JOIN 
                    TRANSPORTADORA TP
                       ON TP.COD_TRANSP = CA.COD_TRANSP
                JOIN 
                    CARGA CG 
                      ON CG.COD_OPERACAO = CA.COD_OPERACAO
            AND CG.COD_CARGA = CA.COD_CARGA
        
            WHERE 
             CA.COD_OPERACAO = ? AND ((CA.STATUS_CARREG = 1) OR (CA.STATUS_CARREG = 3 AND CA.PESO_TARA = 1000 AND COALESCE(CA.STATUS_NOTA_MIC, 1) != 6))
    `, id, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    }
    )
})


app.get('/api/alteracaocadastral/veiculos/:id', (req, res) => {
    const id = req.params.id;

    db.query(`
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
FROM 
      CARREGAMENTO CA
        JOIN 
      MOTORISTA MT 
     ON MT.COD_MOTORISTA = CA.COD_MOTORISTA
        JOIN 
           TIPO_VEICULO TV 
                  ON TV.COD_TIPO = CA.TIPO_VEICULO
        JOIN 
            TRANSPORTADORA TP
               ON TP.COD_TRANSP = CA.COD_TRANSP
        JOIN 
            CARGA CG 
              ON CG.COD_OPERACAO = CA.COD_OPERACAO
    AND CG.COD_CARGA = CA.COD_CARGA

    WHERE 
   ID_CARREGAMENTO =  ?
    `, id, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    }
    )
})


//TOTAL DESCARREGADO NA OPERAÇÃO
app.get('/api/dashboard/descarregado/:id', (req, res) => {
    const id = req.params.id;

    db.query(`
      SELECT 
            SUM(PESO_BRUTO - PESO_TARA) AS DESCARREGADO
        FROM 
            CARREGAMENTO
        WHERE 
            COD_OPERACAO = ?
            AND PESO_CARREGADO > 0
            AND STATUS_CARREG = 3;
    `, id, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    }
    )
})

//HORA A HORA NA OPERAÇÃO 
app.get('/api/hora/autos/:id', (req, res) => {
    const id = req.params.id;
    db.query(`
    SELECT TB.HORA, SUM(TB.QUANTIDADE_AUTOS) AS QUANTIDADE_AUTOS
    FROM (SELECT (CASE
                    WHEN HOUR(DATA_CARREGAMENTO) = 23 THEN '23:00 à  00:00'
                    WHEN HOUR(DATA_CARREGAMENTO) = 0 THEN '00:00 à  01:00'
                    ELSE CONCAT(LPAD(HOUR(DATA_CARREGAMENTO), 2, '0'), ':00 às ', LPAD(HOUR(DATA_CARREGAMENTO) +1, 2, '0'), ':00')
                  END) AS HORA,
                 COUNT(1) AS QUANTIDADE_AUTOS,
                 HOR.ORDEM AS ORDEM
            FROM CARREGAMENTO CAR
           INNER JOIN VW_HORARIOS_2 HOR
              ON HOR.HORA = HOUR(DATA_CARREGAMENTO)
           WHERE CAR.STATUS_CARREG = 3
             AND CAR.PESO_BRUTO > 0
             AND CAR.COD_OPERACAO = ?
             AND CAR.DATA_CARREGAMENTO >= (SELECT MAX(PE.DAT_INI_PERIODO)
                                             FROM PERIODO_OPERACAO PE
                                            WHERE PE.COD_OPERACAO = CAR.COD_OPERACAO
                                               AND PE.DAT_FIM_PERIODO IS NULL )
             AND CAR.DATA_CARREGAMENTO <= (SELECT (CASE
                                                    WHEN TIME_FORMAT(PO.DAT_INI_PERIODO, "%H:%i:%s") BETWEEN '19:00:00' AND '23:59:59' THEN 
                                                      CONCAT(DATE_FORMAT(MAX(DATE_ADD(PO.DAT_INI_PERIODO, INTERVAL 1 DAY)), "%Y-%m-%d"), ' ', FIM_PERIODO, ":00")
                                                    ELSE 
                                                      CONCAT(DATE_FORMAT(MAX(PO.DAT_INI_PERIODO), "%Y-%m-%d"), ' ', FIM_PERIODO, ":00")
                                                   END)
                                             FROM PERIODO_OPERACAO PO
                                             INNER JOIN PERIODO PE ON PE.COD_PERIODO = PO.COD_PERIODO
                                             WHERE PO.COD_OPERACAO = CAR.COD_OPERACAO
                                               AND PO.DAT_FIM_PERIODO IS NULL)
          GROUP BY HOUR(DATA_CARREGAMENTO)
          UNION
          (SELECT H.HORARIO, H.QUANTIDADE_AUTOS, H.ORDEM
             FROM VW_HORARIOS_2 H
            WHERE H.INI_PERIODO = (SELECT HOUR(INI_PERIODO)
                                     FROM PERIODO_OPERACAO PO
                                      JOIN PERIODO PE 
                                        ON PE.COD_PERIODO = PO.COD_PERIODO
                                    WHERE PO.COD_OPERACAO = ?
                                      AND PO.DAT_FIM_PERIODO IS NULL)
           ORDER BY H.ORDEM)
              ) TB
          GROUP BY TB.HORA, TB.ORDEM
          ORDER BY TB.ORDEM;
    `, [id, id, id], (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    }
    )
})



//SALDO TOTAL NA OPERAÇÃO 
app.get('/api/dashboard/saldo/:id', (req, res) => {
    const id = req.params.id;

    db.query(`
    SELECT (SUM(CG.QTDE_MANIFESTADA) - 
    (SELECT SUM(CA.PESO_BRUTO - CA.PESO_TARA)
       FROM CARREGAMENTO CA
      WHERE CA.COD_OPERACAO = CG.COD_OPERACAO
        AND CA.PESO_BRUTO > 0
        AND CA.STATUS_CARREG = 3
     )) / 1000 AS SALDO
    FROM CARGA CG      
    WHERE CG.COD_OPERACAO = ?;
    `, id, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    }
    )
})


// PARALISAÇÃO
app.post('/api/paralisacao/criar', (req, res) => {
    const operacao = req.body.operacao;
    const periodo = req.body.periodo;
    const motivo = req.body.motivo;
    const complemento = '1';
    const obs = req.body.obs;
    const dtinicio = req.body.dtinicio;
    const usuario = req.body.usuario;
    const dtcadastro = req.body.dtcadastro;

    db.query(`
        INSERT INTO PARALISACAO (COD_OPERACAO, SEQ_PERIODO_OP, COD_MOTIVO, COD_COMPL, OBSERVACAO, DATA_INICIO, USUARIO, DAT_CADASTRO)
        VALUES (?,?,?,?,?,?,?,?);
            `,
        [operacao, periodo, motivo, complemento, obs, dtinicio, usuario, dtcadastro],
        (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('periodo iniciado!');
            }
        }
    )
});

app.get('/api/paralisacao/periodo/:id', (req, res) => {
    const id = req.params.id;

    db.query(`
        SELECT 
            PA.SEQ_PARALISACAO,
            PA.COD_OPERACAO,
            MT.DESC_MOTIVO,
            TIMESTAMPDIFF(MINUTE, PA.DATA_INICIO, PA.DATA_TERMINO) AS DURACAO 
        FROM 
            PARALISACAO PA 
            JOIN MOTIVO_PAR MT 
                ON MT.COD_MOTIVO = PA.COD_MOTIVO 
        WHERE 
            PA.SEQ_PERIODO_OP = ?
        ORDER BY 
            PA.DAT_CADASTRO DESC
    `, id, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

app.get('/api/verifica/paralisacao/:id', (req, res) => {
    const id = req.params.id;
    db.query(`
        SELECT 
            SEQ_PARALISACAO 
        FROM 
            PARALISACAO
        WHERE 
            COD_OPERACAO=? 
            AND DATA_TERMINO IS NULL
    `, id, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

app.get('/api/verifica/carregamento/:id', (req, res) => {
    const id = req.params.id;
    db.query(`
      SELECT * FROM CARREGAMENTO
        WHERE 
             COD_OPERACAO = ? 
            AND PESO_CARREGADO > 0;
    `, id, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

app.put('/encerrar/paralisacao', (req, res) => {

    const id = req.body.id
    const data = req.body.data

    db.query("UPDATE PARALISACAO SET `DATA_TERMINO` = ? WHERE (`SEQ_PARALISACAO` = ?);",
        [data, id], (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('paralisacao encerrada !');
            }
        }
    )
})

//EQUIPAMENTOS
app.get("/api/equipamentos", (req, res) => {
    db.query("SELECT * FROM EQUIPAMENTO;", (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

//CARGA
app.post('/api/carga/criar', (req, res) => {
    const operacao = req.body.operacao;
    const tipo = req.body.tipo;
    const numero = req.body.numero;
    const emissao = req.body.emissao;
    const cliente = req.body.cliente;
    const referencia = req.body.referencia;
    const produto = req.body.produto;
    const ncm = req.body.ncm;
    const cemercante = req.body.cemercante;
    const perigo = req.body.perigo;
    const manifestado = req.body.manifestado;
    const status = req.body.status;
    const emitirNF = req.body.emitirNF;
    const usuario = req.body.usuario;
    const datacadastro = req.body.datacadastro;

    db.query(`
            INSERT INTO CARGA (
                COD_OPERACAO,
                TIPO_DOC,
                NUMERO_DOC,
                DATA_EMISSAO,
                COD_CLIENTE,
                REFERENCIA,
                COD_PRODUTO,
                NCM,
                CE_MERCANTE,
                IND_CARGAIMO,
                QTDE_MANIFESTADA,
                STATUS_CARGA,
                EMITIR_NF,
                USUARIO, 
                DATA_CADASTRO
            )VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`,
        [operacao, tipo, numero, emissao, cliente, referencia, produto, ncm, cemercante, perigo, manifestado, status, emitirNF, usuario, datacadastro],
        (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('carga adicionada!');
            }
        }
    )
});

app.get('/api/destinos', (req, res) => {

    db.query(`SELECT * FROM DESTINO;`,
        (err, result) => {
            if (err) {
                console.log(err)
            } else {
                res.send(result)
            }
        }
    )
})

app.get('/api/carga/busca/:id', (req, res) => {
    const id = req.params.id;
    db.query(`
            SELECT 
            CA.COD_CARGA,
            CA.COD_OPERACAO,
            NV.NOME_NAVIO,
            NV.IMO_NAVIO,
            NV.BANDEIRA,
            NV.STATUS,
            CA.TIPO_DOC AS TIPO,
            CA.NUMERO_DOC AS NUMERO,
            CA.REFERENCIA,
            CL.NOME_CLIENTE AS IMPORTADOR,
            CA.DATA_EMISSAO,
            PR.PRODUTO,
            CA.NCM,
            CA.CE_MERCANTE,
            CA.IND_CARGAIMO AS PERIGOSO,
            CA.QTDE_MANIFESTADA
        FROM operacaogranel.CARGA CA
            JOIN operacaogranel.OPERACAO OP
                ON OP.COD_OPERACAO = CA.COD_OPERACAO
            JOIN operacaogranel.NAVIO NV
                ON NV.COD_NAVIO =  OP.COD_NAVIO
            JOIN operacaogranel.CLIENTE CL
                ON CL.COD_CLIENTE = CA.COD_CLIENTE
            JOIN operacaogranel.PRODUTO PR
                ON PR.COD_PRODUTO = CA.COD_PRODUTO
        WHERE CA.COD_OPERACAO = ?
    `,
        id, (err, result) => {
            if (err) {
                console.log(err)
            } else {
                res.send(result)
            }
        }
    )
})

app.delete('/carga/delete/:id', (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM CARGA WHERE COD_CARGA = ?", id, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(result);
            console.log('carga DELETADA!');
        }
    })
})

//VEICULOS
app.post('/api/motorista/criar', (req, res) => {
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

//GET TIPOS DE VEÍCULOS 
app.get("/api/tipoveiculo", (req, res) => {
    db.query("SELECT * FROM TIPO_VEICULO;", (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

app.get('/api/motorista/busca/:cpf', (req, res) => {
    const cpf = req.params.cpf;

    db.query('SELECT * FROM MOTORISTA WHERE CPF_MOTORISTA = ?',
        cpf, (err, result) => {
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



//consulta se ID CARREGAMENTO esta apto 

app.get('/api/valida/ticket/:idCarregamento', (req, res) => {
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

app.get('/api/impressao/busca/:idCarregamento', (req, res) => {
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

app.get('/api/ultimapesagem/busca/:id', (req, res) => {
    const { id } = req.params

    db.query(`
    SELECT 
        FC_PERIODO_CARREGAMENTO(CAR.DATA_TARA) AS PERIODO_TARA,
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
        FC_PERIODO_CARREGAMENTO(CAR.DATA_CARREGAMENTO) AS PERIODO_CARREGAMENTO,
        COALESCE(CAR.STATUS_NOTA_MIC, 1) AS STATUS_NOTA_MIC,
        CAR.DATA_BRUTO,
        CAR.OBS_NOTA,
        CAR.STATUS_CARREG,
        CAR.TICKET
    FROM 
        CARREGAMENTO CAR
        JOIN MOTORISTA MO
            ON MO.COD_MOTORISTA = CAR.COD_MOTORISTA
        JOIN TIPO_VEICULO TV
            ON TV.COD_TIPO = CAR.TIPO_VEICULO
        JOIN CARGA CG
            ON CG.COD_CARGA = CAR.COD_CARGA
            AND CG.COD_OPERACAO = CAR.COD_OPERACAO
    WHERE 
        CAR.COD_OPERACAO = ?
        AND ((CAR.STATUS_CARREG = 2
        OR (CAR.STATUS_CARREG = 3 AND CAR.PESO_TARA != 1000 AND COALESCE(CAR.STATUS_NOTA_MIC, 1) != 6)))
`, id, (err, result) => {
        if (err) {
            res.send(err)
            console.log(err)
        } else {
            res.send(result)
        }
    }
    )
})

app.put('/segundapesagem', (req, res) => {
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

app.put('/operacao/concluir/docs', (req, res) => {
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

app.put('/ultimapesagem', (req, res) => {
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

app.get('/api/carga/busca/:id', (req, res) => {
    const id = req.params.id;
    db.query(`
            SELECT 
            CA.COD_CARGA,
            CA.COD_OPERACAO,
            NV.NOME_NAVIO,
            NV.IMO_NAVIO,
            NV.BANDEIRA,
            NV.STATUS,
            CA.TIPO_DOC AS TIPO,
            CA.NUMERO_DOC AS NUMERO,
            CA.REFERENCIA,
            CL.NOME_CLIENTE AS IMPORTADOR,
            CA.DATA_EMISSAO,
            PR.PRODUTO,
            CA.NCM,
            CA.CE_MERCANTE,
            CA.IND_CARGAIMO AS PERIGOSO,
            CA.QTDE_MANIFESTADA
        FROM operacaogranel.CARGA CA
        INNER JOIN operacaogranel.OPERACAO OP
        ON OP.COD_OPERACAO = CA.COD_OPERACAO
        INNER JOIN operacaogranel.NAVIO NV
        ON NV.COD_NAVIO =  OP.COD_NAVIO
        INNER JOIN operacaogranel.CLIENTE CL
        ON CL.COD_CLIENTE = CA.COD_CLIENTE
        INNER JOIN operacaogranel.PRODUTO PR
        ON PR.COD_PRODUTO = CA.COD_PRODUTO
        WHERE CA.COD_OPERACAO = ?
    `,
        id, (err, result) => {
            if (err) {
                console.log(err)
            } else {
                res.send(result)
            }
        }
    )
})

app.post('/api/periodo/carregamentos/:id', (req, res) => {
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

app.post('/api/portal/relatorios/:id', (req, res) => {
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



app.post('/api/periodo/documentos/:id', (req, res) => {
    const id = req.params.id;
    const { data } = req.body;  //DD/MM/YYYY 13h⁰⁰/19h⁰⁰ formato que deve ser passado a data e periodo '10/05/2023 13h⁰⁰/19h⁰⁰'

    db.query(`
    SELECT CA2.PERIODO,
                   DOCUMENTO AS DOC_CARGA,
       COUNT(CA2.ID_CARREGAMENTO) AS QTDE_AUTOS_CARGA,
       SUM(CA2.PESO_LIQUIDO) AS PESO_LIQUIDO_CARGA
  FROM (SELECT CONCAT(CG.TIPO_DOC, " ", CG.NUMERO_DOC) AS DOCUMENTO,
		CAR.ID_CARREGAMENTO,
        FC_PERIODO_CARREGAMENTO(CAR.DATA_CARREGAMENTO) AS PERIODO,
        CAR.PESO_BRUTO - CAR.PESO_TARA AS PESO_LIQUIDO
          FROM CARREGAMENTO CAR
               JOIN CARGA CG
              ON CG.COD_OPERACAO = CAR.COD_OPERACAO AND CG.COD_CARGA = CAR.COD_CARGA
         WHERE CAR.STATUS_CARREG = 3
           AND CAR.PESO_BRUTO > 0
           AND CAR.COD_OPERACAO = ?
           AND FC_PERIODO_CARREGAMENTO(CAR.DATA_CARREGAMENTO) = ?
        ORDER BY DATA_CARREGAMENTO) CA2
  GROUP BY CA2.DOCUMENTO, CA2.PERIODO

    `, [id, data], (err, result) => {
        if (err) {
            console.log(err)
        } else {
            console.log(id, data);
            res.send(result)

        }
    });
});

app.post('/api/periodo/autos/:id', (req, res) => {
    const id = req.params.id;
    const { data } = req.body;  //DD/MM/YYYY 13h⁰⁰/19h⁰⁰ formato que deve ser passado a data e periodo '10/05/2023 13h⁰⁰/19h⁰⁰'

    db.query(`
    SELECT CA2.PERIODO,
       COUNT(CA2.ID_CARREGAMENTO) AS QTDE_AUTOS,
       SUM(CA2.PESO_LIQUIDO) AS PESO_LIQUIDO
  FROM (SELECT CAR.ID_CARREGAMENTO,
                               FC_PERIODO_CARREGAMENTO(CAR.DATA_CARREGAMENTO) AS PERIODO,
                               CAR.PESO_BRUTO - CAR.PESO_TARA AS PESO_LIQUIDO
          FROM CARREGAMENTO CAR 
         WHERE CAR.STATUS_CARREG = 3
           AND CAR.PESO_CARREGADO > 0
           AND CAR.COD_OPERACAO = ?
           AND FC_PERIODO_CARREGAMENTO(CAR.DATA_CARREGAMENTO) = ?
        ORDER BY DATA_CARREGAMENTO) CA2
  GROUP BY CA2.PERIODO

    `, [id, data], (err, result) => {
        if (err) {
            console.log(err)
        } else {
            console.log(id, data);
            res.send(result)

        }
    });
});





app.put('/alterar/docs', (req, res) => {
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

app.put('/alterar/tara', (req, res) => {
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


app.put('/alterarultima/tara', (req, res) => {
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

app.put('/alterar/pesomoega', (req, res) => {
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
app.put('/alterar/cavalo', (req, res) => {
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
app.put('/alterar/carreta1', (req, res) => {
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

app.put('/alterar/carreta2', (req, res) => {
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

app.put('/alterar/carreta3', (req, res) => {
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

app.put('/transporadora/atualiza', (req, res) => {
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

app.put('/documento/atualiza', (req, res) => {
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

app.put('/veiculo/atualiza', (req, res) => {
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

app.put('/documentos/atualiza', (req, res) => {
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

app.put('/carregamento/excluir', (req, res) => {
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
app.get("/api/relatorios", (req, res) => {
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

//primeira pesagem 
app.post('/api/pesagem/primeirapesagem', (req, res) => {
    const COD_CARGA = req.body.COD_CARGA
    const COD_OPERACAO = req.body.COD_OPERACAO
    const PLACA_CAVALO = req.body.PLACA_CAVALO
    const COD_MOTORISTA = req.body.COD_MOTORISTA
    const PLACA_CARRETA = req.body.PLACA_CARRETA
    const PLACA_CARRETA2 = req.body.PLACA_CARRETA2
    const PLACA_CARRETA3 = req.body.PLACA_CARRETA3
    const TIPO_VEICULO = req.body.TIPO_VEICULO
    const COD_TRANSP = req.body.COD_TRANSP
    const COD_DESTINO = req.body.COD_DESTINO
    const PESO_TARA = req.body.PESO_TARA
    const DATA_TARA = req.body.DATA_TARA
    const USUARIO_TARA = req.body.USUARIO_TARA
    const STATUS_CARREG = req.body.STATUS_CARREG
    const USUARIO = req.body.USUARIO
    const DATA_CADASTRO = req.body.DATA_CADASTRO
    const NR_PEDIDO = req.body.NR_PEDIDO
    const TIPO_PESAGEM = req.body.TIPO_PESAGEM


    db.query(`
        INSERT INTO CARREGAMENTO (
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
            PEDIDO_MIC, 
            TIPO_PESAGEM
        ) VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
        )`,
        [
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
            TIPO_PESAGEM
        ],
        (err, result) => {
            if (err) {
                res.send(err)
                console.log(err)
            } else {
                res.send("sucesso")
                console.log('Primeira pesagem cadastrada!');
            }
        }
    )
})

//Listar navios pra relatorio
app.get("/api/relatorios/operacoes", (req, res) => {
    db.query(`
    SELECT *  FROM  OPERACAO O 
    JOIN NAVIO N 
        ON N.COD_NAVIO = O.COD_NAVIO
        ORDER BY 
        O.ATRACACAO
      DESC
    `, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})



//Periodos pra relatorio 
app.get('/api/periodos/gerais/:id', (req, res) => {
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
        ORDER BY SEQ_PERIODO_OP DESC;         
    `, id, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    }
    )
})


app.get('/api/portal/periodos/gerais/:id', (req, res) => {
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



app.post('/api/operacao/paralisacao/:id', (req, res) => {
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

app.post('/api/login/user', (req, res) => {
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

//puxa ultima placa do motorista
app.get('/api/pesageminicial/historico/:cpf', (req, res) => {
    const cpf = req.params.cpf;

    db.query(`
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
JOIN OPERACAO O ON C.COD_OPERACAO = O.COD_OPERACAO
JOIN NAVIO N ON O.COD_NAVIO = N.COD_NAVIO
WHERE M.CPF_MOTORISTA = ?
ORDER BY C.DATA_TARA DESC, C.ID_CARREGAMENTO DESC
LIMIT 1;`,
        [cpf], (err, result) => {
            if (err) {
                res.send(err);
                console.log(err);
            } else {
                res.send(result);
                console.log(result);
            }
        }
    );
});


app.post('/api/operacao/complemento/:id', (req, res) => {
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
app.get('/api/operacao/gerais/:id', (req, res) => {
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

app.post('/api/operacao/autos/:id', (req, res) => {
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
app.get('/api/motivacao/conteudo/:id', async (req, res) => {
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

app.post('/api/executarPuppeteer', async (req, res) => {

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

// app.post('/api/motivacao/registrar', async (req, res) => {
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


app.post('/api/operacao/documentos/:id', (req, res) => {
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


app.get("/api/destino", (req, res) => {
    db.query(`SELECT * FROM DESTINO;`, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send(result)
        }
    })
})

app.get('/api/buscar/pedidos/:id', (req, res) => {
    const id = req.params.id;
    db.query(`SELECT * FROM PEDIDO WHERE COD_OPERACAO = ?`,
        id, (err, result) => {
            if (err) {
                console.log(err)
            } else {
                res.send(result)
            }
        }
    )
})

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
    var dir = `C:\\Users\\ogdev\\Desktop\\operacao_granel\\logs\\${idCarregamento}`;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    fs.writeFile(`${dir}\\${filename}.txt`, JSON.stringify(data, null, 4), error => {
        if (error)
            throw error;
    });
}

// MIC SISTEMAS - CONSULTAR NOTA
// app.post('/api/consultarnotamic/:id', async (req, res) => {
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
          const dir = `/app/Files/Notas_Fiscais/${codRAP}`;
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
  
    console.log("Consulta MIC finalizada");
  });

// MIC SISTEMAS - ENTREGAR NOTA
app.post('/api/entregarnotamic/:id', async (req, res) => {
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

app.post('/api/baixarnota', async (req, res) => {
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

    var dir = `\\\\rodrimar.com.br\\sistemas\\Exe\\Operacao-Granel\\Notas-Fiscais\\${nomeNavio}-${codRAP}`
    var file = `Nota Fiscal ${idCarregamento}.pdf`


    var file_data = {}

    try {
        var filepath = `${dir}\\${file}`

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
app.listen(8080, () => { console.log("servidor rodando na porta 8080...") });