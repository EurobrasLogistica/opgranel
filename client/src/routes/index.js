import { BrowserRouter, Route, Routes } from "react-router-dom";

import AberturaPeriodo from "../pages/operacao/AberturaPeriodo";
import BuscarMotorista from "../pages/veiculos/BuscarMotorista";
import CadastroCarga from "../pages/cargas/CadastroCarga";
import CadastroMotorista from "../pages/veiculos/CadastroMotorista";
import CadastroNavio from "../pages/navios/CadastroNavio";
import CadastroOperacao from "../pages/navios/CadastroOperacao";
import Cargas from "../pages/cargas/Cargas";
import Dashboard from "../pages/Dashboard";
import EmAndamento from "../pages/operacao/EmAndamento";
import { Fragment } from "react";
import GraficoDocs from "../pages/operacao/GraficoDocs";
import Login from "../pages/Login";
import Navios from "../pages/navios/Navios";
import Operacao from "../pages/operacao/Operacao";
import PesagemFinal from "../pages/operacao/PesagemFinal";
import PesagemInicial from "../pages/veiculos/PesagemInicial";
import RelatorioPeriodo from "../pages/operacao/RelatorioPeriodo"
import RelatorioOperacao from "../pages/RelatorioOperacao"
import Relatorios from "../pages/Relatorios";
import Suporte from "../pages/Suporte";
import useAuth from "../hooks/useAuth";
import portalCliente from "../pages/PortalCliente/PortalCliente";
import GraficoPortal from "../pages/PortalCliente/GraficoPortal";
import RelatorioPortal from "../pages/PortalCliente/RelatorioPortal";
import Motivacao from "../pages/Motivacao"
import CadastroInfo from "../pages/CadastroInfo";
import AlteracaoCadastral from "../pages/AlteracaoCadastral"
import PercentualPorao from "../pages/operacao/PercentualPorao"

//recebe item, no caso Home
const Private = ({ Item }) => {
    const { signed } = useAuth();

    //verifica se esta logado encaminha para o item que passou no parametro, no caso Home
    return signed > 0 ? <Item /> : <Login />;
};

const RoutesApp = () => {
    return (
        <BrowserRouter>
            <Fragment>
                <Routes>
                    <Route exact path="/navios" element={<Private Item={Navios} />} />
                    <Route exact path="/navios/cadastro" element={<Private Item={CadastroNavio} />} />
                    <Route path="/portalCliente" element={<Private Item={portalCliente} />} />
                    <Route path="/portalCliente/relatorio/:id" element={<Private Item={RelatorioPortal} />} />
                    <Route path="/portalCliente/grafico/:id" element={<Private Item={GraficoPortal} />} />
                    <Route exact path="/operacao/cadastro/:nome/:id" element={<Private Item={CadastroOperacao} />} />
                    <Route exact path="/cargas/cadastro/:nome/:id" element={<Private Item={CadastroCarga} />} />
                    <Route exact path="/cargas" element={<Private Item={Cargas} />} />
                    <Route exact path="/operacoes" element={<Private Item={EmAndamento} />} />
                    <Route exact path="/operacao/:id" element={<Private Item={Operacao} />} />
                    <Route exact path="/operacao/:id/aberturaperiodo" element={<Private Item={AberturaPeriodo} />} />
                    <Route exact path="/relatorios/:id" element={<Private Item={RelatorioPeriodo} />} />
                    <Route exact path="/relatorios/operacao/:id" element={<Private Item={RelatorioOperacao} />} />
                    <Route exact path="/operacao/GraficoDocs/:id" element={<Private Item={GraficoDocs} />} />
                    <Route exact path="/operacao/PercentualPorao/:id" element={<Private Item={PercentualPorao} />} />
                    <Route exact path="/dashboard/:id" element={<Private Item={Dashboard} />} />
                    <Route exact path="/relatorios" element={<Private Item={Relatorios} />} />
                    <Route exact path="/suporte" element={<Private Item={Suporte} />} />
                    <Route exact path="/motivacao" element={<Private Item={Motivacao} />} />
                    <Route exact path="/veiculos/" element={<Private Item={CadastroMotorista} />} />
                    <Route exact path="/veiculos/pesageminicial/:nome/:cpf/:cnh/:id" element={<Private Item={PesagemInicial} />} />
                    <Route exact path="/operacao/pesagemfinal/:id" element={<Private Item={PesagemFinal} />} />
                    <Route exact path="/veiculos/buscarmotorista" element={<Private Item={BuscarMotorista} />} /> 
                    <Route exact path="/AlteracaoCadastral" element={<Private Item={AlteracaoCadastral} />} />
                    <Route exact path="/CadastroInfo" element={<Private Item={CadastroInfo} />} />                   
                    <Route path="/" element={<Private Item={Dashboard} />} />
                    <Route path="*" element={<Private Item={Dashboard} />} />
                </Routes>
            </Fragment>
        </BrowserRouter>
    );
};

export default RoutesApp;