import React, { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import Brackground from "../../components/Background";
import Container from "../../components/Container";
import Header from "../../components/Header";
import style from "./CadastroInfo.module.css";
import { SnackbarProvider, useSnackbar } from "notistack";
import InputMask from "react-input-mask";
import { api } from "../../api"; // usa baseURL do .env

const CadastroInfo = () => {
  const { enqueueSnackbar } = useSnackbar();

  const usuario =
    JSON.parse(localStorage.getItem("user_token") || "{}")?.id ?? null;

  const [activeButton, setActiveButton] = useState(null);

  // Campos comuns/dinâmicos
  const [inputValue, setInputValue] = useState("");
  const [cnpjValue, setCnpjValue] = useState("");
  const [nomereduzido, setNomeReduzido] = useState("");

  // Pedido
  const [operacoesList, setOperacoesList] = useState([]);
  const [navio, setNavio] = useState(""); // COD_OPERACAO
  const [docs, setDocs] = useState([]);
  const [doc, setDoc] = useState("");
  const [transportadoras, setTransportadoras] = useState([]);
  const [transportadora, setTransportadora] = useState("");

  // Consulta (tabelas)
  const [consultaData, setConsultaData] = useState([]);

  // NCM
  const [ncmCode, setNcmCode] = useState("");
  const [ncmDescription, setNcmDescription] = useState("");

  // Lista local apenas para exibir o que foi adicionado nesta tela (não obrigatório)
  const [items, setItems] = useState({
    Pedido: [],
    Transportadora: [],
    Importador: [],
    Destino: [],
    NCM: [],
    Produto: [],
  });

  useEffect(() => {
    getOperacoes();
    getTransportadoras();
  }, []);

  const handleButtonClick = (button) => {
    setActiveButton(button);
    // reset de campos
    setInputValue("");
    setCnpjValue("");
    setNomeReduzido("");
    setNcmCode("");
    setNcmDescription("");
    setNavio("");
    setDoc("");
    setTransportadora("");
    setConsultaData([]);
  };

  // ------- Fetch helpers
  const getOperacoes = async () => {
    try {
      const { data } = await api.get("/operacao");
      // se o backend simples retornar um array puro, use direto
      setOperacoesList(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error(err);
      enqueueSnackbar("Erro ao buscar operações", { variant: "error" });
    }
  };

  const getCargas = async (codOperacao) => {
    if (!codOperacao) return;
    try {
      const { data } = await api.get(`/carga/busca/${codOperacao}`);
      setDocs(data || []);
    } catch (err) {
      console.error(err);
      enqueueSnackbar("Erro ao buscar documentos (DI/BL)", { variant: "error" });
    }
  };

  const getTransportadoras = async () => {
    try {
      const { data } = await api.get("/transportadora/consultar");
      setTransportadoras(data || []);
    } catch (err) {
      console.error(err);
      enqueueSnackbar("Erro ao buscar transportadoras", { variant: "error" });
    }
  };

  // ------- Validação
  const validateFields = () => {
    switch (activeButton) {
      case "Transportadora":
        if (!inputValue || !cnpjValue) {
          enqueueSnackbar("Preencha nome e CNPJ.", { variant: "error" });
          return false;
        }
        return true;

      case "Importador":
        if (!inputValue || !cnpjValue || !nomereduzido) {
          enqueueSnackbar("Preencha nome, CNPJ e nome reduzido.", {
            variant: "error",
          });
          return false;
        }
        return true;

      case "Destino":
        if (!inputValue) {
          enqueueSnackbar("Preencha o nome do destino.", { variant: "error" });
          return false;
        }
        return true;

      case "NCM":
        if (!ncmCode || !ncmDescription) {
          enqueueSnackbar("Preencha código e descrição do NCM.", {
            variant: "error",
          });
          return false;
        }
        return true;

      case "Produto":
        if (!inputValue) {
          enqueueSnackbar("Preencha os dados do produto.", {
            variant: "error",
          });
          return false;
        }
        return true;

      case "Pedido":
        if (!navio || !inputValue || !transportadora || !doc) {
          enqueueSnackbar(
            "Selecione navio, DI/BL, transportadora e informe o nº do pedido.",
            { variant: "error" }
          );
          return false;
        }
        return true;

      default:
        enqueueSnackbar("Selecione um tipo para cadastrar.", {
          variant: "error",
        });
        return false;
    }
  };

  // ------- Adicionar (POST)
  const handleAddItem = async () => {
    if (!validateFields()) return;

    const cnpjSemMascara = cnpjValue.replace(/[^\d]/g, "");

    try {
      switch (activeButton) {
        case "Transportadora":
          await api.post("/transportadora/criar", {
            nome: inputValue,
            cnpj: cnpjSemMascara,
            usuario,
          });
          enqueueSnackbar("Transportadora adicionada!", { variant: "success" });
          break;

        case "Importador":
          await api.post("/importador/criar", {
            nome: inputValue,
            cnpj: cnpjSemMascara,
            nomereduzido,
            usuario,
          });
          enqueueSnackbar("Importador adicionado!", { variant: "success" });
          break;

        case "Destino":
          await api.post("/destino/criar", {
            nome: inputValue,
            usuario,
          });
          enqueueSnackbar("Destino adicionado!", { variant: "success" });
          break;

        case "NCM":
          await api.post("/ncm/criar", {
            codncm: ncmCode,
            descricao: ncmDescription,
            usuario,
          });
          enqueueSnackbar("NCM adicionado!", { variant: "success" });
          break;

        case "Produto":
          // Ajuste conforme os campos reais no backend
          await api.post("/produto/criar", {
            descricao: inputValue,
            usuario,
          });
          enqueueSnackbar("Produto adicionado!", { variant: "success" });
          break;

        case "Pedido":
          await api.post("/pedido/criar", {
            operacao: navio, // COD_OPERACAO
            pedido: inputValue, // nº pedido
            transportadora,
            documento: doc, // COD_CARGA
            usuario,
          });
          enqueueSnackbar("Pedido adicionado!", { variant: "success" });
          break;

        default:
          break;
      }

      // adiciona na listinha local só para exibição
      setItems((prev) => ({
        ...prev,
        [activeButton]: [...prev[activeButton], inputValue || ncmCode],
      }));

      // reset de campos de entrada principais
      setInputValue("");
    } catch (error) {
      console.error(error);
      const msg =
        error?.response?.data?.message ||
        error?.response?.data ||
        "Erro ao salvar.";
      // tentativa simples de detectar duplicidade por texto
      if (String(msg).toLowerCase().includes("duplic")) {
        enqueueSnackbar(`Erro: registro já existe`, { variant: "error" });
      } else {
        enqueueSnackbar(String(msg), { variant: "error" });
      }
    }
  };

  // ------- Consultar (GET)
  const handleConsultador = async (tabela) => {
    try {
      let url = "";
      switch (tabela) {
        case "Transportadora":
          url = "/transportadora/consultar";
          break;
        case "Importador":
          url = "/importador/consultar";
          break;
        case "Destino":
          url = "/destino/consultar";
          break;
        case "NCM":
          url = "/ncm/consultar";
          break;
        case "Produto":
          url = "/produto/consultar";
          break;
        case "Pedido":
          url = "/pedido/consultar";
          break;
        default:
          enqueueSnackbar("Selecione algo para consultar.", {
            variant: "warning",
          });
          return;
      }

      const { data } = await api.get(url);
      setConsultaData(Array.isArray(data) ? data : []);
      enqueueSnackbar(`${tabela} consultado com sucesso!`, {
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      enqueueSnackbar(`Erro ao consultar ${tabela}`, { variant: "error" });
    }
  };

  // ------- Render tabela de consulta
  const renderTable = () => {
    if (!consultaData.length) return null;

    const headers = Object.keys(consultaData[0] || {});

    return (
      <table className={style.table}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {consultaData.map((row, i) => (
            <tr key={i}>
              {headers.map((h) => (
                <td key={h}>{row[h]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <>
      <Navbar cargas />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          <div className={style.nav}>
            <div className={style.active}>Cadastrar</div>
          </div>

          <div className={style.buttonGroup}>
            {/* <button className={style.button} onClick={() => handleButtonClick('Pedido')}>Pedido</button> */}
            <button
              className={style.button}
              onClick={() => handleButtonClick("Transportadora")}
            >
              Transportadora
            </button>
            <button
              className={style.button}
              onClick={() => handleButtonClick("Importador")}
            >
              Importador
            </button>
            <button
              className={style.button}
              onClick={() => handleButtonClick("Destino")}
            >
              Destino
            </button>
            <button
              className={style.button}
              onClick={() => handleButtonClick("NCM")}
            >
              NCM
            </button>
            <button
              className={style.button}
              onClick={() => handleButtonClick("Produto")}
            >
              Produto
            </button>
          </div>

          {/* FORM GERAL (exceto NCM e Pedido) */}
          {activeButton &&
            activeButton !== "NCM" &&
            activeButton !== "Pedido" && (
              <div className={style.form}>
                <h3>Cadastrar {activeButton}</h3>

                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={`Digite aqui (${activeButton})`}
                />

                {(activeButton === "Transportadora" ||
                  activeButton === "Importador") && (
                  <InputMask
                    mask="99.999.999/9999-99"
                    value={cnpjValue}
                    onChange={(e) => setCnpjValue(e.target.value)}
                    placeholder="Digite o CNPJ"
                  />
                )}

                {activeButton === "Importador" && (
                  <input
                    type="text"
                    value={nomereduzido}
                    onChange={(e) => setNomeReduzido(e.target.value)}
                    placeholder="Digite o nome reduzido"
                  />
                )}

                <button className={style.button} onClick={handleAddItem}>
                  Adicionar {activeButton}
                </button>
                <button
                  className={style.button}
                  onClick={() => handleConsultador(activeButton)}
                >
                  Consultar
                </button>

                {renderTable()}

                <ul>
                  {items[activeButton].map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

          {/* NCM */}
          {activeButton === "NCM" && (
            <div className={style.form}>
              <h3>Cadastrar NCM</h3>

              <input
                type="text"
                value={ncmCode}
                onChange={(e) => setNcmCode(e.target.value)}
                placeholder="Digite o código NCM"
              />
              <input
                type="text"
                value={ncmDescription}
                onChange={(e) => setNcmDescription(e.target.value)}
                placeholder="Descrição do NCM"
              />

              <button className={style.button} onClick={handleAddItem}>
                Adicionar NCM
              </button>
              <button
                className={style.button}
                onClick={() => handleConsultador(activeButton)}
              >
                Consultar
              </button>

              {renderTable()}
            </div>
          )}

          {/* Pedido */}
          {activeButton === "Pedido" && (
            <div className={style.form}>
              <h3>Cadastrar Pedido</h3>

              <div className={style.form_control}>
                <label>Navio (operação):</label>
                <select
                  value={navio}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNavio(v);
                    setDoc("");
                    getCargas(v);
                  }}
                >
                  <option value="" disabled>
                    Selecione um navio (operação)
                  </option>
                  {operacoesList
                    ?.filter((o) => o.STATUS_OPERACAO !== "FECHADA")
                    .map((val) => (
                      <option
                        key={val.COD_OPERACAO}
                        value={val.COD_OPERACAO}
                      >
                        {val.NOME_NAVIO}
                      </option>
                    ))}
                </select>

                <label>Código da operação (DI ou BL):</label>
                <select value={doc} onChange={(e) => setDoc(e.target.value)}>
                  <option value="" disabled>
                    Selecione uma opção
                  </option>
                  {docs?.map((val) => (
                    <option key={val.COD_CARGA} value={val.COD_CARGA}>
                      {val.TIPO} - {val.NUMERO}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Digite o número do pedido"
                  disabled={!navio}
                />

                <label>Transportadora:</label>
                <select
                  value={transportadora}
                  onChange={(e) => setTransportadora(e.target.value)}
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

                {!navio && (
                  <p style={{ color: "red" }}>
                    Selecione um navio antes de inserir o número do pedido
                  </p>
                )}

                <button
                  className={style.button}
                  onClick={handleAddItem}
                  disabled={!navio || !doc || !inputValue || !transportadora}
                >
                  Adicionar Pedido
                </button>

                <button
                  className={style.button}
                  onClick={() => handleConsultador(activeButton)}
                >
                  Consultar
                </button>
              </div>

              {renderTable()}
            </div>
          )}
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
      <CadastroInfo />
    </SnackbarProvider>
  );
}
