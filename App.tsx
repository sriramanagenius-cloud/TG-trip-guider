
import React, { useState } from 'react';
import StepAuth from './components/StepAuth';
import StepAdmin from './components/StepAdmin';
import StepLanding from './components/StepLanding';
import StepInputs from './components/StepInputs';
import StepTransport from './components/StepTransport';
import StepBudget from './components/StepBudget';
import StepResults from './components/StepResults';
import StepDuration from './components/StepDuration';
import StepAdViewer from './components/StepAdViewer';
import { AppStep, TripFormData, TransportType, BudgetLevel, TripPlanResponse, User, TripAnalysis } from './types';
import { analyzeTripRoute, generateTripPlan } from './services/geminiService';
import { deductPoints, addPoints, deleteUser } from './services/authService';
import { AlertCircle, Plane, Map as MapIcon, Cloud, Wallet, PlayCircle, Loader2, Trash2 } from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.AUTH);
  const [user, setUser] = useState<User | null>(null);
  
  // Trip Data
  const [formData, setFormData] = useState<TripFormData>({
    origin: '',
    destination: '',
    transport: TransportType.CAR,
    days: 3,
    travelers: 2, 
  });

  // Analysis Data
  const [analysis, setAnalysis] = useState<TripAnalysis | null>(null);

  const [tripPlan, setTripPlan] = useState<TripPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AUTHENTICATION
  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.isAdmin) {
      setStep(AppStep.ADMIN);
    } else {
      setStep(AppStep.LANDING);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setStep(AppStep.AUTH);
  };

  const handleDeleteAccount = () => {
    if (!user) return;
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
        const success = deleteUser(user.id);
        if (success) {
            handleLogout();
        } else {
            // If delete failed (e.g., user already removed from DB by admin), just log them out to fix state
            alert("Account deleted or not found. Logging you out.");
            handleLogout();
        }
    }
  };

  // TRIP FLOW
  const handleInputSubmit = async (origin: string, destination: string) => {
    setFormData(prev => ({ ...prev, origin, destination }));
    setStep(AppStep.ANALYZING);
    setError(null);
    
    try {
      const result = await analyzeTripRoute(origin, destination);
      setAnalysis(result);
      // Update form with corrected spellings from analysis
      setFormData(prev => ({ 
        ...prev, 
        origin: result.correctedOrigin || origin, 
        destination: result.correctedDestination || destination 
      }));
      
      setStep(AppStep.POINT_CHECK);
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please try again.");
      setStep(AppStep.ERROR);
    }
  };

  const handlePointCheckConfirm = () => {
    if (!user || !analysis) return;

    const cost = analysis.isInternational ? 100 : 50;
    
    if (user.points >= cost) {
      const success = deductPoints(user.id, cost);
      if (success) {
        // Refresh local user state points
        setUser(prev => prev ? { ...prev, points: prev.points - cost } : null);
        
        // Auto set days range based on analysis
        const avgDays = Math.ceil((analysis.minDays + analysis.maxDays) / 2);
        setFormData(prev => ({ ...prev, days: avgDays }));
        
        setStep(AppStep.DURATION_SELECTION);
      } else {
        setError("Transaction failed.");
      }
    } else {
      setError("Insufficient points.");
    }
  };

  const handleWatchAdStart = () => {
    setStep(AppStep.AD_WATCH);
  };

  const handleAdComplete = () => {
    if (!user) return;
    addPoints(user.id, 50);
    setUser(prev => prev ? { ...prev, points: prev.points + 50 } : null);
    setStep(AppStep.POINT_CHECK);
  };

  const handleAdCancel = () => {
    setStep(AppStep.POINT_CHECK);
  };

  const handleDurationSelect = (days: number, travelers: number) => {
    setFormData(prev => ({ ...prev, days, travelers }));
    setStep(AppStep.TRANSPORT);
  };

  const handleTransportSelect = (transport: TransportType) => {
    setFormData(prev => ({ ...prev, transport }));
    setStep(AppStep.BUDGET);
  };

  const handleBudgetSelect = async (budget: BudgetLevel) => {
    const finalData = { ...formData, budget };
    setFormData(finalData);
    setStep(AppStep.LOADING);
    setError(null);

    try {
      const result = await generateTripPlan(finalData);
      setTripPlan(result);
      setStep(AppStep.RESULTS);
    } catch (err) {
      console.error(err);
      setError("Planning failed. Please try again.");
      setStep(AppStep.ERROR);
    }
  };

  const handleReset = () => {
    setStep(AppStep.LANDING);
    setFormData({ origin: '', destination: '', transport: TransportType.CAR, days: 3, travelers: 2 });
    setAnalysis(null);
    setTripPlan(null);
    setError(null);
  };

  // --- RENDER CONTENT HELPER ---
  const renderStepContent = () => {
    switch (step) {
      case AppStep.AUTH: return <StepAuth onLogin={handleLogin} />;
      case AppStep.ADMIN: return <StepAdmin onLogout={handleLogout} />;
      case AppStep.AD_WATCH: return <StepAdViewer onComplete={handleAdComplete} onCancel={handleAdCancel} />;
      case AppStep.LANDING: return <StepLanding onStart={() => setStep(AppStep.INPUTS)} />;
      case AppStep.INPUTS: return <StepInputs data={formData} onSubmit={handleInputSubmit} />;
      case AppStep.ANALYZING:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white relative">
            <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-bold">Checking Route...</h2>
            <p className="text-slate-400 mt-2">Correcting spelling & calculating distance</p>
          </div>
        );
      case AppStep.POINT_CHECK:
         if (!user || !analysis) return null;
         const cost = analysis.isInternational ? 100 : 50;
         const canAfford = user.points >= cost;
         return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl text-center relative z-10">
                  <h2 className="text-3xl font-bold text-white mb-2">Trip Summary</h2>
                  <div className="flex justify-center items-center gap-3 text-lg text-slate-300 mb-6">
                      <span>{analysis.correctedOrigin}</span>
                      <span className="text-teal-400">→</span>
                      <span>{analysis.correctedDestination}</span>
                  </div>

                  <div className={`p-4 rounded-xl mb-6 ${analysis.isInternational ? 'bg-purple-500/20 border-purple-500/50' : 'bg-blue-500/20 border-blue-500/50'} border`}>
                      <span className={`text-xs font-bold uppercase tracking-wider ${analysis.isInternational ? 'text-purple-300' : 'text-blue-300'}`}>
                          {analysis.isInternational ? 'International Trip' : 'National Trip'}
                      </span>
                      <div className="text-4xl font-bold text-white mt-1">{cost} <span className="text-lg font-normal opacity-70">pts</span></div>
                  </div>

                  <div className="flex justify-between items-center text-sm text-slate-400 mb-8 bg-slate-800 p-4 rounded-lg">
                      <span>Your Balance:</span>
                      <span className={`${canAfford ? 'text-teal-400' : 'text-red-400'} font-bold text-lg`}>{user.points} pts</span>
                  </div>

                  {canAfford ? (
                      <button 
                          onClick={handlePointCheckConfirm}
                          className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg"
                      >
                          Unlock Plan (-{cost} pts)
                      </button>
                  ) : (
                      <div className="space-y-4">
                          <p className="text-red-300 font-medium bg-red-900/20 p-2 rounded-lg">Insufficient Points!</p>
                          <button 
                              onClick={handleWatchAdStart}
                              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                          >
                              <PlayCircle className="w-5 h-5" /> Watch Ad (+50 pts)
                          </button>
                          <p className="text-xs text-slate-400 mt-2">Watch a short ad to earn points immediately.</p>
                      </div>
                  )}
              </div>
            </div>
         );
      case AppStep.DURATION_SELECTION:
        if (!analysis) return null;
        return <StepDuration minDays={analysis.minDays} maxDays={analysis.maxDays} onSelect={handleDurationSelect} onBack={() => setStep(AppStep.INPUTS)} destination={analysis.correctedDestination} />;
      case AppStep.TRANSPORT:
        if (!analysis) return null;
        return <StepTransport validTransports={analysis.validTransports} onSelect={handleTransportSelect} onBack={() => setStep(AppStep.DURATION_SELECTION)} />;
      case AppStep.BUDGET:
        return <StepBudget onSelect={handleBudgetSelect} onBack={() => setStep(AppStep.TRANSPORT)} />;
      case AppStep.LOADING:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-sky-50 overflow-hidden relative">
            <div className="absolute top-20 -left-20 animate-[moveRight_20s_linear_infinite] text-sky-200"><Cloud className="w-24 h-24 opacity-50" /></div>
            <div className="absolute top-40 -right-20 animate-[moveLeft_25s_linear_infinite] text-sky-200"><Cloud className="w-32 h-32 opacity-40" /></div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                    <div className="absolute inset-0 bg-teal-400 rounded-full animate-ping opacity-20"></div>
                    <div className="absolute inset-4 bg-white rounded-full shadow-xl flex items-center justify-center">
                        <MapIcon className="w-16 h-16 text-teal-500" />
                    </div>
                    <div className="absolute inset-0 animate-spin-slow">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 p-3 rounded-full text-white shadow-lg transform -rotate-45"><Plane className="w-6 h-6" /></div>
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-slate-800 animate-pulse">Planning Trip...</h2>
                <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100">
                   <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"></span>
                   <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce delay-100"></span>
                   <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce delay-200"></span>
                </div>
            </div>
            <style>{`@keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        );
      case AppStep.ERROR:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
            <div className="bg-red-100 p-4 rounded-full mb-4"><AlertCircle className="w-12 h-12 text-red-600" /></div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Oops! Something went wrong.</h2>
            <p className="text-slate-600 mb-6 max-w-md">{error}</p>
            <button onClick={handleReset} className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">Start Over</button>
          </div>
        );
      case AppStep.RESULTS:
        if (!tripPlan) return null;
        return <StepResults plan={tripPlan} formData={formData} onReset={handleReset} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Global User Header - Fixed positioning with high Z-index */}
      {user && step !== AppStep.AUTH && step !== AppStep.ADMIN && (
        <div className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center z-[100] pointer-events-none">
            <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg border border-white/10 pointer-events-auto flex items-center gap-3">
                <span className="font-bold text-sm md:text-base">{user.id}</span>
                <div className="w-px h-4 bg-white/20"></div>
                <div className="flex items-center gap-1 text-teal-400 font-mono">
                    <Wallet className="w-4 h-4" />
                    <span>{user.points} pts</span>
                </div>
            </div>
            
            <div className="flex gap-2 pointer-events-auto">
                {!user.isAdmin && (
                    <button 
                      onClick={handleDeleteAccount} 
                      className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 px-3 py-2 rounded-full transition-colors backdrop-blur-sm shadow-md"
                      title="Delete Account"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
                <button onClick={handleLogout} className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-colors backdrop-blur-sm shadow-md">
                    Logout
                </button>
            </div>
        </div>
      )}

      {renderStepContent()}
    </>
  );
};

export default App;
