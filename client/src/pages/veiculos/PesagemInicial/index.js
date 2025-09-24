import React from "react";
import Navbar from "../../../components/Navbar";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import style from "./PesagemInicial.module.css";
import { useNavigate, useParams } from "react-router-dom";
import Input from "../../../components/Input";
import SubmitButton from "../../../components/Button";
import Select from "../../../components/select";
import { useState, useEffect } from "react";
import Axios from "axios";
import { SnackbarProvider, useSnackbar } from 'notistack';
import MaskedInput from "../../../components/InputMask";
import moment from "moment";
import GraficoPercent from "../../../components/GraficoPercent";

const PesagemInicial = () => {
  const navigate = useNavigate();


  useEffect(() => {
    getTipoveiculo()
    getOperacoes()
    getTransp()
    getDestino()
    BuscarPlacas(cpf); 
  }, [])

  const [operacoesList, setOperacoesList] = useState([]);
  const [docs, setDocs] = useState([]);
  const [pedidoMic, setPedidoMic] = useState([]);  
  const [teste, setTeste] = useState(false);
  let { nome } = useParams();
  let { cpf } = useParams();
  let { cnh } = useParams();
  let { id } = useParams();

  const [destinos, setDestinos] = useState([]);
  const [destino, setDestino] = useState('');


  const [pedidos, setPedidos] =  useState([])
  const [doc, setDoc] = useState('');
  const [navio, setNavio] = useState('');
  const [tara, setTara] = useState('');
  const [placacavalo, setPlacacavalo] = useState('');
  const [placa1, setPlaca1] = useState('');
  const [placa2, setPlaca2] = useState(null);
  const [placa3, setPlaca3] = useState(null);
  const [data, setData] = useState('');
  const [transportadora, setTransportadora] = useState([])
  const [transportadoras, setTransportadoras] = useState([])
  const [tipopesagem, setTipopesagem] = useState('');
  const [tipoveiculo, setTipoveiculo] = useState([])
  const [tipoveiculos, setTipoveiculos] = useState([])
  const [disabled, setDisabled] = useState(false)
  const usuario = JSON.parse(localStorage.getItem("user_token")).id;

  const [codOperacao, setCodOperacao] = useState('');
  const [codMotorista, setCodMotorista] = useState('');
  const [idCarregamento, setIdCarregamento] = useState('');
  const [cpfMotorista, setCpfMotorista] = useState('');

  const [message, setMessage] = useState('');
  const [mostrarCpf, setMostrarCpf] = useState(false);




  const [openA, setOpenA] = useState(false);
  const DetalhesOp = () => {
    setOpenA(true);
  };
  const FecharDetalhesOp = () => {
    setOpenA(false);
  };


    const [openB, setOpenB] = useState(false);
  const AbrirConfirm = () => {
    FecharDetalhesOp()
    setOpenB(true);

  };

  const validaDados = () => {
    if (!doc | !destino | !placacavalo | !data | !placa1 | !transportadora | !tipopesagem ) {
      return showAlert('Preencha todos os campos', 'error');
    }
    if (placacavalo.length < 7) {
      showAlert('Placa do cavalo deve conter 7 digitos!', 'error');
      return
    } if (placa1.length < 7) {
      showAlert('Placa 1 deve conter 7 digitos!', 'error');
      return
    }
    if (tipoveiculo == null) {
      setTipoveiculo(null)
      showAlert('Preencha todos os campos', 'error');
      return
    } 
   // getMotivacaoConteudo();
    // if (!validaSaldo()) return;
    addPesagem();
  }
 const validaSaldo = () => {
  
    const documentosComSaldoBaixo = docs.filter(doc => doc.SALDO <= 150000);

    if (documentosComSaldoBaixo.length > 0) {
      const mensagens = documentosComSaldoBaixo.map(doc =>
        `⚠ Documento ${doc.NUMERO_DOC} está com apenas ${(doc.SALDO / 1000).toFixed(2)} tons de saldo.`
      ).join("\n");
      
      alert(mensagens);
      return; 
    }
    
    console.log("Cadastrando...");
    
  };

  const validaTecla = (e) => {
    if (e.key === 'Enter') {
      validaDados()
  //    getMotivacaoConteudo()
      //onkeypress={(e) => validaTecla(e)}
    }
  }
  //tipopesagem == "PesagemMoega" ? setDisabled(true) : 

 const validaTipo = (val) => {
    if (val == "C"){
      showAlert('Pesagem completa selecionada com sucesso!', 'success');
      setDisabled(false)
      setTara(0)      
      return;
    } else {
      showAlert('Pesagem moega selecionada com sucesso!', 'success');
      setTara(1000)
      setDisabled(true)
      return;
    }
  }

  const BuscarPlacas = async (cpf) => {
    try {
      const response = await Axios.get(`https://opgranel.eurobraslogistica.com.br/api/pesageminicial/historico/${cpf}`);
      if (response.data.length > 0) {
        const { PLACA_CAVALO, PLACA_CARRETA, PLACA_CARRETA2, PLACA_CARRETA3, TIPO_VEICULO } = response.data[0]; // Destructure the response
        setPlacacavalo(PLACA_CAVALO);
        setPlaca1(PLACA_CARRETA || ''); // Set or default to empty string
        setPlaca2(PLACA_CARRETA2 || '');
        setPlaca3(PLACA_CARRETA3 || '');
        setTipoveiculo(TIPO_VEICULO || '');
      }
    } catch (error) {
      console.error('Error fetching vehicle plate data:', error);
    }
  };

  const addPesagem = () => {
    Axios.post('https://opgranel.eurobraslogistica.com.br/api/pesagem/primeirapesagem', {
      COD_CARGA: doc,
      COD_OPERACAO: navio,
      PLACA_CAVALO: placacavalo,
      COD_MOTORISTA: id,
      PLACA_CARRETA: placa1,
      PLACA_CARRETA2: placa2,
      PLACA_CARRETA3: placa3,
      TIPO_VEICULO: tipoveiculo,
      COD_TRANSP: transportadora,
      COD_DESTINO: destino,
      PESO_TARA: tara,
      DATA_TARA: data,
      USUARIO_TARA: usuario,
      STATUS_CARREG: '1',
      USUARIO: usuario,
      DATA_CADASTRO: getDate(),
      NR_PEDIDO: pedidoMic,
      TIPO_PESAGEM: tipopesagem,
    }).then(function (res) {
      console.log(res);
      res.data.sqlMessage ?
        showAlert(res.data.sqlMessage, 'error') :
        showAlert('Pesagem cadastrada com sucesso!', 'success');
      setTimeout(() => {
        navigate('/veiculos/BuscarMotorista')
      });
    }, 20);
  }

  const getDate = () => {
    const date = new Date()
    date.setHours(date.getHours() - 3)
    return (date.toISOString().slice(0, 19).replace('T', ' '))
  }

 const getOperacoes = () => {
    Axios.get('https://opgranel.eurobraslogistica.com.br/api/operacao')
      .then((response) => {
        setOperacoesList(response.data)
        console.log(response.data);
        getCargas()
      });
  }

  const getCargas = (id) => {
    Axios.get(`https://opgranel.eurobraslogistica.com.br/api/carga/busca/${id}`,)
      .then(function (res) {
        setDocs(res.data);
        console.log(res.data);
        getPedido(id)
      });
  }

  // const getMotivacaoConteudo = async (id) => {
  //   try {

  //     // Faz a requisição para executar o Puppeteer com os parâmetros corretos
  //     const response = await Axios.post('https://opgranel.eurobraslogistica.com.br/api/executarPuppeteer');
  
  //     // Verifica a resposta
  //     console.log('Resposta da API Puppeteer:', response.data);
  //     if (response.data) {
  //       showAlert('Conteúdo carregado com sucesso!', 'success');
  //     } else {
  //       showAlert('Nenhum conteúdo encontrado!', 'warning');
  //     }
  //   } catch (error) {
  //     console.error('Erro ao executar Puppeteer:', error.response?.data || error.message);
  //     showAlert('Erro ao carregar o conteúdo!', 'error');
  //   }
  // };
  
  

//   const getMotivacao = (id) => {
//     Axios.post(`https://opgranel.eurobraslogistica.com.br/api/motivacao/conteudo/${id}`, {
//     }).then((response) => {
//         console.log(response.data);
//         setCpfMotorista(response.data);
//     });
// }

  const getTransp = () => {
    Axios.get(`https://opgranel.eurobraslogistica.com.br/api/transportadora`,)
      .then(function (res) {
        setTransportadoras(res.data);
        console.log(res.data);
      });
  }

  const getDestino = () => {
    Axios.get(`https://opgranel.eurobraslogistica.com.br/api/destino`,)
      .then(function (res) {
        setDestinos(res.data);
        console.log(res.data);
      });
  }

  const getTipoveiculo = () => {
    Axios.get(`https://opgranel.eurobraslogistica.com.br/api/tipoveiculo`,)
      .then(function (res) {
        setTipoveiculos(res.data);
        console.log(res.data);
      });
  }



  const getPedido = (id) => {
    Axios.get(`https://opgranel.eurobraslogistica.com.br/api/buscar/pedidos/${id}`,)
      .then(function (res) {
        setPedidos(res.data);
        console.log(res.data);
      });
  }


  const { enqueueSnackbar } = useSnackbar();
  const showAlert = (txt, variant) => {
    enqueueSnackbar(txt, { variant: variant });
  }



  return (
    <>
      <Navbar veiculos />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          <div className={style.nav}>
            <div className={style.nav}>
              <div onClick={() => navigate("/veiculos/BuscarMotorista")} >
                Buscar Motorista
              </div>

              <div onClick={() => navigate("/veiculos")}>
                Cadastrar Motorista
              </div>
              <div className={style.active}>
                Pesagem inicial
              </div>
            </div>
          </div>


          <div className={style.align}>
            <div className="columns">
              <div className="column is-4">
                <div className={style.box}>
                  <div className="card">
                    <div className="card-content">
                      <div className={style.cabecario}>
                        INFORMAÇÕES DO MOTORISTA
                      </div>
                      <div className="content">
                        <div> <strong className={style.name}>Motorista:</strong> {nome}</div>
                        <div><strong className={style.name}>CPF:</strong> {cpf}</div>
                        <div><strong className={style.name}>CNH:</strong> {cnh == 'null' ? "nulo" : cnh}</div>
                

                      </div>
                    </div>
                  </div>
                </div>
                
               <div className={style.radio}> 
                          <div className="control">
                            <label className="radio">
                              <input type="radio" 
                              onChange={(e) => [setTipopesagem(e.target.value), validaTipo(e.target.value)]} 
                              value="C"
                               name="tipoPesagem" /> Pesagem COMPLETA  
                              </label>
                            <label className="radio">
                              <input type="radio"
                               onChange={(e) => [setTipopesagem(e.target.value), validaTipo(e.target.value)]}
                               value="M"
                               name="tipoPesagem" /> Pesagem MOEGA
                            </label>                                                      
                          </div>
                        </div>
                     
                      
                <div className={style.form_control}>
          
                        
                  <label>Selecione o navio (operação):</label>
                  <select onChange={(e) => [getCargas(e.target.value), setNavio(e.target.value)]}>{/*
                    Chama o getCargas() passando o id o codigo da operacao que vai ser selecinado no select e depois seta o navio que vai ser operado
                    porem na função getCargas, quando é enviado o id, automaticamente seta os documentos que vao ser lidos no outro select 
                  */}
                    <option disabled selected>Selecione uma opção</option>
                    {operacoesList?.map((val) => {
                      if (val.STATUS_OPERACAO == 'FECHADA') {
                        return (
                          null
                        )
                      }
                      return (
                        <option value={val.COD_OPERACAO}>{val.NOME_NAVIO}</option>
                      )
                    })}
                  </select>
                </div>

                {disabled == true ?
              <div  className={style.form_input_div}>Peso vazio (Tara):
                 <input className={style.form_input} type={"text"} 
                 text={"Peso vazio (Tara)"}
                  placeholder={"1.000 kg"}
                  disabled={true}                  
                />
              </div>
                 : 
                 <Input type={"text"} text={"Peso vazio (Tara)"}
                  placeholder={"Insira o Peso em KG"}
                  onChange={(e) => setTara(e.target.value)}
                />
              }
              </div>
              <div className="column is-3">
                  <div className={style.form_control}>

                  <label>Destino da carga:</label>
                  <select onChange={(e) => { setDestino(e.target.value) }}>
                    <option disabled selected>Selecione uma opção</option>
                    {destinos?.map((val) => {
                      return (
                        <option value={val.COD_DESTINO}>{val.NOME_DESTINO}</option>
                      )
                    })}
                  </select>
                </div> 
                
             
                  <div className={style.placaContainer}>
                    <label htmlFor="placaCavalo">Placa Cavalo</label>
                    <input
                      type="text"
                      id="placaCavalo"
                      placeholder="Ex: AAA1234"
                      value={placacavalo}
                      onChange={(e) => setPlacacavalo(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className={style.placaContainer}>
                    <label htmlFor="placa1">Placa Carreta 1</label>
                    <input
                      type="text"
                      id="placa1"
                      placeholder="Ex: AAA1234"
                      value={placa1}
                      onChange={(e) => setPlaca1(e.target.value.toUpperCase())}
                    />
                  </div>

                  <div className={style.placaContainer}>
                    <label htmlFor="placa2">Placa Carreta 2</label>
                    <input
                      type="text"
                      id="placa2"
                      placeholder="Ex: AAA1234"
                      value={placa2}
                      onChange={(e) => setPlaca2(e.target.value.toUpperCase())}
                    />
                  </div>

                  <div className={style.placaContainer}>
                    <label htmlFor="placa3">Placa Carreta 3</label>
                    <input
                      type="text"
                      id="placa3"
                      placeholder="Ex: AAA1234"
                      value={placa3}
                      onChange={(e) => setPlaca3(e.target.value.toUpperCase())}
                    />
                  </div>


          
              
                <div className={style.form_control}>

                  <label>Tipo de veículo:</label>
                  <select onChange={(e) => { setTipoveiculo(e.target.value) }}>
                    <option disabled selected>Selecione uma opção</option>
                    {tipoveiculos?.map((val) => {
                      return (
                        <option value={val.COD_TIPO}>{val.DESC_TIPO_VEICULO}</option>
                      )
                    })}
                  </select>
                </div>
                <div className={style.form_control}>

                  <label>Transportadora:</label>
                  <select onChange={(e) => { setTransportadora(e.target.value) }}>
                    <option disabled selected>Selecione uma opção</option>
                    {transportadoras?.map((val) => {
                      return (
                        <option value={val.COD_TRANSP}>{val.NOME_TRANSP}</option>
                      )
                    })}
                  </select>
                </div>

              </div>
    
              <div className="column is-4">

              {/* <div>
      <div className={style.form_control}>
      <label>Deseja motivar o CPF?</label>
  <div className={style.radio_group}>
    <div className={style.radio_motiva}>
      <input
        type="radio"
        name="informarCpf"
        value="sim"
        onChange={handleRadioChange}
      />
      <label>Sim</label>
    </div>
    <div className={style.radio_motiva}>
      <input
        type="radio"
        name="informarCpf"
        value="nao"
        onChange={handleRadioChange}
      />
      <label>Não</label>
    </div>
  </div>
      </div>

      {mostrarCpf && (
  <div className={style.form_control}>
    <label htmlFor="cpf">CPF:</label>
    <input
      type="text"
      id="cpf"
      placeholder="Digite o CPF"
      value={cpfMotorista}
      onChange={(e) => {
        setCpfMotorista(e.target.value);
        if (e.target.value) {
          (e.target.value); // Chama a função ao preencher o CPF
        }
      }}
    />
  </div>
)}

    </div> */}
                <div className={style.form_control}>

                  <label>Código da operação (DI ou BL):</label>
                  <select onChange={(e) => { setDoc(e.target.value) }}>
                    <option disabled selected>Selecione uma opção</option>
                    {docs?.map((val) => {
                      return (
                        <option value={val.COD_CARGA}>{val.TIPO} - {val.NUMERO}</option>
                      )
                    })}
                  </select>
               </div>
                <div className={style.form_control}>
                  <label>Número do Pedido:</label>
                  <select onChange={(e) => { setPedidoMic(e.target.value)}}>
                    <option disabled selected>Selecione uma opção</option>
                    {pedidos?.map((val) => {
                      return (
                        <option value={val.NR_PEDIDO}>{val.NR_PEDIDO}</option>
                      )
                    })}
                  </select>
                </div>
                <Input type={"datetime-local"} text={"Data e hora(h)"}
                  onChange={(e) => setData(e.target.value)}
                  onKeyPress={(e) => validaTecla(e)}
                // onChange={moment(setData).format("DD/MM/YYYY")}
                />

              </div>
            </div>

          </div>
          <div className={style.button}>
            <SubmitButton text={"Cadastrar"}
              onClick={AbrirConfirm}
              onkeypress={(e) => validaTecla(e)}
            />
          </div>

        </div>
      </Container>
       <Confirm open={openB} onClose={FecharConfirm} fullWidth>
        <div className={confirm.modal}>
          <div className={confirm.nav}>
            <div onClick={FecharConfirm}>Voltar</div>
          </div>
          <div className={confirm.center}>
            ⚠ Documento ${doc.NUMERO_DOC} está com apenas ${(doc.SALDO / 1000).toFixed(2)} tons de saldo.
            <br />
            <div>Deseja continuar mesmo assim?</div>
          </div>
       
          <div className={confirm.flex}>
            <button className={confirm.cancelar} onClick={FecharConfirm}>CANCELAR</button>
            <button className={confirm.confirmar} onClick={validaDados}>CONFIRMAR</button>
          </div>
        </div>
      </Confirm>
    </>
  );
};



export default function IntegrationNotistack() {
  return (
    <SnackbarProvider
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      maxSnack={3}
      autoHideDuration={2500}>
      <PesagemInicial />
    </SnackbarProvider >
  );
}

