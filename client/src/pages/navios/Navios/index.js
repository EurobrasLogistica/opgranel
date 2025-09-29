import React from "react";
import { useEffect, useState } from 'react';
import Axios from 'axios';
import Navbar from "../../../components/Navbar";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import Detalhes from '@mui/material/Dialog';
import { useNavigate } from "react-router-dom";
import SubmitButton from "../../../components/Button";
import Input from "../../../components/Input";
import Select from "../../../components/select";
import style from "./Navios.module.css";
import modal from "./Modal.module.css";
import { SnackbarProvider, useSnackbar } from 'notistack';
import GerarNfe from "../../../components/GerarNfe";

// === Base da API: localhost em dev, produção no build ===
const API_BASE =
  process.env.REACT_APP_SERVER ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:3009'
    : 'https://opgranel.eurobraslogistica.com.br/api');

// (opcional) definir baseURL global do Axios
Axios.defaults.baseURL = API_BASE;

const Navios = () => {
  const navigate = useNavigate();

  const [naviosList, setNaviosList] = useState([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    getNavios();
  }, []);

  const getNavios = () => {
    Axios.get('/navio')
      .then((response) => setNaviosList(response.data))
      .catch((err) => console.error('Falha ao buscar navios:', err?.message || err));
  };

  const [openA, setOpenA] = useState(false);
  const DetalhesNavio = () => setOpenA(true);
  const FecharDetalhesNavio = () => setOpenA(false);

  const DetalharNavio = (index) => {
    setI(naviosList[index]);
  };

  const { enqueueSnackbar } = useSnackbar();
  const showAlert = (txt, variant) => {
    enqueueSnackbar(txt, { variant });
  };

  const validaOp = () => {
    if (i.STATUS === 'OPERANDO') {
      return showAlert('Navio ja está em operação !', 'error');
    }
    return navigate(`/operacao/cadastro/${i.NOME_NAVIO}/${i.COD_NAVIO}`);
  };

  return (
    <>
      <Navbar navs />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          <div className={style.nav}>
            <div className={style.active}>
              Navios
            </div>
            <div onClick={() => navigate("/navios/cadastro")}>
              Cadastrar Navio
            </div>
          </div>

          <div className={style.table}>
            <div className={style.sumario}>
              <div>NOME</div>
              <div>IMO/LLOYD</div>
              <div>BANDEIRA</div>
              <div>STATUS</div>
            </div>

            {naviosList.map((val, key) => {
              return (
                <div
                  key={val.COD_NAVIO ?? key}
                  className={style.table_item}
                  onClick={() => { DetalhesNavio(); DetalharNavio(key); }}
                >
                  <div>{val.NOME_NAVIO || "-"}</div>
                  <div>{val.IMO_NAVIO || "-"}</div>
                  <div>{val.BANDEIRA || "-"}</div>
                  <div>{val.STATUS || "-"}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>

      <Detalhes open={openA} onClose={FecharDetalhesNavio} fullWidth>
        <div className={modal.modal}>
          <div className={modal.nav}>
            <div onClick={FecharDetalhesNavio}>Voltar</div>
            <div className={modal.active}>Detalhes do Navio </div>
          </div>

          <div className={modal.center}>
            <div className={modal.status}>
              <i className="fa fa-ship icon"></i>&nbsp;&nbsp;{i.STATUS || "-"}
            </div>
          </div>
          <div className={modal.flex}>
            <div className={modal.detalhebox}>
              <div><b>Nome:</b> {i.NOME_NAVIO || "-"}</div>
            </div>
            <div className={modal.detalhebox}>
              <div><b>IMO:</b> {i.IMO_NAVIO || "-"}</div>
            </div>
            <div className={modal.detalhebox}>
              <div><b>Bandeira:</b> {i.BANDEIRA || "-"}</div>
            </div>
          </div>
          <div className={modal.flex}>
            <button className={modal.finalizar} onClick={validaOp}>
              INICIAR OPERAÇÃO
            </button>
          </div>
        </div>
      </Detalhes>
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
      <Navios />
    </SnackbarProvider>
  );
}
