import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SnackbarProvider, useSnackbar } from "notistack";

import { api } from "../../api"; // usa baseURL do .env
import Navbar from "../../components/Navbar";
import Brackground from "../../components/Background";
import Container from "../../components/Container";
import Header from "../../components/Header";

import style from "./Relatorios.module.css";
import moment from "moment";

const Relatorios = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [naviosList, setNaviosList] = useState([]);
  const [loading, setLoading] = useState(true);

  const showAlert = (txt, variant) => enqueueSnackbar(txt, { variant });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/relatorios/operacoes");
        setNaviosList(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("[relatorios/operacoes][ERR]", err);
        showAlert("Erro ao carregar operações para relatórios.", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const goDetalhes = (codOperacao) => {
    // navega para a página de relatórios da operação
    navigate(`/relatorios/${codOperacao}`);
  };

  const fmtDate = (d) => {
    if (!d) return "-";
    const m = moment(d);
    return m.isValid() ? m.format("DD/MM/YYYY") : "-";
    // se quiser mostrar horário: m.format("DD/MM/YYYY HH:mm")
  };

  return (
    <>
      <Navbar relatorios />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          <div className={style.nav}>
            <div className={style.active}>Selecione um navio</div>
          </div>

          <div className={style.table}>
            <div className={style.sumario}>
              <div>Navio</div>
              <div>IMO</div>
              <div>RAP</div>
              <div>Data de atracação</div>
              <div>Bandeira</div>
            </div>

            {loading && (
              <div className={style.table_item} style={{ opacity: 0.7 }}>
                Carregando...
              </div>
            )}

            {!loading && naviosList.length === 0 && (
              <div className={style.table_item} style={{ opacity: 0.7 }}>
                Nenhuma operação encontrada.
              </div>
            )}

            {!loading &&
              naviosList.map((val) => (
                <div
                  key={val.COD_OPERACAO}
                  className={style.table_item}
                  onClick={() => goDetalhes(val.COD_OPERACAO)}
                >
                  <div className={style.detalheNavio}>{val.NOME_NAVIO || "-"}</div>
                  <div className={style.detalheNavio}>{val.IMO_NAVIO || "-"}</div>
                  <div className={style.detalheNavio}>{val.RAP || "-"}</div>
                  <div className={style.detalheNavio}>{fmtDate(val.ATRACACAO)}</div>
                  <div className={style.detalheNavio}>{val.BANDEIRA || "-"}</div>
                </div>
              ))}
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
      autoHideDuration={3500}
    >
      <Relatorios />
    </SnackbarProvider>
  );
}
