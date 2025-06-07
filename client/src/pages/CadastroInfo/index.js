import React, { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import Brackground from "../../components/Background";
import Container from "../../components/Container";
import Header from "../../components/Header";
import style from "./CadastroInfo.module.css";
import { useNavigate, useParams } from "react-router-dom";
import { SnackbarProvider, useSnackbar } from 'notistack';
import Axios from "axios";
import SelecionarTransp from '@mui/material/Dialog';
import InputMask from 'react-input-mask';

const CadastroInfo = () => {
    const navigate = useNavigate();
    const { id, nome, cnpj, pedido, operacao } = useParams();
    const usuario = JSON.parse(localStorage.getItem("user_token")).id;
    const { enqueueSnackbar } = useSnackbar();

    const [activeButton, setActiveButton] = useState(null);
    const [inputValue, setInputValue] = useState(''); 
    const [navio, setNavio] = useState(''); 
    const [docs, setDocs] = useState([]);
    const [doc, setDoc] = useState('');
    const [cnpjValue, setCnpjValue] = useState('');
    const [nomereduzido, setNomeReduzido] = useState(''); 
    const [operacoesList, setOperacoesList] = useState([]);
    const [transportadora, setTransportadora] = useState([]);
    const [consultaData, setConsultaData] = useState([]);
    const [transportadoras, setTransportadoras] = useState([]); // Estado para armazenar as transportadoras
    const [selectedTransportadoras, setSelectedTransportadoras] = useState([]); // Estado para as transportadoras selecionadas
    const [ncmCode, setNcmCode] = useState(''); // Estado para o código do NCM
    const [ncmDescription, setNcmDescription] = useState(''); // Estado para a descrição do NCM
    const [items, setItems] = useState({
        Pedido: [],
        Transportadora: [],
        Importador: [],
        Destino: [],
        NCM: [],
        Produto: []
    });

    useEffect(() => {
        getOperacoes();
        getTransportadoras();
        getTransportadoras();
    }, []);

    const handleButtonClick = (button) => {
        setActiveButton(button); 
        setInputValue(''); 
        setCnpjValue(''); 
        setNomeReduzido(''); 
        setNcmCode(''); // Reseta o valor do código NCM
        setNcmDescription(''); // Reseta a descrição do NCM
        setConsultaData([]); 
    };

    const getCargas = (id) => {
        Axios.get(`https://opgranel.eurobraslogistica.com.br/api/carga/busca/${id}`)
            .then(function (res) {
                setDocs(res.data);
            });
    };
    const getTransportadoras = () => {
        Axios.get('https://opgranel.eurobraslogistica.com.br/api/transportadora/consultar')
            .then((response) => {
                setTransportadoras(response.data);
            })
            .catch((error) => {
                console.error(error);
                enqueueSnackbar("Erro ao buscar transportadoras", { variant: 'error' });
            });
    };
    
  

    const getOperacoes = () => {
        Axios.get('https://opgranel.eurobraslogistica.com.br/api/operacao')
            .then((response) => {
                setOperacoesList(response.data);
                getCargas();
            });
    };

    const validateFields = () => {
      if (activeButton === 'Transportadora') {
          if (!inputValue || !cnpjValue) {
              enqueueSnackbar("Preencha todos os campos obrigatórios!", { variant: 'error' });
              return false; // Validação falhou
          }
      } else if (activeButton === 'Importador') {
          if (!inputValue || !cnpjValue || !nomereduzido) {
              enqueueSnackbar("Preencha todos os campos obrigatórios!", { variant: 'error' });
              return false; // Validação falhou
          }
      } else if (activeButton === 'Destino') {
          if (!inputValue) {
              enqueueSnackbar("Preencha todos os campos obrigatórios!", { variant: 'error' });
              return false; // Validação falhou
          }
      } else if (activeButton === 'NCM') {
          if (!ncmCode || !ncmDescription) {
              enqueueSnackbar("Preencha todos os campos obrigatórios!", { variant: 'error' });
              return false; // Validação falhou
          }
      } else if (activeButton === 'Produto') {
          if (!inputValue) {
              enqueueSnackbar("Preencha todos os campos obrigatórios!", { variant: 'error' });
              return false; // Validação falhou
          }
      } else if (activeButton === 'Pedido') {
          if (!navio || !inputValue) {
              enqueueSnackbar("Preencha todos os campos obrigatórios!", { variant: 'error' });
              return false; // Validação falhou
          }
      }
      return true; // Validação bem-sucedida
  };

  const handleAddItem = () => {
    const cnpjSemMascara = cnpjValue.replace(/[^\d]/g, '');

    if (activeButton === 'Transportadora') {
        Axios.post('https://opgranel.eurobraslogistica.com.br/api/transportadora/criar', {
            nome: inputValue,
            cnpj: cnpjSemMascara,
         
        }).then(() => {
            enqueueSnackbar("Transportadora adicionada com sucesso!", { variant: 'success' });
        }).catch((error) => {
            // Tratamento de erro específico para duplicidade
            if (error.response && error.response.data.includes('duplicado')) {
                enqueueSnackbar("Erro: Transportadora já existe no banco de dados", { variant: 'error' });
            } else {
                enqueueSnackbar("Erro ao adicionar Transportadora", { variant: 'error' });
            }
        });
    } else if (activeButton === 'Importador') {
        Axios.post('https://opgranel.eurobraslogistica.com.br/api/importador/criar', {
            nome: inputValue,
            cnpj: cnpjSemMascara,
            nomereduzido: nomereduzido 
        }).then(() => {
            enqueueSnackbar("Importador adicionado com sucesso!", { variant: 'success' });
        }).catch((error) => {
            if (error.response && error.response.data.includes('duplicado')) {
                enqueueSnackbar("Erro: Importador já existe no banco de dados", { variant: 'error' });
            } else {
                enqueueSnackbar("Erro ao adicionar Importador", { variant: 'error' });
            }
        });
    } else if (activeButton === 'Destino') {
        Axios.post('https://opgranel.eurobraslogistica.com.br/api/destino/criar', {
            nome: inputValue
        }).then(() => {
            enqueueSnackbar("Destino adicionado com sucesso!", { variant: 'success' });
        }).catch((error) => {
            if (error.response && error.response.data.includes('duplicado')) {
                enqueueSnackbar("Erro: Destino já existe no banco de dados", { variant: 'error' });
            } else {
                enqueueSnackbar("Erro ao adicionar Destino", { variant: 'error' });
            }
        });
    } else if (activeButton === 'NCM') {
        Axios.post('https://opgranel.eurobraslogistica.com.br/api/ncm/criar', {
            codncm: ncmCode,
            descricao: ncmDescription
        }).then(() => {
            enqueueSnackbar("NCM adicionado com sucesso!", { variant: 'success' });
        }).catch((error) => {
            if (error.response && error.response.data.includes('duplicado')) {
                enqueueSnackbar("Erro: NCM já existe no banco de dados", { variant: 'error' });
            } else {
                enqueueSnackbar("Erro ao adicionar NCM", { variant: 'error' });
            }
        });
    } else if (activeButton === 'Produto') {
        Axios.post('https://opgranel.eurobraslogistica.com.br/api/produto/criar', {
            codncm: inputValue,
            unidade: inputValue,
            ind_carga: inputValue
        }).then(() => {
            enqueueSnackbar("Produto adicionado com sucesso!", { variant: 'success' });
        }).catch((error) => {
            if (error.response && error.response.data.includes('duplicado')) {
                enqueueSnackbar("Erro: Produto já existe no banco de dados", { variant: 'error' });
            } else {
                enqueueSnackbar("Erro ao adicionar Produto", { variant: 'error' });
            }
        });
    } else if (activeButton === 'Pedido') {
        Axios.post('https://opgranel.eurobraslogistica.com.br/api/pedido/criar', {
            operacao: navio,
            pedido: inputValue, 
            transportadora: transportadora,
            documento: doc
        }).then(() => {
            enqueueSnackbar("Pedido adicionado com sucesso!", { variant: 'success' });
        }).catch((error) => {
            if (error.response && error.response.data.includes('duplicado')) {
                enqueueSnackbar("Erro: Pedido já existe no banco de dados", { variant: 'error' });
            } else {
                enqueueSnackbar("Erro ao adicionar Pedido", { variant: 'error' });
            }
        });
    }

    setItems((prevItems) => ({
        ...prevItems,
        [activeButton]: [...prevItems[activeButton], inputValue],
    }));
    setInputValue('');
};


    const handleConsultador = (tabela) => {
      let url = '';
      switch (tabela) {
          case 'Transportadora':
              url = 'https://opgranel.eurobraslogistica.com.br/api/transportadora/consultar';
              break;
          case 'Importador':
              url = 'https://opgranel.eurobraslogistica.com.br/api/importador/consultar';
              break;
          case 'Destino':
              url = 'https://opgranel.eurobraslogistica.com.br/api/destino/consultar';
              break;
          case 'NCM':
              url = 'https://opgranel.eurobraslogistica.com.br/api/ncm/consultar';
              break;
          case 'Produto':
              url = 'https://opgranel.eurobraslogistica.com.br/api/produto/consultar';
              break;
              case 'Pedido':
                url = 'https://opgranel.eurobraslogistica.com.br/api/pedido/consultar';
                break;    
          default:
              return;
      }
  
          Axios.get(url)
    .then((response) => {
        setConsultaData(response.data); // Armazena os dados no estado
        enqueueSnackbar(`${tabela} consultado com sucesso!`, { variant: 'success' });
    })
    .catch((error) => {
        console.error(error);
        enqueueSnackbar(`Erro ao consultar ${tabela}`, { variant: 'error' });
    });
  };

    const renderTable = () => {
        if (consultaData.length === 0) {
            return null;
        }

        const headers = Object.keys(consultaData[0]);

        return (
            <table className={style.table}>
                <thead>
                    <tr>
                        {headers.map((header) => (
                            <th key={header}>{header}</th> // Cabeçalhos da tabela
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {consultaData.map((row, index) => (
                        <tr key={index}>
                            {headers.map((header) => (
                                <td key={header}>{row[header]}</td> // Células da tabela
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };
    
   
    return (
        <>
            <Navbar cargas />
            <Header />
            <Brackground />
            <Container>
                <div className={style.content}>
                    <div className={style.nav}>
                        <div className={style.active}>Cadastrar</div>
                    </div>
                    <div className={style.buttonGroup}>
                        {/* <button className={style.button} onClick={() => handleButtonClick('Pedido')}>Pedido</button> */}
                        <button className={style.button} onClick={() => handleButtonClick('Transportadora')}>Transportadora</button>
                        <button className={style.button} onClick={() => handleButtonClick('Importador')}>Importador</button>
                        <button className={style.button} onClick={() => handleButtonClick('Destino')}>Destino</button>
                        <button className={style.button} onClick={() => handleButtonClick('NCM')}>NCM</button>
                        <button className={style.button} onClick={() => handleButtonClick('Produto')}>Produto</button>
                    </div>

                    {activeButton && activeButton !== 'NCM' && activeButton !== 'Pedido' &&(
                        <div className={style.form}>
                            <h3>Cadastrar {activeButton}</h3>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={`Digite aqui (${activeButton})`}
                            />

                            {(activeButton === 'Transportadora' || activeButton === 'Importador') && (
                                <InputMask
                                    mask="99.999.999/9999-99"
                                    value={cnpjValue}
                                    onChange={(e) => setCnpjValue(e.target.value)}
                                    placeholder="Digite o CNPJ"
                                />
                            )}

                            {activeButton === 'Importador' && (
                                <input
                                    type="text"
                                    value={nomereduzido}
                                    onChange={(e) => setNomeReduzido(e.target.value)}
                                    placeholder="Digite o nome reduzido"
                                />
                            )}
                          
                        
                          
                            <button className={style.button} onClick={handleAddItem}>Adicionar {activeButton}</button>
                            <button className={style.button} onClick={() => handleConsultador(activeButton)}> Consultar</button>
                                    {renderTable()}
                            
                            <ul>
                                {items[activeButton].map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                      {activeButton === 'NCM' && (
                              <div className={style.form}>
                                  <h3>Cadastrar {activeButton}</h3>
                                  {/* Campo para o código do NCM */}
                                  <input
                                      type="text"
                                      value={ncmCode}
                                      onChange={(e) => setNcmCode(e.target.value)}
                                      placeholder="Digite o código NCM"
                                  />
                                  {/* Campo para a descrição do NCM */}
                                  <input
                                      type="text"
                                      value={ncmDescription}
                                      onChange={(e) => setNcmDescription(e.target.value)}
                                      placeholder="Descrição do NCM"
                                  />
                                  <button className={style.button} onClick={handleAddItem}>Adicionar NCM</button>
                                  <button className={style.button} onClick={() => handleConsultador(activeButton)}> Consultar </button>
                                    {renderTable()}
                              </div>
                          )}
                          
                          
                          {activeButton === "Pedido" && (
                            
                            <div className={style.form}>
                                <h3>Cadastrar {activeButton}</h3>
                                <div className={style.form_control}>
                                    {/* Campo para seleção do navio */}
                                    <select onChange={(e) => [getCargas(e.target.value), setNavio(e.target.value)]}>
                                        <option disabled selected>Selecione um navio (operação)</option>
                                        {operacoesList?.map((val) => {
                                            if (val.STATUS_OPERACAO === 'FECHADA') {
                                                return null;
                                            }
                                            return (
                                                <option value={val.COD_OPERACAO}>{val.NOME_NAVIO}</option>
                                            );
                                        })}
                                    </select>

                                    <label>Código da operação (DI ou BL):</label>
                                        <select onChange={(e) => { setDoc(e.target.value) }}>
                                        <option disabled selected>Selecione uma opção</option>
                                        {docs?.map((val) => {
                                            return (
                                            <option value={val.COD_CARGA}>{val.TIPO} - {val.NUMERO}</option>
                                            )
                                        })}
                                    </select>
                                    {/* Input para o número do pedido, habilitado somente após seleção do navio */}
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder="Digite o número do pedido"
                                        disabled={!navio} // Desativa o campo se o navio não estiver selecionado
                                    />

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
                                        <button 
            className={style.addButton} 
            onClick={() => (true)} // Abre o modal
        >
            +
        </button>

        {/* Modal
        {showModal && (
            <div className={style.modal}>
                <div className={style.modalContent}>
                    <h2>Adicionar Novo Item</h2>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Digite o nome do item"
                    />
                    <div className={style.modalActions}>
                        <button 
                            className={style.button} 
                            onClick={handleAddItem}
                        >
                            Salvar
                        </button>
                        <button 
                            className={style.button} 
                            onClick={() => setShowModal(false)} // Fecha o modal
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        )} */}
                                    {/* Mensagem para orientar o usuário a selecionar o navio primeiro */}
                                    {!navio && (
                                        <p style={{ color: 'red' }}>Selecione um navio antes de inserir o número do pedido</p>
                                    )}
                        
                                    <button
                                        className={style.button}
                                        onClick={handleAddItem}
                                        disabled={!navio || !inputValue} // Desativa o botão se o navio ou pedido não estiverem preenchidos
                                    >
                                        Adicionar Pedido
                                    </button>
                                    
                                    <button
                                        className={style.button}
                                        onClick={() => handleConsultador(activeButton)}
                                    >
                                        Consultar
                                    </button>
                                </div>
                                {renderTable()}
                            </div>
                        )}
                    
                          
                          
                </div>
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
            <CadastroInfo />
        </SnackbarProvider>
    );
}
