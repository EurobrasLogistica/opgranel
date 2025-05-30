import React, { useState, useEffect } from "react";
import Navbar from "../../../components/Navbar";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import { SnackbarProvider, useSnackbar } from 'notistack';
import { useNavigate, useParams } from "react-router-dom";
import Axios from "axios";
import GraficoPercent from "../../../components/GraficoPercent";
import style from "./GraficoDocs.module.css"

const GraficoDocs = () => {

    useEffect(() => {
        getDados()
    }, [])

    async function getDados() {
       await Axios.get(`http://opgranel.rodrimar.com.br:8080/grafico/${id}`,)
            .then(function (res) {
                setList(res.data)
                console.log(res.data)
            })

    }

    const [list, setList] = useState([])

    let { id } = useParams();

    const navigate = useNavigate();
    return (
        <>
            <Navbar operacao />
            <Header />
            <Brackground />
            <Container>

                <div className={style.content}>

                     {/* INICIO - Barra de Navegacao */}
                    <div className={style.nav}>
                        <div onClick={() => navigate(`/operacoes`)}>
                            Operações
                        </div>
                        <div onClick={() => navigate(`/operacao/${id}`)}>
                            Dashboard Período
                        </div>
                        <div onClick={() => navigate(`/operacao/pesagemfinal/${id}`)}>
                            Pesagem Final
                        </div>
                        <div className={style.active} >
                            DI / BL
                        </div>
                        {/* <div onClick={() => navigate(`/operacao/PercentualPorao/${id}`)}>
                            Porão
                        </div> */}
                        <div onClick={() => navigate(`/operacao/${id}/AberturaPeriodo`)}>
                            Abertura de Período
                        </div>
                        {/* FIM - Barra de Navegacao */}

                    </div>
                    <div className={style.gftitle}>Quantidade descarregada por (DI/BL)</div>
                    <GraficoPercent docs={list} />
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
            autoHideDuration={2500}>
            <GraficoDocs
            />
        </SnackbarProvider >
    );
}