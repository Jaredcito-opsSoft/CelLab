import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PanelPage } from '../pages/PanelPage';
import { PublicHomePage } from '../pages/PublicHomePage';
export function App() {
  return <BrowserRouter><Routes><Route path="/" element={<PublicHomePage />} /><Route path="/panel/*" element={<PanelPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></BrowserRouter>;
}
