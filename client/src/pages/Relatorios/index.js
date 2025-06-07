import React, { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import Brackground from "../../components/Background";
import Container from "../../components/Container";
import Header from "../../components/Header";
import Axios from "axios";
import GraficoPercent from "../../components/GraficoPercent";
import style from "./Relatorios.module.css";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import Periodo from '@mui/material/Dialog';
import { SnackbarProvider, useSnackbar } from 'notistack';



const Relatorios = () => {

  useEffect(() => {
    getOp();
  }, [])

  const navigate = useNavigate();


  

  const getOp = () => {
    Axios.get('https://opgranel.eurobraslogistica.com.br/api/relatorios/operacoes').then((response) => {
      setNaviosList(response.data)
    });
  }

 const getPeriodo = (id) => {
  Axios.get(`https://opgranel.eurobraslogistica.com.br/api/periodos/gerais/${id}`).then((response) => {
    setPeriodo(response.data)
  });
 }

 
 const selecionarPeriodo = () => {
  console.log(relatorios);
    navigate(`/relatorioperiodo/${relatorios}`)
 } 
  

  
 
  
  const DetalhesNavio = (id, status, nome) => {
         navigate(`/relatorios/${id}`)


      setList(nome)
  

  };

  const { enqueueSnackbar } = useSnackbar();
  const showAlert = (txt, variant) => {
    enqueueSnackbar(txt, { variant: variant });
  }


  const AbrirPesagem = () => {

  }


  const [openA, setOpenA] = useState(false);
  
 
    const FecharDetalhesNavio = () => {
    setOpenA(false);
  };


  const [operacoeslist, setOperacoesList] = useState([]);
  const [naviosList, setNaviosList] = useState([]);
  const [veiculos, setVeiculos] = useState([])
  const [i, setI] = useState([])
  const [busca, setBusca] = useState([])
  const [list, setList] = useState([])
  const [navios, setNavios] = useState([])
  const [periodo, setPeriodo] = useState([])
  const [relatorios, setRelatorios] = useState([])

  return (
    <>
      <Navbar relatorios />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          <div className={style.nav}>
            <div className={style.active}>
            Selecione um navio
            </div>
          </div>

        
            <div className={style.table}>

            <div className={style.sumario}>
              <div>Navio</div>
              <div>Imo</div>
              <div>RAP</div>
              <div>Data de atracação</div>
              <div>Bandeira</div>
            </div>


            {naviosList.map((val, key) => {
              return (
                <div className={style.table_item}
                  onClick={() => [DetalhesNavio(val.COD_OPERACAO, val.STATUS_OPERACAO, val.NOME_NAVIO), getPeriodo(val.COD_OPERACAO)]}>
                  <div className={style.detalheNavio}>{val.NOME_NAVIO || "-"}</div>
                  <div className={style.detalheNavio}>{val.IMO_NAVIO || "-"}</div>
                  <div className={style.detalheNavio}>{val.RAP || "-"}</div>
                  <div className={style.detalheNavio}>{moment(val.ATRACACAO).format("DD/MM/YYYY") || "-"}</div>
                  <div className={style.detalheNavio}>{val.BANDEIRA || "-"}</div>
                </div>
              )
            })

            
            }

          </div>



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
      autoHideDuration={3500}>
      <Relatorios/>
    </SnackbarProvider >
  );
}
