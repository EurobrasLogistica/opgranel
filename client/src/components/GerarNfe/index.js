import React from "react";
import axios from "axios";
import { useEffect, useState, } from 'react';
import ConfirmNfe from '@mui/material/Dialog';
import style from "./GerarNfe.module.css";
import modal from "./Modal.module.css"

const GerarNfe = () => {

    function EnviaDados() {
        axios.post('http://opgranel.rodrimar.com.br:8080/gerarnfe', {
            // firstName: 'Fred',
            // lastName: 'Flintstone'
        })
            .then(function (response) {
                console.log(response.data);
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    const [openA, setOpenA] = useState(false);
    const AbrirConfirm = () => {
        setOpenA(true);
    };
    const FecharConfirm = () => {
        setOpenA(false);
    };
    return (
        <>
            <button className={style.btn} onClick={EnviaDados}>NF-e <i className="fa fa-file-text" aria-hidden="true"></i>
            </button>
            <ConfirmNfe open={openA} onClose={FecharConfirm} fullWidth>
                <div className={modal.modal}>
                    <div className={modal.nav}>
                        <div onClick={FecharConfirm}>Voltar</div>
                    </div>
                    <div className={modal.center}>
                        Deseja finalizar o período atual?
                        <br />
                        <div>Ao finalizar não será mais possível acessar Dashboard! </div>
                    </div>
                    <div className={modal.center}>
                        <div className={modal.inputbox}>
                            horário:
                            <input type="datetime-local" />
                        </div>
                    </div><br></br>
                    <div className={modal.flex}>
                        <button className={modal.cancelar}>CANCELAR</button>
                        <button className={modal.confirmar}>CONFIRMAR</button>
                    </div>
                </div>
            </ConfirmNfe>
        </>

    )
}


export default GerarNfe;