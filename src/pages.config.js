import Accueil from './pages/Accueil';
import FicheDetail from './pages/FicheDetail';
import FicheDetailV2 from './pages/FicheDetailV2';
import DemandesEtude from './pages/DemandesEtude';
import CreerDE from './pages/CreerDE';
import TraiterDE from './pages/TraiterDE';
import CreerFL from './pages/CreerFL';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Accueil": Accueil,
    "FicheDetail": FicheDetail,
    "FicheDetailV2": FicheDetailV2,
    "DemandesEtude": DemandesEtude,
    "CreerDE": CreerDE,
    "TraiterDE": TraiterDE,
    "CreerFL": CreerFL,
}

export const pagesConfig = {
    mainPage: "Accueil",
    Pages: PAGES,
    Layout: __Layout,
};