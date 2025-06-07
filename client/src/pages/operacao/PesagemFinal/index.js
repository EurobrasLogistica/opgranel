import { SnackbarProvider, useSnackbar } from 'notistack';
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Axios from "axios";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import GerarNfe from "../../../components/GerarNfe";
import Header from "../../../components/Header";
import Input from "../../../components/Input";
import MaskedInput from "../../../components/InputMask";
import Navbar from "../../../components/Navbar";
import Pesagem from '@mui/material/Dialog';
import React from "react";
import SubmitButton from "../../../components/Button";
import modal from "./Modal.module.css";
import moment from "moment";
import style from "./PesagemFinal.module.css";

//../Operacao/Operacao.module.css


const PesagemFinal = () => {

  useEffect(() => {
    DadosDashboard();
    getVeiculos();
    VerificaParalisacao();

  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      DadosDashboard();
      getVeiculos();
      VerificaParalisacao();
    }, 1500)

    return () => clearInterval(interval); //This is important

  }, [])

  const navigate = useNavigate();
  let { id } = useParams();

  const [busca, setBusca] = useState("");

  const [existeParalisacao, setExisteParalisacao] = useState(0);
  const [dadosDash, setDadosDash] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [paralisacoes, setParalisacoes] = useState([]);
  const [descarregado, setDescarregado] = useState([]);

  const usuario = JSON.parse(localStorage.getItem("user_token")).id;

  const [i, setI] = useState({});
  const [peso2, setPeso2] = useState("");
  const [data, setData] = useState("");
  const [obsPesagem, setObsPesagem] = useState("");

  const [pesoliquido, setPesoLiquido] = useState("");
  const [pesobruto, setPesoBruto] = useState("");
  const [databruto, setDataBruto] = useState("");
  const [ticket, setTicket] = useState("");


  const [mostaInput1, setMostaInput1] = useState(false);
  const [mostaInput2, setMostaInput2] = useState(false);


  //modal de 2 pesagem
  const [openA, setOpenA] = useState(false);
  const AbrirPesagem = () => {
    setOpenA(true);
  };
  const FecharPesagem = () => {
    setOpenA(false);
  };

  const [openB, setOpenB] = useState(false);
  const AbrirConfirm = () => {
    setOpenB(true);
  };
  const FecharConfirm = () => {
    setOpenB(false);
  };

  const [MostaInput, setMostaInput] = useState(false);


  const divClick1 = () => {
    setMostaInput1(true);
  }; 


  const divClick2 = () => {
    setMostaInput2(true);
  }; 

  const divClick = () => {
    setMostaInput(true);
  };

  const getVeiculoAtual = () => {
    return veiculos.find(item => item.ID_CARREGAMENTO === i.ID_CARREGAMENTO) || i
  }

  const getDate = () => {
    const date = new Date()
    date.setHours(date.getHours() - 3)
    return (date.toISOString().slice(0, 19).replace('T', ' '))
  }
  const VerificaParalisacao = () => {
    Axios.get(`https://opgranel.eurobraslogistica.com.br/api/verifica/paralisacao/${id}`,)
      .then(function (res) {
        setExisteParalisacao(res.data)
      })
  }
  const DadosDashboard = () => {
    Axios.get(`https://opgranel.eurobraslogistica.com.br/api/periodo/dashboard/${id}`,)
      .then(function (res) {
        setDadosDash(res.data[0])
        Axios.get(`https://opgranel.eurobraslogistica.com.br/api/paralisacao/periodo/${res.data[0].SEQ_PERIODO_OP}`,)
          .then(function (res) {
            setParalisacoes(res.data)
          })
      })
  }
  const getVeiculos = () => {
    Axios.get(`https://opgranel.eurobraslogistica.com.br/api/ultimapesagem/busca/${id}`,)
      .then(function (res) {
        setVeiculos(res.data)
      })
  }



  const datetimeLocal = (datetime) => {
    if (datetime == undefined)
      return '' 

    const dt = new Date(datetime);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    return dt.toISOString().slice(0, 16).replace("T", " ");
  }

  const GerarNotaMIC = async () => {
    if (getVeiculoAtual().STATUS_NOTA_MIC == 4)
      return
    
    const preparaPlaca = (placa) => {
      if (placa == undefined || placa == '')
        return ''

      return placa.replace(/\s/g, '').slice(0, 3) + ' ' +  placa.replace(/\s/g, '').slice(3)
    }

    const data = {
      placa1: preparaPlaca(i.PLACA_CARRETA),
      placa2: preparaPlaca(i.PLACA_CARRETA2),
      placa3: preparaPlaca(i.PLACA_CARRETA3),
      placaCavalo: preparaPlaca(i.PLACA_CAVALO),
      num_DI: i.NUMERO_DOC,
      pedido_mic: i.PEDIDO_MIC,
      tara: parseFloat(i.PESO_TARA),
      peso_bruto: parseFloat(i.PESO_TARA) + parseFloat(i.PESO_LIQUIDO || pesoliquido),
      peso_liquido: parseFloat(i.PESO_LIQUIDO),
      codTiquete: i.TICKET || ticket,
      data: i.DATA_CARREGAMENTO || data
    };

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `https://opgranel.eurobraslogistica.com.br/api/gerarnotamic/${i.ID_CARREGAMENTO}`,
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
      },
      data: data
    };

    await Axios.request(config)
    FecharPesagem()
  }

  const EntregarNotaMIC = async () => {
    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `https://opgranel.eurobraslogistica.com.br/api/entregarnotamic/${i.ID_CARREGAMENTO}`,
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
      },
    };

    await Axios.request(config)
    FecharPesagem()
    showAlert("Nota entregue!", 'success')
  }

  const DownloadNota = async () => {
    if (getVeiculoAtual().STATUS_NOTA_MIC != 4)
      return

    const input_data = {
        idCarregamento: i.ID_CARREGAMENTO
    };

    const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://opgranel.eurobraslogistica.com.br/api/baixarnota`,
        headers: { 
          'Content-Type': 'application/json; charset=utf-8',
        },
        data: input_data
    };
  
    Axios.request(config)
    .then((res) => {
        var byteCharacters = atob(res.data.pdf.split(',')[res.data.pdf.split(',').length - 1]);
        var byteNumbers = new Array(byteCharacters.length);
        for (var i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        var byteArray = new Uint8Array(byteNumbers);
        var file = new Blob([byteArray], { type: res.data.pdf.split(',')[0].split(":")[1] });

        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = res.data.filename 
        link.click();
        URL.revokeObjectURL(url);
    })
    .catch((err) => {
        showAlert('Erro ao obter PDF', 'error')
        console.log(err.response.data.mensagem)
    })
  }

  const { enqueueSnackbar } = useSnackbar();
  const showAlert = (txt, variant) => {
    enqueueSnackbar(txt, { variant: variant });
  }



  const validaDados = () => {
    if (!pesoliquido || !databruto) {
      showAlert('Preencha todos os campos!', 'error')
      return;
    }  
    if(pesoliquido <= 0){
      showAlert('Peso deve ser maior do que 0!', 'error')
      return;
    } 
    addPesagem()
  }

  const addPesagem = async () => {
    
    await Axios.put(`https://opgranel.eurobraslogistica.com.br/api/ultimapesagem`, {
      peso3: pesoliquido,
      data: databruto,
      usuario: usuario,
      ticket: ticket,
      id: i.ID_CARREGAMENTO
    }).then(function (res) {
      console.log(res);
      if (res.data.sqlMessage)
          showAlert(res.data.sqlMessage, 'error')
        else {
          showAlert('Pesagem cadastrada com sucesso!', 'success');
      //    GerarNotaMIC()
          FecharPesagem()
        }

      setTimeout(() => {
        navigate(`/operacao/pesagemfinal/${id}`)
      }, 1000);
    });
  }

  return (
    <>
      <Navbar operacao />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          <div className={style.nav}>
            <div onClick={() => navigate(`/operacoes`)}>
              Operações
            </div>
            <div onClick={() => navigate(`/operacao/${id}`)}>
              Dashboard Período
            </div>
            <div className={style.active}>
              Pesagem Final
            </div>
            <div onClick={() => navigate(`/operacao/GraficoDocs/${id}`)}>
              DI / BL
            </div>
            <div onClick={() => navigate(`/operacao/${id}/AberturaPeriodo`)}>
              Abertura de Período
            </div>
          </div>
          {!dadosDash.SEQ_PERIODO_OP ?
            <div>
              <div className={style.notform}>DASHBOARD INDISPONÍVEL</div>
            </div>
            :
            <div>
              <div className={style.flex}>
                <div className={style.periodo}>
                  {dadosDash.DEN_PERIODO || "--/--"}
                  <div className={style.data}>
                    {/* 02/01/2023 */}
                    {moment(dadosDash.INI_PERIODO).format("DD/MM/YYYY") || "--/--"}
                  </div>
                </div>
                <div>
                </div>
                <div className={style.status}>
                  <div className={`${style[dadosDash.STATUS_OPERACAO]}`}>
                    <i className="fa fa-truck"></i>&nbsp;&nbsp;{`${veiculos.length} VEÍCULOS DISPONÍVEIS` || "--"}
                  </div>
                </div>
              </div>
              <div className={style.flex}>
                <div className={style.tara}>
                  <div className={style.taratitulo}>
                    <div>
                      <input placeholder="Pesquisar..." type="text" onChange={(e) => { setBusca(e.target.value) }} />
                      <i className="fa fa-search"></i>
                    </div>

                  </div>
                  <div className={style.sumario}>
                    <div>Nome</div>
                    <div>Cavalo</div>
                    <div>Horário (Tara)</div>
                    <div>1º Peso (tara) + período</div>
                    <div>Horário (2° peso)</div>
                    <div>2º Peso (Moega) + período</div>
                  </div>
                  <div className={style.lista}>{
                      veiculos.filter((val) => {
                      let nome = val.NOME_MOTORISTA.trim().split(' ')[0]
                      let horario = moment(val.DATA_TARA).format('HH:mm')

                      val.COR = 'item_status_' + (val.STATUS_NOTA_MIC == 1 ? 'def' : val.STATUS_NOTA_MIC)

                      if (busca == "") {
                        return val
                      } else if (nome.toLowerCase().includes(busca.toLowerCase()) ||
                        val.PLACA_CAVALO.toLowerCase().includes(busca.toLowerCase()) ||
                        horario.toLowerCase().includes(busca.toLowerCase()) ||
                        val.DATA_TARA.includes(busca.toLowerCase()) ||
                        String(val.PESO_TARA).includes(busca.toLowerCase()) ||
                        String(val.PESO_CARREGADO).includes(busca.toLowerCase()) ||
                        val.PERIODO_CARREGAMENTO.includes(busca.toLowerCase()) ||
                        val.PERIODO_TARA.includes(busca.toLowerCase())
                      ) {
                        return val
                      }
                    }).map((val, key) => {
                      return (
                        <div className={style.item + ' ' + style[val.COR]} onClick={() => [AbrirPesagem(), setI(val)]}>
                          <div className={style.item_cell}>{val.NOME_MOTORISTA.trim().split(' ')[0] || "-"}</div>
                          <div className={style.item_cell}>{val.PLACA_CAVALO || "-"}</div>
                          <div className={style.item_cell}>{moment(val.DATA_TARA).format('HH:mm') || "-"}</div>
                          <div className={style.wrap + ' ' + style.item_cell}>{String(val.PESO_TARA)} kg       <span className={style.barrinha}><b>|{val.PERIODO_CARREGAMENTO}|</b></span> </div>
                         <div className={style.item_cell}>{moment(val.DATA_CARREGAMENTO).format('HH:mm') || "-"}</div>
                          <div className={style.wrap + ' ' + style.item_cell}>{String(val.PESO_CARREGADO)} kg       <span className={style.barrinha}><b>|{val.PERIODO_CARREGAMENTO}|</b></span> </div>
                        </div>
                      )
                    })
                  }
                  
                  </div>
                </div>
              </div>
            </div>}
        </div>
      </Container>
      <Pesagem open={openA} onClose={FecharPesagem} fullWidth>
        <div className={modal.modal}>
          <div className={modal.nav}>
            <div onClick={FecharPesagem}>Voltar</div>
            <div className={modal.active}>Peso Liquido </div>
          </div>
          <div className={modal.flex}>
            <div className={modal.periodo}>
              {dadosDash.DEN_PERIODO || "--/--"}
              <div className={modal.data}>
                {moment(dadosDash.INI_PERIODO).format("DD/MM/YYYY") || "--/--"}
              </div>
              {getVeiculoAtual().STATUS_CARREG == 3 && (
              <div className={modal.nota}>
                <h2>MIC Sistemas</h2>
                <div className={modal.gera_nota} onClick={getVeiculoAtual().STATUS_NOTA_MIC == 4 ? DownloadNota : undefined} style={getVeiculoAtual().STATUS_NOTA_MIC == 4 ? {"cursor": "pointer"} : {"cursor": "auto"}}>
                  <i className="fa fa-file-pdf icon"></i>
                  <h3>BAIXAR Nota Fiscal</h3>
                </div>
                {getVeiculoAtual().STATUS_NOTA_MIC != 4 &&
                (<label className={modal['obs_nota_status_' + (getVeiculoAtual().STATUS_NOTA_MIC < 3 ? 'def' : getVeiculoAtual().STATUS_NOTA_MIC)]}>
                  {getVeiculoAtual().OBS_NOTA}
                </label>)}
                {getVeiculoAtual().STATUS_NOTA_MIC == 4 &&
                (<label>
                  <input onClick={EntregarNotaMIC} type="checkbox" style={{"width" : "auto", "marginRight" : "5px"}} value="1" />
                  Entregue ao Motorista
                </label>)}
              </div>
              )}
            </div>
            <div className={modal.motorista}>
              <div><b>ID: </b>{i.ID_CARREGAMENTO}</div>
              <div><b>Motorista: </b>{i.NOME_MOTORISTA}</div>
              <div><b>Cavalo: </b>{i.PLACA_CAVALO}</div>
              <div><b>1° Carreta: </b>{i.PLACA_CARRETA}</div>
              <div><b>2° Carreta: </b>{i.PLACA_CARRETA2 || "não registrado"}</div>
              <div><b>3° Carreta: </b>{i.PLACA_CARRETA3 || "não registrado"}</div>
              <div><b>Tipo do Veículo: </b>{i.TIPO_VEICULO}</div>
              <div><b>1º Pesagem (tara): </b>{i.PESO_TARA} KG</div>
              <div><b>2ª Pesagem (Moega): </b>{i.PESO_CARREGADO}KG</div>
              <div><b>Pedido MIC: </b>{i.PEDIDO_MIC}</div>
              <div><b>N° DI/BL: </b>{i.TIPO_DOC}-{i.NUMERO_DOC}</div>
              <div><b>Ticket: </b>{i.TICKET}</div>
            </div>
          </div>
          <div className={modal.flex}>
            <div className={modal.inputbox_pesagem}>
             Peso Liquido
              <input type="number" onChange={(e) => { setPesoLiquido(e.target.value)}} placeholder={getVeiculoAtual().PESO_LIQUIDO} disabled={getVeiculoAtual().STATUS_CARREG == 3} />
            </div>
           
            <div className={modal.inputbox}>
              Data
              <input type={getVeiculoAtual().STATUS_CARREG == 3 ? "text" : "datetime-local"} onChange={(e) => { setDataBruto(e.target.value) }} placeholder={datetimeLocal(getVeiculoAtual().DATA_BRUTO)} disabled={getVeiculoAtual().STATUS_CARREG == 3} />
            </div>
              </div>
          <div className={modal.flex}>
            <div className={modal.textbox}>
              Observação (opcional)
              <textarea rows="4" onChange={(e) => { setObsPesagem(e.target.value) }} disabled={getVeiculoAtual().STATUS_CARREG == 3} ></textarea>
            </div>
          </div>
          <div className={modal.flex}>
            <div className={style.navio}><i className="fa fa-ship icon"></i>&nbsp;&nbsp;&nbsp;{dadosDash.NOME_NAVIO || "--"}</div>
            <button className={style.finalizar} onClick={validaDados} disabled={getVeiculoAtual().STATUS_CARREG == 3} >REGISTRAR</button>
          </div>
        </div>
      </Pesagem>
    </>
  );
};

export default function IntegrationNotistack() {
  return (
    <SnackbarProvider
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      maxSnack={3}
      autoHideDuration={2500}>
      <PesagemFinal />
    </SnackbarProvider >
  );
}