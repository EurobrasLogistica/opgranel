import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SnackbarProvider, useSnackbar } from "notistack";

import { api } from "../../../api"; // usa baseURL do .env
import Navbar from "../../../components/Navbar";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import SubmitButton from "../../../components/Button";
import MaskedInput from "../../../components/InputMask";
import style from "./BuscarMotorista.module.css";

const BuscarMotorista = () => {
  const navigate = useNavigate();

  const [busca, setBusca] = useState("");
  const [motorista, setMotorista] = useState(null);

  const { enqueueSnackbar } = useSnackbar();
  const showAlert = (txt, variant) => enqueueSnackbar(txt, { variant });

  const cpfDigits = (busca || "").replace(/\D/g, "");

  const getMotorista = async () => {
    try {
      const { data } = await api.get(`/motorista/busca/${cpfDigits}`);
      if (Array.isArray(data) && data.length > 0) {
        setMotorista(data[0]);
        showAlert("Dados do motorista encontrados.", "success");
      } else {
        setMotorista(null);
        showAlert("Motorista não cadastrado.", "error");
      }
    } catch (err) {
      console.error("[getMotorista][ERR]", err);
      showAlert("Erro ao buscar motorista.", "error");
    }
  };

  const validaDados = () => {
    if (!cpfDigits || cpfDigits.length !== 11) {
      showAlert("Digite um CPF válido!", "error");
      return;
    }
    getMotorista();
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") validaDados();
  };

  const validaPesagem = () => {
    if (!motorista?.CPF_MOTORISTA) {
      showAlert("Busque um motorista válido primeiro.", "error");
      return;
    }
    navigate(
      `/veiculos/PesagemInicial/${motorista.NOME_MOTORISTA}/${motorista.CPF_MOTORISTA}/${motorista.CNH_MOTORISTA}/${motorista.COD_MOTORISTA}`
    );
  };

  return (
    <>
      <Navbar veiculos />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          <div className={style.nav}>
            <div className={style.active}>Buscar Motorista</div>
            <div onClick={() => navigate("/veiculos")}>Cadastrar Motorista</div>
          </div>

          <div className={"columns"}>
            <div className={"column is-2"}>
              <div className={style.periodo}>
                <MaskedInput
                  text={"Buscar CPF"}
                  mask={"999.999.999-99"}
                  placeholder={"000.000.000-00"}
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={handleEnter}
                />
              </div>
            </div>

            <div className={"column"}>
              <div className={style.submit}>
                <SubmitButton text={"Buscar"} onClick={validaDados} />
              </div>
            </div>

            <div className="column is-5">
              <div className={style.box}>
                <div className="card">
                  <div className="card-content">
                    <div className="content">
                      <div>
                        <strong className={style.name}>Motorista:</strong>{" "}
                        {motorista?.NOME_MOTORISTA || "-"}
                      </div>
                      <div>
                        <strong className={style.name}>CPF:</strong>{" "}
                        {motorista?.CPF_MOTORISTA || "-"}
                      </div>
                      <div>
                        <strong className={style.name}>CNH:</strong>{" "}
                        {motorista?.CNH_MOTORISTA || "-"}
                      </div>
                      <div className={style.submit2}>
                        <SubmitButton text={"Pesar"} onClick={validaPesagem} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={style.cabecario}>Histórico</div>
          <div className={style.flex}>
            <div className={style.formulario}>
              <div className={"columns"}>
                <div className={"column is-one-fifth"}>CAVALO</div>
                <div className={"column is-one-fifth"}>CARRETA</div>
                <div className={"column is-one-fifth"}>PRODUTO</div>
                <div className={"column is-one-fifth"}>TRANSPORTADORA</div>
                <div className={"column is-2"}>DATA</div>
              </div>

              <div className={style.lista}>nenhum histórico encontrado</div>
            </div>
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
      autoHideDuration={2500}
    >
      <BuscarMotorista />
    </SnackbarProvider>
  );
}
