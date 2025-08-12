import { Chart as ChartJS, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import React, { useEffect } from "react";
import { useState } from "react";
import Axios from 'axios';
import { useParams } from "react-router-dom";
import { bottomNavigationActionClasses, stepLabelClasses } from '@mui/material';
import { height } from '@mui/system';
import style from './GraficoPercent.module.css'


const GraficoPercent = ({ docs, onAlertaSaldoBaixo }) => {
  return (
    <div className={style.gfbox}>
      <div className={style.gfcoluns}>
        {docs.map((val) => {
          let saldo = val.PERC.toFixed(2);

          // Emitir alerta se SALDO for menor ou igual a 150.000 kg (ou seja, 150 toneladas)
          if (val.SALDO <= 150000 && typeof onAlertaSaldoBaixo === 'function') {
            onAlertaSaldoBaixo(val);
          }

          return (
            <div className={style.gfcolum} key={val.NUMERO_DOC}>
              <div className={style.grpercent}>{saldo} %</div>
              <div className={style.grbackbar}>
                <div
                  className={saldo >= 94 ? `${style.grred}` : `${style.grblue}`}
                  style={{ height: saldo + "%" }}
                ></div>
              </div>
              <div className={style.grdesc}>
                <div className={style.DI_BL}>
                  <b>{val.TIPO_DOC}: </b> {val.NUMERO_DOC}
                </div>
                <br />
                <div className={style.NOME_REDUZIDO}>
                  <b>{val.NOME_REDUZIDO}</b>
                </div>
                <br />
                <b>Saldo:</b>{" "}
                {(val.SALDO / 1000).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 3,
                })}{" "}
                Tons
                <br />
                <b>Peso Balança:</b>{" "}
                {(val.PESO_CARREGADO / 1000).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 3,
                })}{" "}
                Tons
                <br />
                <b>Peso Moega:</b>{" "}
                {(val.PESO_MOEGA / 1000).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 3,
                })}{" "}
                Tons
                <div className={style.linha}></div>
                <div className={style.manifestado}>
                  <b>MANIFESTADO:</b>{" "}
                  {(val.MANIFESTADO / 1000).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 3,
                  })}{" "}
                  Tons
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GraficoPercent;