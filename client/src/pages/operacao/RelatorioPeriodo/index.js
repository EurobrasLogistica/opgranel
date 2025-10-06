import React, { useEffect, useState, useCallback, useMemo } from "react"; import { SnackbarProvider, useSnackbar } from "notistack";
import { useNavigate, useParams } from "react-router-dom";
import Axios from "axios";
import jsPDF from "jspdf";

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

const pad2 = (n) => String(n).padStart(2, "0");

const formatDateBR = (dateInput) => {
  if (!dateInput) return "--/--/-- --:--";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "--/--/-- --:--";
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yy = String(d.getFullYear()).slice(-2);
  const hh = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  return `${dd}/${mm}/${yy} ${hh}:${min}`;
};

const formatKg = (val) => {
  const n = Number(val) || 0;
  return `${Math.round(n).toLocaleString("pt-BR")} Kg`;
};

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

  // totais a partir de 'operacoes'
  const totalAutos = operacoes?.length || 0;

  const totalPesoLiquidoKg = useMemo(() => {
    try {
      return (operacoes || []).reduce((acc, v) => acc + safeNumber(v.PESO_LIQUIDO), 0);
    } catch {
      return 0;
    }
  }, [operacoes]);

const generateTicketPDF = (row) => {
  try {
    const doc = new jsPDF({
      orientation: "landscape",       // força horizontal
      unit: "mm",
      format: [40, 60],               // com landscape, vira 60(larg) x 40(alt)
      compress: true,
    });

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 3;
    const GAP = 2;
    const LINE_H = 3.0;

    const linha = (y) => doc.line(M, y, W - M, y);

    doc.setLineWidth(0.3);
    linha(M + 5.5);

    // Cabeçalho: "Ticket n°: <ID>" com valor colado ao label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const headerLabel = "Ticket n°:";
    const headerY = M + 2.8;
    doc.text(headerLabel, M, headerY);

    const headerValueX = M + doc.getTextWidth(headerLabel) + GAP;
    doc.setFont("helvetica", "normal");
    doc.text(String(row.ID_CARREGAMENTO ?? "--"), headerValueX, headerY);

    linha(M + 7.5);

    let y = M + 11;

    const add = (label, value) => {
      // rótulo
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(label, M, y);

      // valor começa logo depois do rótulo
      const valueX = M + doc.getTextWidth(label) + GAP;
      const maxWidth = W - valueX - M; // largura disponível até a margem direita

      doc.setFont("helvetica", "normal");
      const txt = String(value ?? "--");

      // quebra em múltiplas linhas se passar do espaço disponível
      const wrapped = doc.splitTextToSize(txt, Math.max(10, maxWidth));
      doc.text(wrapped, valueX, y);

      // avança Y considerando quantas linhas foram usadas
      const lines = Array.isArray(wrapped) ? wrapped.length : 1;
      y += LINE_H * lines;
    };

    add("Data/Hora:", formatDateBR(row.DATA_CARREGAMENTO));
    add("Placa Cavalo:", row.PLACA_CAVALO);
    add("Peso Carregado:", formatKg(row.PESO_CARREGADO));
    add("Navio:", (dadosDash?.NOME_NAVIO || "--"));
    add((row.DOCUMENTO || "--"));

    doc.save(`ticket_${row.ID_CARREGAMENTO}.pdf`);
  } catch (e) {
    console.error(e);
    showAlert("Não foi possível gerar o ticket.", "error");
  }
};


  // não dependem de id
  const getEquipamentos = useCallback(async () => {
    try {
      const r = await Axios.get("/equipamentos");
      setEquipamentos(r.data || []);
    } catch {
      setEquipamentos([]);
    }
  }, []);

  const getBercos = useCallback(async () => {
    try {
      const r = await Axios.get("/bercos");
      setBercos(r.data || []);
    } catch {
      setBercos([]);
    }
  }, []);

  const getPeriodos = useCallback(async () => {
    try {
      const r = await Axios.get("/periodos/horarios");
      setPeriodoLista(r.data || []);
    } catch {
      setPeriodoLista([]);
    }
  }, []);

  // dependem de id
  const getPeriodo = useCallback(async () => {
    if (!id) return;
    try {
      const response = await Axios.get(`/periodos/gerais/${id}`);
      setPeriodoLista(response.data || []);
    } catch { }
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

  // === getAutos / getDocumentos COMENTADOS ===
  /*
  const getAutos = useCallback(
    async (period = relatorios) => {
      if (!id) return;
      try {
        const r = await Axios.post(`/periodo/autos/${id}`, {
          data: period,
          cod_operacao: id,
        });
        setAutos(r.data || []);
      } catch {
        setAutos([]);
      }
    },
    [id, relatorios]
  );

  const getDocumentos = useCallback(
    async (period = relatorios) => {
      if (!id) return;
      try {
        const r = await Axios.post(`/periodo/documentos/${id}`, {
          data: period,
          cod_operacao: id,
        });
        setDocumentos(r.data || []);
      } catch {
        setDocumentos([]);
      }
    },
    [id, relatorios]
  );
  */

  // Principal: chama APENAS /periodo/carregamentos/:id
  const getOperacoes = useCallback(
    async (period = relatorios) => {
      if (!id) return showAlert("Selecione uma operação/navio primeiro.", "warning");
      if (!period) return showAlert("Selecione um período.", "warning");

      try {
        const carregamentosRes = await Axios.post(`/periodo/carregamentos/${id}`, {
          data: period,
        });
        setOperacoes(Array.isArray(carregamentosRes?.data) ? carregamentosRes.data : []);
        // opcional: zera cards se não estiver usando as rotas
        setAutos([]);
        setDocumentos([]);
      } catch (err) {
        setOperacoes([]);
        console.error("Erro ao buscar carregamentos:", err);
        showAlert("Não foi possível carregar os carregamentos do período.", "error");
      }
    },
    [id, relatorios, showAlert]
  );

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
      "ID",
      "Nome",
      "Placa (Cavalo)",
      "1° Peso (Tara)",
      "2° Peso (Moega)",
      "3° Peso (Bruto)",
      "Peso Liquido",
      "DI/BL",
      "(Liquido - Moega)",
      "(%)",
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
                  onChange={(e) => {
                    const period = e.target.value;
                    setRelatorios(period);
                    getOperacoes(period); // dispara imediatamente com a data (via id na URL)
                  }}
                >
                  <option value="" disabled>
                    Selecione uma opção
                  </option>
                  {periodoLista?.map((val, idx) => (
                    <option key={idx} value={val.PERIODO}>
                      {val.PERIODO}
                    </option>
                  ))}
                </select>

                {/*<div className={style.submit_button}>
                  <SubmitButton text={"Buscar"} onClick={() => getOperacoes()} />
                </div>

                <div className={style.periodo}>
                  <div className={style.data}>{relatorios || "--"}</div>
                </div>*/}
              </div>
            </div>

            {/* Cards (ficarão zerados, pois autos/documentos foram comentados) */}
            <div className={style.cards}>
              <span className={style.cardinfo}>
                <div className={style.box}>
                  <div className="content">
                    <center>
                      <i className="fa fa-truck icon"></i> Carregados
                    </center>
                    {autos.length > 0 ? (
                      autos.map((val, idx) => (
                        <div key={idx} className={style.total}>
                          {totalAutos} Autos
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
                    <center>
                      <i className="fa fa-weight-hanging icon"></i> Peso Líquido
                    </center>
                    <div className={style.total}>
                      {(totalPesoLiquidoKg / 1000).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 3,
                      })} Tons
                    </div>
                  </div>
                </div>
              </span>

              <span className={style.cardinfo_Doc}>
                <div className={style.box}>
                  <div className="content">
                    <center>
                      <i className="fa fa-file-text icon"></i> Total de Peso por DI / BL
                    </center>
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
                <th>
                  <abbr title="Id">ID </abbr>
                </th>
                <th>
                  <abbr title="Nome">Nome </abbr>
                </th>
                <th>
                  <abbr title="Placa do Cavalo">Placa (Cavalo)</abbr>
                </th>
                <th>
                  <abbr title="Tara">1° Peso (Tara)</abbr>
                </th>
                <th>
                  <abbr title="SegundoPeso">2° Peso (Moega)</abbr>
                </th>
                <th>
                  <abbr title="TerceiroPeso">3° Peso (Bruto)</abbr>
                </th>
                <th>
                  <abbr title="PesoLiquido">Peso Liquido </abbr>
                </th>
                <th>
                  <abbr title="Documento">DI/BL </abbr>
                </th>
                <th>
                  <abbr title="Diferenca">(Liquido - Moega)</abbr>
                </th>
                <th>
                  <abbr title="DiferencaPerc">(%)</abbr>
                </th>
                <th>
                  <abbr title="Ticket">Ticket</abbr>
                </th>
                <th>
                  <abbr title="Nota">Nota Fiscal</abbr>
                </th>
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
                  <tr key={val.ID_CARREGAMENTO ?? idx}>
                    <td>{val.ID_CARREGAMENTO}</td>
                    <td>{val.NOME_MOTORISTA}</td>
                    <td>{val.PLACA_CAVALO}</td>
                    <td>{safeNumber(val.PESO_TARA).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>{safeNumber(val.PESO_CARREGADO).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>{safeNumber(val.PESO_BRUTO).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>{safeNumber(val.PESO_LIQUIDO).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>{val.DOCUMENTO}</td>
                    <td>{safeNumber(val.DIFERENCA).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</td>
                    <td>{String(safeNumber(val.PERCENTUAL))} %</td>
                    <td className={style.nota_download}>
                      <i
                        onClick={() => generateTicketPDF(val)}
                        className="fa fa-ticket-alt icon"
                        style={{ cursor: "pointer" }}
                        title="Gerar ticket (60x40mm)"
                      />
                    </td>
                    <td
                      className={
                        notaHabilitada(val?.STATUS_NOTA_MIC) ? style.nota_download : style.nota_download_empty
                      }
                    >
                      <i
                        onClick={() => {
                          if (notaHabilitada(val?.STATUS_NOTA_MIC)) downloadNota(val.ID_CARREGAMENTO);
                        }}
                        style={notaHabilitada(val?.STATUS_NOTA_MIC) ? {} : { color: "#bcbcbc", cursor: "not-allowed" }}
                        className="fa fa-file-pdf icon"
                      />
                    </td>
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
    <SnackbarProvider anchorOrigin={{ vertical: "bottom", horizontal: "right" }} maxSnack={3} autoHideDuration={2500}>
      <RelatorioPeriodo />
    </SnackbarProvider>
  );
}
