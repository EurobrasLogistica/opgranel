import { SnackbarProvider, useSnackbar } from 'notistack';
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Axios from "axios";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import Input from "../../../components/Input";
import Navbar from "../../../components/Navbar";
import React from "react";
import Select from "../../../components/select";
import SubmitButton from "../../../components/Button";
import moment from "moment";
import style from "./RelatorioPeriodo.module.css"
import { useStepContext } from "@mui/material";
import * as XLSX from 'xlsx';


const RelatorioPeriodo = () => {

    useEffect(() => {
        getEquipamentos();
        getPeriodos();
        getBercos();
        VerificaPeriodo();
        getOp()
        getPeriodo()
    }, [])


    const { id } = useParams();
    const [navioslist, setNaviosList] = useState([])
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
    const [equipamentos, setEquipamentos] = useState([]);
    const [periodos, setPeriodos] = useState('');
    const [autos, setAutos] = useState([]);
    const [documentos, setDocumentos] = useState([]);
    const [bercos, setBercos] = useState([])
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);
    const [buttonText, setButtonText] = useState('Cadastrar');
    const navigate = useNavigate();

    const getOp = () => {
        Axios.get('https://opgranel.eurobraslogistica.com.br/api/relatorios/operacoes').then((response) => {
            setNaviosList(response.data)
        });
    }

    const getDate = () => {
        const date = new Date()
        date.setHours(date.getHours() - 3)
        return (date.toISOString().slice(0, 19).replace('T', ' '))
    }

    const getEquipamentos = () => {
        Axios.get('https://opgranel.eurobraslogistica.com.br/api/equipamentos').then((response) => {
            setEquipamentos(response.data)
        });
    }

    const getPeriodos = () => {
        Axios.get('https://opgranel.eurobraslogistica.com.br/api/periodos/horarios').then((response) => {
            setPeriodos(response.data)
        });
    }
    const exportToExcel  = (tableData) => {
     
        const workbook = XLSX.utils.book_new();
   
            const wsData = tableData.map(val => [
                val.ID_CARREGAMENTO, 
                val.NOME_MOTORISTA,
                val.PLACA_CAVALO,
                (val.PESO_TARA).toLocaleString(undefined, {maximumFractionDigits: 2,}),
                (val.PESO_CARREGADO).toLocaleString(undefined, {maximumFractionDigits: 2,}),
                (val.PESO_BRUTO).toLocaleString(undefined, {maximumFractionDigits: 2,}),
                (val.PESO_LIQUIDO).toLocaleString(undefined, {maximumFractionDigits: 2,}),
                val.DOCUMENTO,
                (val.DIFERENCA).toLocaleString(undefined, {maximumFractionDigits: 2,}),
                val.PERCENTUAL
            ])
            
            wsData.unshift(['ID' ,'Nome', 'Placa (Cavalo)', '1° Peso (Tara)', '2° Peso (Moega)', '3° Peso (Bruto)', 'Peso Liquido', 'DI/BL', '(Liquido - Moega)', '(%)' ]) 
        
    
        const worksheet = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatorio_Periodo');
        XLSX.writeFile(workbook, `relatorio_periodo.xlsx`);

    };

    const handleExportClick = () => {
        exportToExcel(operacoes);
    };

    const getBercos = () => {
        Axios.get('https://opgranel.eurobraslogistica.com.br/api/bercos').then((response) => {
            setBercos(response.data);
        });
    }

    const { enqueueSnackbar } = useSnackbar();

    const showAlert = (txt, variant) => {
        enqueueSnackbar(txt, { variant: variant });
    }

    const VerificaPeriodo = () => {
        Axios.get(`https://opgranel.eurobraslogistica.com.br/api/periodo/busca/${id}`,)
            .then(function (res) {
                setExistePeriodo(res.data[0].EXISTE)
            })
    }

    const getOperacoes = () => {
        getAutos()
        getDocumentos()
        console.log(autos)
        console.log(documentos)
        Axios.post(`https://opgranel.eurobraslogistica.com.br/api/periodo/carregamentos/${id}`, {
            data: relatorios,
            id: i.ID_CARREGAMENTO
        }).then((response) => {
            console.log(response.data);
            setOperacoes(response.data);
        });
    }

    const getAutos = () => {
        Axios.post(`https://opgranel.eurobraslogistica.com.br/api/periodo/autos/${id}`, {
            data: relatorios
        }).then((response) => {
            console.log(response.data);
            setAutos(response.data);
        });
    }

    const getDocumentos = () => {
        Axios.post(`https://opgranel.eurobraslogistica.com.br/api/periodo/documentos/${id}`, {
            data: relatorios
        }).then((response) => {
            console.log(response.data);
            setDocumentos(response.data);
        });
    }

    const addPeriodo = async () => {
        await Axios.post('https://opgranel.eurobraslogistica.com.br/api/periodo/criar', {
            operacao: id,
            periodo: periodo,
            inicio: inicio,
            berco: berco,
            qtbordo: qtbordo,
            qtterra: qtterra,
            porao: porao,
            moega: equipamento,
            conexo: conexo,
            requisicao: requisicao,
            gerador: gerador,
            grab: grab,
            usuario: usuario,
            dtcadastro: getDate()
        })
        .then(function (res) {
            console.log(res);
            res.data.sqlMessage ?
                showAlert(res.data.sqlMessage, 'error') :
                showAlert('Nova Operação cadastrada com sucesso', 'success');
            setTimeout(() => {
                navigate(`/operacao/${id}`)
            }, 2000);
        })
    }

    const validaDados = async () => {
        if (!grab | !periodo | !qtterra | !berco | !gerador | !equipamento | !qtbordo | !porao | !inicio) {
            showAlert('Preencha todos os campos!', 'error')
            return;
        }

        //addPeriodo() 
        setButtonText('Aguarde...');
        setIsButtonDisabled(true);

        try {
            await addPeriodo();
        } catch (error) {
            console.log(error);
            showAlert('Ocorreu um erro ao cadastrar a nova operação', 'error');
        } finally {
            setButtonText('Enviar');
            setIsButtonDisabled(false);
        }
    }

    useEffect(() => {
        DadosDashboard();
        getVeiculos();
        VerificaParalisacao();

    }, [])

    const [busca, setBusca] = useState("");

    const [existeParalisacao, setExisteParalisacao] = useState(0);
    const [dadosDash, setDadosDash] = useState([]);
    const [veiculos, setVeiculos] = useState([]);
    const [paralisacoes, setParalisacoes] = useState([]);
    const [descarregado, setDescarregado] = useState([]);
    const [relatorios, setRelatorios] = useState([]);

    const [i, setI] = useState({});
    const [peso2, setPeso2] = useState("");
    const [data, setData] = useState("");
    const [obsPesagem, setObsPesagem] = useState("");

    const [pesobruto, setPesoBruto] = useState("");
    const [databruto, setDataBruto] = useState("");

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

    const divClick = () => {
        setMostaInput(true);
    };

    const getPeriodo = () => {
        Axios.get(`https://opgranel.eurobraslogistica.com.br/api/periodos/gerais/${id}`).then((response) => {
            setPeriodo(response.data)
        });
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

    const downloadNota = async (idCarregamento) => {
        const data = {
            idCarregamento: idCarregamento
        };

        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `https://opgranel.eurobraslogistica.com.br/api/baixarnota`,
            headers: { 
              'Content-Type': 'application/json; charset=utf-8',
            },
            data: data
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

    return (
        <>
            <Navbar relatorios />
            <Header />
            <Brackground />
            <Container>


                <div className={style.content}>
                    <div className={style.nav}>
                        <div onClick={() => navigate(`/relatorios`)}>
                            Selecione um navio
                        </div>
                        <div className={style.active}>
                            Relatório por Período
                        </div>
                        <div onClick={() => navigate(`/relatorios/operacao/${id}`)}>
                        Relatório por Operação
                        </div>
                    </div>

                    <div className={style.flex}>

                        <div>

                            <div className={style.form_control}>
                                <label>Selecione um período:</label>
                                <select onChange={(e) => { setRelatorios(e.target.value) }}>
                                    <option disabled selected>Selecione uma opção</option>
                                    {periodo?.map((val) => {
                                        return (
                                            <option value={[val.PERIODO]}>{val.PERIODO}</option>
                                            
                                        )
                                    })}
                                </select>

                                <div className={style.submit_button}>
                                    <SubmitButton text={'Buscar'}
                                        onClick={getOperacoes} />
                                </div>
                                <div className={style.periodo}>

                                    <div className={style.data}>
                                        {relatorios}
                                    </div>

                                </div>

                            </div>
                        </div>

                        <div className={style.cards}>
                            <span className={style.cardinfo}>
                                <div className={style.box}>
                                    <div className="content">
                                        <center><i className="fa fa-truck icon"></i>  Carregados</center>
                                        {autos.map((val)=>{
                                            return(
                                                <div className={style.total}>
                                                {val.QTDE_AUTOS} Autos
                                             </div>
                                            )
                                        })}
                                        </div>
                                    
                                </div>
                            </span>

                            
                            <span className={style.cardinfo}>
                                <div className={style.box}>
                                        <div className="content">
                                        <center><i className="fa fa-weight-hanging icon"></i>  Peso Líquido</center>
                                            {autos.map((val)=>{
                                            return(
                                            <div className={style.total}>
                                               {(val.PESO_LIQUIDO / 1000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 3,})} Tons
                                            </div>
                                            )
                                        })}
                                        </div>
                                </div>
                            </span>

                            <span className={style.cardinfo_Doc}>
                                <div className={style.box}>
                                        <div className="content">
                                        <center><i className="fa fa-file-text icon"></i>  Total de Peso por DI / BL</center> 
                                            {documentos.map((val)=>{
                                            return(
                                            
                                                <tr>
                                        <th>{val.DOC_CARGA}</th>|
                                        <th>{(val.PESO_LIQUIDO_CARGA / 1000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 3,})} Tons</th>|<th>{val.QTDE_AUTOS_CARGA} Autos</th>
                                        </tr>
                                            
                                            )
                                        })}
                                        </div>
                                </div>
                            </span>

                        </div>

                    </div>
                      <div className={style.seacrch}>
                        <div className={style.taratitulo}>
                            <input placeholder="Pesquisar..." type="text" onChange={(e) => { setBusca(e.target.value) }} />
                            <i className="fa fa-search"></i>
                        </div>
                    </div>

                   
                  <table className="table" >

                        <thead>
                            <tr>
                                <th><abbr title="Id">ID </abbr></th>
                                <th><abbr title="Nome">Nome </abbr></th>
                                <th><abbr title="Placa do Cavalo">Placa (Cavalo)</abbr></th>
                                <th><abbr title="Tara">1° Peso (Tara)</abbr></th>
                                <th><abbr title="SegundoPeso">2° Peso (Moega)</abbr></th>
                                <th><abbr title="TerceiroPeso">3° Peso (Bruto)</abbr></th>  
                                <th><abbr title="PesoLiquido">Peso Liquido </abbr></th>
                                <th><abbr title="Documento">DI/BL </abbr></th>
                                <th><abbr title="Diferenca">(Liquido - Moega)</abbr></th>
                                <th><abbr title="DiferencaPerc">(%)</abbr></th>
                                <th><abbr title="Nota">Nota Fiscal</abbr></th>
                            </tr>
                        </thead>
 
                        <tbody>
                            {operacoes.filter((val) => {
                                if (busca == "") {
                                    return val
                                } else if (
                                 String(val.ID_CARREGAMENTO).toLowerCase().includes(busca.toLowerCase()) ||
                                 val.NOME_MOTORISTA.toLowerCase().includes(busca.toLowerCase()) ||
                                 val.PLACA_CAVALO.toLowerCase().includes(busca.toLowerCase()) ||
                                 String(val.PESO_TARA).toLowerCase().includes(busca.toLowerCase()) ||
                                 String(val.PESO_CARREGADO).toLowerCase().includes(busca.toLowerCase()) ||
                                 String(val.PESO_BRUTO).toLowerCase().includes(busca.toLowerCase()) ||
                                 String(val.PESO_LIQUIDO).toLowerCase().includes(busca.toLowerCase()) ||
                                 String(val.DOCUMENTO).toLowerCase().includes(busca.toLowerCase()) ||
                                 String(val.DIFERENCA).toLowerCase().includes(busca.toLowerCase()) ||
                                 String(val.PERCENTUAL).toLowerCase().includes(busca.toLowerCase()) 
                                
                                  ) {
                                    return val
                                }
                             }).map((val) => {
                                return (
                                    <tr>
                                        <th>{val.ID_CARREGAMENTO}</th>
                                        <th>{val.NOME_MOTORISTA}</th>
                                        <th>{val.PLACA_CAVALO}</th>
                                        <th>{(val.PESO_TARA).toLocaleString(undefined, {maximumFractionDigits: 2,})}</th>
                                        <th>{(val.PESO_CARREGADO).toLocaleString(undefined, {maximumFractionDigits: 2,})} </th>
                                        <th>{(val.PESO_BRUTO).toLocaleString(undefined, {maximumFractionDigits: 2,})}</th>
                                        <th>{(val.PESO_LIQUIDO).toLocaleString(undefined, {maximumFractionDigits: 2,})}</th>
                                        <th>{val.DOCUMENTO}</th>
                                        <th>{(val.DIFERENCA).toLocaleString(undefined, {maximumFractionDigits: 2,})} kg</th>
                                        <th>{val.PERCENTUAL} %</th>
                                       
                                        <th className={[4, 6].includes(val.STATUS_NOTA_MIC) ? style.nota_download : style.nota_download_empty}>
                                            <i 
                                                onClick={() => [ [4, 6].includes(val.STATUS_NOTA_MIC) ? downloadNota(val.ID_CARREGAMENTO) : undefined ]} 
                                                style={[4, 6].includes(val.STATUS_NOTA_MIC) ? {"color": "auto"} : {"color": "#bcbcbc"}}
                                                className="fa fa-file-pdf icon"
                                            />
                                        </th>
                                    </tr>
                                )
                            })}
                            
                    
                        {operacoes.filter((val) => {
 }).map((val) => {
                                return (
                                    <tr>
                                        <th>{val.ID_CARREGAMENTO}</th>
                                        <th>{val.NOME_MOTORISTA}</th>
                                        <th>{val.PLACA_CAVALO}</th>
                                        <th>{(val.PESO_TARA).toLocaleString(undefined, {maximumFractionDigits: 2,})}</th>
                                        <th>{(val.PESO_CARREGADO).toLocaleString(undefined, {maximumFractionDigits: 2,})} </th>
                                        <th>{(val.PESO_BRUTO).toLocaleString(undefined, {maximumFractionDigits: 2,})}</th>
                                        <th>{(val.PESO_LIQUIDO).toLocaleString(undefined, {maximumFractionDigits: 2,})}</th>
                                        <th>{val.DOCUMENTO}</th>
                                        <th>{val.DIFERENCA} kg</th>
                                        <th>{val.PERCENTUAL} %</th>
                                       
                                    </tr>
                                )
                            })}
                                <div>
                            <SubmitButton text={'Exportar para Excel'} onClick={handleExportClick}/>
                        </div>


                        </tbody>

                    </table>
                </div>
                <center><div className={style.navio}><i className="fa fa-ship icon"></i>&nbsp;&nbsp;&nbsp;{dadosDash.NOME_NAVIO || "--"}</div>
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
            autoHideDuration={2500}>
            <RelatorioPeriodo />
        </SnackbarProvider >
    );
}