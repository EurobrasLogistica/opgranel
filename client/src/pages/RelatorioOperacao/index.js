import React, { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import Brackground from "../../components/Background";
import Container from "../../components/Container";
import GraficoPercent from "../../components/GraficoPercent";
import Header from "../../components/Header";
import Axios from "axios";
import style from "./RelatorioOperacao.module.css";
import moment from "moment";
import { useNavigate, useParams } from "react-router-dom";
import Periodo from "@mui/material/Dialog";
import { SnackbarProvider, useSnackbar } from "notistack";
import SubmitButton from "../../components/Button";
import * as XLSX from "xlsx";

// === Base da API: localhost em dev; produção no build ===
const API_BASE =
  process.env.REACT_APP_SERVER ||
  (window.location.hostname === "localhost"
    ? "http://localhost:3009"
    : "https://opgranel.eurobraslogistica.com.br/api");

Axios.defaults.baseURL = API_BASE;
Axios.defaults.headers.common["Content-Type"] =
  "application/json; charset=utf-8";

const RelatorioPeriodo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    getEquipamentos();
    getPeriodos();
    getBercos();
    VerificaPeriodo();
    getOp();
    getPeriodo();
    getDados();
  }, []);

  const [navioslist, setNaviosList] = useState([]);
  const [equipamento, setEquipamento] = useState("");
  const [periodo, setPeriodo] = useState([]);
  const [berco, setBerco] = useState("");
  const [qtbordo, setQtBordo] = useState("");
  const [qtterra, setQtTerra] = useState("");
  const [gerador, setGerador] = useState("");
  const [grab, setGrab] = useState("");
  const [porao, setPorao] = useState("");
  const [requisicao, setRequisicao] = useState("");
  const [conexo, setConexo] = useState("");
  const [inicio, setInicio] = useState("");
  const [existePeriodo, setExistePeriodo] = useState(0);
  const usuario = JSON.parse(localStorage.getItem("user_token")).id;
  const [operacoes, setOperacoes] = useState([]);
  const [complemento, setComplemento] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [periodos, setPeriodos] = useState("");
  const [saldo, setSaldo] = useState([]);
  const [autos, setAutos] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [bercos, setBercos] = useState([]);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [buttonText, setButtonText] = useState("Cadastrar");
  const [list, setList] = useState([]);

  async function getDados() {
    await Axios.get(`/grafico/${id}`).then(function (res) {
      setList(res.data);
      console.log(res.data);
    });
  }

  const getOp = () => {
    Axios.get(`/relatorios/operacoes`).then((response) => {
      setNaviosList(response.data);
    });
  };

  const getDate = () => {
    const date = new Date();
    date.setHours(date.getHours() - 3);
    return date.toISOString().slice(0, 19).replace("T", " ");
  };

  const getEquipamentos = () => {
    Axios.get(`/equipamentos`).then((response) => {
      setEquipamentos(response.data);
    });
  };

  const getPeriodos = () => {
    Axios.get(`/periodos/horarios`).then((response) => {
      setPeriodos(response.data);
    });
  };

  const getBercos = () => {
    Axios.get(`/bercos`).then((response) => {
      setBercos(response.data);
    });
  };

  const showAlert = (txt, variant) => {
    enqueueSnackbar(txt, { variant: variant });
  };

  const VerificaPeriodo = () => {
    Axios.get(`/periodo/busca/${id}`).then(function (res) {
      setExistePeriodo(res.data[0].EXISTE);
    });
  };

  const getOperacoes = () => {
    getAutos();
    getDocumentos();
    getComplemento();
    Axios.post(`/operacao/paralisacao/${id}`, {
      data: relatorios,
    }).then((response) => {
      setOperacoes(response.data);
    });
  };

  const getAutos = () => {
    Axios.post(`/operacao/autos/${id}`, {
      data: relatorios,
    }).then((response) => {
      setAutos(response.data);
    });
  };

  const getDocumentos = () => {
    Axios.post(`/operacao/documentos/${id}`, {
      data: relatorios,
    }).then((response) => {
      setDocumentos(response.data);
    });
  };

  const getComplemento = () => {
    Axios.post(`/operacao/complemento/${id}`, {
      data: relatorios,
    }).then((response) => {
      setComplemento(response.data);
    });
  };

  useEffect(() => {
    DadosDashboard();
    getVeiculos();
    VerificaParalisacao();
  }, []);

  const [busca, setBusca] = useState("");
  const [existeParalisacao, setExisteParalisacao] = useState(0);
  const [dadosDash, setDadosDash] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [paralisacoes, setParalisacoes] = useState([]);
  const [descarregado, setDescarregado] = useState([]);
  const [relatorios, setRelatorios] = useState(""); // STRING no select

  const [i, setI] = useState({});
  const [peso2, setPeso2] = useState("");
  const [data, setData] = useState("");
  const [obsPesagem, setObsPesagem] = useState("");

  const [pesobruto, setPesoBruto] = useState("");
  const [databruto, setDataBruto] = useState("");

  const getPeriodo = () => {
    Axios.get(`/operacao/gerais/${id}`).then((response) => {
      setPeriodo(response.data);
    });
  };

  const VerificaParalisacao = () => {
    Axios.get(`/verifica/paralisacao/${id}`).then(function (res) {
      setExisteParalisacao(res.data);
    });
  };

  const DadosDashboard = () => {
    Axios.get(`/periodo/dashboard/${id}`).then(function (res) {
      setDadosDash(res.data[0]);
      Axios.get(`/paralisacao/periodo/${res.data[0].SEQ_PERIODO_OP}`).then(
        function (res) {
          setParalisacoes(res.data);
        }
      );
    });
  };

  const getVeiculos = () => {
    Axios.get(`/ultimapesagem/busca/${id}`).then(function (res) {
      setVeiculos(res.data);
    });
  };

  const downloadNota = async (idCarregamento) => {
    const data = {
      idCarregamento: idCarregamento,
    };

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: `/baixarnota`,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      data: data,
    };

    Axios.request(config)
      .then((res) => {
        const parts = res.data.pdf.split(",");
        const header = parts[0];
        const content = parts[parts.length - 1];

        const byteCharacters = atob(content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const file = new Blob([byteArray], {
          type: header.split(":")[1],
        });

        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = res.data.filename;
        link.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        showAlert("Erro ao obter PDF", "error");
        console.log(err?.response?.data?.mensagem || err);
      });
  };

  return (
    <>
      <Navbar relatorios />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          <div className={style.nav}>
            <div onClick={() => navigate(`/relatorios`)}>Selecione um navio</div>
            <div className={style.nav}>
              <div onClick={() => navigate(`/relatorios/${id}`)}>
                Relatório por Período
              </div>
            </div>
            <div className={style.active}>Relatório por Operação</div>
          </div>

          <div className={style.flex}>
            <div>
              <div className={style.form_control}>
                <label>Selecione uma operação:</label>
                <select
                  value={relatorios || ""}
                  onChange={(e) => setRelatorios(e.target.value)}
                >
                  <option value="" disabled>
                    Selecione uma opção
                  </option>
                  {periodo?.map((val, idx) => (
                    <option key={idx} value={val.NAVIO}>
                      {val.NAVIO}
                    </option>
                  ))}
                </select>

                <div className={style.submit_button}>
                  <SubmitButton text={"Buscar"} onClick={getOperacoes} />
                </div>
                <div className={style.periodo}>
                  <div className={style.data}>{relatorios}</div>
                </div>
              </div>
            </div>

            <div className={style.cards}>
              <span className={style.cardinfo}>
                <div className={style.box}>
                  <div className="content">
                    <center>
                      <i className="fa fa-truck icon"></i> Carregados
                    </center>
                    {autos.map((val, idx) => (
                      <div key={idx} className={style.total}>
                        {val.QTDE_AUTOS} Autos
                      </div>
                    ))}
                  </div>
                </div>
              </span>

              <span className={style.cardinfo}>
                <div className={style.box}>
                  <div className="content">
                    <center>
                      <i className="fa fa-weight-hanging icon"></i> Manifestado
                    </center>
                    {autos.map((val, idx) => (
                      <div key={idx} className={style.total}>
                        {(val.MANIFESTADO / 1000).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 3,
                        })}{" "}
                        Tons
                      </div>
                    ))}
                  </div>
                </div>
              </span>

              <span className={style.cardinfo}>
                <div className={style.box}>
                  <div className="content">
                    <center>
                      <i className="fa fa-balance-scale icon"></i> Saldo
                    </center>
                    {autos.map((val, idx) => (
                      <div key={idx} className={style.total}>
                        {(val.SALDO / 1000).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        Tons
                      </div>
                    ))}
                  </div>
                </div>
              </span>
            </div>
          </div>

          <div className={style.grafico}>
            <div className={style.gftitle}>
              Quantidade descarregada por (DI/BL)
            </div>
            <GraficoPercent docs={list} />
          </div>

          <div className={style.flex}>
            <div className={style.table}>
              <table className="table">
                <thead>
                  <tr>
                    <th>
                      <abbr title="Motivo">Motivo </abbr>
                    </th>
                    <th>
                      <abbr title="TotalHoras">Total </abbr>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {operacoes
                    .filter((val) => {
                      if (busca === "") return true;
                      return (
                        val.MOTIVO.toLowerCase().includes(
                          busca.toLowerCase()
                        ) ||
                        val.HORAS.toLowerCase().includes(
                          busca.toLowerCase()
                        )
                      );
                    })
                    .map((val, idx) => (
                      <tr key={idx}>
                        <th>{val.MOTIVO}</th>
                        <th className={style.horaTable}>{val.HORAS}</th>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className={style.tableC}>
              <table className="table">
                <thead>
                  <tr>
                    <th>
                      <abbr title="Complemento">Complemento</abbr>
                    </th>
                    <th>
                      <abbr title="Observacao">Observação </abbr>
                    </th>
                    <th>
                      <abbr title="TotalHoras">Total </abbr>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {complemento
                    .filter((val) => {
                      if (busca === "") return true;
                      return (
                        val.COMPLEMENTO.toLowerCase().includes(
                          busca.toLowerCase()
                        ) ||
                        val.OBSERVACAO.toLowerCase().includes(
                          busca.toLowerCase()
                        ) ||
                        val.HORA.toLowerCase().includes(busca.toLowerCase())
                      );
                    })
                    .map((val, idx) => (
                      <tr key={idx}>
                        <th>{val.COMPLEMENTO}</th>
                        <th>{val.OBSERVACAO}</th>
                        <th className={style.horaTable}>{val.HORA}</th>
                      </tr>
                    ))}

                  {/* <div>
                    <SubmitButton text={'Exportar para Excel'} onClick={handleExportClick}/>
                  </div> */}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <center>
          <div className={style.navio}>
            <i className="fa fa-ship icon"></i>&nbsp;&nbsp;&nbsp;
            {dadosDash.NOME_NAVIO || "--"}
          </div>
        </center>
      </Container>
    </>
  );
};

export default function IntegrationNotistack() {
  return (
    <SnackbarProvider
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      maxSnack={3}
      autoHideDuration={2500}
    >
      <RelatorioPeriodo />
    </SnackbarProvider>
  );
}
