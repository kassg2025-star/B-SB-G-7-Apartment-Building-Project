import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import SCurveAnalysis from './pages/SCurveAnalysis';
import DelayAnalysis from './pages/DelayAnalysis';
import EOTManagement from './pages/EOTManagement';
import FinancialMonitoring from './pages/FinancialMonitoring';
import QualityNCR from './pages/QualityNCR';
import ResourceManagement from './pages/ResourceManagement';
import HSEDashboard from './pages/HSEDashboard';
import ProjectDataCenter from './pages/ProjectDataCenter';
import AIReportGenerator from './pages/AIReportGenerator';
import SchedulePlanner from './pages/SchedulePlanner';
import RiskRegister from './pages/RiskRegister';
import AlertsCentre from './pages/AlertsCentre';
import ProjectSettings from './pages/ProjectSettings';
import ManpowerPayroll from './pages/ManpowerPayroll';
import ConcreteCasting from './pages/ConcreteCasting';
import VariationOrders from './pages/VariationOrders';
import SubcontractorRegister from './pages/SubcontractorRegister';
import BOQModule from './pages/BOQModule';
import DrawingRegister from './pages/DrawingRegister';
import OrgChart from './pages/OrgChart';

const EB = ErrorBoundary;

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"            element={<EB><ExecutiveDashboard /></EB>} />
        <Route path="/s-curve"     element={<EB><SCurveAnalysis /></EB>} />
        <Route path="/delay"       element={<EB><DelayAnalysis /></EB>} />
        <Route path="/eot"         element={<EB><EOTManagement /></EB>} />
        <Route path="/financial"   element={<EB><FinancialMonitoring /></EB>} />
        <Route path="/quality"     element={<EB><QualityNCR /></EB>} />
        <Route path="/resources"   element={<EB><ResourceManagement /></EB>} />
        <Route path="/hse"         element={<EB><HSEDashboard /></EB>} />
        <Route path="/risk"        element={<EB><RiskRegister /></EB>} />
        <Route path="/schedule"    element={<EB><SchedulePlanner /></EB>} />
        <Route path="/data-center" element={<EB><ProjectDataCenter /></EB>} />
        <Route path="/reports"     element={<EB><AIReportGenerator /></EB>} />
        <Route path="/alerts"      element={<EB><AlertsCentre /></EB>} />
        <Route path="/settings"    element={<EB><ProjectSettings /></EB>} />
        <Route path="/manpower"    element={<EB><ManpowerPayroll /></EB>} />
        <Route path="/concrete"    element={<EB><ConcreteCasting /></EB>} />
        <Route path="/variations"  element={<EB><VariationOrders /></EB>} />
        <Route path="/subcontractors" element={<EB><SubcontractorRegister /></EB>} />
        <Route path="/boq"         element={<EB><BOQModule /></EB>} />
        <Route path="/drawings"    element={<EB><DrawingRegister /></EB>} />
        <Route path="/org-chart"   element={<EB><OrgChart /></EB>} />
      </Routes>
    </Layout>
  );
}
