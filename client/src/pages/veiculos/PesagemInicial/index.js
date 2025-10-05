import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SnackbarProvider, useSnackbar } from "notistack";
import Axios from "axios";

import Navbar from "../../../components/Navbar";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import Input from "../../../components/Input";
import SubmitButton from "../../../components/Button";

import style from "./PesagemInicial.module.css";
import confirm from "./Confirm.module.css";

/** =========================
 *  BASE DA API (flexível)
 *  Prioridades:
 *  - REACT_APP_SERVER
 *  - hostname === localhost ? http://localhost:3009 : https://opgranel.eurobraslogistica.com.br/api
 *  ========================= */
const API_BASE =
  process.env.REACT_APP_SERVER ||
  (window.location.hostname === "localhost"
    ? "http://localhost:3009"
    : "https://opgranel.eurobraslogistica.com.br/api");

// Configura Axios globalmente
Axios.defaults.baseURL = API_BASE;
Axios.defaults.headers.common["Content-Type"] = "application/json; charset=utf-8";

const PesagemInicial = () => {
  const navigate = useNavigate();
  const { nome, cpf, id } = useParams();

  // ----- estado -----
  const [operacoesList, setOperacoesList] = useState([]);
  const [docs, setDocs] = useState([]);
  const [pedidoMic, setPedidoMic] = useState("");

  const [destinos, setDestinos] = useState([]);
  const [destino, setDestino] = useState("");

  const [pedidos, setPedidos] = useState([]);
  const [doc, setDoc] = useState("");       // COD_CARGA selecionado
  const [navio, setNavio] = useState("");   // COD_OPERACAO

  const [tara, setTara] = useState("");
  const [placacavalo, setPlacacavalo] = useState("");
  const [placa1, setPlaca1] = useState("");
  const [placa2, setPlaca2] = useState("");
  const [placa3, setPlaca3] = useState("");
  const [data, setData] = useState("");

  const [transportadora, setTransportadora] = useState("");
  const [transportadoras, setTransportadoras] = useState([]);

  const [tipopesagem, setTipopesagem] = useState(""); // "C" ou "M"
  const [tipoveiculo, setTipoveiculo] = useState("");
  const [tipoveiculos, setTipoveiculos] = useState([]);
  const [disabled, setDisabled] = useState(false);
  const [hideButton, setHideButton] = useState(false);

  // modal confirmação (saldo baixo)
  const [openConfirm, setOpenConfirm] = useState(false);

  // botão submit
  const [submitting, setSubmitting] = useState(false);

  // token seguro
  const rawToken = localStorage.getItem("user_token");
  let usuario = null;
  try {
    usuario = rawToken ? (JSON.parse(rawToken)?.id ?? null) : null;
  } catch {
    usuario = null;
  }

  const { enqueueSnackbar } = useSnackbar();
  const showAlert = (txt, variant) => enqueueSnackbar(txt, { variant });

  // ----- efeitos -----
  useEffect(() => {
    getTipoveiculo();
    getOperacoes();
    getTransp();
    getDestino();
    if (cpf) BuscarPlacas(cpf);
  }, [cpf]);

  // ----- helpers -----
  const getDate = () => {
    const date = new Date();
    date.setHours(date.getHours() - 3);
    return date.toISOString().slice(0, 19).replace("T", " ");
  };

  const validaTipo = (val) => {
    if (val === "C") {
      showAlert("Pesagem completa selecionada com sucesso!", "success");
      setDisabled(false);
      setTara("");
    } else {
      showAlert("Pesagem moega selecionada com sucesso!", "success");
      setTara("1000"); // tara fixa para moega
      setDisabled(true);
    }
    setTipopesagem(val);
  };

  // ----- API calls -----
  const BuscarPlacas = async (cpfVal) => {
    try {
      const { data } = await Axios.get(`/pesageminicial/historico/${cpfVal}`);
      if (Array.isArray(data) && data.length > 0) {
        const {
          PLACA_CAVALO,
          PLACA_CARRETA,
          PLACA_CARRETA2,
          PLACA_CARRETA3,
          TIPO_VEICULO,
        } = data[0];
        setPlacacavalo(PLACA_CAVALO || "");
        setPlaca1(PLACA_CARRETA || "");
        setPlaca2(PLACA_CARRETA2 || "");
        setPlaca3(PLACA_CARRETA3 || "");
        setTipoveiculo(TIPO_VEICULO || "");
      }
    } catch (error) {
      console.error("[BuscarPlacas][ERR]", error);
    }
  };

  const getOperacoes = async () => {
    try {
      const { data } = await Axios.get("/operacao");
      setOperacoesList(data || []);
    } catch (e) {
      console.error("[getOperacoes][ERR]", e);
    }
  };

  const getCargas = async (codOper) => {
    try {
      setNavio(codOper);
      setDoc(""); // reset doc selecionado
      const { data } = await Axios.get(`/carga/busca/${codOper}`);
      setDocs(data || []);
      getPedido(codOper);
    } catch (e) {
      console.error("[getCargas][ERR]", e);
    }
  };

  const getPedido = async (codOper) => {
    try {
      const { data } = await Axios.get(`/buscar/pedidos/${codOper}`);
      setPedidos(data || []);
    } catch (e) {
      console.error("[getPedido][ERR]", e);
    }
  };

  const getTransp = async () => {
    try {
      const { data } = await Axios.get("/transportadora");
      setTransportadoras(data || []);
    } catch (e) {
      console.error("[getTransp][ERR]", e);
    }
  };

  const getDestino = async () => {
    try {
      const { data } = await Axios.get("/destino");
      setDestinos(data || []);
    } catch (e) {
      console.error("[getDestino][ERR]", e);
    }
  };

  const getTipoveiculo = async () => {
    try {
      const { data } = await Axios.get("/tipoveiculo");
      setTipoveiculos(data || []);
    } catch (e) {
      console.error("[getTipoveiculo][ERR]", e);
    }
  };

  // ----- validações / cadastro -----
  const selectedDoc = docs?.find((d) => String(d.COD_CARGA) === String(doc));
  const saldoTons =
    selectedDoc && typeof selectedDoc.SALDO === "number"
      ? (selectedDoc.SALDO / 1000).toFixed(2)
      : null;

  const validaDados = () => {
    if (!doc || !destino || !placacavalo || !data || !placa1 || !transportadora || !tipopesagem) {
      showAlert("Preencha todos os campos", "error");
      return;
    }
    if (!usuario) {
      showAlert("Sessão inválida. Entre novamente.", "error");
      return;
    }
    if (placacavalo.replace(/\s/g, "").length < 7) {
      showAlert("Placa do cavalo deve conter 7 dígitos!", "error");
      return;
    }
    if (placa1.replace(/\s/g, "").length < 7) {
      showAlert("Placa 1 deve conter 7 dígitos!", "error");
      return;
    }
    if (!tipoveiculo) {
      showAlert("Selecione o tipo do veículo.", "error");
      return;
    }
    addPesagem();
  };

  const addPesagem = async () => {
    try {
      setSubmitting(true);

      const payload = {
        COD_CARGA: doc,
        COD_OPERACAO: navio,
        PLACA_CAVALO: placacavalo,
        COD_MOTORISTA: id ?? "",
        PLACA_CARRETA: placa1,
        PLACA_CARRETA2: placa2 || null,
        PLACA_CARRETA3: placa3 || null,
        TIPO_VEICULO: tipoveiculo,
        COD_TRANSP: transportadora,
        COD_DESTINO: destino,
        PESO_TARA: disabled ? 1000 : (tara || 0),
        DATA_TARA: data,
        USUARIO_TARA: usuario,
        STATUS_CARREG: "1",
        USUARIO: usuario,
        DATA_CADASTRO: getDate(),
        NR_PEDIDO: pedidoMic || null,
        TIPO_PESAGEM: tipopesagem,
      };

      const { data: resp } = await Axios.post("/pesagem/primeirapesagem", payload);

      if (resp?.ok) {
        // Mostra mensagem com ID e aguarda 3s para navegar
        showAlert(`Pesagem cadastrada com sucesso! ID: ${resp.id}`, "success");
        setOpenConfirm(false);
        setTimeout(() => navigate("/veiculos/BuscarMotorista"), 3000);
      } else if (resp?.error) {
        showAlert(resp.error, "error");
      } else {
        showAlert("Não foi possível confirmar o cadastro da pesagem.", "error");
      }
    } catch (err) {
      console.error("[addPesagem][ERR]", err);
      const backendMsg =
        (err && err.response && (err.response.data?.message || err.response.data?.error)) ||
        "Erro ao cadastrar pesagem.";
      showAlert(backendMsg, "error");
      setOpenConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const tentarCadastrar = () => {
    if (submitting) return; // evita duplo clique

    // esconde o botão por 4s imediatamente
    setHideButton(true);
    setTimeout(() => setHideButton(false), 4000);

    // Se saldo <= 150 t, abrir confirmação
    if (selectedDoc && Number(selectedDoc.SALDO) <= 150000) {
      setOpenConfirm(true);
      return;
    }
    validaDados(); // segue direto
  };


  return (
    <>
      <Navbar veiculos />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          <div className={style.nav}>
            <div onClick={() => navigate("/veiculos/BuscarMotorista")}>Buscar Motorista</div>
            <div onClick={() => navigate("/veiculos")}>Cadastrar Motorista</div>
            <div className={style.active}>Pesagem inicial</div>
          </div>

          <div className={style.align}>
            <div className="columns">
              {/* Coluna 1 */}
              <div className="column is-4">
                <div className={style.box}>
                  <div className="card">
                    <div className="card-content">
                      <div className={style.cabecario}>INFORMAÇÕES DO MOTORISTA</div>
                      <div className="content">
                        <div><strong className={style.name}>Motorista:</strong> {nome}</div>
                        <div><strong className={style.name}>CPF:</strong> {cpf}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={style.radioGroup}>
                  <label className={style.radioOption}>
                    <input
                      type="radio"
                      name="tipoPesagem"
                      value="C"
                      onChange={(e) => validaTipo(e.target.value)}
                    />
                    <span className={style.customRadio}></span>
                    Pesagem COMPLETA
                  </label>

                  <label className={style.radioOption}>
                    <input
                      type="radio"
                      name="tipoPesagem"
                      value="M"
                      onChange={(e) => validaTipo(e.target.value)}
                    />
                    <span className={style.customRadio}></span>
                    Pesagem MOEGA
                  </label>
                </div>

                <div className={style.form_control}>
                  <label>Selecione o navio (operação):</label>
                  <select onChange={(e) => getCargas(e.target.value)} defaultValue="">
                    <option value="" disabled>Selecione uma opção</option>
                    {operacoesList
                      ?.filter((op) => op.STATUS_OPERACAO !== "FECHADA")
                      .map((val) => (
                        <option key={val.COD_OPERACAO} value={val.COD_OPERACAO}>
                          {val.NOME_NAVIO}
                        </option>
                      ))}
                  </select>
                </div>

                {disabled ? (
                  <div className={style.form_input_div}>
                    Peso vazio (Tara):
                    <input
                      className={style.form_input}
                      type="text"
                      placeholder="1.000 kg"
                      disabled
                      value="1000"
                    />
                  </div>
                ) : (
                  <Input
                    type="text"
                    text="Peso vazio (Tara)"
                    placeholder="Insira o peso em KG"
                    onChange={(e) => setTara(e.target.value)}
                    value={tara}
                  />
                )}
              </div>

              {/* Coluna 2 */}
              <div className="column is-3">
                <div className={style.form_control}>
                  <label>Destino da carga:</label>
                  <select onChange={(e) => setDestino(e.target.value)} defaultValue="">
                    <option value="" disabled>Selecione uma opção</option>
                    {destinos?.map((val) => (
                      <option key={val.COD_DESTINO} value={val.COD_DESTINO}>
                        {val.NOME_DESTINO}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={style.placaContainer}>
                  <label htmlFor="placaCavalo">Placa Cavalo</label>
                  <input
                    type="text"
                    id="placaCavalo"
                    placeholder="Ex: AAA1234"
                    value={placacavalo}
                    onChange={(e) => setPlacacavalo(e.target.value.toUpperCase())}
                  />
                </div>

                <div className={style.placaContainer}>
                  <label htmlFor="placa1">Placa Carreta 1</label>
                  <input
                    type="text"
                    id="placa1"
                    placeholder="Ex: AAA1234"
                    value={placa1}
                    onChange={(e) => setPlaca1(e.target.value.toUpperCase())}
                  />
                </div>

                <div className={style.placaContainer}>
                  <label htmlFor="placa2">Placa Carreta 2</label>
                  <input
                    type="text"
                    id="placa2"
                    placeholder="Ex: AAA1234"
                    value={placa2}
                    onChange={(e) => setPlaca2(e.target.value.toUpperCase())}
                  />
                </div>

                <div className={style.placaContainer}>
                  <label htmlFor="placa3">Placa Carreta 3</label>
                  <input
                    type="text"
                    id="placa3"
                    placeholder="Ex: AAA1234"
                    value={placa3}
                    onChange={(e) => setPlaca3(e.target.value.toUpperCase())}
                  />
                </div>

                <div className={style.form_control}>
                  <label>Tipo de veículo:</label>
                  <select onChange={(e) => setTipoveiculo(e.target.value)} defaultValue="">
                    <option value="" disabled>Selecione uma opção</option>
                    {tipoveiculos?.map((val) => (
                      <option key={val.COD_TIPO} value={val.COD_TIPO}>
                        {val.DESC_TIPO_VEICULO}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={style.form_control}>
                  <label>Transportadora:</label>
                  <select onChange={(e) => setTransportadora(e.target.value)} defaultValue="">
                    <option value="" disabled>Selecione uma opção</option>
                    {transportadoras?.map((val) => (
                      <option key={val.COD_TRANSP} value={val.COD_TRANSP}>
                        {val.NOME_TRANSP}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Coluna 3 */}
              <div className="column is-4">
                <div className={style.form_control}>
                  <label>Código da operação (DI ou BL):</label>
                  <select onChange={(e) => setDoc(e.target.value)} value={doc || ""}>
                    <option value="" disabled>Selecione uma opção</option>
                    {docs?.map((val) => (
                      <option key={val.COD_CARGA} value={val.COD_CARGA}>
                        {val.TIPO} - {val.NUMERO}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={style.form_control}>
                  <label>Número do Pedido:</label>
                  <select onChange={(e) => setPedidoMic(e.target.value)} defaultValue="">
                    <option value="" disabled>Selecione uma opção</option>
                    {pedidos?.map((val) => (
                      <option key={val.NR_PEDIDO} value={val.NR_PEDIDO}>
                        {val.NR_PEDIDO}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  type="datetime-local"
                  text="Data e hora(h)"
                  onChange={(e) => setData(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={style.button}>
            {!hideButton && (
              <SubmitButton
                text={submitting ? "Enviando..." : "Cadastrar"}
                onClick={tentarCadastrar}
                disabled={submitting}
              />
            )}
          </div>

        </div>
      </Container>

      {/* Modal simples de confirmação (saldo baixo) */}
      {openConfirm && (
        <div className={confirm.modal}>
          <div className={confirm.nav}>
            <div onClick={() => setOpenConfirm(false)}>Voltar</div>
          </div>
          <div className={confirm.center}>
            {selectedDoc ? (
              <>
                ⚠ Documento {selectedDoc.NUMERO} está com apenas {saldoTons} tons de saldo.
                <br />
                <div>Deseja continuar mesmo assim?</div>
              </>
            ) : (
              <>Documento com saldo baixo. Deseja continuar?</>
            )}
          </div>

          <div className={confirm.flex}>
            <button className={confirm.cancelar} onClick={() => setOpenConfirm(false)}>
              CANCELAR
            </button>
            <button className={confirm.confirmar} onClick={validaDados}>
              CONFIRMAR
            </button>
          </div>
        </div>
      )}
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
      <PesagemInicial />
    </SnackbarProvider>
  );
}
