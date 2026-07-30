import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Typewriter } from "react-simple-typewriter";
import useAuth from "../../hooks/useAuth";
import style from "./Login.module.css";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!id || !senha) {
      setError("*Preencha todos os campos*");
      return;
    }

    const res = await login(id.toLowerCase(), senha);

    if (res) {
      setError(res);
      return;
    }

    navigate("/dashboard");
  };

  return (
    <>
      <div className={style.content}>
        <div className={style.login_left}>
          <div className={style.left_container}></div>
          <div className={style.frase_box}>
            <div className={style.frase}>
              Qualquer hora, qualquer lugar <br />
              Controle{" "}
              <b>
                <Typewriter
                  words={["sua carga!", "seu navio!", "suas operacoes!"]}
                  loop={0}
                  cursor
                  cursorStyle="|"
                  typeSpeed={100}
                  deleteSpeed={80}
                  delaySpeed={2000}
                />
              </b>
            </div>
          </div>
        </div>
        <div className={style.login_right}>
          <div className={style.text_right}>
            <div className={style.tittle}>Operacao Granel</div>
            <form onSubmit={handleLogin}>
              <div className={style.group}>
                <input
                  className={style.input}
                  type="text"
                  value={id}
                  onChange={(e) => {
                    setId(e.target.value);
                    setError("");
                  }}
                  required
                />
                <label>Usuario</label>
              </div>
              <div className={style.group}>
                <input
                  className={style.input}
                  type="password"
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    setError("");
                  }}
                  required
                />
                <label>Senha</label>
              </div>
              <div className={style.msg}>{error}</div>
              <div className={style.submit}>
                <button type="submit" autoFocus>
                  Entrar
                </button>
                <a
                  href="#registro"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Contate o suporte!");
                  }}
                >
                  &nbsp;Registre-se
                </a>
              </div>
            </form>
            <p className="direitos">Todos os direitos reservados &copy;</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
