import React, { useEffect, useMemo, useState } from "react";
import { SnackbarProvider, useSnackbar } from "notistack";
import { api } from "../../api";
import Navbar from "../../components/Navbar";
import Brackground from "../../components/Background";
import Container from "../../components/Container";
import Header from "../../components/Header";
import style from "./Configuracoes.module.css";

const emptyForm = {
  id: null,
  nome: "",
  url: "",
  token: "",
  webhook_provider: "zpro",
  prioridade: 1,
  ativo: true
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
};

const Configuracoes = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [channels, setChannels] = useState([]);
  const [watchdogState, setWatchdogState] = useState([]);
  const [watchdogLog, setWatchdogLog] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testForm, setTestForm] = useState({
    channelId: "",
    number: "",
    mensagem: "Mensagem de teste do canal WhatsApp."
  });

  const showAlert = (message, variant = "success") => {
    enqueueSnackbar(message, { variant });
  };

  const selectedChannelId = useMemo(() => {
    if (testForm.channelId) return testForm.channelId;
    return channels[0]?.id ? String(channels[0].id) : "";
  }, [channels, testForm.channelId]);

  const loadChannels = async () => {
    const { data } = await api.get("/whatsapp/channels");
    const list = Array.isArray(data) ? data : [];
    setChannels(list);
    if (!testForm.channelId && list[0]?.id) {
      setTestForm((prev) => ({ ...prev, channelId: String(list[0].id) }));
    }
  };

  const loadWatchdog = async () => {
    const [stateResp, logResp] = await Promise.all([
      api.get("/whatsapp/watchdog/state"),
      api.get("/whatsapp/watchdog/log", { params: { limit: 50 } })
    ]);

    setWatchdogState(Array.isArray(stateResp.data) ? stateResp.data : []);
    setWatchdogLog(Array.isArray(logResp.data) ? logResp.data : []);
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      await Promise.all([loadChannels(), loadWatchdog()]);
    } catch (err) {
      showAlert(err.response?.data?.message || "Erro ao carregar configuracoes.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
  };

  const editChannel = (channel) => {
    setForm({
      id: channel.id,
      nome: channel.nome || "",
      url: channel.url || "",
      token: "",
      webhook_provider: channel.webhook_provider || "zpro",
      prioridade: channel.prioridade || 1,
      ativo: !!channel.ativo
    });
  };

  const saveChannel = async (e) => {
    e.preventDefault();

    if (!form.nome.trim() || !form.url.trim() || (!form.id && !form.token.trim())) {
      showAlert("Informe numero/nome, URL e token.", "warning");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        nome: form.nome.trim(),
        url: form.url.trim(),
        token: form.token.trim(),
        webhook_provider: form.webhook_provider,
        prioridade: Number(form.prioridade) || 1,
        ativo: form.ativo
      };

      if (form.id) {
        await api.put(`/whatsapp/channels/${form.id}`, payload);
        showAlert("Canal atualizado.");
      } else {
        await api.post("/whatsapp/channels", payload);
        showAlert("Canal criado.");
      }

      resetForm();
      await loadChannels();
    } catch (err) {
      showAlert(err.response?.data?.message || "Erro ao salvar canal.", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = async (channel) => {
    try {
      await api.patch(`/whatsapp/channels/${channel.id}/ativo`, {
        ativo: !channel.ativo
      });
      await loadChannels();
      showAlert(channel.ativo ? "Canal desativado." : "Canal ativado.");
    } catch (err) {
      showAlert(err.response?.data?.message || "Erro ao alterar canal.", "error");
    }
  };

  const deleteChannel = async (channel) => {
    if (!window.confirm(`Excluir o canal ${channel.nome}?`)) return;

    try {
      await api.delete(`/whatsapp/channels/${channel.id}`);
      if (form.id === channel.id) resetForm();
      await loadChannels();
      showAlert("Canal excluido.");
    } catch (err) {
      showAlert(err.response?.data?.message || "Erro ao excluir canal.", "error");
    }
  };

  const sendTest = async (e) => {
    e.preventDefault();

    if (!selectedChannelId || !testForm.number.trim()) {
      showAlert("Selecione um canal e informe o numero de teste.", "warning");
      return;
    }

    try {
      setSaving(true);
      await api.post(`/whatsapp/channels/${selectedChannelId}/test`, {
        number: testForm.number,
        mensagem: testForm.mensagem
      });
      showAlert("Mensagem de teste enviada.");
    } catch (err) {
      showAlert(err.response?.data?.message || "Erro ao enviar teste.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar configuracoes />
      <Header />
      <Brackground />
      <Container>
        <div className={style.content}>
          <h1 className={style.title}>Configuracoes</h1>

          <div className={style.tabs}>
            <button className={style.tabActive} type="button">
              WhatsApp
            </button>
            <button className={style.tab} type="button" disabled>
              Tokens celular
            </button>
            <button className={style.tab} type="button" disabled>
              Envio por E-mail
            </button>
          </div>

          <div className={style.grid}>
            <div className={style.card}>
              <div className={style.cardHeader}>
                <div>
                  <div className={style.cardTitle}>
                    {form.id ? "Editar canal" : "Novo canal WhatsApp"}
                  </div>
                  <div className={style.cardSubtitle}>
                    O numero e salvo no campo nome da tabela whatsapp_channels.
                  </div>
                </div>
              </div>

              <form className={style.form} onSubmit={saveChannel}>
                <label className={style.label}>
                  Numero / nome
                  <input
                    className={style.input}
                    value={form.nome}
                    onChange={(e) => updateForm("nome", e.target.value)}
                    placeholder="+55 (13) 99999-9999"
                  />
                </label>

                <label className={style.label}>
                  URL
                  <input
                    className={style.input}
                    value={form.url}
                    onChange={(e) => updateForm("url", e.target.value)}
                    placeholder="https://..."
                  />
                </label>

                <label className={style.label}>
                  Token {form.id ? "(preencha apenas para trocar)" : ""}
                  <input
                    className={style.input}
                    value={form.token}
                    onChange={(e) => updateForm("token", e.target.value)}
                    placeholder="Token da API"
                    type="password"
                  />
                </label>

                <div className={style.formRow}>
                  <label className={style.label}>
                    Provider
                    <select
                      className={style.select}
                      value={form.webhook_provider}
                      onChange={(e) => updateForm("webhook_provider", e.target.value)}
                    >
                      <option value="zpro">zpro</option>
                    </select>
                  </label>

                  <label className={style.label}>
                    Prioridade
                    <input
                      className={style.input}
                      min="1"
                      type="number"
                      value={form.prioridade}
                      onChange={(e) => updateForm("prioridade", e.target.value)}
                    />
                  </label>
                </div>

                <div className={style.switchLine}>
                  <span>Ativo</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.ativo}
                    className={`${style.switch} ${form.ativo ? style.switchOn : ""}`}
                    onClick={() => updateForm("ativo", !form.ativo)}
                  >
                    <span className={style.switchKnob}></span>
                  </button>
                </div>

                <div className={style.actions}>
                  {form.id && (
                    <button className={style.buttonSecondary} type="button" onClick={resetForm}>
                      Cancelar
                    </button>
                  )}
                  <button className={style.buttonPrimary} type="submit" disabled={saving}>
                    <i className="fas fa-save"></i>
                    {form.id ? "Salvar" : "Adicionar canal"}
                  </button>
                </div>
              </form>
            </div>

            <div className={style.card}>
              <div className={style.cardHeader}>
                <div>
                  <div className={style.cardTitle}>Canais configurados</div>
                  <div className={style.cardSubtitle}>A prioridade define a ordem de uso.</div>
                </div>
                <button className={style.buttonGhost} type="button" onClick={loadAll} disabled={loading}>
                  <i className="fas fa-sync-alt"></i>
                  Recarregar
                </button>
              </div>

              <div className={style.tableWrap}>
                <table className={style.table}>
                  <thead>
                    <tr>
                      <th>Numero</th>
                      <th>URL</th>
                      <th>Token</th>
                      <th>Prior.</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((channel) => (
                      <tr key={channel.id}>
                        <td>
                          <strong>{channel.nome}</strong>
                          <div className={style.muted}>{channel.webhook_provider}</div>
                        </td>
                        <td className={style.urlCell}>{channel.url}</td>
                        <td className={style.muted}>{channel.token_masked}</td>
                        <td>{channel.prioridade}</td>
                        <td>
                          <span className={channel.ativo ? style.statusOn : style.statusOff}>
                            {channel.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td>
                          <div className={style.rowActions}>
                            <button
                              className={style.buttonSecondary}
                              type="button"
                              onClick={() => toggleChannel(channel)}
                            >
                              {channel.ativo ? "Desativar" : "Ativar"}
                            </button>
                            <button
                              className={style.buttonSecondary}
                              type="button"
                              onClick={() => editChannel(channel)}
                            >
                              <i className="fas fa-pen"></i>
                              Editar
                            </button>
                            <button
                              className={style.buttonDanger}
                              type="button"
                              onClick={() => deleteChannel(channel)}
                            >
                              <i className="fas fa-trash"></i>
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!channels.length && (
                  <div className={style.empty}>
                    {loading ? "Carregando canais..." : "Nenhum canal configurado."}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={style.card} style={{ marginTop: 18 }}>
            <div className={style.cardHeader}>
              <div>
                <div className={style.cardTitle}>Testar canal WhatsApp</div>
                <div className={style.cardSubtitle}>Envia uma mensagem para validar URL e token.</div>
              </div>
            </div>
            <form className={style.form} onSubmit={sendTest}>
              <div className={style.formRow}>
                <label className={style.label}>
                  Canal
                  <select
                    className={style.select}
                    value={selectedChannelId}
                    onChange={(e) =>
                      setTestForm((prev) => ({ ...prev, channelId: e.target.value }))
                    }
                  >
                    {channels.map((channel) => (
                      <option value={channel.id} key={channel.id}>
                        {channel.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={style.label}>
                  Numero de teste
                  <input
                    className={style.input}
                    value={testForm.number}
                    onChange={(e) =>
                      setTestForm((prev) => ({ ...prev, number: e.target.value }))
                    }
                    placeholder="5513999999999"
                  />
                </label>
              </div>
              <label className={style.label}>
                Mensagem
                <textarea
                  className={style.textarea}
                  value={testForm.mensagem}
                  onChange={(e) =>
                    setTestForm((prev) => ({ ...prev, mensagem: e.target.value }))
                  }
                />
              </label>
              <div className={style.actions}>
                <button className={style.buttonPrimary} type="submit" disabled={saving || !channels.length}>
                  <i className="fas fa-paper-plane"></i>
                  Enviar teste
                </button>
              </div>
            </form>
          </div>

          <div className={style.watchdogGrid} style={{ marginTop: 18 }}>
            <div className={style.card}>
              <div className={style.cardHeader}>
                <div>
                  <div className={style.cardTitle}>Monitoramento da conexao</div>
                  <div className={style.cardSubtitle}>Dados da tabela whatsapp_watchdog_state.</div>
                </div>
              </div>
              <div className={style.tableWrap}>
                <table className={style.table}>
                  <thead>
                    <tr>
                      <th>Canal</th>
                      <th>Status</th>
                      <th>Sessao</th>
                      <th>Numero</th>
                      <th>Ultima mudanca</th>
                      <th>Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchdogState.map((item) => (
                      <tr key={item.id}>
                        <td>{item.channel_name}</td>
                        <td>
                          <span className={style.statusNeutral}>{item.status}</span>
                        </td>
                        <td>{item.session_name || item.session_id || "-"}</td>
                        <td>{item.phone_number || "-"}</td>
                        <td>{formatDate(item.last_change_at)}</td>
                        <td className={style.muted}>{item.last_error || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!watchdogState.length && <div className={style.empty}>Sem registros de monitoramento.</div>}
              </div>
            </div>

            <div className={style.card}>
              <div className={style.cardHeader}>
                <div>
                  <div className={style.cardTitle}>Logs do watchdog</div>
                  <div className={style.cardSubtitle}>Ultimos eventos registrados.</div>
                </div>
              </div>
              <div className={style.tableWrap}>
                <table className={style.table}>
                  <thead>
                    <tr>
                      <th>Horario</th>
                      <th>Canal</th>
                      <th>Evento</th>
                      <th>Status</th>
                      <th>Mensagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchdogLog.map((item) => (
                      <tr key={item.id}>
                        <td>{formatDate(item.created_at)}</td>
                        <td>{item.channel_name}</td>
                        <td>{item.event_type}</td>
                        <td>{item.status || "-"}</td>
                        <td className={style.muted}>{item.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!watchdogLog.length && <div className={style.empty}>Sem logs do watchdog.</div>}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
};

export default function ConfiguracoesPage() {
  return (
    <SnackbarProvider
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      maxSnack={3}
      autoHideDuration={3500}
    >
      <Configuracoes />
    </SnackbarProvider>
  );
}
