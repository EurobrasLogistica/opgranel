import React, { useEffect, useState, useCallback } from "react";
import { SnackbarProvider, useSnackbar } from "notistack";
import { useNavigate, useParams } from "react-router-dom";
import Axios from "axios";

import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import Navbar from "../../../components/Navbar";
import SubmitButton from "../../../components/Button";
import style from "./RelatorioPeriodo.module.css";
import * as XLSX from "xlsx";

// === Base da API: localhost em dev, produção no build (igual Navios) ===
const API_BASE =
  process.env.REACT_APP_SERVER ||
  (window.location.hostname === "localhost"
    ? "http://localhost:3009"
    : "https://opgranel.eurobraslogistica.com.br/api");

Axios.defaults.baseURL = API_BASE;
Axios.defaults.headers.common["Content-Type"] = "application/json; charset=utf-8";

const safeNumber = (n, def = 0) => (Number.isFinite(Number(n)) ? Number(n) : def);

const RelatorioPeriodo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // principais
  const [periodoLista, setPeriodoLista] = useState([]);
  const [relatorios, setRelatorios] = useState("");
  const [operacoes, setOperacoes] = useState([]);
  const [autos, setAutos] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [dadosDash, setDadosDash] = useState({});
  const [paralisacoes, setParalisacoes] = useState([]);

  // auxiliares
  const [busca, setBusca] = useState("");

  // compat
  const [equipamentos, setEquipamentos] = useState([]);
  const [bercos, setBercos] = useState([]);

  const showAlert = (txt, variant) => enqueueSnackbar(txt, { variant });

  // não dependem de id
  const getEquipamentos = useCallback(async () => {
    try {
      const r = await Axios.get("/equipamentos");
      setEquipamentos(r.data || []);
    } catch { setEquipamentos([]); }
  }, []);

  const getBercos = useCallback(async () => {
    try {
      const r = await Axios.get("/bercos");
      setBercos(r.data || []);
    } catch { setBercos([]); }
  }, []);

  const getPeriodos = useCallback(async () => {
    try {
      const r = await Axios.get("/periodos/horarios");
      setPeriodoLista(r.data || []);
    } catch { setPeriodoLista([]); }
  }, []);

  // dependem de id
  const getPeriodo = useCallback(async () => {
    if (!id) return;
    try {
      const response = await Axios.get(`/periodos/gerais/${id}`);
      setPeriodoLista(response.data || []);
    } catch {}
  }, [id]);

  const DadosDashboard = useCallback(async () => {
    if (!id) return;
    try {
      const res = await Axios.get(`/periodo/dashboard/${id}`);
      const dash = res.data?.[0] || {};
      setDadosDash(dash);
      if (dash?.SEQ_PERIODO_OP) {
        const r2 = await Axios.get(`/paralisacao/periodo/${dash.SEQ_PERIODO_OP}`);
        setParalisacoes(r2.data || []);
      } else {
        setParalisacoes([]);
      }
    } catch {
      setDadosDash({});
      setParalisacoes([]);
    }
  }, [id]);

  const getAutos = useCallback(async () => {
    if (!id) return;
    try {
      const r = await Axios.post(`/periodo/autos/${id}`, { data: relatorios });
      setAutos(r.data || []);
    } catch { setAutos([]); }
  }, [id, relatorios]);

  const getDocumentos = useCallback(async () => {
    if (!id) return;
    try {
      const r = await Axios.post(`/periodo/documentos/${id}`, { data: relatorios });
      setDocumentos(r.data || []);
    } catch { setDocumentos([]); }
  }, [id, relatorios]);

  const getOperacoes = useCallback(async () => {
    if (!id) {
      showAlert("Selecione uma operação/navio primeiro.", "warning");
      return;
    }
    try {
      await Promise.all([getAutos(), getDocumentos()]);
      const response = await Axios.post(`/periodo/carregamentos/${id}`, { data: relatorios });
      setOperacoes(Array.isArray(response.data) ? response.data : []);
    } catch {
      setOperacoes([]);
    }
  }, [id, relatorios, getAutos, getDocumentos, showAlert]);

  // efeito inicial
  useEffect(() => {
    (async () => {
      await Promise.all([getEquipamentos(), getBercos(), getPeriodos()]);
      if (!id) return;
      await Promise.all([getPeriodo(), DadosDashboard()]);
    })();
  }, [id, getEquipamentos, getBercos, getPeriodos, getPeriodo, DadosDashboard]);

  const exportToExcel = (tableData) => {
    const workbook = XLSX.utils.book_new();
    const wsData = (tableData || []).map((val) => [
      val.ID_CARREGAMENTO,
      val.NOME_MOTORISTA,
      val.PLACA_CAVALO,
      safeNumber(val.PESO_TARA).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      safeNumber(val.PESO_CARREGADO).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      safeNumber(val.PESO_BRUTO).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      safeNumber(val.PESO_LIQUIDO).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      val.DOCUMENTO ?? "",
      safeNumber(val.DIFERENCA).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      String(safeNumber(val.PERCENTUAL)),
    ]);
    wsData.unshift([
      "ID","Nome","Placa (Cavalo)","1° Peso (Tara)","2° Peso (Moega)","3° Peso (Bruto)",
      "Peso Liquido","DI/BL","(Liquido - Moega)","(%)",
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio_Periodo");
    XLSX.writeFile(workbook, `relatorio_periodo.xlsx`);
  };

  const handleExportClick = () => exportToExcel(operacoes);

  const downloadNota = async (idCarregamento) => {
    try {
      const res = await Axios.post(`/baixarnota`, { idCarregamento });
      const base = String(res.data?.pdf ?? "");
      const parts = base.split(",");
      const header = parts[0] || "data:application/pdf;base64";
      const content = parts[parts.length - 1] || "";
      const mime = header.split(":")[1]?.split(";")[0] || "application/pdf";

      const byteCharacters = atob(content);
      const byteNumbers = Array.from({ length: byteCharacters.length }, (_, i) =>
        byteCharacters.charCodeAt(i)
      );
      const byteArray = new Uint8Array(byteNumbers);
      const file = new Blob([byteArray], { type: mime });

      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = res.data?.filename || `nota_${idCarregamento}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showAlert("Erro ao obter PDF", "error");
      console.log(err?.response?.data?.mensagem || err);
    }
  };

  const notaHabilitada = (s) => [4, 6].includes(Number(s));

  // sem :id, não mostramos a rota específica (evita navegar para undefined)
  if (!id) {
    return (
      <>
        <Navbar relatorios />
        <Header />
        <Brackground />
        <Container>
          <div className={style.content}>
            <div className={style.nav}>
              <div onClick={() => navigate(`/relatorios`)} style={{ cursor: "pointer" }}>
                Selecione um navio
              </div>
              <div className={style.active}>Relatório por Período</div>
            </div>
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar relatorios />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          <div className={style.nav}>
            <div onClick={() => navigate(`/relatorios`)} style={{ cursor: "pointer" }}>
              Selecione um navio
            </div>
            <div className={style.active}>Relatório por Período</div>
            {/* Agora aparece sempre (com id), mesmo sem resultados */}
            <div onClick={() => navigate(`/relatorios/operacao/${id}`)} style={{ cursor: "pointer" }}>
              Relatório por Operação
            </div>
          </div>

          <div className={style.flex}>
            <div>
              <div className={style.form_control}>
                <label>Selecione um período:</label>
                <select
                  value={relatorios || ""}
                  onChange={(e) => setRelatorios(e.target.value)}
                >
                  <option value="" disabled>Selecione uma opção</option>
                  {periodoLista?.map((val, idx) => (
                    <option key={idx} value={val.PERIODO}>{val.PERIODO}</option>
                  ))}
                </select>

                <div className={style.submit_button}>
                  <SubmitButton text={"Buscar"} onClick={getOperacoes} />
                </div>

                <div className={style.periodo}>
                  <div className={style.data}>{relatorios || "--"}</div>
                </div>
              </div>
            </div>

            {/* Cards agora aparecem mesmo sem dados */}
            <div className={style.cards}>
              <span className={style.cardinfo}>
                <div className={style.box}>
                  <div className="content">
                    <center><i className="fa fa-truck icon"></i> Carregados</center>
                    {autos.length > 0 ? (
                      autos.map((val, idx) => (
                        <div key={idx} className={style.total}>
                          {safeNumber(val.QTDE_AUTOS)} Autos
                        </div>
                      ))
                    ) : (
                      <div className={style.total}>0 Autos</div>
                    )}
                  </div>
                </div>
              </span>

              <span className={style.cardinfo}>
                <div className={style.box}>
                  <div className="content">
                    <center><i className="fa fa-weight-hanging icon"></i> Peso Líquido</center>
                    {autos.length > 0 ? (
                      autos.map((val, idx) => (
                        <div key={idx} className={style.total}>
                          {(safeNumber(val.PESO_LIQUIDO) / 1000).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 3,
                          })} Tons
                        </div>
                      ))
                    ) : (
                      <div className={style.total}>0,00 Tons</div>
                    )}
                  </div>
                </div>
              </span>

              <span className={style.cardinfo_Doc}>
                <div className={style.box}>
                  <div className="content">
                    <center><i className="fa fa-file-text icon"></i> Total de Peso por DI / BL</center>
                    {documentos.length > 0 ? (
                      documentos.map((val, idx) => (
                        <div key={idx} className={style.totalDoc}>
                          <strong>{val.DOC_CARGA}</strong> |{" "}
                          {(safeNumber(val.PESO_LIQUIDO_CARGA) / 1000).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 3,
                          })}{" "}
                          Tons | {safeNumber(val.QTDE_AUTOS_CARGA)} Autos
                        </div>
                      ))
                    ) : (
                      <div className={style.totalDoc}>Nenhum documento no período</div>
                    )}
                  </div>
                </div>
              </span>
            </div>
          </div>

          <div className={style.seacrch}>
            <div className={style.taratitulo}>
              <input
                placeholder="Pesquisar..."
                type="text"
                onChange={(e) => setBusca(e.target.value)}
              />
              <i className="fa fa-search"></i>
            </div>
          </div>

          {/* Tabela sempre visível; mostra placeholder quando vazia */}
          <table className="table">
            <thead>
              <tr>
                <th><abbr title="Id">ID </abbr></th>
                <th><abbr title="Nome">Nome </abbr></th>
                <th><abbr title="Placa do Cavalo">Placa (Cavalo)</abbr></th>
                <th><abbr title="Tara">1° Peso (Tara)</abbr></th>
                <th><abbr title="SegundoPeso">2° Peso (Moega)</abbr></th>
                <th><abbr title="TerceiroPeso">3° Peso (Bruto)</abbr></th>
                <th><abbr title="PesoLiquido">Peso Liquido </abbr></th>
                <th><abbr title="Documento">DI/BL </abbr></th>
                <th><abbr title="Diferenca">(Liquido - Moega)</abbr></th>
                <th><abbr title="DiferencaPerc">(%)</abbr></th>
                <th><abbr title="Nota">Nota Fiscal</abbr></th>
              </tr>
            </thead>

            <tbody>
              {operacoes
                .filter((val) => {
                  if (!busca) return true;
                  const b = busca.toLowerCase();
                  return (
                    String(val.ID_CARREGAMENTO).toLowerCase().includes(b) ||
                    String(val.NOME_MOTORISTA ?? "").toLowerCase().includes(b) ||
                    String(val.PLACA_CAVALO ?? "").toLowerCase().includes(b) ||
                    String(val.PESO_TARA ?? "").toLowerCase().includes(b) ||
                    String(val.PESO_CARREGADO ?? "").toLowerCase().includes(b) ||
                    String(val.PESO_BRUTO ?? "").toLowerCase().includes(b) ||
                    String(val.PESO_LIQUIDO ?? "").toLowerCase().includes(b) ||
                    String(val.DOCUMENTO ?? "").toLowerCase().includes(b) ||
                    String(val.DIFERENCA ?? "").toLowerCase().includes(b) ||
                    String(val.PERCENTUAL ?? "").toLowerCase().includes(b)
                  );
                })
                .map((val, idx) => (
                  <tr key={idx}>
                    <th>{val.ID_CARREGAMENTO}</th>
                    <th>{val.NOME_MOTORISTA}</th>
                    <th>{val.PLACA_CAVALO}</th>
                    <th>{safeNumber(val.PESO_TARA).toLocaleString(undefined, { maximumFractionDigits: 2 })}</th>
                    <th>{safeNumber(val.PESO_CARREGADO).toLocaleString(undefined, { maximumFractionDigits: 2 })}</th>
                    <th>{safeNumber(val.PESO_BRUTO).toLocaleString(undefined, { maximumFractionDigits: 2 })}</th>
                    <th>{safeNumber(val.PESO_LIQUIDO).toLocaleString(undefined, { maximumFractionDigits: 2 })}</th>
                    <th>{val.DOCUMENTO}</th>
                    <th>{safeNumber(val.DIFERENCA).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</th>
                    <th>{String(safeNumber(val.PERCENTUAL))} %</th>
                    <th
                      className={
                        notaHabilitada(val?.STATUS_NOTA_MIC)
                          ? style.nota_download
                          : style.nota_download_empty
                      }
                    >
                      <i
                        onClick={() => {
                          if (notaHabilitada(val?.STATUS_NOTA_MIC))
                            downloadNota(val.ID_CARREGAMENTO);
                        }}
                        style={
                          notaHabilitada(val?.STATUS_NOTA_MIC)
                            ? {}
                            : { color: "#bcbcbc", cursor: "not-allowed" }
                        }
                        className="fa fa-file-pdf icon"
                      />
                    </th>
                  </tr>
                ))}

              {operacoes.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", opacity: 0.7 }}>
                    Nenhum registro encontrado para o período selecionado.
                  </td>
                </tr>
              )}

              <tr>
                <td colSpan={11}>
                  <div>
                    <SubmitButton text={"Exportar para Excel"} onClick={handleExportClick} />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Nome do navio aparece mesmo sem dados detalhados (usa fallback "--") */}
        <center>
          <div className={style.navio}>
            <i className="fa fa-ship icon"></i>&nbsp;&nbsp;&nbsp;
            {dadosDash?.NOME_NAVIO || "--"}
          </div>
        </center>
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
      <RelatorioPeriodo />
    </SnackbarProvider>
  );
}
