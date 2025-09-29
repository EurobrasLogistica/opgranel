import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Background from "../../components/Background";
import Container from "../../components/Container";
import Header from "../../components/Header";
import Confirm from "@mui/material/Dialog";
import { SnackbarProvider, useSnackbar } from "notistack";

import { api } from "../../api"; // ← usa baseURL do .env

import confirm from "./Confirm.module.css";
import modal from "./Modal.module.css";
import style from "./AlteracaoCadastral.module.css";

const nowStr = () => {
  const d = new Date();
  d.setHours(d.getHours() - 3); // ajusta para horário local se necessário
  return d.toISOString().slice(0, 19).replace("T", " ");
};

const AlteracaoCadastral = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // usuário
  const usuario = useMemo(() => {
    try {
      const raw = localStorage.getItem("user_token");
      return raw ? JSON.parse(raw).id : null;
    } catch {
      return null;
    }
  }, []);

  // estados
  const [carregamento, setCarregamento] = useState(null);
  const [id, setId] = useState("");

  // toggles de edição campo a campo
  const [mostaInput2, setMostaInput2] = useState(false); // cavalo
  const [mostaInput3, setMostaInput3] = useState(false); // carreta1
  const [mostaInput4, setMostaInput4] = useState(false); // carreta2
  const [mostaInput5, setMostaInput5] = useState(false); // carreta3
  const [mostaInput6, setMostaInput6] = useState(false); // tara
  const [mostaInput7, setMostaInput7] = useState(false); // tipo veiculo
  const [mostaInput8, setMostaInput8] = useState(false); // pedido MIC
  const [mostaInput9, setMostaInput9] = useState(false); // peso moega
  const [mostaInput10, setMostaInput10] = useState(false); // transportadora
  const [isEditingEnabled, setIsEditingEnabled] = useState(false);

  // inputs
  const [placa1, setPlaca1] = useState("");
  const [placa2, setPlaca2] = useState("");
  const [placa3, setPlaca3] = useState("");
  const [placaCavalo, setPlacaCavalo] = useState("");
  const [tara, setTara] = useState("");
  const [moega, setMoega] = useState("");
  const [tipoveiculos, setTipoveiculos] = useState([]);
  const [tipoveiculo, setTipoveiculo] = useState("");
  const [transportadoras, setTransportadoras] = useState([]);
  const [transportadora, setTransportadora] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [pedido, setPedido] = useState("");

  // modal excluir
  const [openC, setOpenC] = useState(false);
  const [motivo, setMotivo] = useState("");

  const showAlert = (txt, variant) => enqueueSnackbar(txt, { variant });

  // cargas estáticas iniciais
  useEffect(() => {
    (async () => {
      try {
        const [tv, tr] = await Promise.all([
          api.get("/tipoveiculo"),
          api.get("/transportadora/alterar"),
        ]);
        setTipoveiculos(tv.data || []);
        setTransportadoras(tr.data || []);
      } catch (err) {
        console.error(err);
        showAlert("Erro ao carregar listas iniciais.", "error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pedidos dependem do carregamento (COD_OPERACAO)
  useEffect(() => {
    if (!carregamento?.COD_OPERACAO) return;
    (async () => {
      try {
        const { data } = await api.get(`/buscar/pedidos/${carregamento.COD_OPERACAO}`);
        setPedidos(data || []);
      } catch (err) {
        console.error(err);
        showAlert("Erro ao carregar pedidos.", "error");
      }
    })();
  }, [carregamento?.COD_OPERACAO]); // eslint-disable-line react-hooks/exhaustive-deps

  // buscar carregamento pelo ID
  const getCarregamento = async () => {
    if (!id.trim()) {
      showAlert("Informe um ID válido.", "warning");
      return;
    }
    try {
      const { data } = await api.get(`/alteracaocadastral/veiculos/${id}`);
      if (Array.isArray(data) && data.length > 0) {
        setCarregamento(data[0]);
        setIsEditingEnabled(true); // habilita edição somente após buscar
        showAlert("Carregamento encontrado!", "success");
      } else {
        setCarregamento(null);
        setIsEditingEnabled(false);
        showAlert("ID não encontrado.", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Erro ao buscar carregamento.", "error");
    }
  };

  // validação enter
  const onEnter = (e) => {
    if (e.key === "Enter") validaDados();
  };

  const validaDados = () => {
    if (!id.trim()) {
      showAlert("Informe um ID válido.", "warning");
      return;
    }
    getCarregamento();
  };

  // ——— Atualizações de campos ———

  const validaPlaca1 = async () => {
    const placa = (placa1 || "").replace(/\s/g, "").toUpperCase();
    if (placa.length < 7) return showAlert("Placa 1 inválida.", "error");
    try {
      const { data: resp } = await api.put("/alterar/carreta1", { id, placa });
      if (resp?.sqlMessage) return showAlert(resp.sqlMessage, "error");
      showAlert("Placa 1 alterada!", "success");
      setMostaInput3(false);
      getCarregamento();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao alterar placa 1.", "error");
    }
  };

  const validaplaca2 = async () => {
    const placa = (placa2 || "").replace(/\s/g, "").toUpperCase();
    if (placa && placa.length < 7) return showAlert("Placa 2 inválida.", "error");
    try {
      const { data: resp } = await api.put("/alterar/carreta2", { id, placa });
      if (resp?.sqlMessage) return showAlert(resp.sqlMessage, "error");
      showAlert("Placa 2 alterada!", "success");
      setMostaInput4(false);
      getCarregamento();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao alterar placa 2.", "error");
    }
  };

  const validaplaca3 = async () => {
    const placa = (placa3 || "").replace(/\s/g, "").toUpperCase();
    if (placa && placa.length < 7) return showAlert("Placa 3 inválida.", "error");
    try {
      const { data: resp } = await api.put("/alterar/carreta3", { id, placa });
      if (resp?.sqlMessage) return showAlert(resp.sqlMessage, "error");
      showAlert("Placa 3 alterada!", "success");
      setMostaInput5(false);
      getCarregamento();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao alterar placa 3.", "error");
    }
  };

  const validaCavalo = async () => {
    const placa = (placaCavalo || "").replace(/\s/g, "").toUpperCase();
    if (placa.length < 7) return showAlert("Placa do cavalo inválida.", "error");
    try {
      const { data: resp } = await api.put("/alterar/cavalo", { id, placa });
      if (resp?.sqlMessage) return showAlert(resp.sqlMessage, "error");
      showAlert("Placa do cavalo alterada!", "success");
      setMostaInput2(false);
      getCarregamento();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao alterar placa do cavalo.", "error");
    }
  };

  const validaTara = async () => {
    if (!tara || isNaN(Number(tara))) return showAlert("Informe um peso (tara) válido.", "error");
    try {
      const { data: resp } = await api.put("/alterar/tara", {
        tara,
        data: nowStr(),
        id,
        usuario,
      });
      if (resp?.sqlMessage) return showAlert(resp.sqlMessage, "error");
      showAlert("Tara alterada!", "success");
      setMostaInput6(false);
      getCarregamento();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao alterar tara.", "error");
    }
  };

  const validaMoega = async () => {
    if (!moega || isNaN(Number(moega))) return showAlert("Informe um peso de moega válido.", "error");
    try {
      const { data: resp } = await api.put("/alterar/pesomoega", {
        moega,
        id,
        datamoega: nowStr(),
        usuario,
      });
      if (resp?.sqlMessage) return showAlert(resp.sqlMessage, "error");
      showAlert("Peso moega alterado!", "success");
      setMostaInput9(false);
      getCarregamento();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao alterar peso moega.", "error");
    }
  };

  const validaVeiculo = async () => {
    if (!tipoveiculo) return showAlert("Selecione o tipo de veículo.", "error");
    try {
      const { data: resp } = await api.put("/veiculo/atualiza", {
        tipoveiculo,
        id,
      });
      if (resp?.sqlMessage) return showAlert(resp.sqlMessage, "error");
      showAlert("Veículo alterado!", "success");
      setMostaInput7(false);
      getCarregamento();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao alterar tipo de veículo.", "error");
    }
  };

  const validaTransp = async () => {
    if (!transportadora) return showAlert("Selecione a transportadora.", "error");
    try {
      // rota do backend possui esse nome mesmo (transporadora)
      const { data: resp } = await api.put("/transporadora/atualiza", {
        transporadora: transportadora,
        id,
      });
      if (resp?.sqlMessage) return showAlert(resp.sqlMessage, "error");
      showAlert("Transportadora alterada!", "success");
      setMostaInput10(false);
      getCarregamento();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao alterar transportadora.", "error");
    }
  };

  const validaPedido = async () => {
    if (!pedido) return showAlert("Selecione um pedido.", "error");
    try {
      // rota criada anteriormente para atualizar pedido por operação (compat)
      const { data: resp } = await api.put("/documentos/atualiza", {
        documento: parseInt(pedido, 10),
        cod: carregamento?.COD_OPERACAO,
      });
      if (resp?.sqlMessage) return showAlert(resp.sqlMessage, "error");
      showAlert("Pedido alterado!", "success");
      setMostaInput8(false);
      getCarregamento();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao alterar pedido.", "error");
    }
  };

  // ——— Exclusão (status) ———

  const AbrirConfirm = () => setOpenC(true);
  const FecharConfirm = () => setOpenC(false);

  const confirmaAlteracao = async () => {
    if (!motivo.trim()) return showAlert("Informe o motivo da exclusão.", "error");
    try {
      const { data: resp } = await api.put("/carregamento/excluir", {
        motivo,
        usuario,
        data_exclusao: nowStr(),
        id: carregamento?.ID_CARREGAMENTO,
      });
      if (resp?.sqlMessage) return showAlert(resp.sqlMessage, "error");
      showAlert("Carregamento excluído!", "success");
      setOpenC(false);
      getCarregamento();
    } catch (err) {
      console.error(err);
      showAlert("Erro ao excluir carregamento.", "error");
    }
  };

  return (
    <div>
      <Navbar AlteracaoCadastral />
      <Header />
      <Background />
      <Container>
        <div className={style.content}>
          <div className={style.nav}>
            <div className={style.active}>Alteração Cadastral</div>
          </div>

          <div className={style.searchContainer}>
            <label htmlFor="carregamentoId">Digite o ID do Carregamento:</label>
            <input
              id="carregamentoId"
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="Ex: 12345"
              onKeyDown={onEnter}
            />
            <button onClick={validaDados}>Pesquisar</button>
          </div>

          {carregamento && (
            <div className={style.card}>
              <div className={style.resultContainer}>
                {carregamento.STATUS_CARREG === 8 && (
                  <div
                    style={{
                      backgroundColor: "red",
                      color: "white",
                      padding: 10,
                      textAlign: "center",
                      fontWeight: "bold",
                      borderRadius: 5,
                      marginBottom: 15,
                    }}
                  >
                    ESTE CARREGAMENTO FOI EXCLUÍDO
                  </div>
                )}

                <h3>Detalhes do Carregamento</h3>
                <div>
                  <b>ID:</b> {carregamento.ID_CARREGAMENTO}
                </div>
                <div>
                  <b>Código Operação:</b> {carregamento.COD_OPERACAO}
                </div>

                {/* Cavalo */}
                <div className={style.line}>
                  <b>Cavalo: </b>
                  {mostaInput2 ? (
                    <>
                      <input
                        onChange={(e) => setPlacaCavalo(e.target.value.toUpperCase())}
                        placeholder="Placa do cavalo"
                        className={style.inputline}
                        type="text"
                      />
                      <button onClick={validaCavalo} className={style.buttontline} type="button">
                        <i className="fa fa-check" aria-hidden="true" />
                      </button>
                      <button
                        className={style.buttontlinecancel}
                        onClick={() => setMostaInput2(false)}
                        type="button"
                      >
                        <i className="fa fa-times" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      {carregamento.PLACA_CAVALO || ""}
                      {isEditingEnabled && (
                        <span>
                          <i
                            onClick={() => setMostaInput2(true)}
                            className="fa fa-pencil-square-o"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* 1ª Carreta */}
                <div className={style.line}>
                  <b>1° Carreta:</b>
                  {mostaInput3 ? (
                    <>
                      <input
                        onChange={(e) => setPlaca1(e.target.value.toUpperCase())}
                        placeholder="Placa 1"
                        className={style.inputline}
                        type="text"
                      />
                      <button onClick={validaPlaca1} className={style.buttontline} type="button">
                        <i className="fa fa-check" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setMostaInput3(false)}
                        className={style.buttontlinecancel}
                        type="button"
                      >
                        <i className="fa fa-times" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      {carregamento.PLACA_CARRETA || ""}
                      {isEditingEnabled && (
                        <span>
                          <i
                            onClick={() => setMostaInput3(true)}
                            className="fa fa-pencil-square-o"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* 2ª Carreta */}
                <div className={style.line}>
                  <b>2° Carreta:</b>
                  {mostaInput4 ? (
                    <>
                      <input
                        onChange={(e) => setPlaca2(e.target.value.toUpperCase())}
                        placeholder="Placa 2"
                        className={style.inputline}
                        type="text"
                      />
                      <button onClick={validaplaca2} className={style.buttontline} type="button">
                        <i className="fa fa-check" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setMostaInput4(false)}
                        className={style.buttontlinecancel}
                        type="button"
                      >
                        <i className="fa fa-times" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      {carregamento.PLACA_CARRETA2 || ""}
                      {isEditingEnabled && (
                        <span>
                          <i
                            onClick={() => setMostaInput4(true)}
                            className="fa fa-pencil-square-o"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* 3ª Carreta */}
                <div className={style.line}>
                  <b>3° Carreta:</b>
                  {mostaInput5 ? (
                    <>
                      <input
                        onChange={(e) => setPlaca3(e.target.value.toUpperCase())}
                        placeholder="Placa 3"
                        className={style.inputline}
                        type="text"
                      />
                      <button onClick={validaplaca3} className={style.buttontline} type="button">
                        <i className="fa fa-check" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setMostaInput5(false)}
                        className={style.buttontlinecancel}
                        type="button"
                      >
                        <i className="fa fa-times" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      {carregamento.PLACA_CARRETA3 || ""}
                      {isEditingEnabled && (
                        <span>
                          <i
                            onClick={() => setMostaInput5(true)}
                            className="fa fa-pencil-square-o"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Tipo de veículo */}
                <div className={style.line}>
                  <b>Tipo do veículo:</b>
                  {mostaInput7 ? (
                    <>
                      <select
                        className={style.inputline}
                        onChange={(e) => setTipoveiculo(e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Selecione uma opção
                        </option>
                        {tipoveiculos?.map((val) => (
                          <option key={val.COD_TIPO} value={val.COD_TIPO}>
                            {val.DESC_TIPO_VEICULO}
                          </option>
                        ))}
                      </select>
                      <button onClick={validaVeiculo} className={style.buttontline} type="button">
                        <i className="fa fa-check" aria-hidden="true" />
                      </button>
                      <button
                        className={style.buttontlinecancel}
                        onClick={() => setMostaInput7(false)}
                        type="button"
                      >
                        <i className="fa fa-times" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      {carregamento.DESC_TIPO_VEICULO || ""}
                      {isEditingEnabled && (
                        <span>
                          <i
                            onClick={() => setMostaInput7(true)}
                            className="fa fa-pencil-square-o"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* 1ª Pesagem (tara) */}
                <div className={style.line}>
                  <b>1º Pesagem (tara):</b>
                  {mostaInput6 ? (
                    <>
                      <input
                        onChange={(e) => setTara(e.target.value)}
                        placeholder="Peso da TARA"
                        className={style.inputline}
                        type="text"
                      />
                      <button onClick={validaTara} className={style.buttontline} type="button">
                        <i className="fa fa-check" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setMostaInput6(false)}
                        className={style.buttontlinecancel}
                        type="button"
                      >
                        <i className="fa fa-times" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      {carregamento.PESO_TARA ?? ""}
                      {isEditingEnabled && (
                        <span>
                          <i
                            onClick={() => setMostaInput6(true)}
                            className="fa fa-pencil-square-o"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* 2ª Pesagem (moega) */}
                <div className={style.line}>
                  <b>2ª Pesagem (moega):</b>
                  {mostaInput9 ? (
                    <>
                      <input
                        onChange={(e) => setMoega(e.target.value)}
                        placeholder="Peso da MOEGA"
                        className={style.inputline}
                        type="text"
                      />
                      <button onClick={validaMoega} className={style.buttontline} type="button">
                        <i className="fa fa-check" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setMostaInput9(false)}
                        className={style.buttontlinecancel}
                        type="button"
                      >
                        <i className="fa fa-times" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      {carregamento.PESO_CARREGADO ?? ""}
                      {isEditingEnabled && (
                        <span>
                          <i
                            onClick={() => setMostaInput9(true)}
                            className="fa fa-pencil-square-o"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Pedido MIC */}
                <div className={style.line}>
                  <b>Pedido MIC:</b>
                  {mostaInput8 ? (
                    <>
                      <select
                        className={style.inputline}
                        onChange={(e) => setPedido(e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Selecione uma opção
                        </option>
                        {pedidos?.map((val) => (
                          <option key={val.NR_PEDIDO} value={val.NR_PEDIDO}>
                            {val.NR_PEDIDO}
                          </option>
                        ))}
                      </select>
                      <button onClick={validaPedido} className={style.buttontline} type="button">
                        <i className="fa fa-check" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setMostaInput8(false)}
                        className={style.buttontlinecancel}
                        type="button"
                      >
                        <i className="fa fa-times" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      {carregamento.PEDIDO_MIC ?? ""}
                      {isEditingEnabled && (
                        <span>
                          <i
                            onClick={() => setMostaInput8(true)}
                            className="fa fa-pencil-square-o"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Transportadora */}
                <div className={style.line}>
                  <b>Transportadora: </b>
                  {mostaInput10 ? (
                    <>
                      <select
                        className={style.inputline}
                        onChange={(e) => setTransportadora(e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Selecione uma opção
                        </option>
                        {transportadoras?.map((val) => (
                          <option key={val.COD_TRANSP} value={val.COD_TRANSP}>
                            {val.NOME_TRANSP}
                          </option>
                        ))}
                      </select>
                      <button onClick={validaTransp} className={style.buttontline} type="button">
                        <i className="fa fa-check" aria-hidden="true" />
                      </button>
                      <button
                        className={style.buttontlinecancel}
                        onClick={() => setMostaInput10(false)}
                        type="button"
                      >
                        <i className="fa fa-times" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      {carregamento.NOME_TRANSP ?? ""}
                      {isEditingEnabled && (
                        <span>
                          <i
                            onClick={() => setMostaInput10(true)}
                            className="fa fa-pencil-square-o"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Excluir carregamento */}
                {isEditingEnabled && (
                  <div>
                    <button className={style.deleteButton} onClick={AbrirConfirm} type="button">
                      <i className="fa fa-trash icons" aria-hidden="true" /> Excluir Carregamento
                    </button>
                  </div>
                )}

                {/* Modal confirmação exclusão */}
                <Confirm open={openC} onClose={FecharConfirm} fullWidth>
                  <div className={confirm.modal}>
                    <div className={confirm.center}>
                      Deseja excluir o carregamento '{id}' ?
                      <br />
                      <div>Essa ação não poderá ser desfeita!</div>
                    </div>
                    <div className={confirm.center}>
                      <div className={modal.textbox}>
                        Motivo da exclusão:
                        <textarea
                          rows="3"
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                        />
                      </div>
                    </div>
                    <br />
                    <div className={confirm.flex}>
                      <button className={confirm.confirmar} onClick={confirmaAlteracao} type="button">
                        CONFIRMAR
                      </button>
                      <button className={confirm.cancelar} onClick={FecharConfirm} type="button">
                        CANCELAR
                      </button>
                    </div>
                  </div>
                </Confirm>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};

export default function IntegrationNotistack() {
  return (
    <SnackbarProvider
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      maxSnack={3}
      autoHideDuration={2500}
    >
      <AlteracaoCadastral />
    </SnackbarProvider>
  );
}
