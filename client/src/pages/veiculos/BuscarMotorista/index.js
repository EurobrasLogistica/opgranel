import React from "react";
import Axios from "axios";
import { useEffect, useState } from 'react';
import Navbar from "../../../components/Navbar";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import { useNavigate, useParams } from "react-router-dom";
import SubmitButton from "../../../components/Button";
import Input from "../../../components/Input";
import style from "./BuscarMotorista.module.css";
import MaskedInput from "../../../components/InputMask";
import { SnackbarProvider, useSnackbar } from 'notistack';

const BuscarMotorista = () => {


    const navigate = useNavigate();
    const [busca, setBusca] = useState();
    const [motorista, setMotorista] = useState({});


    const getMotorista = () => {
        Axios.get(`https://opgranel.eurobraslogistica.com.br/api/motorista/busca/${busca}`,)
            .then(function (res) {
                console.log(res.data);
                res.data.length > 0 ?
                    setMotorista(res.data[0], showAlert('Dados do motorista', 'success')) :
                    showAlert('Motorista não cadastrado', 'error');
            });
    }
   
  


    const { enqueueSnackbar } = useSnackbar();
    const showAlert = (txt, variant) => {
        enqueueSnackbar(txt, { variant: variant });
    }

    const validaTecla = (e) => {
        if (e.key === 'Enter') {
            validaDados()
        }
    }

    const validaDados = () => {
        if (!busca) {
            showAlert('Digite um CPF válido!', 'error')
            return;
        }
        getMotorista();
    }

    const intervalMotorista = () => {
        if(motorista){
            
        }
    }

    const validaPesagem = () => {
        if (motorista.CPF_MOTORISTA == undefined) {

            showAlert('Digite um CPF válido!', 'error')
            return;
        }
        else {
            navigate(`/veiculos/PesagemInicial/${motorista.NOME_MOTORISTA}/${motorista.CPF_MOTORISTA}/${motorista.CNH_MOTORISTA}/${motorista.COD_MOTORISTA}`)
        }
    }

    return (
        <>
            <Navbar veiculos />
            <Header />
            <Brackground />
            <Container>
                <div className={style.content}>
                    <div className={style.nav}>
                        <div className={style.nav}>
                            <div className={style.active}>
                                Buscar Motorista
                            </div>
                            <div onClick={() => navigate("/veiculos")}>
                                Cadastrar Motorista
                            </div>                            
                        </div>
                    </div>

                    <div className={'columns'}>
                        <div className={'column is-2'}>
                            <div className={style.periodo}>

                                <MaskedInput

                                    text={'Buscar CPF'}
                                    mask={'999.999.999-99'}
                                    placeholder={'000.000.000-00'}
                                    onChange={(e) => [setBusca(e.target.value)]}
                                    onKeyPress={(e) => validaTecla(e)}

                                />
                               



                            </div>

                        </div>
                        <div className={'column'}>
                            <div className={style.submit}>
                                <SubmitButton text={'Buscar'}
                                    onClick={validaDados} />
                            </div>



                        </div>

                        <div className="column is-5">
                            <div className={style.box}>
                                <div className="card">
                                    <div className="card-content">
                                        <div className="content">
                                            <div> <strong className={style.name}>Motorista:</strong> {motorista.NOME_MOTORISTA}</div>
                                            <div><strong className={style.name}>CPF:</strong> {motorista.CPF_MOTORISTA}</div>
                                            <div><strong className={style.name}>CNH:</strong> {motorista.CNH_MOTORISTA}</div>
                                            <div className={style.submit2}>
                                                <SubmitButton text={'Pesar'} onClick={validaPesagem} onkeypress={(e) => validaTecla(e)}/></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>
                    <div className={style.cabecario}>
                        Histórico
                    </div>
                    <div className={style.flex}>


                        <div className={style.formulario}>


                            <div className={'columns'} >
                                <div className={'column is-one-fifth'} >
                                    CAVALO
                                </div>
                                <div className={'column is-one-fifth'} >
                                    CARRETA
                                </div>
                                <div className={'column is-one-fifth'} >
                                    PRODUTO
                                </div>
                                <div className={'column is-one-fifth'} >
                                    TRANSPORTADORA
                                </div>
                                <div className={'column is-2'} >
                                    DATA
                                </div>

                            </div>
                            <div className={style.lista}>
                                nenhum histórico encontrado
                                {/* <div className={'columns'}>
                                    <div className={'column is-one-fifth'}>
                                        <div>BLL-2799 </div>
                                        <div>BLL-2799 </div>
                                        <div>BLL-2799 </div>
                                        <div>BLL-2799 </div>
                                        <div>BLL-2799 </div>
                                        <div>BLL-2799 </div>
                                        <div>BLL-2799 </div>

                                    </div>
                                    <div className={'column is-one-fifth'}>
                                        <div>BZR-5656</div>
                                        <div>BZR-5656</div>
                                        <div>BZR-5656</div>
                                        <div>BZR-5656</div>
                                        <div>BZR-5656</div>
                                        <div>BZR-5656</div>
                                        <div>BZR-5656</div>

                                    </div>
                                    <div className={'column is-one-fifth'}>
                                        <div>KCL</div>
                                        <div>KCL</div>
                                        <div>KCL</div>
                                        <div>KCL</div>
                                        <div>KCL</div>
                                        <div>KCL</div>
                                        <div>KCL</div>
                                    </div>
                                    <div className={'column is-one-fifth'}>
                                        <div>TRANSCOPA</div>
                                        <div>TRANSCOPA</div>
                                        <div>TRANSCOPA</div>
                                        <div>TRANSCOPA</div>
                                        <div>TRANSCOPA</div>
                                        <div>TRANSCOPA</div>
                                        <div>TRANSCOPA</div>

                                    </div>
                                    <div className={'column is-one-fifth'}>
                                        <div>24/05/2022</div>
                                        <div>24/05/2022</div>
                                        <div>24/05/2022</div>
                                        <div>24/05/2022</div>
                                        <div>24/05/2022</div>
                                        <div>24/05/2022</div>
                                        <div>24/05/2022</div>

                                    </div>

                                </div> */}

                            </div>
                        </div>
                    </div>


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
            <BuscarMotorista />
        </SnackbarProvider >
    );
}