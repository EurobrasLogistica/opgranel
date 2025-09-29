import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SnackbarProvider } from "notistack";

import { api } from "../../../api"; // usa baseURL do .env
import Navbar from "../../../components/Navbar";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import GraficoPercent from "../../../components/GraficoPercent";

import style from "./GraficoDocs.module.css";

const GraficoDocs = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [list, setList] = useState([]);

  useEffect(() => {
    if (!id) return;
    getDados(id);
  }, [id]);

  const getDados = async (opId) => {
    try {
      const { data } = await api.get(`/grafico/${opId}`);
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[grafico/:id][ERR]", err);
      setList([]);
    }
  };

  return (
    <>
      <Navbar operacao />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          {/* INICIO - Barra de Navegacao */}
          <div className={style.nav}>
            <div onClick={() => navigate(`/operacoes`)}>Operações</div>
            <div onClick={() => navigate(`/operacao/${id}`)}>Dashboard Período</div>
            <div onClick={() => navigate(`/operacao/pesagemfinal/${id}`)}>Pesagem Final</div>
            <div className={style.active}>DI / BL</div>
            {/* <div onClick={() => navigate(`/operacao/PercentualPorao/${id}`)}>Porão</div> */}
            <div onClick={() => navigate(`/operacao/${id}/AberturaPeriodo`)}>Abertura de Período</div>
          </div>
          {/* FIM - Barra de Navegacao */}

          <div className={style.gftitle}>Quantidade descarregada por (DI/BL)</div>
          <GraficoPercent docs={list} />
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
      <GraficoDocs />
    </SnackbarProvider>
  );
}
