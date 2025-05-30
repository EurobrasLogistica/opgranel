import { Navigate, useNavigate, useParams } from "react-router-dom";
import { SnackbarProvider, useSnackbar } from 'notistack';
import { useEffect, useState, } from 'react';

import Axios from "axios";
import Brackground from "../../../components/Background";
import Confirm from '@mui/material/Dialog';
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import Input from "../../../components/Input";
import Navbar from "../../../components/Navbar";
import Paralisacao from '@mui/material/Dialog';
import ParalisacaoFim from '@mui/material/Dialog';
import Pesagem from '@mui/material/Dialog';
import React from "react";
import confirm from "./Confirm.module.css";
import SubmitButton from "../../../components/Button";
import modal from "./Modal.module.css";
import moment from 'moment';
import style from "./Operacao.module.css";
import emailjs from 'emailjs-com';

const Operacao = () => {

  useEffect(() => {
    DadosDashboard();
    getVeiculos();
    getQtDescarregado();
    getMotivos();
    getTotalSaldo();
    VerificaParalisacao();
    getComplementos();
    getCargas();
    getTipoveiculo();
    getTransportadora();
    VerificaCarregamento();
    getDocumentos();
    getDocs();
    getPedido();
    getHoraAutos();
    getPeriodos();
  }, [])

  useEffect(() => {
    const interval_1 = setInterval(() => {
      DadosDashboard();
      getVeiculos();
      getQtDescarregado();
      getTotalSaldo();
      getMotivos();
      VerificaParalisacao();
      getComplementos();
      VerificaCarregamento();
      getHoraAutos();
    }, 1500)

    return () => clearInterval(interval_1); 

  }, [])

  const navigate = useNavigate();
  let { id } = useParams();
  let { periodo } = useParams();

  const [busca, setBusca] = useState("");

  const [integra, setIntegra] = useState();
  const [idCarregamento, setIdCarregamento] = useState({});
  const [existeParalisacao, setExisteParalisacao] = useState(0);
  const [integrado, setIntegrado] = useState(0);
  const [dadosDash, setDadosDash] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [paralisacoes, setParalisacoes] = useState([]);
  const [descarregado, setDescarregado] = useState([]);
  const [saldo, setSaldo] = useState([]);
  const [docs, setDocs] = useState([]);
  const [doc, setDoc] = useState('');
  const [horaAutos, setHoraAutos] = useState([]);
  const allowedUsers = ["jmichelotto", "dcruz", "tazevedo","wgoncalves", "walmeida", "mssilva", "toliveira", "enascimento", "vhsilva", "ajunior"];
  const [motivos, setMotivos] = useState([]);
  const [complementos, setComplementos] = useState([]);
  const [motivo, setMotivo] = useState("");
  const [complemento, setComplemento] = useState("");
  const [dtinicio, setDtinicio] = useState("");
  const [obs, setObs] = useState("");
  const usuario = JSON.parse(localStorage.getItem("user_token")).id;

  const [moega, setMoega] = useState("");
  const [peso3, setPeso3] = useState("");
  const [i, setI] = useState({});
  const [peso2, setPeso2] = useState("");
  const [ticket, setTicket] = useState("");
  const [data, setData] = useState("");
  const [obsPesagem, setObsPesagem] = useState("");

  const [dataEmail, setDataEmail] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [dataFimPara, setDataFimPara] = useState("");


  const [mostaInput1, setMostaInput1] = useState(false);
  const [mostaInput2, setMostaInput2] = useState(false);
  const [mostaInput3, setMostaInput3] = useState(false);
  const [mostaInput4, setMostaInput4] = useState(false);
  const [mostaInput5, setMostaInput5] = useState(false);
  const [mostaInput6, setMostaInput6] = useState(false);
  const [mostaInput7, setMostaInput7] = useState(false);
  const [mostaInput8, setMostaInput8] = useState(false);
  const [mostaInput9, setMostaInput9] = useState(false);
  const [periodos, setPeriodos] = useState("");
  const [pedidos, setPedidos] = useState([])
  const [pedido, setPedido] = useState('')
  const [documento, setDocumento] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [placaCavalo, setPlacaCavalo] = useState('')
  const [placa1, setPlaca1] = useState('')
  const [placa2, setPlaca2] = useState('')
  const [placa3, setPlaca3] = useState('')
  const [tara, setTara] = useState('')
  const [dataTara, setDataTara] = useState('')
  const [tipoveiculos, setTipoveiculos] = useState([])
  const [tipoveiculo, setTipoveiculo] = useState([])
  const [transportadora, setTransportadora] = useState([])
  const [transportadoras, setTransportadoras] = useState([])

  //modal de 2 pesagem
  const [openA, setOpenA] = useState(false);
  const AbrirPesagem = () => {
    setOpenA(true);
  };
  const FecharPesagem = () => {
    setOpenA(false);
  };

  const [openC, setOpenC] = useState(false);
  const AbrirConfirm = () => {
    setOpenC(true);
    if (dadosDash.STATUS_OPERACAO == 'PARALISADO') {
      dadosDash.STATUS_OPERACAO = 'PARALISADO'
      showAlert('Encerre a paralisação!', 'error')
      
      return;
    }
  };
  const FecharConfirm = () => {
    setOpenC(false);
  };

  const [MostaInput, setMostaInput] = useState(false);

  const divClick = () => {
    setMostaInput(true);
  };

  //modal de paralisacao
  const [openB, setOpenB] = useState(false);
  const AbrirParalisacao = () => {
    setOpenB(true);
  };
  const FecharParalisacao = () => {
    setOpenB(false);
  };

  const [openD, setOpenD] = useState(false);
  const AbrirParalisacaoFim = () => {
    setOpenD(true);
  };
  const FecharParalisacaoFim = () => {
    setOpenD(false);
    setDataFimPara("")
  };

  const getTipoveiculo = () => {
    Axios.get(`http://opgranel.rodrimar.com.br:8080/tipoveiculo`,)
      .then(function (res) {
        setTipoveiculos(res.data);
        console.log(res.data);
      });
  }

  const getTransportadora = () => {
    Axios.get(`http://opgranel.rodrimar.com.br:8080/transportadora/alterar`,)
      .then(function (res) {
        setTransportadoras(res.data);
        console.log(res.data);
      });
  }

  const getDocumentos = () => {
    Axios.get(`http://opgranel.rodrimar.com.br:8080/documento/${id}`,)
      .then(function (res) {
        setDocumentos(res.data);
        console.log(res.data);
      });
  }

  const getCargas = () => {
    Axios.get(`http://opgranel.rodrimar.com.br:8080/carga/busca/${id}`,)
      .then(function (res) {
        setDocs(res.data);
      });
  }

  const getDate = () => {
    const date = new Date()
    date.setHours(date.getHours() - 3)
    return (date.toISOString().slice(0, 19).replace('T', ' '))
  }

  const VerificaParalisacao = () => {
    Axios.get(`http://opgranel.rodrimar.com.br:8080/verifica/paralisacao/${id}`,)
      .then(function (res) {
        setExisteParalisacao(res.data)
      })
  }

  const VerificaCarregamento = () => {
    Axios.get(`http://opgranel.rodrimar.com.br:8080/verifica/carregamento/${id}`,)
      .then(function (res) {
        setIntegrado(res.data)
      })
  }

  const [dis, setDis] = useState([])
  const getDocs = () => {
    Axios.get(`http://opgranel.rodrimar.com.br:8080/carga/busca/${id}`,)
      .then(function (res) {
        setDis(res.data)
      });
  }
  
  const getPedido = () => {
    Axios.get(`http://opgranel.rodrimar.com.br:8080/buscar/pedidos/${id}`,)
      .then(function (res) {
        setPedidos(res.data);
        console.log(res.data);
      });
  }

  const getPeriodos = () => {
    Axios.get(`http://opgranel.rodrimar.com.br:8080/periodos/gerais/${id}`).then((response) => {
        setPeriodos(response.data)
    });
}
 
const Integra = () => {
  const payload = {
    peso2,
    data,
    peso3,
    usuario,  
    moega
  };
  Axios.put('http://opgranel.rodrimar.com.br:8080/integrar/' + i.ID_CARREGAMENTO, payload//:idCarregamento',
    /*{
      peso2,
      data,
      peso3,
      usuario,  
      moega,
      peso2: peso2,
      data: data,
      peso3: peso3,
      usuario: usuario,  
      moega: moega,
      idCarregamento: i.ID_CARREGAMENTO,
    
    }*/).then(function (res) {
      if (res.data.sqlMessage)
        showAlert('Error: ' + res.data.sqlMessage, 'error')

      else {
        showAlert('Veiculo pesado com sucesso!', 'success');

 } 
});
  }

  const DadosDashboard =  () => {
    Axios.get(`http://opgranel.rodrimar.com.br:8080/periodo/dashboard/${id}`,)
      .then(function (res) {
        setDadosDash(res.data[0])
        Axios.get(`http://opgranel.rodrimar.com.br:8080/paralisacao/periodo/${res.data[0].SEQ_PERIODO_OP}`,)
          .then(function (res) {
            setParalisacoes(res.data)
            
          })
      })
  }
  const getVeiculos = () => {
    Axios.get(`http://opgranel.rodrimar.com.br:8080/dashboard/veiculos/${id}`,)
      .then(function (res) {
        setVeiculos(res.data)
      })
  }

  const getVeiculoAtual = () => {
    return veiculos.find(item => item.ID_CARREGAMENTO === i.ID_CARREGAMENTO) || i
  }

  const getQtDescarregado = () => {
    Axios.get(`http://opgranel.rodrimar.com.br:8080/dashboard/descarregado/${id}`,)
      .then(function (res) {
        setDescarregado(res.data[0].DESCARREGADO)
      })
  }

  const getTotalSaldo = () => {
    Axios.get(`http://opgranel.rodrimar.com.br:8080/dashboard/saldo/${id}`,)
      .then(function (res) {
        setSaldo(res.data[0].SALDO)
      })
  }


  //hora a hora do dashboard 
  const getHoraAutos = () => {
    Axios.get(`http://opgranel.rodrimar.com.br:8080/hora/autos/${id}`, {
    }).then((response) => {
      console.log();
      setHoraAutos(response.data);
    });
  }

  

  const getMotivos = () => {
    Axios.get(`http://opgranel.rodrimar.com.br:8080/motivos`,)
      .then(function (res) {
        setMotivos(res.data)
      })
  }
  const getComplementos = () => {
    Axios.get(`http://opgranel.rodrimar.com.br:8080/complementos`,)
      .then(function (res) {
        setComplementos(res.data)
      })
  }

  const addParalisacao = () => {
    Axios.post('http://opgranel.rodrimar.com.br:8080/paralisacao/criar', {
      operacao: id,
      periodo: dadosDash.SEQ_PERIODO_OP,
      motivo: motivo,
      obs: obs,
      dtinicio: dtinicio,
      usuario: usuario,
      dtcadastro: getDate()
    }) .then(function (res) {
      console.log(res);      
      if (res.data.sqlMessage)
        showAlert(res.data.sqlMessage, 'error')
      else {
        showAlert('Paralisação adicionada!', 'success');
      }
    })
    FecharParalisacao()
    dadosDash()
  }

  const [inputs, setInputs] = useState([
    { name: 'Nome do motorista:', id: 1, value: `${i.NOME_MOTORISTA}`, show: false },
    { name: 'Placa do calvalo: ', id: 2, value: `${i.PLACA_CAVALO}`, show: false },
    { name: 'Placa da carreta 1: ', id: 3, value: `${i.PLACA_CARRETA}`, show: false },
    { name: 'Placa da carreta 2:', id: 4, value: `${i.PLACA_CARRETA2}`, show: false },
    { name: 'Placa da carreta 3:', id: 5, value: `${i.PLACA_CARRETA3}`, show: false },
    { name: '1º peso (tara):', id: 6, value: `${i.PESO_TARA}`, show: false },
    { name: 'Pedido MIC:', id: 7, value: `${i.PEDIDO_MIC}`, show: false },
  ]);

  const handleDivClick = (id) => {
    const newInputs = [...inputs];
    const index = newInputs.findIndex((input) => input.id === id);
    newInputs[index].show = !newInputs[index].show;
    setInputs(newInputs);
  };

  const divClick2 = () => {
    setMostaInput2(true);
  };
  const divClick3 = () => {
    setMostaInput3(true);
  };
  const divClick4 = () => {
    setMostaInput4(true);
  };
  const divClick5 = () => {
    FecharPesagem();  // Assumindo que esse é o modal que você quer fechar
    refreshData();  
  };
  const divClick6 = () => {
    setMostaInput6(true);
  };
  const divClick7 = () => {
    setMostaInput7(true);
  };
  const divClick8 = () => {
    setMostaInput8(true);
  };
  const divClick9 = () => {
    setMostaInput9(true);
  };

  const closeModal = () => {
    setOpenA(false);  // Fecha o modal de Pesagem como exemplo
};

const refreshData = () => {
  DadosDashboard();  
  getVeiculos();
  getQtDescarregado();
  getTotalSaldo();
  getMotivos();
  VerificaParalisacao();
  VerificaCarregamento();
  getComplementos();
  getHoraAutos();
};

  const validaPara = () => {
    let d1 =  moment(dtinicio).startOf('hour');
    let d2 = moment(dataFimPara).startOf('hour');

    let diff = d1.diff(d2);

    if (diff > 0) {
      return showAlert('Datas de paralização inconsistentes', 'error')
    } else {
      encerrarParalisacao()
    }
  }

  const encerrarParalisacao = () => {
    if (!dataFimPara) {
      showAlert('Preencha todos os campos', 'error')
      return;
    }

    Axios.put('http://opgranel.rodrimar.com.br:8080/encerrar/paralisacao',
      {
        id: paralisacoes[0].SEQ_PARALISACAO,
        data: dataFimPara,
      }).then(function (res) {
        res.data.sqlMessage ?
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('paralisacao encerrada!', 'success');
        FecharParalisacaoFim()
      });
  }

  const validaplaca3 = async () => {
    await Axios.put('http://opgranel.rodrimar.com.br:8080/alterar/carreta3',
      {
        id: i.ID_CARREGAMENTO,
        placa: placa3,
      }).then(function (res) {
        res.data.sqlMessage ?
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Placa 3 alterada com sucesso!', 'success');
        setMostaInput5(false)
        setOpenA(false);
      });
  }


  const validaVeiculo = async () => {
    console.log(tipoveiculos, i.ID_CARREGAMENTO);
    await Axios.put('http://opgranel.rodrimar.com.br:8080/veiculo/atualiza',
      {
        tipoveiculo: tipoveiculo,
        id: i.ID_CARREGAMENTO
      }).then(function (res) {
        res.data.sqlMessage ?
        
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Veiculo alterado com sucesso!', 'success');

        setMostaInput7(false)
        setOpenA(false);
      });
  }


  const validaTransp = async () => {
    console.log(transportadoras, i.ID_CARREGAMENTO);
    await Axios.put('http://opgranel.rodrimar.com.br:8080/transporadora/atualiza',
      {
        transporadora: transportadora,
        id: i.ID_CARREGAMENTO
      }).then(function (res) {
        res.data.sqlMessage ?
        
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Veiculo alterado com sucesso!', 'success');

        setMostaInput9(false)
        setOpenA(false);
      });
  }
  const validaplaca2 = async () => {
    await Axios.put('http://opgranel.rodrimar.com.br:8080/alterar/carreta2',
      {
        id: i.ID_CARREGAMENTO,
        placa: placa2,
      }).then(function (res) {
        res.data.sqlMessage ?
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Placa 2 alterada com sucesso!', 'success');
        setMostaInput4(false)
        setOpenA(false);
      });
  }

  const validaPlaca1 = () => {
    if (!placa1) {
      showAlert('Impossível atualizar a placa do cavalo, revivse!', 'error');
      return;
    }

    atualizaPlaca1()
  }
  
  const atualizaPlaca1 = async () => {
    await Axios.put('http://opgranel.rodrimar.com.br:8080/alterar/carreta1',
      {
        id: i.ID_CARREGAMENTO,
        placa: placa1,
      }).then(function (res) {
        res.data.sqlMessage ?
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Placa 1 alterada com sucesso!', 'success');
        setMostaInput3(false)
        setOpenA(false);
      });
  }

  const validaDoc = async () => {

    await Axios.put('http://opgranel.rodrimar.com.br:8080/documentos/atualiza',
      {
        pedido: parseInt(pedido),
        id: i.ID_CARREGAMENTO,
      }).then(function (res) {
        res.data.sqlMessage ?
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Pedido alterado com sucesso!', 'success');
        setMostaInput8(false)
        setOpenA(false);
      });
  }

  const validaCavalo = () => {
    if (!placaCavalo) {
      showAlert('Impossível atualizar a placa do cavalo, revivse!', 'error');
      return;
    }

    atualizaCavalo()
  }

  const atualizaCavalo = async () => {
    await Axios.put('http://opgranel.rodrimar.com.br:8080/alterar/cavalo',
      {
        id: i.ID_CARREGAMENTO,
        placa: placaCavalo,
      }).then(function (res) {
        res.data.sqlMessage ?
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Placa do cavalo alterada com sucesso!', 'success');
        setMostaInput2(false)
        setOpenA(false);
      });
  }

  const validaTara = () => {
    if (!tara) {
      showAlert('Para atualizar a tara é necessário ter o peso!', 'error');
      return;
    }
    if (!dataTara) {
      showAlert('Para atualizar a tara é necessário ter a data!', 'error');
      return;
    }
    atualizaTara()
  }

  const atualizaTara = async () => {
    await Axios.put('http://opgranel.rodrimar.com.br:8080/alterar/tara',
      {
        tara: tara,
        data: dataTara,
        id: i.ID_CARREGAMENTO,
        usuario: usuario
      }).then(function (res) {
        res.data.sqlMessage ?
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Tara alterada com sucesso!', 'success');
        setMostaInput6(false)
        setOpenA(false);
      });
  }

  const validaDados1 = () => {
    if (!motivo | !complemento | !dtinicio) {
      showAlert('Preencha todos os campos', 'error')
      return;
    }
    addParalisacao();
  }

  const validaDados2 = () => {
    if (!peso2 | !data) {
      showAlert('Preencha todos os campos', 'error')
      return;
    }
    if (i.PESO_TARA == 0 || i.PESO_TARA == null) {
      showAlert('Tara é obrigatória para 3ª pesagem', 'error')
      return;
    } if (i.DESC_TIPO_VEICULO == "AGUARDANDO MODELO") {
      showAlert('É obrigatório a escolha do tipo do veículo','error')
      return;
    }
    if (peso2 > 55000){
      showAlert('Peso excedido!', 'error')
      return;
    }

    SegundaPesagem();
  //  Integra();
  }



  const encerrarPeriodo = () => {
    Axios.put('http://opgranel.rodrimar.com.br:8080/periodo/finalizar', {
      id: dadosDash.SEQ_PERIODO_OP,
      data: dataFim,
      cod_operacao: dadosDash.COD_OPERACAO,
     data_carreg:  dadosDash.PERIODO,
    })
    .then(function (res) {
      res.data.sqlMessage ?
        showAlert(res.data.sqlMessage, 'error') :
        showAlert('Período finalizado com sucesso!', 'success');
      //enviarEmail();
      FecharConfirm();
    });
  };
  



const enviarEmail = async (id, data) => {
  try {
    const response = await fetch('http://opgranel.rodrimar.com.br:8080/periodo/dadosEmail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: dadosDash.COD_OPERACAO,
        data: dadosDash.PERIODO 
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const navioData = await response.json();
    

    const templateParams = {
      data: moment(dadosDash.INI_PERIODO).format("DD/MM/YYYY") || "--/--",
      periodo: dadosDash.DEN_PERIODO,
      navio: navioData[0].NAVIO,
      berco: navioData[0].BERCO,
      produto: navioData[0].PRODUTO,
      saldo: (navioData[0].SALDO_NAVIO),
      total_manifestado: (navioData[0].MANIFESTADO_NAVIO),
      total_volume: (navioData[0].CARREGADO_PERIODO),
      total_autos: navioData[0].QTDE_AUTOS_PERIODO,
      total_movimentado: (navioData[0].MOV_ATE_PERIODO),
      total_saldo: (navioData[0].SALDO_NAVIO),
     // percentual: ((navioData[0].PESO_CARREGADO_DI / navioData[0].QTDE_MANIFESTADA) * 100).toFixed(2),
      hora: navioData[0].HORA,
      numero_documento:  navioData[0]?.NUM_DI ?? "-",
      manifestado: (navioData[0]?.QTDE_MANIFESTADA) ?? "0.000",
      volume: (navioData[0]?.PESO_CARREGADO_DI) ?? "0.00",  
      autos: navioData[0]?.QTDE_AUTOS_DI ?? "-",
      movimentado: (navioData[0]?.MOV_DI_ATE_PERIODO) ?? "0.00",
      saldo: (navioData[0]?.SALDO_DI_ATE_PERIODO) ?? "",
    };

    emailjs.send('service_4ph3i6i', 'template_tx654er', templateParams, '4RNsf_AR6UjP4CQc3')
      .then((result) => {
        showAlert('Email enviado com sucesso', 'success');
      }, (error) => {
        showAlert('Erro ao enviar email: ' + error.text, 'error');
      });
  } catch (error) {
    try {
      const errorJson = JSON.parse(error.message);
      showAlert('Erro ao enviar email: ' + errorJson.message, 'error');
    } catch (parseError) {
      showAlert('Erro ao enviar email: ' + error.message, 'error');
    }
  }
};

const validaDados3 = () => {
    if (!dataFim) {
        showAlert('Preencha a data!', 'error');
        return;
    }
    if (dadosDash.STATUS_OPERACAO === 'PARALISADO') {
        showAlert('Encerre a paralisação!', 'error');
        return;
    }
    encerrarPeriodo();
};

  const GerarNotaMIC = async () => {
    if (getVeiculoAtual().STATUS_NOTA_MIC == 4)
      return

    const preparaPlaca = (placa) => {
      if (placa == undefined || placa == '')
        return ''

      return placa.replace(/\s/g, '').slice(0, 3) + ' ' +  placa.replace(/\s/g, '').slice(3)

    }

    const input_data = {
      placa1: preparaPlaca(i.PLACA_CARRETA),
      placa2: preparaPlaca(i.PLACA_CARRETA2),
      placa3: preparaPlaca(i.PLACA_CARRETA3),
      placaCavalo: preparaPlaca(i.PLACA_CAVALO),
      num_DI: i.NUMERO_DOC,
      pedido_mic: i.PEDIDO_MIC,
      peso_bruto: parseFloat(i.PESO_TARA) + parseFloat(i.PESO_CARREGADO || peso2),
      peso_liquido: parseFloat(i.PESO_CARREGADO || peso2),
      tara: 1.0,
      codTiquete: i.ID_CARREGAMENTO || id,
      data: i.DATA_CARREGAMENTO || data
    };

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `http://opgranel.rodrimar.com.br:8080/gerarnotamic/${i.ID_CARREGAMENTO}`,
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
      },
      data: input_data
    };

    await Axios.request(config)
    FecharPesagem()
  }

  const EntregarNotaMIC = async () => {
    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `http://opgranel.rodrimar.com.br:8080/entregarnotamic/${i.ID_CARREGAMENTO}`,
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
      },
    };

    await Axios.request(config)
    FecharPesagem()
    showAlert("Nota entregue!", 'success')
  }

  const datetimeLocal = (datetime) => {
    if (datetime == undefined)
      return '' 

    const dt = new Date(datetime);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    return dt.toISOString().slice(0, 16).replace("T", " ");
  }

  const DownloadNota = async () => {
    const input_data = {
        idCarregamento: i.ID_CARREGAMENTO
    };

    const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `http://opgranel.rodrimar.com.br:8080/baixarnota`,
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

  const SegundaPesagem = () => {
    Axios.put('http://opgranel.rodrimar.com.br:8080/segundapesagem',
      {
        peso2: peso2,
        data: data,
        usuario: usuario,  
        ticket: ticket,
        id: i.ID_CARREGAMENTO,
      }).then(function (res) {
        if (res.data.sqlMessage)
          showAlert(res.data.sqlMessage, 'error')

        else {
          showAlert('Veiculo pesado com sucesso!', 'success');

       //if (i.PESO_TARA == 1000)
       // GerarNotaMIC()
        
        } 
        FecharPesagem()
      })
      .catch((error) => {
        console.log(error);
      });
  }

  const { enqueueSnackbar } = useSnackbar();
  const showAlert = (txt, variant) => {
    enqueueSnackbar(txt, { variant: variant });
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
            <div className={style.active} >
              Dashboard Período
            </div>
            <div onClick={() => navigate(`/operacao/pesagemfinal/${id}`)}>
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
              <div className={style.notform}>NÃO HÁ PERÍODO EM ABERTO</div>
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
                    <i className="fa fa-truck"></i>&nbsp;&nbsp;{dadosDash.STATUS_OPERACAO || "--"}
                  </div>
                </div>
              </div>
              <div className={style.flex}>
                <div className={style.tara}>
                  <div className={style.taratitulo}>
                    1º Pesagem (Tara)
                    <div>
                      <input type="text" onChange={(e) => { setBusca(e.target.value) }} />
                      <i className="fa fa-search"></i>
                    </div>
                  </div>
                  <div className={style.sumario}>
                    <div>NOME</div>
                    <div>CAVALO</div>
                    <div>DATA | HORA </div>
                  </div>
                  <div className={style.lista}>
                    {veiculos.filter((val) => {
                      let nome = val.NOME_MOTORISTA.trim().split(' ')[0]
                      let horario = moment(val.DATA_TARA).format(' DD/MM HH:mm')

                      val.COR = 'item_status_' + (val.STATUS_NOTA_MIC == 1 ? 'def' : val.STATUS_NOTA_MIC)

                      if (busca == "") {
                        return val
                      } else if (nome.toLowerCase().includes(busca.toLowerCase()) || val.PLACA_CAVALO.toLowerCase().includes(busca.toLowerCase()) || horario.toLowerCase().includes(busca.toLowerCase())) {
                        return val
                      }
                    }).map((val, key) => {
                      return (
                        <div className={style.item + ' ' + style[val.COR]} onClick={() => [AbrirPesagem(), setI(val)]}>
                          <div className={style.item_cell}>{val.NOME_MOTORISTA.trim().split(' ')[0] || "-"}</div>
                          <div className={style.item_cell}>{val.PLACA_CAVALO || "-"}</div>
                          <div className={style.item_cell}>{moment(val.DATA_TARA).format('DD/MM | HH:mm') || "-"}</div>
                        </div>
                      )
                    })

                    }
                  </div>
                </div>
                <div className={style.autos}>
                {horaAutos?.map((val) => {
                        return (
                          <div><i className="fa fa-stopwatch"></i> {val.HORA} = {val.QUANTIDADE_AUTOS} Autos</div>
                        )
                      })}
        

                  
             
                </div>
                <div className={style.motivo}>
                  <div className={style.sumariob}>
                    <div className={style.motivobox}>MOTIVO</div>
                    <div className={style.sumariobox}>DURAÇÃO</div>
                  </div>
                  <div className={style.listab}>
                    {!paralisacoes.length ?
                      <div>--</div>
                      :
                      paralisacoes.map((val) => {
                        return (
                          <div className={style.itemb} >
                            <div>{val.DESC_MOTIVO || "-"}</div>
                            <div>{val.DURACAO || "-"} min</div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
              <div className={style.flex}>
                <div className={style.pesos}>
                  <div>
                    DESCARREGADO
                    <div>{(descarregado / 1000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 3,}) || "0"} TONS</div>
                  </div>
                  <div>
                    MANIFESTADO
                    <div>{(dadosDash.MANIFESTADO / 1000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2,})|| "--"} TONS</div>
                  </div>
                  <div>
                    SALDO
                    <div>{(saldo) || "--"} TONS</div>
                  </div>
                  <div>
                    AUTOS
                    <div>{veiculos.length || "0"}</div>
                  </div>
                  <div>
                    BERÇO
                    <div>{dadosDash.NOME_BERCO || "--"}</div>
                  </div>
                </div>
              </div>
              <div className={style.flex}>
                <button
                  className={style.abrirp}
                  onClick={dadosDash.STATUS_OPERACAO == 'OPERANDO' ? AbrirParalisacao : AbrirParalisacaoFim}>
                  {dadosDash.STATUS_OPERACAO == 'OPERANDO' ? "ABRIR PARALISAÇÃO" : "ENCERRAR PARALISAÇÃO"}
                </button>
                <div className={style.navio}><i className="fa fa-ship icon"></i>&nbsp;&nbsp;&nbsp;{dadosDash.NOME_NAVIO || "--"}</div>
                <button
                  className={style.finalizar} onClick={AbrirConfirm}>
                  FINALIZAR ESTE PERÍODO
                </button>
              </div>
            </div>}
        </div>
      </Container>
      <Pesagem open={openA} onClose={FecharPesagem} fullWidth>
        <div className={modal.modal}>
          <div className={modal.nav}>
            <div onClick={FecharPesagem}>Voltar</div>
            <div className={modal.active}>2º Pesagem </div>
          </div>
          <div className={modal.flex}>
            <div className={modal.periodo}>
              {dadosDash.DEN_PERIODO || "--/--"}
              <div className={modal.data}>
                {moment(dadosDash.INI_PERIODO).format("DD/MM/YYYY") || "--/--"}
              </div>
              
              {getVeiculoAtual().PESO_TARA == 1000 && getVeiculoAtual().STATUS_CARREG >= 3 && (
              <div className={modal.nota}>
                <h2>MIC Sistemas</h2>
                {getVeiculoAtual().STATUS_NOTA_MIC == 4 &&
                <div className={modal.gera_nota} onClick={getVeiculoAtual().STATUS_NOTA_MIC == 4 ? DownloadNota : undefined} style={getVeiculoAtual().STATUS_NOTA_MIC == 4 ? {"cursor": "pointer"} : {"cursor": "auto"}}>
                  <i className="fa fa-file-pdf icon"></i>
                  <h3>BAIXAR Nota Fiscal</h3>
                </div>}
                {![2, 4].includes(getVeiculoAtual().STATUS_NOTA_MIC) &&
                <div className={modal.gera_nota} onClick={GerarNotaMIC} style={getVeiculoAtual().STATUS_NOTA_MIC == 4 ? {"cursor": "auto"} : {"cursor": "pointer"}}>
                  <i className="fa fa-file-pdf icon"></i>
                  <h3>GERAR nota fiscal</h3>
                </div>}
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
              <div className={style.line}>
                <b>Cavalo: </b>{mostaInput2 &&
                  < >
                    <input onChange={(e) => { setPlacaCavalo(e.target.value.toUpperCase()) }} placeholder="Placa do cavalo" className={style.inputline} type="text" />
                    <button onClick={validaCavalo} className={style.buttontline} type="submit"><i class="fa fa-check" aria-hidden="true"></i></button>
                    <button className={style.buttontlinecancel} onClick={() => setMostaInput2(false)}><i class="fa fa-times" aria-hidden="true"></i></button>
                  </> || i.PLACA_CAVALO}
                <span><i onClick={divClick2} class="fa fa-pencil-square-o" aria-hidden="true"></i></span>
              </div>
           {/* <div><b>Cavalo: </b>{i.PLACA_CAVALO}</div>
              <div><b>1° Carreta: </b>{i.PLACA_CARRETA}</div>
              <div><b>2° Carreta: </b>{i.PLACA_CARRETA2 || "não registrado"}</div>
              <div><b>3° Carreta: </b>{i.PLACA_CARRETA3 || "não registrado"}</div>*/}
                            <div className={style.line}>
                <b className={style.title}>1° Carreta: </b>{mostaInput3 &&
                  <>
                    <input onChange={(e) => { setPlaca1(e.target.value.toUpperCase()) }} placeholder="Placa 1" className={style.inputline} type="text" />
                    <button onClick={validaPlaca1} className={style.buttontline}><i class="fa fa-check" aria-hidden="true"></i></button>
                    <button className={style.buttontlinecancel} onClick={() => setMostaInput3(false)}><i class="fa fa-times" aria-hidden="true"></i></button>
                  </> || i.PLACA_CARRETA}<span><i onClick={divClick3} class="fa fa-pencil-square-o" aria-hidden="true"></i></span>
              </div>



              <div className={style.line}>
                <b>2° Carreta: </b>{mostaInput4 &&
                  <>
                    <input onChange={(e) => { setPlaca2(e.target.value.toUpperCase()) }} placeholder="Placa 2" className={style.inputline} type="text" />
                    <button onClick={validaplaca2} className={style.buttontline}><i class="fa fa-check" aria-hidden="true"></i></button>
                    <button className={style.buttontlinecancel} onClick={() => setMostaInput4(false)}><i class="fa fa-times" aria-hidden="true"></i></button>
                  </> || i.PLACA_CARRETA2 || "não registrado"}<span><i onClick={divClick4} class="fa fa-pencil-square-o" aria-hidden="true"></i></span>
              </div>


              <div className={style.line}>
                <b>3° Carreta: </b>{mostaInput5 &&
                  <>
                    <input placeholder="Placa 3" className={style.inputline} type="text" onChange={(e) => { setPlaca3(e.target.value.toUpperCase()) }} />
                    <button onClick={validaplaca3} className={style.buttontline}><i class="fa fa-check" aria-hidden="true"></i></button>
                    <button className={style.buttontlinecancel} onClick={() => setMostaInput5(false)}><i class="fa fa-times" aria-hidden="true"></i></button>
                  </> || i.PLACA_CARRETA3 || "não registrado"}<span><i onClick={divClick5} class="fa fa-pencil-square-o" aria-hidden="true"></i></span>
              </div>
                   <div className={style.line}> 
                <b>Tipo do veículo: </b>{mostaInput7 &&
                  <>
                    <select className={style.inputline} onChange={(e) => { setTipoveiculo(e.target.value) }}>
                      <option disabled selected>Selecione uma opção</option>
                      {tipoveiculos?.map((val) => {
                        return (
                          <option value={val.COD_TIPO}>{val.DESC_TIPO_VEICULO}</option>
                        )
                      })}
                    </select>

                    <button onClick={validaVeiculo} className={style.buttontline}><i class="fa fa-check" aria-hidden="true"></i></button>
                    <button className={style.buttontlinecancel} onClick={() => setMostaInput7(false)}><i class="fa fa-times" aria-hidden="true"></i></button>

                  </> || i.DESC_TIPO_VEICULO || "não registrado"}<span><i onClick={divClick7} class="fa fa-pencil-square-o" aria-hidden="true"></i></span>

              </div>   
               <div className={style.line}>
                <b>1º Pesagem (tara): </b>{mostaInput6 &&
                  <><div>
                    <input onChange={(e) => { setTara(e.target.value) }} placeholder="Peso da TARA" className={style.inputline} type="text" />
                    <input onChange={(e) => { setDataTara(e.target.value) }} placeholder="Peso da TARA" className={style.inputlinedate} type="datetime-local" /></div>
                    <button onClick={validaTara} className={style.buttontline}><i class="fa fa-check" aria-hidden="true"></i></button>

                    <button className={style.buttontlinecancel} onClick={() => setMostaInput6(false)}><i class="fa fa-times" aria-hidden="true"></i></button>
                  </> || `${i.PESO_TARA} KG`} <span><i onClick={divClick6} class="fa fa-pencil-square-o" aria-hidden="true"></i></span>
              </div>
            
              {/* <div className={style.line}> 
    

    {mostaInput8 && allowedUsers.includes(usuario) ? ( // Verifica se o usuário está na lista permitida e se `mostaInput8` está true
    
    <>
        <select className={style.inputline} onChange={(e) => { setDocumento(e.target.value) }}>
          <option disabled selected>Selecione uma opção</option>
          {pedidos?.map((val) => (
            <option value={val.ID_PEDIDO}>{val.NR_PEDIDO}</option>
          ))}
        </select>
       
        <button onClick={validaDoc} className={style.buttontline}><i className="fa fa-check" aria-hidden="true"></i></button>
        <button className={style.buttontlinecancel} onClick={() => setMostaInput8(false)}><i className="fa fa-times" aria-hidden="true"></i></button>
      </>
    ) : (  <div><b>Pedido MIC: </b>{i.PEDIDO_MIC}-{i.NR_PEDIDO}</div>)}
   {allowedUsers.includes(usuario) && ( // Exibe o botão de edição apenas para usuários permitidos
      <span><i onClick={divClick8} className="fa fa-pencil-square-o" aria-hidden="true"></i></span>
    )}
  </div> */}
      <div className={style.line}> 
                <b>Pedido MIC: </b>{mostaInput8 &&
                  <>
                    <select className={style.inputline} onChange={(e) => { setPedido(e.target.value) }}>
                      <option disabled selected>Selecione uma opção</option>
                      {pedidos?.map((val) => {
                        return (
                          <option value={val.NR_PEDIDO}>{val.NR_PEDIDO}</option>
                        )
                      })}
                    </select>

                    <button onClick={validaDoc} className={style.buttontline}><i class="fa fa-check" aria-hidden="true"></i></button>
                    <button className={style.buttontlinecancel} onClick={() => setMostaInput8(false)}><i class="fa fa-times" aria-hidden="true"></i></button>

                  </> || i.PEDIDO_MIC || "não registrado"}<span><i onClick={divClick8} class="fa fa-pencil-square-o" aria-hidden="true"></i></span>

              </div>

              <div><b>N° DI/BL: </b>{i.TIPO_DOC}-{i.NUMERO_DOC}</div>
              <div className={style.line}> 
                <b>Transportadora: </b>{mostaInput9 &&
                  <>
                    <select className={style.inputline} onChange={(e) => { setTransportadora(e.target.value) }}>
                      <option disabled selected>Selecione uma opção</option>
                      {transportadoras?.map((val) => {
                        return (
                          <option value={val.COD_TRANSP}>{val.NOME_TRANSP}</option>
                        )
                      })}
                    </select>

                    <button onClick={validaTransp} className={style.buttontline}><i class="fa fa-check" aria-hidden="true"></i></button>
                    <button className={style.buttontlinecancel} onClick={() => setMostaInput9(false)}><i class="fa fa-times" aria-hidden="true"></i></button>

                  </> || i.NOME_TRANSP || "não registrado"}<span><i onClick={divClick9} class="fa fa-pencil-square-o" aria-hidden="true"></i></span>

              </div>
              <div><b>Destino:</b></div>
           {/*   <div className={style.line}>
                <b>ID: </b>{i.ID_CARREGAMENTO}
               </div>

              <div className={style.line}>
                <b>Motorista: </b>{i.NOME_MOTORISTA}
               </div>

             

              <div className={style.line}> 
                <b>Tipo do veículo: </b>{mostaInput7 &&
                  <>
                    <select className={style.inputline} onChange={(e) => { setTipoveiculo(e.target.value) }}>
                      <option disabled selected>Selecione uma opção</option>
                      {tipoveiculos?.map((val) => {
                        return (
                          <option value={val.COD_TIPO}>{val.DESC_TIPO_VEICULO}</option>
                        )
                      })}
                    </select>

                    <button onClick={validaVeiculo} className={style.buttontline}><i class="fa fa-check" aria-hidden="true"></i></button>
                    <button className={style.buttontlinecancel} onClick={() => setMostaInput7(false)}><i class="fa fa-times" aria-hidden="true"></i></button>

                  </> || i.DESC_TIPO_VEICULO || "não registrado"}<span><i onClick={divClick7} class="fa fa-pencil-square-o" aria-hidden="true"></i></span>

              </div>

              <div className={style.line}>
                <b>1º Pesagem (tara): </b>{mostaInput6 &&
                  <><div>
                    <input onChange={(e) => { setTara(e.target.value) }} placeholder="Peso da TARA" className={style.inputline} type="text" />
                    <input onChange={(e) => { setDataTara(e.target.value) }} placeholder="Peso da TARA" className={style.inputlinedate} type="datetime-local" /></div>
                    <button onClick={validaTara} className={style.buttontline}><i class="fa fa-check" aria-hidden="true"></i></button>

                    <button className={style.buttontlinecancel} onClick={() => setMostaInput6(false)}><i class="fa fa-times" aria-hidden="true"></i></button>
                  </> || `${i.PESO_TARA} KG`} <span><i onClick={divClick6} class="fa fa-pencil-square-o" aria-hidden="true"></i></span>
              </div>
             
              <div className={style.line}> 
                <b>Pedido MIC: </b>{mostaInput8 &&
                  <>
                    <select className={style.inputline} onChange={(e) => { setDocumento(e.target.value) }}>
                      <option disabled selected>Selecione uma opção</option>
                      {pedidos?.map((val) => {
                        return (
                          <option value={val.ID_PEDIDO}>{val.NR_PEDIDO}</option>
                        )
                      })}
                    </select>

                    <button onClick={validaDoc} className={style.buttontline}><i class="fa fa-check" aria-hidden="true"></i></button>
                    <button className={style.buttontlinecancel} onClick={() => setMostaInput8(false)}><i class="fa fa-times" aria-hidden="true"></i></button>

                  </> || i.PEDIDO_MIC || "não registrado"}<span><i onClick={divClick8} class="fa fa-pencil-square-o" aria-hidden="true"></i></span>

              </div>


              <div className={style.line}>
                <b>N° DI/BL: </b>{i.TIPO_DOC}-{i.NUMERO_DOC} 
              </div>*/}
            </div>
                    </div>
          <div className={modal.flex}>
            <div className={modal.inputbox_pesagem}>
              2º Pesagem
              <input type="number" onChange={(e) => { setPeso2(e.target.value) }} placeholder={getVeiculoAtual().PESO_CARREGADO} disabled={getVeiculoAtual().STATUS_CARREG == 3}/>
            </div>
            <div className={modal.inputbox_ticket}>
              Ticket
              <input type="text" onChange={(e) => { setTicket(e.target.value) }} placeholder={getVeiculoAtual().TICKET} disabled={getVeiculoAtual().STATUS_CARREG == 3} />
            </div>
            <div className={modal.inputbox}>
              Data
              <input type={getVeiculoAtual().STATUS_CARREG == 3 ? "text" : "datetime-local"} onChange={(e) => { setData(e.target.value)  }} placeholder={datetimeLocal(getVeiculoAtual().DATA_CARREGAMENTO)} disabled={getVeiculoAtual().STATUS_CARREG == 3} />
            </div>
          </div>
          <div className={modal.flex}>
            <div className={modal.textbox}>
              Observação (opcional)
              <textarea rows="4" onChange={(e) => { setObsPesagem(e.target.value) }} disabled={getVeiculoAtual().STATUS_CARREG == 3}></textarea>
            </div>
          </div>
          <div className={modal.flex}>
           
            <div className={style.navio}><i className="fa fa-ship icon"></i>&nbsp;&nbsp;&nbsp;{dadosDash.NOME_NAVIO || "--"}</div>
            <button className={style.finalizar} onClick={validaDados2} disabled={getVeiculoAtual().STATUS_CARREG == 3}>REGISTRAR</button>
            <button className={style.finalizar} onClick={divClick5} disabled={getVeiculoAtual().STATUS_CARREG != 3}>INTEGRAR</button>
          </div>
        </div>
      </Pesagem>
      <Paralisacao open={openB} onClose={FecharParalisacao} fullWidth>
        <div className={modal.modal}>
          <div className={modal.nav}>
            <div onClick={FecharParalisacao}>Voltar</div>
            <div className={modal.active}>Abertura de Paralisação</div>
          </div>
          <div className={modal.flex}>
            <div className={modal.periodo}>
              {dadosDash.DEN_PERIODO || "--/--"}
              <div className={modal.data}>
                {/* 02/01/2023 */}
                {moment(dadosDash.INI_PERIODO).format("DD/MM/YYYY") || "--/--"}
              </div>
            </div>
            <div className={modal.inputbox}>
              Início
              <input type="datetime-local" onChange={(e) => { setDtinicio(e.target.value) }} />
            </div>
          </div>
          <div className={modal.selectbox}>
            <label>Motivo:</label>
            <select onChange={(e) => { setMotivo(e.target.value) }}>
              <option disabled selected>Selecione uma opção</option>
              {motivos?.map((val) => {
                return (
                  <option value={val.COD_MOTIVO}>{val.DESC_MOTIVO} </option>
                )
              })}
            </select>
          </div>
          <div className={modal.selectbox}>
            <label>Complemento:</label>
            <select onChange={(e) => { setComplemento(e.target.value) }}>
              <option disabled selected>Selecione uma opção</option>
              {complementos?.map((val) => {
                return (
                  <option value={val.COD_COMPL}>{val.DESC_COMPL}</option>
                )
              })}
            </select>
          </div>
          <div className={modal.flex}>
            <div className={modal.textbox}>
              Observação
              <textarea rows="4" onChange={(e) => setObs(e.target.value)}></textarea>
            </div>
          </div>
          
          <div className={modal.flex}>
            <div className={style.navio}><i className="fa fa-ship icon"></i>&nbsp;&nbsp;&nbsp;{dadosDash.NOME_NAVIO || "--"}</div>
            <button className={style.finalizar} onClick={validaDados1}>REGISTRAR PARALISAÇÃO</button>
          </div>
        </div>
      </Paralisacao>      
      <Confirm open={openC} onClose={FecharConfirm} fullWidth>
        <div className={confirm.modal}>
          <div className={confirm.nav}>
            <div onClick={FecharConfirm}>Voltar</div>
          </div>
          <div className={confirm.center}>
            Deseja finalizar o período atual?
            <br />
            <div>Ao finalizar não será mais possível acessar Dashboard! </div>
          </div>
          <div className={confirm.center}>
            <div className={confirm.inputbox}>
              horário:
              <input type="datetime-local" onChange={(e) => { setDataFim(e.target.value) }} />
            </div>
          </div><br></br>
          <div className={confirm.flex}>
            <button className={confirm.cancelar} onClick={FecharConfirm}>CANCELAR</button>
            <div className={confirm.navio}><i className="fa fa-ship icon"></i>&nbsp;&nbsp;&nbsp;{dadosDash.NOME_NAVIO || "--"}</div>
            <button className={confirm.confirmar} onClick={validaDados3}>CONFIRMAR</button>
          </div>
        </div>
      </Confirm>
      <ParalisacaoFim open={openD} onClose={FecharParalisacaoFim} fullWidth>
        <div className={confirm.modal}>
          <div className={confirm.nav}>
            <div onClick={FecharParalisacaoFim}>Voltar</div>
          </div><br />
          <div className={confirm.center}>
            Deseja finalizar paralisação atual?
            <br />
          </div>
          <div className={confirm.center}>
            <div className={confirm.inputbox}>
              horário:
              <input type="datetime-local" onChange={(e) => { setDataFimPara(e.target.value) }} />
            </div>
          </div><br></br>
          <div className={confirm.flex}>
            <button className={confirm.cancelar} onClick={FecharParalisacaoFim}>CANCELAR</button>
            <div className={confirm.navio}><i className="fa fa-ship icon"></i>&nbsp;&nbsp;&nbsp;{dadosDash.NOME_NAVIO || "--"}</div>
            <button className={confirm.confirmar} onClick={validaPara}>CONFIRMAR</button>
          </div>
        </div>
      </ParalisacaoFim>
    </>
  );

};

export default function IntegrationNotistack() {
  return (
    <SnackbarProvider
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      maxSnack={3}
      autoHideDuration={3500}>
      <Operacao />
    </SnackbarProvider >
  );
}