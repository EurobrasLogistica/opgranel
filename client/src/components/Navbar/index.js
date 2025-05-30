import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { AuthContext } from '../../contexts/auth';
import './styles.css';

function Navbar() {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [isActive, setIsActive] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);
  
    const menuItems = [
    { route: "/dashboard", icon: "fa fa-dashboard", text: "Início", activeProp: "dashboard", allowedIds: ["jmichelotto","arodrigues","glopes", "wesleyf","ajunior", "wgoncalves", "gpsilva", "wroberto","vhsilva","csilva","dbarbosa","apsilva","jvalter","wteixeira","wnascimento","grifo","enascimento","toliveira","mmsantos", "mssilva","tazevedo","nalves","rpsouza","gmsantos","amsouza","hollanda","dcruz","walmeida"] },
    { route: "/navios", icon: "fa fa-ship icon", text: "Navios", activeProp: "navios", allowedIds: ["jmichelotto","arodrigues","vhsilva","ajunior","glopes",  "wesleyf","dbarbosa", "wgoncalves",  "wroberto", "csilva","apsilva","jvalter","wteixeira","wnascimento","grifo","enascimento","toliveira","mmsantos", "mssilva","tazevedo","nalves","rpsouza","gmsantos","amsouza","hollanda","dcruz","walmeida"] },
    { route: "/cargas", icon: "fa fa-area-chart icon", text: "Cargas", activeProp: "cargas", allowedIds: ["jmichelotto","arodrigues","vhsilva","ajunior", "csilva", "wesleyf","glopes","dbarbosa", "wgoncalves","wroberto", "mssilva","apsilva","jvalter","wteixeira","wnascimento","grifo","enascimento","toliveira","mmsantos","tazevedo","nalves","rpsouza","gmsantos","amsouza","hollanda","dcruz","walmeida"] },
    { route: "/veiculos/BuscarMotorista", icon: "fa fa-truck icon", text: "Autos", activeProp: "veiculos", allowedIds: ["jmichelotto","csilva", "ajunior","vhsilva", "wesleyf","arodrigues", "glopes", "wgoncalves","wroberto", "mssilva","dbarbosa","apsilva","jvalter","wteixeira","wnascimento","grifo","enascimento","toliveira","mmsantos","tazevedo","nalves","rpsouza","gmsantos","amsouza","hollanda","dcruz","walmeida"] },
    { route: "/operacoes",  icon: "fa fa-anchor", text: "Operação", activeProp: "operacao", allowedIds: ["jmichelotto","arodrigues","vhsilva","gpsilva", "csilva","ajunior", "wesleyf","dbarbosa","wgoncalves", "glopes", "wroberto", "mssilva","apsilva","jvalter","wteixeira","wnascimento","grifo","enascimento","toliveira","mmsantos","tazevedo","nalves","rpsouza","gmsantos","amsouza","hollanda","dcruz","walmeida"] },
    { route: "/relatorios", icon: "far fa-file-alt", text: "Relatórios", activeProp: "relatorios", allowedIds: ["jmichelotto", "arodrigues", "gpsilva", "vhsilva","csilva", "wesleyf", "ajunior", "wroberto","wgoncalves","glopes", "mssilva","dbarbosa","apsilva","jvalter","wteixeira","wnascimento","grifo","enascimento","toliveira","mmsantos","tazevedo","nalves","rpsouza","gmsantos","amsouza","hollanda","dcruz","walmeida"] },
    { route: "/suporte", icon: "fas fa-sitemap icon", text: "Suporte", activeProp: "suporte", allowedIds: ["jmichelotto","arodrigues","vhsilva", "wesleyf", "gpsilva", "dbarbosa","csilva", "wroberto", "ajunior","wgoncalves","glopes","mssilva","apsilva","jvalter","wteixeira","wnascimento","grifo","enascimento","toliveira","mmsantos","tazevedo","nalves","rpsouza","gmsantos","amsouza","hollanda","dcruz","walmeida"] },
    { route: "/portalCliente", icon: "fas fa-user-alt", text: "Portal do Cliente", activeProp: "PortalCliente", allowedIds: [ "grifo"] },
    { route: "/motivacao", icon: "fas fa-user-alt", text: "Motivação", activeProp: "Motivacao", allowedIds: [ "grifo"] },
    { route: "/CadastroInfo", icon: " fas fa-plus-square", text: "Cadastrar", activeProp: "CadastroInfo", allowedIds: [ "grifo", "jmichelotto", "nalves"] },
    { route: "/AlteracaoCadastral", icon: " fas fa-edit", text: "Alteração Cadastral", activeProp: "AlteracaoCadastral", allowedIds: ["grifo", "jmichelotto", "vhsilva", "nalves","ajunior", "walmeida", "dcruz", "glopes"] },
 ];

  const filteredMenuItems = menuItems.filter(item => user && item.allowedIds.includes(user.id));
  
  const handleNavigation = (route) => {
      setIsActive(false);
      setIsCollapsed(true); // Recolher o menu ao selecionar um item
      navigate(route);
  };

  const toggleMenu = () => {
      setIsCollapsed(!isCollapsed); // Alternar visibilidade
  };

  const handleMenuHover = () => {
      setIsCollapsed(false); // Expandir o menu ao passar o mouse
  };

  const handleMenuLeave = () => {
      setIsCollapsed(true); // Recolher o menu ao remover o mouse
  };

  useEffect(() => {
      if (window.innerWidth <= 768) {
          setIsCollapsed(true); // Colapsar para dispositivos móveis
      }
  }, []);

  return (
      <div id="menu" onMouseEnter={handleMenuHover} onMouseLeave={handleMenuLeave} className={isCollapsed ? 'collapsed' : ''}>
          <div className="menu-container">
              <nav className={`menu-horizontal ${isActive ? 'active' : ''}`}>
                  <ul className="itens-menu">
                      <li onClick={toggleMenu}>
                          <div className="nav_bar">
                              <i className="fas fa-bars"></i>
                          </div>
                      </li>

                      {filteredMenuItems.map((item, index) => (
                          <li
                              key={item.route}
                              onClick={() => handleNavigation(item.route)}
                              className={`${location.pathname === item.route ? 'ativo' : ''} ${index === 0 ? 'first-tab' : ''}`}
                          >
                              <div className="nav_bar">
                                  <i className={item.icon + " item-icon"}></i>
                                  <span className="item-text">{item.text}</span>
                              </div>
                          </li>
                      ))}
                      <li onClick={logout}>
                          <div className="nav_bar">
                              <i className="fas fa-sign-out-alt item-icon"></i>
                              <span className="item-text">SAIR</span>
                          </div>
                      </li>
                  </ul>
              </nav>
          </div>
      </div>
  );
}

export default Navbar;