import React, { useEffect } from "react";
import { useState } from "react";
import Axios from 'axios';
import Navbar from "../../../components/Navbar";
import Brackground from "../../../components/Background";
import Container from "../../../components/Container";
import Header from "../../../components/Header";
import { useParams } from "react-router-dom";
import { useNavigate} from "react-router-dom";
import GraficoPercent from "../../../components/GraficoPercent";
import style from "./GraficoPortal.module.css";



const GraficoPortal = () => {

  useEffect(() => {
    getDados();
}, [])

let { id } = useParams();
const [list, setList] = useState([])
const navigate = useNavigate();


async function getDados() {
   await Axios.get(`https://opgranel.eurobraslogistica.com.br/api/grafico/portal/${id}`,)
        .then(function (res) {
            setList(res.data)
            console.log(res.data)
        })

}


  return (
    <>
      <Navbar />
      <Header />
      <Brackground />
      <Container>

        <div className={style.content}>
          <div className={style.nav}>
            <div className={style.nav}>
              
            <div onClick={() => navigate(`/portalCliente`)}>
              Selecione um navio
              </div>
              <div onClick={() => navigate(`/portalCliente/relatorio/${id}`)}>
              Relatório
              </div>
              <div className={style.active}>
              DI / BL
              </div>
          
            </div>
          </div>
           
              <div className={style.gftitle}>Quantidade descarregada por (DI/BL)</div>
                    <GraficoPercent docs={list} />
                    
          </div>
  
      </Container>
    </>
  );
};

export default GraficoPortal;