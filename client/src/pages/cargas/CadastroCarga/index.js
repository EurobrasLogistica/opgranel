import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Dialog from "@mui/material/Dialog";
import { SnackbarProvider, useSnackbar } from "notistack";
import moment from "moment";

import { api } from "../../../api"; // <- baseURL do .env
import Navbar from "../../../components/Navbar";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import Input from "../../../components/Input";
import SubmitButton from "../../../components/Button";
import MaskedInput from "../../../components/InputMask";

import style from "./CadastroCarga.module.css";
import modal from "./Modal.module.css";

const CadastroCarga = () => {
  const navigate = useNavigate();
  const { id, nome } = useParams();
  const { enqueueSnackbar } = useSnackbar();

  const userToken = localStorage.getItem("user_token");
  const usuario = userToken ? JSON.parse(userToken).id : null;

  // Campos do formulário
  const [tipo, setTipo] = useState("");
  const [perigo, setPerigo] = useState("");          // "S" | "N"
  const [emitirNF, setEmitirNF] = useState("");      // "S" | "N"
  const [numero, setNumero] = useState("");
  const [emissao, setEmissao] = useState("");
  const [produto, setProduto] = useState("");
  const [ncm, setNcm] = useState("");
  const [manifestado, setManifestado] = useState(""); // string → parse p/ número
  const [cemercante, setCemercante] = useState("");

  // Listas
  const [clientesList, setClientesList] = useState([]);
  const [clienteSel, setClienteSel] = useState("");  // id do cliente selecionado
  const [ncms, setNcms] = useState([]);
  const [produtos, setProdutos] = useState([]);

  // Cargas já cadastradas
  const [cargas, setCargas] = useState([]);
  const [loadingListas, setLoadingListas] = useState(false);
  const [loadingCargas, setLoadingCargas] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Dialog "Concluir"
  const [openConfirm, setOpenConfirm] = useState(false);

  const showAlert = (txt, variant) => enqueueSnackbar(txt, { variant });

  useEffect(() => {
    carregarListas();
    carregarCargas(); // primeira carga normal (sem force)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
  setTipo("");
  setPerigo("");
  setEmitirNF("");
  setNumero("");
  setEmissao("");
  setProduto("");
  setNcm("");
  setManifestado("");
  setCemercante("");
  setClienteSel("");
};


  const carregarListas = async () => {
    try {
      setLoadingListas(true);
      const [rClientes, rNcm, rProd] = await Promise.all([
        api.get("/clientes", { params: { t: Date.now() } }),
        api.get("/ncm",      { params: { t: Date.now() } }),
        api.get("/produtos", { params: { t: Date.now() } }),
      ]);

      setClientesList(Array.isArray(rClientes.data) ? rClientes.data : []);
      setNcms(Array.isArray(rNcm.data) ? rNcm.data : []);
      setProdutos(Array.isArray(rProd.data) ? rProd.data : []);
    } catch (err) {
      console.error("[carregarListas][ERR]", err);
      showAlert("Erro ao carregar listas (clientes/NCM/produtos).", "error");
    } finally {
      setLoadingListas(false);
    }
  };

  // aceita "force" pra forçar no-store e cache-busting apenas quando precisa
  const carregarCargas = async (force = false) => {
    try {
      setLoadingCargas(true);
      const config = {
        params: { t: force ? Date.now() : undefined },
        headers: force ? { "Cache-Control": "no-store" } : undefined,
      };
      const { data } = await api.get(`/carga/busca/${id}`, config);
      setCargas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[carregarCargas][ERR]", err);
      showAlert("Erro ao carregar cargas.", "error");
    } finally {
      setLoadingCargas(false);
    }
  };

  // Soma total (Kg)
  const total = useMemo(
    () =>
      (cargas || []).reduce(
        (acc, item) => acc + Number(item?.QTDE_MANIFESTADA ?? 0),
        0
      ),
    [cargas]
  );

  const getDateNowMinus3 = () => {
    const date = new Date();
    date.setHours(date.getHours() - 3);
    return date.toISOString().slice(0, 19).replace("T", " ");
  };

  const normalizaNumero = (txt) => {
    if (!txt) return 0;
    // troca vírgula por ponto, remove separadores
    const n = String(txt).replace(/\./g, "").replace(",", ".").trim();
    const val = Number(n);
    return Number.isFinite(val) ? val : 0;
  };

  // Garante máscara "99/9999999-9" mesmo se colarem só dígitos
  const ensureMaskedNumero = (raw) => {
    if (!raw) return "";
    const digits = String(raw).replace(/\D/g, "");
    if (digits.length !== 10) return ""; // precisa de 10 dígitos
    return `${digits.slice(0,2)}/${digits.slice(2,9)}-${digits.slice(9)}`;
  };

  // Extrai "####-X" do trecho após a "/"
  // Ex.: "23/2335128-0" -> "5128-0"
  const extraiReferenciaFromNumero = (num) => {
    if (!num) return "";
    const afterSlash = String(num).toUpperCase().split("/")[1] || "";
    const m = afterSlash.match(/(\d{4}-[A-Z0-9])$/);
    if (m) return m[1];
    return afterSlash.slice(-6); // fallback
  };

  const validaDados = () => {
    if (!tipo || !numero || !clienteSel || !emissao || !produto || !ncm || !cemercante || !manifestado) {
      showAlert("Preencha todos os campos!", "error");
      return false;
    }
    if (!usuario) {
      showAlert("Sessão expirada. Faça login novamente.", "error");
      return false;
    }
    if (!["S", "N"].includes(perigo) || !["S", "N"].includes(emitirNF)) {
      showAlert("Selecione as opções de Perigoso e Emissão de NF.", "error");
      return false;
    }
    const kg = normalizaNumero(manifestado);
    if (kg <= 0) {
      showAlert("Quantidade manifestada deve ser maior que zero.", "error");
      return false;
    }
    return true;
  };

  // Após ADICIONAR, recarrega a lista com force=true
  const addCarga = async () => {
    if (!validaDados()) return;

    // Sempre garantir máscara antes de enviar
    const numeroFmt =
      /^\d{2}\/\d{7}-[A-Za-z0-9]$/.test(numero) ? numero : ensureMaskedNumero(numero);

    if (!numeroFmt) {
      showAlert('Número do documento inválido. Use 10 dígitos (ex.: "23/2335128-0").', "error");
      return;
    }

    const referencia = extraiReferenciaFromNumero(numeroFmt);
    if (!referencia) {
      showAlert("Não foi possível derivar a referência a partir do número do documento.", "error");
      return;
    }

    const payload = {
      operacao: id,
      tipo: (tipo || "").toUpperCase(),     // BL/DI
      perigo,                                // "S"/"N"
      numero: numeroFmt,                     // << Envia COM a máscara
      referencia,                            // << "####-X"
      emissao: moment(emissao).format("YYYY-MM-DD"),
      cliente: clienteSel,                   // ID do cliente
      produto,                               // ID do produto
      ncm,                                   // código NCM
      cemercante: (cemercante || "").toUpperCase(),
      manifestado: normalizaNumero(manifestado),
      status: "1",
      emitirNF,                              // "S"/"N"
      usuario,
      datacadastro: getDateNowMinus3(),
    };

    try {
      setSalvando(true);
      const res = await api.post("/carga/criar", payload, {
        headers: { "Cache-Control": "no-store" },
      });

      if (res?.data?.ok === false || res?.data?.sqlMessage) {
        showAlert(res?.data?.message || res?.data?.sqlMessage || "Erro ao cadastrar carga.", "error");
        return;
      }

      showAlert("Carga cadastrada com sucesso!", "success");

      resetForm();

      // limpa campos principais
      setNumero("");
      setManifestado("");
      setCemercante("");

      // força reload apenas agora
      await carregarCargas(true);
    } catch (err) {
      console.error("[addCarga][ERR]", err);
      showAlert(err?.response?.data?.message || "Erro ao cadastrar carga.", "error");
    } finally {
      setSalvando(false);
    }
  };

  // Após EXCLUIR, recarrega a lista com force = true
  const deleteCarga = async (idCarga) => {
    if (!idCarga) return;
    try {
      const res = await api.delete(`/carga/delete/${idCarga}`, {
        headers: { "Cache-Control": "no-store" },
        params: { t: Date.now() }, // cache-bust
      });

      if (res?.data?.ok === false || res?.data?.sqlMessage) {
        showAlert(res?.data?.message || res?.data?.sqlMessage || "Erro ao deletar carga.", "error");
        return;
      }

      showAlert("Carga deletada com sucesso!", "success");
      await carregarCargas(true); // força o refresh
    } catch (err) {
      console.error("[deleteCarga][ERR]", err);
      showAlert(err?.response?.data?.message || "Erro ao deletar carga.", "error");
    }
  };

  const abrirConfirm = () => {
    if (!cargas || cargas.length === 0) {
      showAlert("Nenhuma carga cadastrada. Insira uma carga para continuar!", "error");
      return;
    }
    setOpenConfirm(true);
  };

  const fecharConfirm = () => setOpenConfirm(false);

  const concluirDocs = async () => {
    try {
      const res = await api.put("/operacao/concluir/docs", {
        id,
        status: "AGUARDANDO ATRACAÇÃO",
      });

      if (res?.data?.ok === false || res?.data?.sqlMessage) {
        showAlert(res?.data?.message || res?.data?.sqlMessage || "Erro ao concluir.", "error");
        return;
      }

      showAlert("Documentação concluída com sucesso!", "success");
      fecharConfirm();
      setTimeout(() => navigate("/cargas"), 1200);
    } catch (err) {
      console.error("[concluirDocs][ERR]", err);
      showAlert(err?.response?.data?.message || "Erro ao concluir documentação.", "error");
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
            <div onClick={() => navigate("/cargas")}>Voltar</div>
            <div className={style.active}>Cadastrar Carga</div>
          </div>

          <div className={style.navio}>
            <i className="fa fa-ship icon" />
            &nbsp;&nbsp;&nbsp;{nome}
          </div>

          {/* Linha 1: Tipo | Número | Perigoso | Emitir NF */}
          <div className={style.flex}>
            <div className={style.form_control}>
              <label>Tipo:</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="" disabled>Selecione uma opção</option>
                <option value="BL">BL</option>
                <option value="DI">DI</option>
              </select>
            </div>

            {/* Número do documento (máscara: 99/9999999-9) */}
            <MaskedInput
              text="Número do documento"
              mask="99/9999999-9"
              placeholder="00/0000000-0"
              value={numero}
              onChange={(e) => setNumero(e.target.value || "")}
            />

            <div className={style.form_control}>
              <label>Produto Perigoso:</label>
              <select value={perigo} onChange={(e) => setPerigo(e.target.value)}>
                <option value="" disabled>Selecione uma opção</option>
                <option value="S">Sim</option>
                <option value="N">Não</option>
              </select>
            </div>

            <div className={style.form_control}>
              <label>Emissão de Nota Fiscal:</label>
              <select value={emitirNF} onChange={(e) => setEmitirNF(e.target.value)}>
                <option value="" disabled>Selecione uma opção</option>
                <option value="S">Sim</option>
                <option value="N">Não</option>
              </select>
            </div>
          </div>

          {/* Linha 2: Importador | Emissão */}
          <div className={style.flex}>
            <div className={style.form_control}>
              <label>Importador:</label>
              <select value={clienteSel} onChange={(e) => setClienteSel(e.target.value)}>
                <option value="" disabled>Selecione uma opção</option>
                {clientesList.map((cli) => (
                  <option key={cli.COD_CLIENTE} value={String(cli.COD_CLIENTE)}>
                    {cli.NOME_CLIENTE} - CNPJ: {cli.CNPJ_CLIENTE}
                  </option>
                ))}
              </select>
            </div>

            <Input
              type="date"
              text="Selecione a Data de Emissão"
              value={emissao}
              onChange={(e) => setEmissao(e.target.value)}
            />
          </div>

          {/* Linha 3: NCM | Produto | Qtde | CE Mercante */}
          <div className={style.flex}>
            <div className={style.form_control}>
              <label>NCM:</label>
              <select value={ncm} onChange={(e) => setNcm(e.target.value)}>
                <option value="" disabled>Selecione uma opção</option>
                {ncms.map((n) => (
                  <option key={n.COD_NCM} value={String(n.COD_NCM)}>
                    {n.COD_NCM} - {n.DESCRICAO_NCM}
                  </option>
                ))}
              </select>
            </div>

            <div className={style.form_control}>
              <label>Produto:</label>
              <select value={produto} onChange={(e) => setProduto(e.target.value)}>
                <option value="" disabled>Selecione uma opção</option>
                {produtos.map((p) => (
                  <option key={p.COD_PRODUTO} value={String(p.COD_PRODUTO)}>
                    {p.PRODUTO}
                  </option>
                ))}
              </select>
            </div>

            <Input
              type="text"
              text="Qtde Manifestada (Kg)"
              value={manifestado}
              onChange={(e) => setManifestado(e.target.value)}
              placeholder="Ex.: 120000 ou 120.000,00"
            />

            <Input
              type="text"
              text="CE Mercante"
              value={cemercante}
              onChange={(e) => setCemercante((e.target.value || "").toUpperCase())}
            />
          </div>

          {/* Histórico */}
          <div className={style.listatitulo}>Histórico</div>
          <div className={style.cargas}>
            <div className={style.sumario}>
              <div>TIPO</div>
              <div>CÓDIGO</div>
              <div>REFERÊNCIA</div>
              <div>DT. EMISSÃO</div>
              <div>PERIGO</div>
              <div>IMPORTADOR</div>
              <div>PRODUTO</div>
              <div>NCM</div>
              <div>QT. MANIFESTADA</div>
              <div>CE MERCANTE</div>
              <div></div>
            </div>

            <div className={style.lista}>
              {loadingCargas && "Carregando cargas…"}
              {!loadingCargas && cargas.length === 0
                ? "nenhuma carga identificada"
                : !loadingCargas &&
                  cargas.map((val) => (
                    <div className={style.item} key={val.COD_CARGA}>
                      <div>{val.TIPO}</div>
                      <div>{val.NUMERO}</div>
                      <div>{val.REFERENCIA}</div>
                      <div>{val.DATA_EMISSAO ? moment(val.DATA_EMISSAO).format("DD/MM/YYYY") : "-"}</div>
                      <div>{val.PERIGOSO}</div>
                      <div>{val.IMPORTADOR}</div>
                      <div>{val.PRODUTO}</div>
                      <div>{val.NCM}</div>
                      <div>
                        {(val.QTDE_MANIFESTADA || 0).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div>{val.CE_MERCANTE}</div>
                      <div>
                        <span className={style.delete}>
                          <i
                            className="fa fa-trash"
                            onClick={() => deleteCarga(val.COD_CARGA)}
                          />
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Ações finais */}
          <div className={style.flex}>
            <SubmitButton text={salvando ? "Salvando..." : "ADICIONAR"} onClick={addCarga} />
            <div className={style.total}>
              TOTAL DO NAVIO
              <div>
                {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} KG
              </div>
            </div>
            <SubmitButton text="CONCLUIR" onClick={abrirConfirm} />
          </div>
        </div>
      </Container>

      {/* Dialog Confirmar Conclusão */}
      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)} fullWidth>
        <div className={modal.modal}>
          <div className={modal.nav}>
            <div onClick={() => setOpenConfirm(false)}>Voltar</div>
            <div className={modal.active}>Concluir Documentação</div>
          </div>
          <div className={modal.center}>
            Deseja concluir a documentação desta operação?
            <br />
            <div>O status será alterado para <b>AGUARDANDO ATRACAÇÃO</b>.</div>
          </div>
          <div className={modal.center} style={{ marginTop: 12 }}>
            <button className={modal.finalizar} onClick={concluirDocs}>
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
      <CadastroCarga />
    </SnackbarProvider>
  );
}
