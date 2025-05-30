import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { SnackbarProvider, useSnackbar } from 'notistack';
import Navbar from '../../components/Navbar';
import Background from '../../components/Background';
import Container from '../../components/Container';
import Header from '../../components/Header';
import SubmitButton from '../../components/Button';
import Input from '../../components/Input';
import style from "./Motivacao.module.css";

const Motivacao = () => {

    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [motivados, setMotivados] = useState([]);
    const [empresaSelecionada, setEmpresaSelecionada] = useState('');
    const [statusSelecionado, setStatusSelecionado] = useState('ATIVO');
    const [nomeMotivadoSelecionado, setNomeMotivadoSelecionado] = useState('');
    const [diasSelecionado, setDiasSelecionado] = useState('');
    const [bercoSelecionado, setBercoSelecionado] = useState('');
  
  
    // Adicionando a função showAlert
    const showAlert = (message, variant) => {
      enqueueSnackbar(message, { variant });
    };
  
    useEffect(() => {
      Axios.get(`http://opgranel.rodrimar.com.br:8080/motivados`)
        .then(response => {
          setMotivados(response.data);
        })
        .catch(error => {
          console.error("Erro ao buscar dados: ", error);
          enqueueSnackbar('Erro ao buscar dados', { variant: 'error' });
        });
    }, []);
  
    const renderStatusDot = (status) => {
      if (status === 'ATIVO') {
        return (
          <span>
            <span className={style.greenDot}></span>
            {status}
          </span>
        );
      } else if (status === 'INATIVO') {
        return (
          <span>
            <span className={style.redDot}></span>
            {status}
          </span>
        );
      }
      return status; // Caso status não seja "ATIVO" ou "INATIVO"
    };
  
  
    const formatarCPF = (cpf) => {
      return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    };
  
    const empresasUnicas = [...new Set(motivados.map(item => item.EMPRESA))];
    const statusUnicos = [...new Set(motivados.map(item => item.STATUS))];
    const nomeMotivadoUnicos = [...new Set(motivados.map(item => item.NOME_MOTIVADO))];
  
    const validaTecla = (e) => {
      if (e.key === 'Enter') {
        validaDados()
      }
    }
  
    const validaDados = () => {
  
      // Verifica se ambos, Período e Berço, não foram selecionados
      if (!diasSelecionado && !bercoSelecionado) {
        showAlert('Selecione um período e um berço!', 'error');
        return; // Interrompe a execução da função
      }
  
      // Verifica se o Berço foi selecionado
      if (!diasSelecionado) {
        showAlert('Selecione um período!', 'error');
        return; // Interrompe a execução da função
      }
  
      // Verifica se o Período foi selecionado
      if (!bercoSelecionado) {
        showAlert('Selecione um berço!', 'error');
        return; // Interrompe a execução da função
      }
  
      // Aqui você pode continuar com a lógica de motivação
      // ...
    };
  
    const filtrarMotivados = () => {
      return motivados
        .filter(item => empresaSelecionada === '' || item.EMPRESA === empresaSelecionada)
        .filter(item => statusSelecionado === '' || item.STATUS === statusSelecionado)
        .filter(item => nomeMotivadoSelecionado === '' || item.NOME_MOTIVADO === nomeMotivadoSelecionado);
    };
  
    const toggleMotivadoStatus = (motivadoId, currentStatus) => {
        const updatedStatus = currentStatus === 'ATIVO' ? 'INATIVO' : 'ATIVO';
    
        // Optimistically update the UI
        const updatedMotivados = motivados.map(motivado =>
          motivado.COD_MOTIVADO === motivadoId ? { ...motivado, STATUS: updatedStatus } : motivado
        );
        setMotivados(updatedMotivados);
    
        // Attempt to update the backend
        Axios.post(`http://opgranel.rodrimar.com.br:8080/api/motivado/status/update`, { motivadoId, updatedStatus })
          .then(response => {
            showAlert('Status atualizado com sucesso!', 'success');
          })
          .catch(error => {
            console.error("Erro ao atualizar status: ", error);
            showAlert('Erro ao atualizar status', 'error');
            // Revert the optimistic update in case of error
            setMotivados(motivados.map(motivado =>
              motivado.COD_MOTIVADO === motivadoId ? { ...motivado, STATUS: currentStatus } : motivado
            ));
          });
    };
    
    const renderStatusSwitch = (motivado) => {
      return (
        <label className={style.switch}>
          <input
            type="checkbox"
            className={style.inputhidden}
            checked={motivado.STATUS === 'ATIVO'}
            onChange={() => toggleMotivadoStatus(motivado.COD_MOTIVADO, motivado.STATUS)}
          />
          <span></span>
        </label>
      );
    }
    
  
    return (
      <>
        <Navbar motivados />
        <Header />
        <Background />
        <Container>
          <div className={style.content}>
            <div className={style.nav}>
              <div className={style.navItem}>
                Motivado
              </div>
              <div className={style.navItem} onClick={() => navigate('/motivacao/cadastro')}>
                Cadastrar Motivado
              </div>
            </div>
  
            <div className={style.filtersContainer}>
              <select
                className={style.selectEmpresa}
                value={empresaSelecionada}
                onChange={(e) => setEmpresaSelecionada(e.target.value)}
              >
                <option value="">Todas as Empresas</option>
                {empresasUnicas.map((empresa, index) => (
                  <option key={index} value={empresa}>{empresa}</option>
                ))}
              </select>
  
              <select
                className={style.selectStatus}
                value={nomeMotivadoSelecionado}
                onChange={(e) => setNomeMotivadoSelecionado(e.target.value)}
              >
                <option value="">Todos os Motivados</option>
                {nomeMotivadoUnicos.map((nome_motivado, index) => (
                  <option key={index} value={nome_motivado}>{nome_motivado}</option>
                ))}
              </select>
  
              <select
                className={style.selectDias}
                value={diasSelecionado}
                onChange={(e) => setDiasSelecionado(e.target.value)}
              >
                <option value="">Período</option>
                <option value="1">1 Dia</option>
                <option value="3">3 Dias</option>
                <option value="8">8 Dias</option>
              </select>
  
              <select
                className={style.selectBerco}
                value={diasSelecionado}
                onChange={(e) => setDiasSelecionado(e.target.value)}
              >
                <option value="">Berço</option>
                <option value="Saboo-5Seccao">Saboó e 5° Secção</option>
                <option value="5° Seccao">5° Secção</option>
                <option value="Saboo">Saboó</option>
              </select>
  
              <div class={style.switch_container}>
                <label className={style.switch}>
                  <input
                    type="checkbox"
                    className={style.inputhidden}
                    checked={statusSelecionado === 'ATIVO'} // Altere para 'INATIVO' se necessário
                    onChange={() => {
                      setStatusSelecionado(statusSelecionado === 'ATIVO' ? 'INATIVO' : 'ATIVO');
                    }}
                  />
                  <span></span>
                </label>
              </div>
  
              <div className={style.submitButton}>
                <SubmitButton text="Motivar" onClick={validaDados} onKeyPress={(e) => validaTecla(e)} />
              </div>
  
            </div>
  
  
            <table className={style.table}>
              <thead>
                <tr>
                  <th>NOME MOTIVADO</th>
                  <th>CPF MOTIVADO</th>
                  <th>EMPRESA</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filtrarMotivados().map((item, index) => (
                  <tr key={index}>
                    <td>{item.NOME_MOTIVADO}</td>
                    <td>{formatarCPF(item.CPF_MOTIVADO)}</td>
                    <td>{item.EMPRESA}</td>
                    <td>{renderStatusSwitch(item)}</td> {/* Updated line here */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </>
    );
  };

  export default function IntegrationNotistack() {
    return (
      <SnackbarProvider
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        maxSnack={3}
        autoHideDuration={2500}
      >
        <Motivacao />
      </SnackbarProvider>
    );
  }