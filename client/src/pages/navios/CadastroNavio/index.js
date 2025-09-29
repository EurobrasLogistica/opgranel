import React, { useState } from "react";
import Axios from "axios";
import { useNavigate } from "react-router-dom";
import { SnackbarProvider, useSnackbar } from "notistack";
import Navbar from "../../../components/Navbar";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import Input from "../../../components/Input";
import SubmitButton from "../../../components/Button";
import style from "./CadastroNavio.module.css";
import MaskedInput from "../../../components/InputMask";

// Base da API: localhost em dev, produção no build
const API_BASE =
  process.env.REACT_APP_SERVER ||
  (window.location.hostname === "localhost"
    ? "http://localhost:3009"
    : "https://opgranel.eurobraslogistica.com.br/api");

Axios.defaults.baseURL = API_BASE;

const CadastroNavio = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [nome, setNome] = useState("");
  const [imo, setImo] = useState("");
  const [bandeira, setBandeira] = useState("");

  // evita crash se não houver user_token
  const userToken = localStorage.getItem("user_token");
  const usuario = userToken ? JSON.parse(userToken).id : null;

  const showAlert = (txt, variant) => enqueueSnackbar(txt, { variant });

const addNavio = async () => {
  try {
    const payload = {
      nome: (nome || "").toUpperCase(),
      imo: (imo || "").toUpperCase(),
      bandeira: (bandeira || "").toUpperCase(),
      status: "AGUARDANDO INÍCIO DA OPERAÇÃO",
      usuario,
    };

    // Se no back você usou /api/navio/criar, aqui o caminho relativo é /navio/criar (porque baseURL termina em /api)
    const res = await Axios.post("/navio/criar", payload);

    const { status, data } = res;
    const okFlag =
      data?.ok === true ||
      (typeof data === "string" && data.toLowerCase().includes("sucesso"));

    if (status >= 200 && status < 300 && okFlag) {
      // sucesso
      // usa a mensagem do back, se houver
      showAlert(data?.message || "Navio cadastrado com sucesso!", "success");
      setTimeout(() => navigate("/navios"), 1200);
      return;
    }

    // não veio ok -> tratar como erro
    showAlert(data?.message || "Erro ao cadastrar navio", "error");
  } catch (err) {
    console.error(err);
    showAlert(err?.response?.data?.message || err.message || "Erro ao cadastrar navio", "error");
  }
};

  const validaDados = () => {
    const imoDigits = (imo || "").replace(/\D/g, "");
    if (!nome || !imo || !bandeira) {
      showAlert("Preencha todos os campos!", "error");
      return;
    }
    if (imoDigits.length !== 8) {
      showAlert("IMO deve conter 8 dígitos!", "error");
      return;
    }
    if (!usuario) {
      showAlert("Sessão expirada. Faça login novamente.", "error");
      return;
    }
    addNavio();
  };

  return (
    <>
      <Navbar navios />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          <div className={style.nav}>
            <div onClick={() => navigate("/navios")}>Navios</div>
            <div className={style.active}>Cadastrar Navio</div>
          </div>

          {/* Nome / IMO / Bandeira (floating label com “ : ”) */}
          <div className={style.fieldsRow}>
            {/* NOME DO NAVIO */}
            <div className={`${style.floatField} ${!nome ? style.floatError : ""} ${nome ? style.filled : ""}`}>
              <Input
                text="NAVIO"
                type="text"
                placeholder=" "
                value={nome}
                onChange={(e) => setNome((e.target.value || "").toUpperCase())}
                onPaste={(e) => {
                  e.preventDefault();
                  setNome((e.clipboardData.getData("text") || "").toUpperCase());
                }}
                autoCapitalize="characters"
                aria-label="Nome do navio"
              />
            </div>

            {/* IMO */}
            <div
              className={`${style.floatField} ${
                (imo || "").replace(/\D/g, "").length !== 8 ? style.floatError : ""
              } ${(imo || "").length ? style.filled : ""}`}
            >
              <MaskedInput
                text="IMO (8 DÍGITOS)"
                name="IMO"
                mask="99999999"
                placeholder=" "
                value={imo}
                onChange={(e) => setImo((e.target.value || "").toUpperCase())}
                onPaste={(e) => {
                  e.preventDefault();
                  setImo((e.clipboardData.getData("text") || "").toUpperCase());
                }}
                autoCapitalize="characters"
                aria-label="IMO"
              />
            </div>

            {/* BANDEIRA */}
            <div className={`${style.floatField} ${!bandeira ? style.floatError : ""} ${bandeira ? style.filled : ""}`}>
              <Input
                type="text"
                text="Bandeira"
                placeholder=""
                value={bandeira}
                onChange={(e) => setBandeira((e.target.value || "").toUpperCase())}
                onPaste={(e) => {
                  e.preventDefault();
                  setBandeira((e.clipboardData.getData("text") || "").toUpperCase());
                }}
                autoCapitalize="characters"
                aria-label="Bandeira"
              />
            </div>
          </div>

          <div className="columns">
            <div className="column is-5">
              <SubmitButton text="Cadastrar" onClick={validaDados} />
            </div>
          </div>
        </div>
      </Container>
    </>
  );
};

export default function IntegrationNotistack() {
  return (
    <SnackbarProvider anchorOrigin={{ vertical: "bottom", horizontal: "right" }} maxSnack={3} autoHideDuration={2500}>
      <CadastroNavio />
    </SnackbarProvider>
  );
}
