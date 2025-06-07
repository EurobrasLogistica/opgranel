import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Background from "../../components/Background";
import Container from "../../components/Container";
import Header from "../../components/Header";
import Input from "../../components/Input";
import SubmitButton from "../../components/Button";
import Confirm from '@mui/material/Dialog';
import confirm from "./Confirm.module.css";
import modal from "./Modal.module.css";
import style from "./AlteracaoCadastral.module.css";
import Axios from "axios";
import { SnackbarProvider, useSnackbar } from 'notistack';

const AlteracaoCadastral = () => {

  useEffect(() => {
    getTipoveiculo();
    getTransportadora();
    getPedido();
  }, [])

    const usuario = JSON.parse(localStorage.getItem("user_token")).id;
    const navigate = useNavigate();
    const [i, setI] = useState({});
    const { enqueueSnackbar } = useSnackbar();
    const [carregamento, setCarregamento] = useState({});
    const [id, setId] = useState();
    const [MostaInput, setMostaInput] = useState(false);
    const [mostaInput2, setMostaInput2] = useState(false);
    const [mostaInput3, setMostaInput3] = useState(false);
    const [mostaInput4, setMostaInput4] = useState(false);
    const [mostaInput5, setMostaInput5] = useState(false);
    const [mostaInput6, setMostaInput6] = useState(false);
    const [mostaInput7, setMostaInput7] = useState(false);
    const [mostaInput8, setMostaInput8] = useState(false);
    const [mostaInput9, setMostaInput9] = useState(false);
    const [mostaInput10, setMostaInput10] = useState(false);
    const [mostaInput11, setMostaInput11] = useState(false);
    const [placa1, setPlaca1] = useState("");
    const [placa2, setPlaca2] = useState("");
    const [placa3, setPlaca3] = useState("");
    const [tipoVeiculo, setTipoVeiculo] = useState("");
    const [moega, setMoega] = useState("");
    const [dataMoega, setDataMoega] = useState("");
    const [tara, setTara] = useState("");
    const [dataTara, setDataTara] = useState("");
    const [placaCavalo, setPlacaCavalo] = useState('');
    const [documento, setDocumento] = useState([]);
    const [documentos, setDocumentos] = useState([]);
    const [tipoveiculos, setTipoveiculos] = useState([]);
    const [tipoveiculo, setTipoveiculo] = useState([]);
    const [transportadora, setTransportadora] = useState([])
    const [transportadoras, setTransportadoras] = useState([]);
    const [pedidos, setPedidos] = useState([]);
    const [pedido, setPedido] = useState([]);
    const [motivo, setMotivo] = useState("");
    const [isEditingEnabled, setIsEditingEnabled] = useState(false);
    const data = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [openC, setOpenC] = useState(false);
    
    
  const showAlert = (txt, variant) => {
    enqueueSnackbar(txt, { variant: variant });
  }


  const [openA, setOpenA] = useState(false);
  const AbrirPesagem = () => {
    setOpenA(true);
  };
  const FecharPesagem = () => {
    setOpenA(false);
  };
  
  const validaTecla = (e) => {
    if (e.key === 'Enter') {
        validaDados()
    }
}

const validaDados = () => {
  if (id.trim() !== "") {
    setIsEditingEnabled(true);
      if (carregamento.STATUS_CARREG === 8) {
      setIsEditingEnabled(true);
    } 
  } else {
    alert("Por favor, insira um ID válido.");
  }
    getCarregamento();
}

const getTransportadora = () => {
  Axios.get(`https://opgranel.eurobraslogistica.com.br/api/transportadora/alterar`,)
    .then(function (res) {
      setTransportadoras(res.data);
      console.log(res.data);
    });
}


const getDoc = () => {
  Axios.get(`https://opgranel.eurobraslogistica.com.br/api/documento/alterar/${carregamento.COD_OPERACAO}`,)
    .then(function (res) {
      setDocumentos(res.data);
      console.log(res.data);
    });
}

const AbrirConfirm = () => {
  setOpenC(true);
};
const FecharConfirm = () => {
  setOpenC(false);
};
const confirmaAlteracao = () => {
  if (!motivo.trim()) {
    showAlert("Por favor, insira um motivo para a exclusão.", "error");
    return;
  }
  // Lógica para alterar o status_carreg
  console.log("Carregamento excluído!"); // Substituir pela chamada ao backend
  excluirCarregamento();
  FecharConfirm();
};

// Função para excluir o carregamentooo
const excluirCarregamento = async () => {
  try {
    const res = await Axios.put(`https://opgranel.eurobraslogistica.com.br/api/carregamento/excluir`, {
      motivo: motivo, 
      usuario: usuario, 
      data_exclusao: data, 
      id: carregamento.ID_CARREGAMENTO,
    });
    if (res.data.sqlMessage) {
      showAlert(res.data.sqlMessage, "error");
    } else {
      showAlert("Carregamento excluído com sucesso!", "success"); // Reseta o carregamento após exclusão
    }
  } catch (error) {
    console.error("Erro ao excluir carregamento:", error);
    showAlert("Erro ao excluir o carregamento!", "error");
  }
};


const [inputs, setInputs] = useState([
    { name: 'Nome do motorista:', id: 1, value: `${i.NOME_MOTORISTA}`, show: false },
    { name: 'Placa do calvalo: ', id: 2, value: `${i.PLACA_CAVALO}`, show: false },
    { name: 'Placa da carreta 1: ', id: 3, value: `${i.PLACA_CARRETA}`, show: false },
    { name: 'Placa da carreta 2:', id: 4, value: `${i.PLACA_CARRETA2}`, show: false },
    { name: 'Placa da carreta 3:', id: 5, value: `${i.PLACA_CARRETA3}`, show: false },
    { name: '1º peso (tara):', id: 6, value: `${i.PESO_TARA}`, show: false },
    { name: 'Pedido MIC:', id: 7, value: `${i.PEDIDO_MIC}`, show: false },
  ]);


const validaTara = () => {
  if (!tara) {
    showAlert('Para atualizar a tara é necessário ter o peso!', 'error');
    return;
  }
  atualizaTara()
}

const validaMoega = () => {
  if (!moega) {
    showAlert('Para atualizar a tara é necessário ter o peso!', 'error');
    return;
  }
  if (!dataMoega) {
    showAlert('Para atualizar a tara é necessário ter a data!', 'error');
    return;
  }
  atualizaMoega()
}

  const validaplaca3 = async () => {
    await Axios.put('https://opgranel.eurobraslogistica.com.br/api/alterar/carreta3',
      {
        id: id,
        placa: placa3,
      }).then(function (res) {
        res.data.sqlMessage ?
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Placa 3 alterada com sucesso!', 'success');
        setMostaInput5(false)
      });
  }


  const validaVeiculo = async () => {
    console.log(tipoveiculos, i.ID_CARREGAMENTO);
    await Axios.put('https://opgranel.eurobraslogistica.com.br/api/veiculo/atualiza',
      {
        tipoveiculo: tipoveiculo,
        id: id
      }).then(function (res) {
        res.data.sqlMessage ?
        
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Veiculo alterado com sucesso!', 'success');

        setMostaInput7(false)
      });
  }


  const validaTransp = async () => {
    console.log(transportadoras, i.ID_CARREGAMENTO);
    await Axios.put('https://opgranel.eurobraslogistica.com.br/api/transporadora/atualiza',
      {
        transporadora: transportadora,
        id: id
      }).then(function (res) {
        res.data.sqlMessage ?
        
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Veiculo alterado com sucesso!', 'success');

        setMostaInput10(false)
      });
  }

  const validaDoc = async () => {
    console.log(documento, i.ID_CARREGAMENTO);
    await Axios.put('https://opgranel.eurobraslogistica.com.br/api/documento/atualiza',
      {
        documento: documento,
        id: id
      }).then(function (res) {
        res.data.sqlMessage ?
        
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('DI/BL alterada com sucesso!', 'success');

        setMostaInput11(false)
      });
  }

  const validaplaca2 = async () => {
    await Axios.put('https://opgranel.eurobraslogistica.com.br/api/alterar/carreta2',
      {
        id: id,
        placa: placa2,
      }).then(function (res) {
        res.data.sqlMessage ?
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Placa 2 alterada com sucesso!', 'success');
        setMostaInput4(false)
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
    await Axios.put('https://opgranel.eurobraslogistica.com.br/api/alterar/carreta1',
      {
        id: id,
        placa: placa1,
      }).then(function (res) {
        res.data.sqlMessage ?
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Placa 1 alterada com sucesso!', 'success');
        setMostaInput3(false)
      });
  }

  const getPedido = () => {
    Axios.get(`https://opgranel.eurobraslogistica.com.br/api/buscar/pedidos/${carregamento.COD_OPERACAO}`)
      .then((res) => {
        setPedidos(res.data);
      })
      .catch((error) => console.error("Erro ao buscar pedidos:", error));
  };


  // Função para validar o documento
  const validaPedido = async () => {
    if (!carregamento || !pedido) {
      showAlert('Por favor, selecione um pedido válido.', 'error');
      return;
    }
  
    try {
      const res = await Axios.put('https://opgranel.eurobraslogistica.com.br/api/documentos/atualiza', {
        documento: parseInt(pedido),
        cod: carregamento.COD_OPERACAO,
      });
  
      if (res.data.sqlMessage) {
        showAlert(res.data.sqlMessage, 'error');
      } else {
        showAlert('Pedido alterado com sucesso!', 'success');
        setMostaInput8(false);
      }
    } catch (error) {
      console.error("Erro ao validar documento:", error);
      showAlert('Erro ao alterar o pedido!', 'error');
    }
  };

  const validaCavalo = () => {
    if (!placaCavalo) {
      showAlert('Impossível atualizar a placa do cavalo, revivse!', 'error');
      return;
    }

    atualizaCavalo()
  }

  const atualizaCavalo = async () => {
    await Axios.put('https://opgranel.eurobraslogistica.com.br/api/alterar/cavalo',
      {
        id: id,
        placa: placaCavalo,
      }).then(function (res) {
        res.data.sqlMessage ?
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Placa do cavalo alterada com sucesso!', 'success');
        setMostaInput2(false)
      });
  }

  const atualizaTara = async () => {
    await Axios.put('https://opgranel.eurobraslogistica.com.br/api/alterar/tara',
      {
        tara: tara,
        data: data,
        id: id,
        usuario: usuario
      }).then(function (res) {
        res.data.sqlMessage ?
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Tara alterada com sucesso!', 'success');
        setMostaInput6(false)
      });
  }
  const atualizaMoega = async () => {
    await Axios.put('https://opgranel.eurobraslogistica.com.br/api/alterar/pesomoega',
      {
        moega: moega,
        id: id,
        datamoega: data,
        usuario: usuario
      }).then(function (res) {
        res.data.sqlMessage ?
          showAlert(res.data.sqlMessage, 'error') :
          showAlert('Peso moega alterado com sucesso!', 'success');
        setMostaInput9(false)
      });
  }

  const getCarregamento = () => {
    Axios.get(`https://opgranel.eurobraslogistica.com.br/api/alteracaocadastral/veiculos/${id}`)
      .then(function (res) {
        console.log(res.data);
        if (res.data.length > 0) {
          setCarregamento(res.data[0]);
          showAlert('Dados do carregamento encontrados!', 'success');
          // Chama a função para buscar os pedidos relacionados
          getPedido(res.data[0].COD_OPERACAO);
        } else {
          showAlert('ID não encontrado', 'error');
          setCarregamento(null); // Reseta caso não encontre
        }
      })
      .catch((err) => {
        console.error("Erro ao buscar carregamento:", err);
        showAlert('Erro ao buscar carregamento!', 'error');
      });
  };
  
  const getTipoveiculo = () => {
    Axios.get(`https://opgranel.eurobraslogistica.com.br/api/tipoveiculo`,)
      .then(function (res) {
        setTipoveiculos(res.data);
        console.log(res.data);
      });
  }

  return (
    <div>
      <Navbar AlteracaoCadastral/>
      <Header/>
      <Background />
      <Container>
      <div className={style.content}>
      <div className={style.nav}>
      <div className={style.active}>Alteração Cadastral</div>
      </div>
      <div className={style.searchContainer}>
    <label htmlFor="carregamentoId">Digite o ID do Carregamento:</label>
       <input
        id="carregamentoId"
        type="text"
        value={id}
        onChange={(e) => setId(e.target.value)}
        placeholder="Ex: 12345"
        onKeyPress={(e) => validaTecla(e)}
        
        />
          <button onClick={validaDados} onKeyPress={(e) => validaTecla(e)}>
        Pesquisar
          </button>
      </div>


      
        {carregamento && (
            <div className={`${style.card}`}>
          <div className={style.resultContainer}>
          {carregamento.STATUS_CARREG === 8 && (
            <div style={{
              backgroundColor: "red",
              color: "white",
              padding: "10px",
              textAlign: "center",
              fontWeight: "bold",
              borderRadius: "5px",
              marginBottom: "15px"
            }}>
              ESTE CARREGAMENTO FOI EXCLUÍDO
            </div>
          )}
                <h3>Detalhes do Carregamento</h3>
          <div><b>ID:</b> {carregamento.ID_CARREGAMENTO}</div>
          <div><b>Código Operação:</b> {carregamento.COD_OPERACAO} </div>

            <div className={style.line}>
              <b>Cavalo: </b>
              {mostaInput2 ? (
                <>
                  <input
                    onChange={(e) => {
                      setPlacaCavalo(e.target.value.toUpperCase());
                    }}
                    placeholder="Placa do cavalo"
                    className={style.inputline}
                    type="text"
                  />
                  <button onClick={validaCavalo} className={style.buttontline} type="submit">
                    <i className="fa fa-check" aria-hidden="true"></i>
                  </button>
                  <button className={style.buttontlinecancel} onClick={() => setMostaInput2(false)}>
                    <i className="fa fa-times" aria-hidden="true"></i>
                  </button>
                </>
              ) : (
                <>
                  {carregamento.PLACA_CAVALO || ""}
                  {isEditingEnabled && (
                    <span>
                      <i
                        onClick={() => setMostaInput2(true)}
                        className="fa fa-pencil-square-o"
                        aria-hidden="true"
                      ></i>
                    </span>
                  )}
                </>
              )}
            </div>

            {/* 1ª Carreta */}
            <div className={style.line}>
              <b>1° Carreta:</b>
              {mostaInput3 ? (
                <>
                  <input
                    onChange={(e) => setPlaca1(e.target.value.toUpperCase())}
                    placeholder="Placa 1"
                    className={style.inputline}
                    type="text"
                  />
                  <button onClick={validaPlaca1} className={style.buttontline}>
                    <i className="fa fa-check" aria-hidden="true"></i>
                  </button>
                  <button onClick={() => setMostaInput3(false)} className={style.buttontlinecancel}>
                    <i className="fa fa-times" aria-hidden="true"></i>
                  </button>
                </>
              ) : (
                <>
                {carregamento.PLACA_CARRETA|| ""}
                {isEditingEnabled && (
                <span> <i
                      onClick={() => setMostaInput3(true)}
                      className="fa fa-pencil-square-o"
                      aria-hidden="true"
                    ></i>
                    </span> 
                )}
                </>
              )}
            </div>

            {/* 2ª Carreta */}
            <div className={style.line}>
              <b>2° Carreta:</b>
              {mostaInput4 ? (
                <>
                  <input
                    onChange={(e) => setPlaca2(e.target.value.toUpperCase())}
                    placeholder="Placa 2"
                    className={style.inputline}
                    type="text"
                  />
                  <button onClick={() => validaplaca2(false)} className={style.buttontline}>
                    <i className="fa fa-check" aria-hidden="true"></i>
                  </button>
                  <button onClick={() => setMostaInput4(false)} className={style.buttontlinecancel}>
                    <i className="fa fa-times" aria-hidden="true"></i>
                  </button>
                </>
              ) : (
                <>
                {carregamento.PLACA_CARRETA2|| ""}
                {isEditingEnabled && (
                <span> <i
                      onClick={() => setMostaInput4(true)}
                      className="fa fa-pencil-square-o"
                      aria-hidden="true"
                    ></i>
                    </span>
                )}
                </>
              )}
            </div>

            {/* 3ª Carreta */}
            <div className={style.line}>
              <b>3° Carreta:</b>
              {mostaInput5 ? (
                <>
                  <input
                    onChange={(e) => setPlaca3(e.target.value.toUpperCase())}
                    placeholder="Placa 3"
                    className={style.inputline}
                    type="text"
                  />
                  <button onClick={validaplaca3} className={style.buttontline}>
                    <i className="fa fa-check" aria-hidden="true"></i>
                  </button>
                  <button onClick={() => setMostaInput5(false)} className={style.buttontlinecancel}>
                    <i className="fa fa-times" aria-hidden="true"></i>
                  </button>
                </>
              ) : (
                <>
                {carregamento.PLACA_CARRETA3|| ""}
                {isEditingEnabled && (
                <span> <i
                      onClick={() => setMostaInput5(true)}
                      className="fa fa-pencil-square-o"
                      aria-hidden="true"
                    ></i>
                    </span>
                )}
                </>
              )}
            </div>

           {/* Tipo do Veículo */}
           <div className={style.line}>
              <b>Tipo do veículo:</b>
              {mostaInput7 ? (
                <>
                    <select className={style.inputline} onChange={(e) => { setTipoveiculo(e.target.value) }}>
                      <option disabled selected>Selecione uma opção</option>
                      {tipoveiculos?.map((val) => {
                        return (
                          <option value={val.COD_TIPO}>{val.DESC_TIPO_VEICULO}</option>
                        )
                      })}
                    </select>
                  <button onClick={validaVeiculo} className={style.buttontline}>
                    <i className="fa fa-check" aria-hidden="true"></i>
                  </button>
                  <button
                    className={style.buttontlinecancel}
                    onClick={() => setMostaInput7(false)}
                  >
                    <i className="fa fa-times" aria-hidden="true"></i>
                  </button>
                </>
              ) : (
                <>
                  {carregamento.DESC_TIPO_VEICULO || ""}
                  {isEditingEnabled && (
                  <span>
                    <i
                      onClick={() => setMostaInput7(true)}
                      className="fa fa-pencil-square-o"
                      aria-hidden="true"
                    ></i>
                  </span>
                  )}
                </>
              )}
            </div>
              
            {/* 1ª Pesagem (tara) */}
            <div className={style.line}>
              <b>1º Pesagem (tara):</b>
              {mostaInput6 ? (
                <>
                  <input
                    onChange={(e) => setTara(e.target.value)}
                    placeholder="Peso da TARA"
                    className={style.inputline}
                    type="text"
                  />
                  <button onClick={validaTara} className={style.buttontline}>
                    <i className="fa fa-check" aria-hidden="true"></i>
                  </button>
                  <button onClick={() => setMostaInput6(false)} className={style.buttontlinecancel}>
                    <i className="fa fa-times" aria-hidden="true"></i>
                  </button>
                </>
                ) : (
                  <>
                  {carregamento.PESO_TARA|| ""}
                  {isEditingEnabled && (
                  <span> <i
                        onClick={() => setMostaInput6(true)}
                        className="fa fa-pencil-square-o"
                        aria-hidden="true"
                      ></i>
                      </span> 
                  )}
                  </>
              )}
            </div>

   {/* 2ª Pesagem (moega) */}
   <div className={style.line}>
              <b>2ª Pesagem (moega):</b>
              {mostaInput9 ? (
                <>
                  <input
                    onChange={(e) => setMoega(e.target.value)}
                    placeholder="Peso da MOEGA"
                    className={style.inputline}
                    type="text"
                  />
                
                  <button onClick={validaMoega} className={style.buttontline}>
                    <i className="fa fa-check" aria-hidden="true"></i>
                  </button>
                  <button onClick={() => setMostaInput9(false)} className={style.buttontlinecancel}>
                    <i className="fa fa-times" aria-hidden="true"></i>
                  </button>
                </>
                ) : (
                  <>
                  {carregamento.PESO_CARREGADO|| ""}
                  {isEditingEnabled && (
                  <span> <i
                        onClick={() => setMostaInput9(true)}
                        className="fa fa-pencil-square-o"
                        aria-hidden="true"
                      ></i>
                      </span> 
                  )}
                  </>
              )}
            </div>

                       {/* Pedido MIC */}
            <div className={style.line}>
              <b>Pedido MIC:</b>
              {mostaInput8 ? (
                <>
                    <select className={style.inputline} onChange={(e) => { setPedido(e.target.value) }}>
                      <option disabled selected>Selecione uma opção</option>
                      {pedidos?.map((val) => {
                        return (
                          <option value={val.NR_PEDIDO}>{val.NR_PEDIDO}</option>
                        )
                      })}
                    </select>
                  <button onClick={validaPedido} className={style.buttontline}>
                    <i className="fa fa-check" aria-hidden="true"></i>
                  </button>
                  <button onClick={() => setMostaInput8(false)} className={style.buttontlinecancel}>
                    <i className="fa fa-times" aria-hidden="true"></i>
                  </button>
                </>
               ) : (
                <>
                {carregamento.PEDIDO_MIC|| ""}
                {isEditingEnabled && (
                <span> <i
                      onClick={() => setMostaInput8(true)}
                      className="fa fa-pencil-square-o"
                      aria-hidden="true"
                    ></i>
                    </span> 
                )}
                </>
              
              )}
                  </div>


            <div className={style.line}> 
                <b>Transportadora: </b> {mostaInput10 ? (
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
                    <button className={style.buttontlinecancel} onClick={() => setMostaInput10(false)}><i class="fa fa-times" aria-hidden="true"></i></button>

                  </>  
                  ) : (
                <>
                {carregamento.NOME_TRANSP|| ""}
                {isEditingEnabled && (
                <span> <i
                      onClick={() => setMostaInput10(true)}
                      className="fa fa-pencil-square-o"
                      aria-hidden="true"
                    ></i>
                    </span> 
                )}
                </>
              )}
              </div>
            
                   {/* Botão para excluir carregamento */}
                   {isEditingEnabled && (
                   <div>
                <button
                  className={style.deleteButton}
                  onClick={AbrirConfirm}
                >
                  <i className="fa fa-trash icons" aria-hidden="true"></i> Excluir Carregamento
                </button>
              </div>
                   )}
              <Confirm open={openC} onClose={FecharConfirm} fullWidth>
        <div className={confirm.modal}>
          <div className={confirm.center}>
            Deseja excluir o carregamento '{id}' ? 
            <br />
            <div>Essa ação não poderá ser desfeita!</div>
          </div>
          <div className={confirm.center}>
          <div className={modal.textbox}>
              Motivo da exclusão:
              <textarea rows="3" value={motivo} onChange={(e) => setMotivo(e.target.value)}></textarea>
            </div>
          </div>
          <br />
          <div className={confirm.flex}>
            <button className={confirm.confirmar} onClick={confirmaAlteracao}>
              CONFIRMAR
            </button>
            <button className={confirm.cancelar} onClick={FecharConfirm}>
              CANCELAR
            </button>
          </div>
        </div>
      </Confirm>


          </div> 
        </div>
        )}
        
            </div>
      </Container>
    </div>
  );
};

export default function IntegrationNotistack() {
  return (
    <SnackbarProvider
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      maxSnack={3}
      autoHideDuration={2500}
    >
      <AlteracaoCadastral />
    </SnackbarProvider>
  );
}