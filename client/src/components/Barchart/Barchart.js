import { Chart as ChartJS, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import React, { useEffect } from "react";
import { useState } from "react";
import Axios from 'axios';
import { useParams } from "react-router-dom";
import { bottomNavigationActionClasses } from '@mui/material';


ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement
)

const BarChart = ({ id }) => {

    useEffect(() => {
        getMotivos()
    }, [])

    

    const red = 'rgb(175, 2, 2, 0.9)'
    const collor2 = 'rgb(40,20,64, 0.9)'
    


    const [list, setList] = useState([])

    async function getMotivos() {
        Axios.get(`http://opgranel.rodrimar.com.br:8080/grafico/${id}`,)
            .then(function (res) {
                setList(res.data)
                console.log(res.data);
            })
    }


    
    const data = {

        labels: list?.map((val) => {
            return (
                val.TIPO_DOC + "-" + val.NUMERO_DOC
            )
        }),


        datasets: [{
            yAxisID: 'yAxis',
            label: `Porcentagem manifestado`,
            //backgroundColor: `${collor}`,
            backgroundColor: list?.map((val) => {
                return (
                    val.SALDO * 80 >100? `${red}` :`${collor2}` 
                )
            }),
            data: list?.map((val) => {
                return (
                    (val.SALDO * 100 ).toFixed(2)
                )
            }),

            borderWidth: 1
        }]
    }

    const options = { 
        plugins: {
            subtitle: {
                display: true,
                text: 'Controle de carga das DIs ou BLs cadastradas'
            }, legend: {
                labels: {
                    // This more specific font property overrides the global property
                    font: {
                        size: 30
                    }
                }
            }
        },   
        
    }


    return (
        <>

            <Bar
                height={300}
                width={600}
                data={data}
                options={options}
                responsive={true}
                maintainAspectRatio={true}
            />
        </>

    )
}


export default BarChart;