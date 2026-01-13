import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Navigation } from "@/components/Navigation";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Strategy from "./pages/Strategy";
import PaperTradingLive from "./pages/PaperTradingLive";
import BacktestingStrategy from "./pages/BacktestingStrategy";
import NotFound from "./pages/NotFound";
import ViewOrder from "./pages/ViewOrder";
import Login from "./pages/Login";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Navigation />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/strategy" element={<ProtectedRoute><Strategy /></ProtectedRoute>} />
              <Route path="/paper-trading-live" element={<ProtectedRoute><PaperTradingLive /></ProtectedRoute>} />
              <Route path="/backtesting-strategy" element={<ProtectedRoute><BacktestingStrategy /></ProtectedRoute>} />
              <Route path="/viewOrder/:id" element={<ProtectedRoute><ViewOrder /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
