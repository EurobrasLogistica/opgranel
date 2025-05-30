import React, { useEffect } from "react";
import { useState } from "react";
import Axios from 'axios';
import Navbar from "../../components/Navbar";
import Brackground from "../../components/Background";
import Container from "../../components/Container";
import Header from "../../components/Header";
import { useParams } from "react-router-dom";
import style from "./Dash.module.css";
import GerarNfe from "../../components/GerarNfe";
import BarChart from "../../components/Barchart/Barchart";
//import { PieChart, Pie } from 'recharts';


const Dashboard = () => {

  const { id } = useParams()
{/*
  const data = [
    {name: 'Geeksforgeeks', students: 10},
    {name: 'Technical scripter', students: 900},
  ];
  */}
  return (
    <>
      <Navbar />
      <Header />
      <Brackground />
      <Container>
        <h1>Dashboard</h1> <br />

        <div>
          <div className={style.teste}>
            {/* <GerarNfe /> */}

          </div>

        </div>
{/*
        <div className={style.graf}>

         <GraficoPercent docs={list}/> 
         <div className={style.porc}>
          
          <div class='dashboard'>74%</div>
         </div>
         <PieChart width={700} height={700}>
          <Pie 
          data={data} 
          dataKey="students" 
         // cx={400}
         // cy={300}
          outerRadius={250} 
          innerRadius={150}  
          fill="#1E3E59"
          
          />
         
         </PieChart>
         <div className={style.info}>
         <div>Capicidade Total: </div>
         <div>Usado: </div>
         <div>Pi: </div>

        

         </div>
        </div>
      
        <div>fer</div>
          */}
      </Container>
    </>
  );
};

export default Dashboard;