import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Dialog from "@mui/material/Dialog";
import { SnackbarProvider, useSnackbar } from "notistack";

import { api } from "../../../api"; // baseURL vem do .env
import Navbar from "../../../components/Navbar";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import Input from "../../../components/Input";

import style from "./Cargas.module.css";
import modal from "./Modal.module.css";
import confirm from "./Confirm.module.css";

const Cargas = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [operacoesList, setOperacoesList] = useState([]);
  const [loadingOps, setLoadingOps] = useState(false);

  const [cargas, setCargas] = useState([]);
  const [loadingCargas, setLoadingCargas] = useState(false);

  const [selecionada, setSelecionada] = useState(null); // operação selecionada
  const [date, setDate] = useState("");

  const [openDetalhes, setOpenDetalhes] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);

  // controllers para cancelar requisições em curso
  const opsAbortRef = useRef(null);
  const cargasAbortRef = useRef(null);

  const showAlert = (txt, variant) => enqueueSnackbar(txt, { variant });

  // ===== Carrega operações (com abort + cache-busting) =====
  const getOperacoes = async () => {
    // cancela requisição anterior se existir
    if (opsAbortRef.current) {
      try { opsAbortRef.current.abort(); } catch {}
    }
    const controller = new AbortController();
    opsAbortRef.current = controller;

    try {
      setLoadingOps(true);
      const res = await api.get("/operacao", {
        params: { pageSize: 200, t: Date.now() }, // cache-busting
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
      setLoadingOps(false);
    }
  };

  useEffect(() => {
    getOperacoes();
    // cleanup ao desmontar
    return () => {
      try { opsAbortRef.current?.abort(); } catch {}
      try { cargasAbortRef.current?.abort(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Carrega cargas por operação (com abort + cache-busting) =====
  const getCargas = async (idOperacao) => {
    const id = Number(idOperacao);
    if (!Number.isFinite(id) || id <= 0) {
      showAlert("Operação inválida.", "error");
      return;
    }

    if (cargasAbortRef.current) {
      try { cargasAbortRef.current.abort(); } catch {}
    }
    const controller = new AbortController();
    cargasAbortRef.current = controller;

    try {
      setLoadingCargas(true);
      const { data } = await api.get(`/carga/busca/${id}`, {
        signal: controller.signal,
        params: { t: Date.now() }, // cache-busting
      });

      const rows = Array.isArray(data) ? data : [];
      rows.sort((a, b) => (b?.COD_CARGA ?? 0) - (a?.COD_CARGA ?? 0));
      setCargas(rows);

      if (rows.length === 0) {
        showAlert("Nenhuma carga encontrada para esta operação.", "info");
      }
    } catch (err) {
      if (err?.name !== "CanceledError" && err?.name !== "AbortError") {
        console.error("[getCargas][ERR]", err);
        showAlert(err?.response?.data?.message || "Erro ao carregar cargas.", "error");
      }
    } finally {
      if (cargasAbortRef.current === controller) cargasAbortRef.current = null;
      setLoadingCargas(false);
    }
  };

  // ===== Ações UI =====
  const abrirDetalhes = async (opItem) => {
    if (loadingCargas) return;
    setSelecionada(opItem || null);
    setOpenDetalhes(true);
    if (opItem?.COD_OPERACAO) {
      await getCargas(opItem.COD_OPERACAO);
    }
  };

  const fecharDetalhes = () => setOpenDetalhes(false);

  const abrirConfirm = () => {
    setOpenDetalhes(false);
    setOpenConfirm(true);
  };

  const fecharConfirm = () => setOpenConfirm(false);

// opcional no topo do componente:
// const [registrando, setRegistrando] = useState(false);

const registrarAtracacao = async () => {
  const opId = Number(selecionada?.COD_OPERACAO);

  if (!opId) {
    showAlert("Operação inválida.", "error");
    return;
  }
  if (!date) {
    showAlert("Preencha a data e horário!", "error");
    return;
  }
  // evita duplo clique
  // if (registrando) return;

  try {
    // setRegistrando(true);
    const res = await api.put(
      "/operacao/registrar/atracacao",
      { id: opId, date },
      { headers: { "Cache-Control": "no-store" }, params: { t: Date.now() } }
    );

    if (res?.status !== 200 || res?.data?.ok === false || res?.data?.sqlMessage) {
      showAlert(res?.data?.message || res?.data?.sqlMessage || "Erro ao registrar atracação.", "error");
      return;
    }

    showAlert("Atracação registrada com sucesso!", "success");
    fecharConfirm();
    setDate("");
    await getOperacoes(); // recarrega lista de operações
  } catch (err) {
    console.error("[registrarAtracacao][ERR]", err);
    showAlert(err?.response?.data?.message || "Erro ao registrar atracação.", "error");
  } finally {
    // setRegistrando(false);
  }
};


  return (
    <>
      <Navbar cargas />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          <div className={style.nav}>
            <div className={style.active}>Selecione a operação</div>
          </div>

          <div className={style.table}>
            <div className={style.sumario}>
              <div>NAVIO</div>
              <div>BERÇO</div>
              <div>STATUS</div>
            </div>

            {loadingOps && (
              <div className={style.table_item} style={{ opacity: 0.7 }}>
                Carregando operações…
              </div>
            )}

            {!loadingOps && operacoesList.length === 0 && (
              <div className={style.table_item} style={{ opacity: 0.7 }}>
                Nenhuma operação encontrada.
              </div>
            )}

            {!loadingOps &&
              operacoesList.map((val) => (
                <div
                  key={val.COD_OPERACAO}
                  className={style.table_item}
                  onClick={() => abrirDetalhes(val)}
                >
                  <div>{val.NOME_NAVIO || "-"}</div>
                  <div>{val.NOME_BERCO || "-"}</div>
                  <div>{val.STATUS_OPERACAO || "-"}</div>
                </div>
              ))}
          </div>
        </div>
      </Container>

      {/* Detalhes */}
      <Dialog open={openDetalhes} onClose={fecharDetalhes} fullWidth>
        <div className={modal.modal}>
          <div className={modal.nav}>
            <div onClick={fecharDetalhes}>Voltar</div>
            <div className={modal.active}>Detalhes da Operação</div>
          </div>

          <div className={modal.center}>
            <div className={modal.status}>
              <i className="fa fa-ship icon" />
              &nbsp;&nbsp;{selecionada?.STATUS_OPERACAO || "-"}
            </div>
          </div>

          <div className={modal.flex}>
            <div className={modal.detalhebox}>
              <div>
                <b>Navio:</b> {selecionada?.NOME_NAVIO || "-"}
              </div>
            </div>
            <div className={modal.detalhebox}>
              <div>
                <b>Berço:</b> {selecionada?.NOME_BERCO || "-"}
              </div>
            </div>
          </div>

          <div className={modal.center}>
            <div className={modal.cargas}>
              DI/BL cadastrados
              <div className={modal.sumario}>
                <div>TIPO</div>
                <div>CÓDIGO</div>
                <div>IMPORTADOR</div>
                <div>PRODUTO</div>
                <div>QT. MANIFESTADA</div>
              </div>

              <div className={modal.lista}>
                {loadingCargas && "Carregando cargas…"}
                {!loadingCargas && (cargas?.length ?? 0) === 0
                  ? "Nenhuma carga identificada"
                  : !loadingCargas &&
                    cargas.map((c) => (
                      <div key={`${c.TIPO}-${c.NUMERO}`} className={modal.item}>
                        <div>{c.TIPO}</div>
                        <div>{c.NUMERO}</div>
                        <div>{c.IMPORTADOR}</div>
                        <div>{c.PRODUTO}</div>
                        <div>
                          {(c.QTDE_MANIFESTADA || 0).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          </div>

          <div className={modal.center}>
            {selecionada?.STATUS_OPERACAO === "AGUARDANDO DI/BL" ? (
              <button
                className={modal.finalizar}
                onClick={() =>
                  navigate(`/cargas/cadastro/${selecionada?.NOME_NAVIO}/${selecionada?.COD_OPERACAO}`)
                }
              >
                EDITAR CARGA
              </button>
            ) : (
              <div className={modal.center}>
                Não é possível adicionar mais DI/BL nesta operação
              </div>
            )}

            {selecionada?.STATUS_OPERACAO === "AGUARDANDO ATRACAÇÃO" && (
              <button className={modal.finalizar} onClick={abrirConfirm}>
                REGISTRAR ATRACAÇÃO
              </button>
            )}
          </div>
        </div>
      </Dialog>

      {/* Confirmar atracação */}
      <Dialog open={openConfirm} onClose={fecharConfirm} fullWidth>
        <div className={confirm.modal}>
          <div className={confirm.nav}>
            <div onClick={fecharConfirm}>Voltar</div>
          </div>

          <div className={confirm.center}>
            Deseja registrar a Atracação desta Operação?
            <br />
            <div>Ao confirmar o Dashboard será liberado.</div>
          </div>

          <div className={confirm.inputbox}>
            <Input
              type="datetime-local"
              text="Data e hora da Atracação"
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className={confirm.flex}>
            <button className={confirm.cancelar} onClick={fecharConfirm}>
              CANCELAR
            </button>
            <button className={confirm.confirmar} onClick={registrarAtracacao}>
              CONFIRMAR
            </button>
          </div>
        </div>
      </Dialog>
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
      <Cargas />
    </SnackbarProvider>
  );
}
