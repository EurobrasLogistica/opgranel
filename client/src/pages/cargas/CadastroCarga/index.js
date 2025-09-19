import React from "react";
import { useEffect, useState } from 'react';
import Axios from 'axios';
import { SnackbarProvider, useSnackbar } from 'notistack';
import Navbar from "../../../components/Navbar";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import Input from "../../../components/Input";
import Confirm from '@mui/material/Dialog';
import moment from "moment";
import SubmitButton from "../../../components/Button";
import { useNavigate, useParams } from "react-router-dom";
import style from "./CadastroCarga.module.css";
import modal from "./Modal.module.css";
import MaskedInput from "../../../components/InputMask";

const CadastroCarga = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { nome } = useParams();
  const usuario = JSON.parse(localStorage.getItem("user_token")).id;

  const [tipo, setTipo] = useState("");
  const [perigo, setPerigo] = useState("");
  const [emitirNF, setEmitirNF] = useState("");
  const [numero, setNumero] = useState("");
  const [agentes, setAgentes] = useState();
  //const [agente, setAgente] = useState("");
  const [emissao, setEmissao] = useState("");
  const [datacadastro, setDataCadastro] = useState("");
  const [produto, setProduto] = useState("");
  const [ncm, setNcm] = useState("");
  const [descncm, setDescncm] = useState("");
  const [manifestado, setManifestado] = useState("");
  const [cemercante, setCemercante] = useState("");
  const [cargas, setCargas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cliente, setCliente] = useState([]);
  const [ncms, setNcms] = useState([]);
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    getCargas();
    getClientes();
    getAgentes()
    getProdutos();
    getNcms();
  }, [])

  const getClientes = () => {
    Axios.get('https://opgranel.eurobraslogistica.com.br/api/clientes').then((response) => {
      setCliente(response.data);
    });
  }
  const getNcms = () => {
    Axios.get('https://opgranel.eurobraslogistica.com.br/api/ncm').then((response) => {
      setNcms(response.data);
    });
  }
  const getProdutos = () => {
    Axios.get('https://opgranel.eurobraslogistica.com.br/api/produtos').then((response) => {
      setProdutos(response.data);
    });
  }
  const getCargas = () => {
    Axios.get(`https://opgranel.eurobraslogistica.com.br/api/carga/busca/${id}`,)
      .then(function (res) {
        setCargas(res.data);
      });
  }

  const getDate = () => {
    const date = new Date()
    date.setHours(date.getHours() - 3)
    return (date.toISOString().slice(0, 19).replace('T', ' '))
  }

  var total = cargas.reduce(getTotal, 0);
  function getTotal(total, item) {
    return total + (item.QTDE_MANIFESTADA * 1);
  }

  const addCarga = () => {
    Axios.post('https://opgranel.eurobraslogistica.com.br/api/carga/criar', {
      operacao: id,
      tipo: tipo,
      perigo: perigo,
      numero: numero,
      emissao: emissao,
      cliente: clientes,
      referencia: numero.substring(6),
      produto: produto,
      ncm: ncm,
      cemercante: cemercante,
      perigo: perigo,
      manifestado: manifestado,
      status: '1',
      emitirNF: emitirNF,
      usuario: usuario,
      datacadastro: getDate(),
    })
      .then(function (res) {
        console.log(res);
        res.data.sqlMessage ?
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Carga cadastrada com sucesso!', 'success');
        getCargas();
      });
  }

  const deleteCarga = (id) => {
    Axios.delete(`https://opgranel.eurobraslogistica.com.br/api/carga/delete/${id}`)
      .then(function (res) {
        console.log(res);
        res.data.sqlMessage ?
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Carga DELETADA com sucesso!', 'success');
        getCargas();
      });
  }

  const concluirDocs = () => {
    Axios.put('https://opgranel.eurobraslogistica.com.br/api/operacao/concluir/docs',
      {
        id: id,
        status: 'AGUARDANDO ATRACAÇÃO'
      }).then(function (res) {
        res.data.sqlMessage ?
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Documentação concluida com sucesso!', 'success');
        FecharConfirm();
        setTimeout(() => {
          navigate("/cargas");
        }, 1500);
      });
  }


  const { enqueueSnackbar } = useSnackbar();
  const showAlert = (txt, variant) => {
    enqueueSnackbar(txt, { variant: variant });
  }

  const validaDados = () => {
    if (!tipo | !numero | !clientes | !emissao | !produto | !ncm | !cemercante | !manifestado) {
      showAlert('Preencha todos os campos!', 'error')
      return;
    }

    addCarga();
  }


  const [openA, setOpenA] = useState(false);
  const AbrirConfirm = () => {
    if (cargas.length == 0) {
      return showAlert('Nenhuma carga cadastrada. Insira uma carga para continuar!', 'error')
    }
    setOpenA(true);
  };
  const FecharConfirm = () => {
    setOpenA(false);
  };



  const getAgentes = () => {
    Axios.get('https://opgranel.eurobraslogistica.com.br/api/agentes').then((response) => {
      setAgentes(response.data);
    });
  }


  return (
    <>
      <Navbar cargas />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          <div className={style.nav}>
            <div onClick={() => navigate("/cargas")}>
              Voltar
            </div>
            <div className={style.active}>
              Cadastrar Carga
            </div>
          </div>

          <div className={style.navio}>
            <i className="fa fa-ship icon"></i>
            &nbsp;&nbsp;&nbsp;
            {nome}
          </div>
          <div className={style.flex}>
            <div className={style.form_control}>
              <label>Tipo: <br /></label>
              <select onChange={(e) => [setTipo(e.target.value)]}>
                <option disabled selected>Selecione uma opção</option>
                <option value={"BL"}>BL</option>
                <option value={"DI"}>DI</option>
              </select>
            </div>


            <Input
              type={"text"}
              text={"Número do documento"}
              placeholder={''}
              onChange={(e) => [setNumero(e.target.value)]}
            />
            <div className={style.form_control}>
              <label>Produto Perigoso: <br /></label>
              <select onChange={(e) => [setPerigo(e.target.value)]}>
                <option disabled selected>Selecione uma opção</option>
                <option value={"S"}>Sim</option>
                <option value={"N"}>Não</option>
              </select>
            </div>
            <div className={style.form_control}>
              <label>Emissão de Nota Fiscal: <br /></label>
              <select onChange={(e) => [setEmitirNF(e.target.value)]}>
                <option disabled selected>Selecione uma opção</option>
                <option value={"S"}>Sim</option>
                <option value={"N"}>Não</option>
              </select>
            </div>
          </div>
          <div className={style.flex}>
            <div className={style.form_control}>
              <label>Importador:</label>
              <select onChange={(e) => setClientes(e.target.value)}>
                <option disabled selected>Selecione uma opção</option>
                {cliente?.map((val, key) => {
                  return (
                    <option value={val.COD_CLIENTE}>{val.NOME_CLIENTE} - CNPJ: {val.CNPJ_CLIENTE} </option>
                  )
                })}
              </select>
            </div>
            <Input
              type={"date"}
              text={"Selecione a Data de Emissão"}
              onChange={(e) => [setEmissao(e.target.value)]}
            />

          </div>


          <div className={style.flex}>
            <div className={style.form_control}>
              <label>NCM:</label>
              <select onChange={(e) => [setNcm(e.target.value)]}>
                <option disabled selected>Selecione uma opção</option>
                {ncms?.map((val) => {
                  return (
                    <option value={val.COD_NCM}>{val.COD_NCM} - {val.DESCRICAO_NCM}</option>
                  )
                })}
              </select>
            </div>            

            <div className={style.form_control}>
              <label>Produto:</label>
              <select onChange={(e) => [setProduto(e.target.value)]}>
                <option disabled selected>Selecione uma opção</option>
                {produtos?.map((val) => {
                  return (
                    <option value={val.COD_PRODUTO}>{val.PRODUTO}</option>
                  )
                })}
              </select>
            </div>
            <Input
              type={"text"}
              text={"Qtde Manifestada (Kg)"}
              onChange={(e) => [setManifestado(e.target.value)]}
            />
            <Input
              type={"text"}
              text={"CE Mercante"}
              onChange={(e) => [setCemercante(e.target.value)]}
            />


          </div>
          <div className={style.listatitulo}>Histórico</div>
          <div className={style.cargas}>
            <div className={style.sumario}>
              <div>TIPO</div>
              <div>CÓDIGO</div>
              <div>REFERÊNCIA</div>
              <div>DT. EMISSÃO</div>
              <div>PERIGO</div>
              <div>IMPORTADOR</div>
              <div>PRODUTO</div>
              <div>NCM</div>
              <div>QT. MANIFESTADA</div>
              <div>CE MERCANTE</div>
              <div></div>
            </div>
            <div className={style.lista}>

              {cargas.length == 0 ?
                "nenhuma carga identificada"
                :
                cargas.map((val) => {
                  return (<div className={style.item}>
                    <div>{val.TIPO}</div>
                    <div>{val.NUMERO}</div>
                    <div>{val.REFERENCIA}</div>
                    <div>{moment(val.DATA_EMISSAO).format("DD/MM/YYYY")}</div>
                    <div>{val.PERIGOSO}</div>
                    <div>{val.IMPORTADOR}</div>
                    <div>{val.PRODUTO}</div>
                    <div>{val.NCM}</div>
                    <div>{(val.QTDE_MANIFESTADA).toLocaleString(undefined, {maximumFractionDigits: 2,})}</div>
                    <div>{val.CE_MERCANTE}</div>
                    <div>
                      <span className={style.delete}>
                        <i class="fa fa-trash" onClick={() => deleteCarga(val.COD_CARGA)}></i>
                      </span>
                    </div>
                  </div>
                  )
                })}

            </div>
          </div>
          <div className={style.flex}>
            <SubmitButton text={"ADICIONAR"} onClick={validaDados} />
            <div className={style.total}>
              TOTAL DO NAVIO
              <div>
                {/* 120.000,000 KG */}
                {(total).toLocaleString(undefined, {maximumFractionDigits: 2,})} KG
              </div>
            </div>
            <SubmitButton text={"CONCLUIR"} onClick={AbrirConfirm} />
          </div>
        </div>
      </Container>
    Sou Analista de Sistemas, atuando desde o levantamento de requisitos e necessidades com usuários até a entrega de soluções. Tenho experiência com as seguintes tecnologias:
• C#: Windows Forms, ASP.NET, Programação Orientada a Objetos
• JavaScript​: Node.js, React.js
• HTML, CSS
• MySQL 
• SQL Server
• PL/SQL
• Conhecimentos em Containers, API, Azure DevOps e Cloud;
• Familiaridade com ferramentas como Git e metodologias ágeis

Sou formada em Análise e Desenvolvimento de Sistemas e atualmente curso pós-graduação em Desenvolvimento Full Stack pela PUC. Busco constantemente aprimorar minhas habilidades e contribuir em projetos que estou envolvida.
    </>
  );
};

export default function IntegrationNotistack() {
  return (
    <SnackbarProvider
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      maxSnack={3}
      autoHideDuration={2500}>
      <CadastroCarga />
    </SnackbarProvider >
  );
}