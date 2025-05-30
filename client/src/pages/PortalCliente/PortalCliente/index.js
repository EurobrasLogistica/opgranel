import React, { useEffect } from "react";
import { useState } from "react";
import Axios from 'axios';
import Navbar from "../../../components/Navbar";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import SubmitButton from "../../../components/Button";
import moment from "moment";
import Input from "../../../components/Input";
import style from "./portalCliente.module.css";
import { SnackbarProvider, useSnackbar } from 'notistack';
import { useNavigate, useParams } from "react-router-dom";



const PortalCliente = () => {

 useEffect(() => {
    getOp();
  }, [])

  const navigate = useNavigate();


  

 
  const getOp = () => {
    Axios.get('http://opgranel.rodrimar.com.br:8080/relatorios/operacoes').then((response) => {
      setNaviosList(response.data)
    });
  }


 const getPeriodo = (id) => {
  Axios.get(`http://opgranel.rodrimar.com.br:8080/periodos/gerais/${id}`).then((response) => {
    setPeriodo(response.data)
  });
 }

 
  const DetalhesNavio = (id, status, nome) => {
         navigate(`/portalCliente/relatorio/${id}`)


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
      <Navbar relatorios/>
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


            {naviosList.filter(val => val.STATUS_OPERACAO !== 'FECHADA').map((val, key) => {
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
})}

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
            autoHideDuration={2500}>
            <PortalCliente />
        </SnackbarProvider>
    );
}

