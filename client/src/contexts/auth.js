import { createContext, useEffect, useState } from "react";
import Axios from "axios";

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    const usersStorage = [
    { "id": "maguiar", "password": "eurobras@241#2#3#4", "nivel": "mestre", "nmcompleto": "Marcelo Aguiar Rocha dos Santos", "depto": "TI/STS", "status": "inativo" },
        { "id": "lucas", "password": "eurobras@241#2#3#4", "nivel": "mestre","nmcompleto": "Lucas Rodrigues", "depto": "TI/STS", "status": "inativo"  },
        { "id": "dbarbosa", "password": "srDF3%12*34s$", "nivel": "mestre","nmcompleto": "Diego Campos Barbosa", "depto": "DIN/STS", "status": "inativo"  },
        { "id": "gnascimento", "password": "ghn@155$#%*~", "nivel": "mestre","nmcompleto": "Gustavo Honorato Nascimento", "depto": "COS/STS", "status": "inativo" },
        { "id": "mnascimento", "password": "48%$$%&$", "nivel": "mestre","nmcompleto": "Mauricio Nascimento Junior", "depto": "DIN/STS", "status": "inativo"  },
        { "id": "apicalomini", "password": "eurobras@241#2#3#4", "nivel": "mestre","nmcompleto": "Ari Picalomini Pinto", "depto": "COS/STS", "status": "inativo"  },
        { "id": "lasilva", "password": "1WAR@!#4sdsdf", "nivel": "mestre","nmcompleto": "Lucas Abreu da Silva", "depto": "DIN/STS", "status": "inativo"  },
        { "id": "msantos", "password": "48%$$%&$", "nivel": "mestre","nmcompleto": "Mauricio da Conceição Santos", "depto": "COS/STS", "status": "inativo"  },
        { "id": "ssebadelhe", "password": "sas@266$#%*~", "nivel": "mestre","nmcompleto": "Sérgio Augusto Sebadelhe", "depto": "COS/STS", "status": "inativo"  },
        { "id": "glsilva", "password": "gls@5581#2#3#4", "nivel": "mestre","nmcompleto": "Genilson Luiz da Silva", "depto": "COS/STS", "status": "inativo"  },
        { "id": "arsantos", "password": "ars@351!@1#2#3#4", "nivel": "mestre","nmcompleto": "Aduilson Ribeiro dos Santos", "depto": "COS/STS", "status": "inativo"  },
        { "id": "amsouza", "password": "ams@854$#%*~", "nivel": "mestre","nmcompleto": "Alexandre Moreira de Souza", "depto": "COS/STS", "status": "inativo"  },
        { "id": "mssilva", "password": "d$%s@87@$$&*", "nivel": "mestre","nmcompleto": "Marcos Antonio Santos da Silva", "depto": "COS/STS", "status": "inativo"  },
        { "id": "mmsantos", "password": "mms@753$#%*~", "nivel": "mestre","nmcompleto": "Marconi Raimundo Mendonça dos Santos", "depto": "COS/STS", "status": "inativo"  },
        { "id": "joao", "password": "48%$$%&$", "nivel": "mestre", "nmcompleto": "Joao Roberto Archiolli", "depto": "TI/STS", "status": "inativo" },
        { "id": "jaugusto", "password": "eurobras#23$7&8*9", "nivel": "mestre","nmcompleto": "Jose Augusto F. Conrado", "depto": "CML/STS", "status": "inativo"  },
        { "id": "fertiparsp", "password": "fertSP@2O2A#2#3#4", "nivel": "mestre","nmcompleto": "Fertipar Bandeirantes (Campo Limpo Paulista)", "depto": "SP", "status": "inativo"  },
        { "id": "fertiparmg", "password": "fertMG#2O2A#2#3#4", "nivel": "mestre","nmcompleto": "Fertipar Sudeste (Varginha MG)", "depto": "MG", "status": "inativo"  },
        { "id": "ljfelix", "password": "eurobras@241#2#3#4", "nivel": "mestre","nmcompleto": "Lucas Joaquim Felix da Silva", "depto": "COS/STS", "status": "inativo"  },
        { "id": "wroberto", "password": "wroberto2024", "nivel": "mestre","nmcompleto": "Wesley Roberto Fernandes Machado", "depto": "COS/STS", "status": "inativo"  },
        { "id": "wesleyf", "password": "2024wesley", "nivel": "mestre","nmcompleto": "Wesley Machado", "depto": "COS/STS", "status": "ativo"  },
        { "id": "tazevedo", "password": "taz@#$%*", "nivel": "mestre","nmcompleto": "Túlio Augusto Azevedo", "depto": "COS/STS", "status": "inativo"  },
        { "id": "hollanda", "password": "hol@158", "nivel": "mestre","nmcompleto": "João Luiz Hollanda", "depto": "ADM/STS", "status": "ativo"  },
        { "id": "walmeida", "password": "wra@621", "nivel": "mestre","nmcompleto": "Wilson Ribeiro Almeida", "depto": "COS/STS", "status": "ativo"  },
        { "id": "dcruz", "password": "dsc@158", "nivel": "mestre","nmcompleto": "Douglas de Souza Cruz", "depto": "COS/STS", "status": "ativo"  },
        { "id": "gmsantos", "password": "gms@152", "nivel": "mestre","nmcompleto": "Gabriel Dos Santos", "depto": "COS/STS", "status": "ativo"  },
        { "id": "rpsouza", "password": "rps@160", "nivel": "mestre","nmcompleto": "Roberto Pereira ", "depto": "COS/STS", "status": "ativo"  },
        { "id": "nalves", "password": "nia@741", "nivel": "mestre","nmcompleto": "Nicolas Alves", "depto": "DIN/STS", "status": "ativo"  },
        { "id": "jmichelotto", "password": "685Julia", "nivel": "mestre","nmcompleto": "Julia Michelotto", "depto": "TI/STS", "status": "ativo"  },
        { "id": "arodrigues", "password": "teste", "nivel": "mestre","nmcompleto": "Anderson Rodrigues", "depto": "TI/STS", "status": "ativo"  },
        { "id": "toliveira", "password": "tma@123", "nivel": "mestre","nmcompleto": "Tania Maria Alves", "depto": "ARM/STS", "status": "ativo"  },
        { "id": "enascimento", "password": "erme@234", "nivel": "mestre","nmcompleto": "Ermelania Do Nascimento", "depto": "ARM/STS", "status": "ativo"  },
        { "id": "grifo", "password": "48%$$%&$", "nivel": "mestre","nmcompleto": "Teste", "depto": "TI/STS", "status": "ativo" },
        { "id": "wnascimento", "password": "grcmac#23", "nivel": "mestre","nmcompleto": "William Nascimento", "depto": "GRCMAC/STS", "status": "ativo"  },
        { "id": "wteixeira", "password": "walter#23", "nivel": "mestre","nmcompleto": "Walter Teixeira", "depto": "COS/STS", "status": "ativo"  },
        { "id": "jvalter", "password": "jvalter#23", "nivel": "mestre","nmcompleto": "José Valter", "depto": "COS/STS", "status": "ativo"  },
        { "id": "apsilva", "password": "apsilva#24", "nivel": "mestre","nmcompleto": "Alexsandro Pereira Silva", "depto": "ARM/STS", "status": "ativo"  },
        { "id": "csilva", "password": "cbs@2024", "nivel": "mestre","nmcompleto": "Clyviston Barroso", "depto": "COM/STS", "status": "ativo"  },
        { "id": "vhsilva", "password": "vhs@2024", "nivel": "mestre","nmcompleto": "Victor Hugo", "depto": "ARM/STS", "status": "ativo"  },
        { "id": "ajunior", "password": "aj#2024", "nivel": "mestre","nmcompleto": "Altamiro Junior", "depto": "COS/STS", "status": "ativo"  },
        { "id": "gpsilva", "password": "solelua18", "nivel": "mestre","nmcompleto": "Gisele Prudente", "depto": "GRCMAC/STS", "status": "ativo"  },
        { "id": "wgoncalves", "password": "rodrimar@24", "nivel": "mestre","nmcompleto": "Werner do Nascimento", "depto": "ARM/STS", "status": "ativo"  },
        { "id": "glopes", "password": "guilhermeRodrimar", "nivel": "mestre","nmcompleto": "Guilherme Nascimento", "depto": "TI/STS", "status": "ativo"  }
   
    ];

    useEffect(() => {
        const userToken = localStorage.getItem("user_token");

        if (userToken) {
            const parsedToken = JSON.parse(userToken);
            const currentUser = usersStorage.find((u) => u.id === parsedToken.id);

            if (currentUser) {
                if (currentUser.status === "ativo") {
                    setUser(currentUser);
                } else {
                    forceLogout(parsedToken.id); // Força logout se o usuário estiver inativo
                }
            }
        }
    }, []);

    const login = (id, password) => {
        const hasUser = usersStorage.find((user) => user.id === id);

        if (hasUser) {
            if (hasUser.password === password) {
                if (hasUser.status === "ativo") {
                    const nome = hasUser.nmcompleto;
                    const departamento = hasUser.depto;
                    const token = Math.random().toString(36).substring(2);
                    localStorage.setItem("user_token", JSON.stringify({ id, token, nome, departamento }));
                    setUser({ id, nome, departamento });
                } else {
                    return "Usuário está inativo.";
                }
            } else {
                return "Usuário ou senha incorretos";
            }
        } else {
            return "Usuário não cadastrado";
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("user_token");
    };

    const forceLogout = (userId) => {
        const currentToken = JSON.parse(localStorage.getItem("user_token"));
        if (currentToken?.id === userId) {
            logout();
            alert("Sua sessão foi encerrada pelo administrador.");
        }
    };

   return ( //retorna os valores para que possam ser usados no resto da aplicação
        <AuthContext.Provider
            value={{user, signed: !!user, login, logout }}
        >
            {children}
        </AuthContext.Provider>

);
};