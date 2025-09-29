import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import moment from "moment";
import { SnackbarProvider, useSnackbar } from "notistack";

import { api } from "../../../api";            // <- usa baseURL do .env
import Navbar from "../../../components/Navbar";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import SubmitButton from "../../../components/Button";
import MaskedInput from "../../../components/InputMask";

import style from "./CadastroOperacao.module.css";

const CadastroOperacao = () => {
  const navigate = useNavigate();
  const { id, nome } = useParams();
  const { enqueueSnackbar } = useSnackbar();

  const [empresas, setEmpresas] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [bercos, setBercos] = useState([]);

  const [tipoOp, setTipoOp] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [agente, setAgente] = useState("");
  const [eta, setEta] = useState("");
  const [previsao, setPrevisao] = useState("");
  const [rap, setRap] = useState("");
  const [berco, setBerco] = useState("");

  const userToken = localStorage.getItem("user_token");
  const usuario = userToken ? JSON.parse(userToken).id : null;

  // Helpers
  const showAlert = (txt, variant) => enqueueSnackbar(txt, { variant });

  const getDate = () => {
    const date = new Date();
    date.setHours(date.getHours() - 3);
    return date.toISOString().slice(0, 19).replace("T", " ");
  };

  // Fetches
  useEffect(() => {
    (async () => {
      try {
        const [r1, r2, r3] = await Promise.all([
          api.get("/empresas"),
          api.get("/agentes"),
          api.get("/bercos"),
        ]);
        setEmpresas(r1.data || []);
        setAgentes(r2.data || []);
        setBercos(r3.data || []);
      } catch (err) {
        console.error(err);
        showAlert("Erro ao carregar listas (empresas/agentes/berços).", "error");
      }
    })();
  }, []);

  // Submit
  const addOperacao = async () => {
    try {
      const payload = {
        empresa,
        navio: id,
        rap,
        agente,
        berco,
        eta: moment(eta).format("YYYY-MM-DD HH:mm"),
        previsao: moment(previsao).format("YYYY-MM-DD HH:mm"),
        status: "AGUARDANDO DI/BL",
        usuario,
        tipo: tipoOp,
        data: getDate(),
      };

      const res = await api.post("/operacao/criar", payload);

      if (res?.data?.ok === false || res?.data?.sqlMessage) {
        showAlert(res?.data?.message || res?.data?.sqlMessage || "Erro ao cadastrar operação.", "error");
        return;
      }

      showAlert("Nova Operação cadastrada com sucesso!", "success");
      setTimeout(() => navigate("/navios"), 1500);
    } catch (err) {
      console.error(err);
      showAlert(err?.response?.data?.message || "Erro ao cadastrar operação.", "error");
    }
  };

  const validaDados = () => {
    if (!empresa || !agente || !eta || !previsao || !rap || !berco || !tipoOp) {
      showAlert("Preencha todos os campos!", "error");
      return;
    }
    if (!usuario) {
      showAlert("Sessão expirada. Faça login novamente.", "error");
      return;
    }
    addOperacao();
  };

  return (
    <>
      <Navbar navios />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          <div className={style.nav}>
            <div onClick={() => navigate("/navios")}>Voltar</div>
            <div className={style.active}>Cadastrar Operação</div>
          </div>

          <div className={style.navio}>
            <i className="fa fa-ship icon" />
            &nbsp;&nbsp;&nbsp;{nome}
          </div>

          {/* Linha 1: Empresa / Agente / ETA */}
          <div className={style.formGrid}>
            {/* EMPRESA */}
            <div className={style.field}>
              <span className={style.labelTop}>Empresa</span>
              <div className={style.control}>
                <select
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className={style.select}
                >
                  <option value="" disabled>Selecione uma opção</option>
                  {empresas.map((val) => (
                    <option key={val.COD_EMPRESA} value={val.COD_EMPRESA}>
                      {val.NOME_EMPRESA}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* AGENTE */}
            <div className={style.field}>
              <span className={style.labelTop}>Agente</span>
              <div className={style.control}>
                <select
                  value={agente}
                  onChange={(e) => setAgente(e.target.value)}
                  className={style.select}
                >
                  <option value="" disabled>Selecione uma opção</option>
                  {agentes.map((val) => (
                    <option key={val.COD_AGENTE} value={val.COD_AGENTE}>
                      {val.NOME_AGENTE}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ETA */}
            <div className={style.field}>
              <span className={style.labelTop}>Data do ETA</span>
              <div className={style.control}>
                <input
                  type="datetime-local"
                  className={style.input}
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                  placeholder="Selecione a data/hora"
                />
              </div>
            </div>
          </div>

          {/* Linha 2: Previsão / RAP / Berço / Tipo de Operação */}
          <div className={style.formGrid}>
            {/* PREVISÃO */}
            <div className={style.field}>
              <span className={style.labelTop}>Previsão de Atracação</span>
              <div className={style.control}>
                <input
                  type="datetime-local"
                  className={style.input}
                  value={previsao}
                  onChange={(e) => setPrevisao(e.target.value)}
                  placeholder="Selecione a data/hora"
                />
              </div>
            </div>

            {/* RAP */}
            <div className={style.field}>
              <span className={style.labelTop}>RAP</span>
              <div className={style.control}>
                <MaskedInput
                  text={null}
                  mask="9999-9/9999"
                  value={rap}
                  onChange={(e) => setRap((e.target.value || "").toUpperCase())}
                  placeholder="0000-0/0000"
                  className={style.input}
                />
              </div>
            </div>

            {/* BERÇO */}
            <div className={style.field}>
              <span className={style.labelTop}>Berço</span>
              <div className={style.control}>
                <select
                  value={berco}
                  onChange={(e) => setBerco(e.target.value)}
                  className={style.select}
                >
                  <option value="" disabled>Selecione uma opção</option>
                  {bercos.map((val) => (
                    <option key={val.COD_BERCO} value={val.COD_BERCO}>
                      {val.NOME_BERCO}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tipo de Operação (segmented / pills) */}
            <div className={style.field}>
              <span className={style.labelTop}>Tipo de Operação</span>
              <div role="radiogroup" aria-label="Tipo de Operação" className={style.segmentedPills}>
                <label
                  className={`${style.pill} ${tipoOp === "P" ? style.pillActive : ""}`}
                  tabIndex={0}
                >
                  <input
                    type="radio"
                    name="tipoOP"
                    value="P"
                    checked={tipoOp === "P"}
                    onChange={(e) => setTipoOp(e.target.value)}
                  />
                  <i className="fa fa-industry" aria-hidden="true" />
                  <span>Própria</span>
                </label>

                <label
                  className={`${style.pill} ${tipoOp === "L" ? style.pillActive : ""}`}
                  tabIndex={0}
                >
                  <input
                    type="radio"
                    name="tipoOP"
                    value="L"
                    checked={tipoOp === "L"}
                    onChange={(e) => setTipoOp(e.target.value)}
                  />
                  <i className="fa fa-handshake-o" aria-hidden="true" />
                  <span>Locação</span>
                </label>
              </div>
            </div>
          </div>

          <SubmitButton text="Cadastrar" onClick={validaDados} />
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
      <CadastroOperacao />
    </SnackbarProvider>
  );
}
