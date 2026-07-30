import { createContext, useEffect, useState } from "react";
import { api } from "../api";

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const userToken = localStorage.getItem("user_token");

        if (!userToken) {
            return;
        }

        try {
            const parsedToken = JSON.parse(userToken);

            if (parsedToken?.id && parsedToken?.token) {
                setUser(parsedToken);
            } else {
                localStorage.removeItem("user_token");
            }
        } catch {
            localStorage.removeItem("user_token");
        }
    }, []);

    const login = async (id, password) => {
        try {
            const { data } = await api.post("/login/user", {
                usuario: id,
                senha: password
            });

            const usuario = data.user;
            const token = Math.random().toString(36).substring(2);
            const userData = {
                id: usuario.id,
                token,
                nome: usuario.nome,
                departamento: usuario.departamento,
                email: usuario.email,
                admin: usuario.admin,
                nivel: usuario.nivel
            };

            localStorage.setItem("user_token", JSON.stringify(userData));
            setUser(userData);
            return null;
        } catch (err) {
            return err.response?.data?.message || "Erro ao fazer login. Tente novamente.";
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("user_token");
    };

   return (
        <AuthContext.Provider
            value={{user, signed: !!user, login, logout }}
        >
            {children}
        </AuthContext.Provider>

);
};
