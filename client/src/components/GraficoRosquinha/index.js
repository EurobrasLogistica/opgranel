import { Chart as ChartJS, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Doughnut } from 'react-chartjs-2';
import React, { useEffect } from "react";
import { useState } from "react";
import Axios from 'axios';
import { useParams } from "react-router-dom";
import { bottomNavigationActionClasses } from '@mui/material';



const GraficoRosquinha = ({charData}) => {



    return (
        <div>
          <Doughnut data={charData}/>
          {docs.map((val) => {
                    let saldo = val.PERC.toFixed(2)
                    return (
                        <div className={style.gfcolum}>
                            <div className={style.grpercent}>{saldo} %</div>
                            <div className={style.grbackbar}>
                                <div
                                    className={saldo >= 90 ? `${style.grred}` : `${style.grblue}`}
                                    style={{ height: saldo + "%" }}>

                                </div>
                            </div>
                            <div className={style.grdesc}>
                                <b>{val.TIPO_DOC}: </b>
                                {val.NUMERO_DOC}
                            </div>
                        </div>
                    )
                })}
            </div>

    )
}


export default GraficoRosquinha;