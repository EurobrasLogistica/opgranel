import React, { useEffect, useRef, useState } from "react";
import { SnackbarProvider, useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";

import { api } from "../../../api"; // <- usa baseURL do .env
import Navbar from "../../../components/Navbar";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";

import style from "./EmAndamento.module.css";
import modal from "./Modal.module.css"; // (se não usar, pode remover)

const EmAndamento = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [operacoesList, setOperacoesList] = useState([]);
  const [loading, setLoading] = useState(false);

  // para cancelar fetches
  const opsAbortRef = useRef(null);

  const showAlert = (txt, variant) => enqueueSnackbar(txt, { variant });

  const getOperacoes = async () => {
    // cancela anterior (se houver)
    if (opsAbortRef.current) {
      try { opsAbortRef.current.abort(); } catch {}
    }
    const controller = new AbortController();
    opsAbortRef.current = controller;

    try {
      setLoading(true);
      const res = await api.get("/operacao", {
        params: { pageSize: 200, t: Date.now() },
        headers: { "Cache-Control": "no-store" },
        signal: controller.signal,
      });

      const lista = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setOperacoesList(lista);
    } catch (e) {
      if (e?.name !== "CanceledError" && e?.name !== "AbortError") {
        console.error("[getOperacoes][ERR]", e);
        showAlert("Erro ao carregar operações.", "error");
      }
    } finally {
      if (opsAbortRef.current === controller) opsAbortRef.current = null;
      setLoading(false);
    }
  };

  useEffect(() => {
    getOperacoes();
    return () => {
      try { opsAbortRef.current?.abort(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirDash = (id, status) => {
    const st = String(status || "").toUpperCase();

    if (st === "AGUARDANDO DI/BL") {
      showAlert("Documentação deve ser concluída antes de acessar o Dashboard.", "warning");
      return;
    }
    if (st === "AGUARDANDO ATRACAÇÃO") {
      showAlert("Um usuário autorizado deve registrar a atracação.", "info");
      return;
    }
    if (st === "OPERANDO" || st === "PARALISADO") {
      navigate(`/operacao/${id}`);
      return;
    }

    // fallback: status inesperado
    showAlert(`Status "${status || "-"}" não permite abrir o Dashboard.`, "info");
  };

  return (
    <>
      <Navbar operacao />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          <div className={style.nav}>
            <div className={style.active}>Operações</div>
            <div
              className={style.refresh}
              onClick={getOperacoes}
              title="Atualizar lista"
              style={{ cursor: "pointer", marginLeft: "auto" }}
            >
              ↻ Atualizar
            </div>
          </div>

          <div className={style.table}>
            <div className={style.sumario}>
              <div>NAVIO</div>
              <div>BERÇO</div>
              <div>RAP</div>
              <div>STATUS</div>
            </div>

            {loading && (
              <div className={style.table_item} style={{ opacity: 0.7 }}>
                Carregando operações…
              </div>
            )}

            {!loading && operacoesList.length === 0 && (
              <div className={style.table_item} style={{ opacity: 0.7 }}>
                Nenhuma operação encontrada.
              </div>
            )}

            {!loading &&
              operacoesList.map((val) => {
                const key = val.COD_OPERACAO ?? `${val.NOME_NAVIO}-${val.NOME_BERCO}-${val.RAP}`;
                const status = val.STATUS_OPERACAO || "-";
                const clicavel = ["OPERANDO", "PARALISADO"].includes(String(status).toUpperCase());

                return (
                  <div
                    key={key}
                    className={style.table_item}
                    onClick={() => abrirDash(val.COD_OPERACAO, status)}
                    style={{ cursor: clicavel ? "pointer" : "default" }}
                    title={clicavel ? "Abrir dashboard" : ""}
                  >
                    <div>{val.NOME_NAVIO || "-"}</div>
                    <div>{val.NOME_BERCO || "-"}</div>
                    <div>{val.RAP || "-"}</div>
                    <div>{status}</div>
                  </div>
                );
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
      autoHideDuration={3000}
    >
      <EmAndamento />
    </SnackbarProvider>
  );
}
