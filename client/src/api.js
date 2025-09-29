// client/src/services/api.js
import axios from "axios";

// Se o backend NÃO usa /api no caminho, não coloque /api aqui.
const API_BASE =
  process.env.REACT_APP_SERVER ||
  (window.location.hostname === "localhost"
    ? "http://localhost:3009"                       // dev local
    : "https://opgranel.eurobraslogistica.com.br/api"); // produção

export const api = axios.create({ baseURL: API_BASE });
