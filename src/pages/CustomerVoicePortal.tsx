import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Phone, PhoneOff, RefreshCw, Layers, CheckCircle2, DollarSign, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";

// EMPTY firebaseConfig as requested
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const isFirebaseActive = !!firebaseConfig.apiKey;

// Lazy initialize firebase to prevent crash
let firestoreDb: any = null;
if (isFirebaseActive) {
  try {
    const { initializeApp, getApps, getApp } = require("firebase/app");
    const { getFirestore } = require("firebase/firestore");
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    firestoreDb = getFirestore(app);
  } catch (error) {
    console.warn("Failure initializing firebase", error);
  }
}

export default function CustomerVoicePortal() {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [micActive, setMicActive] = useState(false);
  
  // App state
  const [clientLogs, setClientLogs] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState<string>("");
  const [carType, setCarType] = useState<string>("");
  const [duration, setDuration] = useState<number>(0);
  const [additionalFee, setAdditionalFee] = useState<number>(0);
  const [newTotal, setNewTotal] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusText, setStatusText] = useState("Tap 'Start Call' to talk with receptionist");

  // BroadcastChannel for in-memory sync
  const channelRef = useRef<BroadcastChannel | null>(null);

  // ... Speech synthesis and recognition refs ...
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Setup local broadcast channel
    channelRef.current = new BroadcastChannel("portal_sync");
    
    // Log initial status
    addLog(`Initialized page: running in ${isFirebaseActive ? "Firestore Cloud" : "Local Demo (BroadcastChannel)"} Mode.`);
    
    // Speech synthesis setup
    synthRef.current = window.speechSynthesis;
    
    // Load voices
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        addLog("Speech Synthesis voices loaded.");
      };
    }

    return () => {
      cleanupAudio();
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, []);

  const addLog = (text: string) => {
    setClientLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${text}`, ...prev.slice(0, 19)]);
  };

  const syncToDesktop = async (data: {
    customerName: string;
    carType: string;
    durationDays: number;
    additionalFee: number;
    newTotal: number;
    action: "book" | "edit";
  }) => {
    setIsSyncing(true);
    addLog(`Syncing data to dashboard tab: ${data.customerName} | ${data.carType}`);
    
    try {
      if (isFirebaseActive && firestoreDb) {
        const { collection, addDoc } = require("firebase/firestore");
        await addDoc(collection(firestoreDb, "voice_portal_syncs"), {
          ...data,
          timestamp: new Date().toISOString()
        });
        addLog("Data successfully uploaded to Firestore!");
      } else {
        // BroadcastChannel sync
        if (channelRef.current) {
          channelRef.current.postMessage({
            type: "SYNC_BOOKING",
            data
          });
          addLog("Data broadcasted via BroadcastChannel ('portal_sync')");
        }
      }
    } catch (e: any) {
      addLog(`Error syncing: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const startConnection = async () => {
    if (isConnected) return;
    
    // Prime Speech Synthesis by playing an empty utterance on user gesture.
    if (synthRef.current) {
        const dummy = new SpeechSynthesisUtterance("");
        dummy.volume = 0;
        synthRef.current.speak(dummy);
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addLog("Speech Recognition API not supported in this browser.");
      setStatusText("Browser not supported");
      return;
    }

    setIsLoading(true);
    setStatusText("Connecting to elite voice receptionist...");
    addLog("Requesting microphone permission...");

    try {
      // Explicitly request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsConnected(true);
        setIsLoading(false);
        setMicActive(true);
        setStatusText("Connected. Receptionist is listening...");
        addLog("Voice agency link online. Starting stream...");
      };

      recognition.onresult = async (event: any) => {
        const userText = event.results[0][0].transcript;
        addLog(`You said: "${userText}"`);
        setStatusText("Processing...");

        try {
          // Send to Gemini via our REST endpoint
          const sessionState = {
            customer_name: customerName,
            car_type: carType,
            duration_days: duration,
            total: newTotal
          };

          const res = await fetch("/api/voice-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: userText, sessionState })
          });
          const data = await res.json();
          
          if (data.error) throw new Error(data.error);

          const { speech, calculation } = data;

          if (calculation) {
            const { customer_name, car_type, duration_days, additional_fee, new_total, action } = calculation;
            setCustomerName(customer_name || "");
            setCarType(car_type || "");
            setDuration(duration_days || 0);
            setAdditionalFee(additional_fee || 0);
            setNewTotal(new_total || 0);
            addLog(`Dynamic Fee calculated! Additional: $${additional_fee}, Total: $${new_total}`);

            await syncToDesktop({
              customerName: customer_name,
              carType: car_type,
              durationDays: duration_days,
              additionalFee: additional_fee,
              newTotal: new_total,
              action: action || "book"
            });
          }

          // Output speech via Web Speech API
          if (speech && synthRef.current) {
            addLog(`Receptionist: "${speech}"`);
            synthRef.current.cancel(); // Cancel previous
            
            const utterance = new SpeechSynthesisUtterance(speech);
            utterance.rate = 1.0;
            
            // Default to a professional voice if available
            const voices = synthRef.current.getVoices();
            if (voices.length > 0) {
              const engVoices = voices.filter(v => v.lang.startsWith("en-"));
              if (engVoices.length > 0) {
                 utterance.voice = engVoices[0];
              }
            }

            utterance.onstart = () => {
              setStatusText("Receptionist is speaking...");
            };
            utterance.onend = () => {
              setStatusText("Tap 'Start Phone Call' to speak again.");
              handleDisconnect();
            };

            synthRef.current.speak(utterance);
          } else {
            handleDisconnect();
          }

        } catch (err: any) {
           addLog(`Error processing: ${err.message}`);
           handleDisconnect();
        }
      };

      recognition.onerror = (event: any) => {
        addLog(`Speech recognition error: ${event.error}`);
        handleDisconnect();
      };

      recognition.onend = () => {
        // Recognition stops after one session
        setMicActive(false);
      };

      recognition.start();

    } catch (err: any) {
      addLog(`Error connecting: ${err.message || err}`);
      console.error(err);
      setIsLoading(false);
      setStatusText("Failed to establish voice session");
      cleanupAudio();
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setIsLoading(false);
    setMicActive(false);
    setStatusText("Call ended");
    cleanupAudio();
  };

  const cleanupAudio = () => {
    try {
      if (recognitionRef.current) {
         recognitionRef.current.abort();
      }
      if (synthRef.current) {
         synthRef.current.cancel();
      }
    } catch (_) {}
  };

  return (
    <div className="min-h-screen bg-[#07080e] text-white flex flex-col justify-between px-5 py-6 font-sans select-none overflow-hidden relative">
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute top-[-10%] left-[-20%] w-[100%] h-[40%] bg-indigo-900/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-[100%] h-[40%] bg-blue-900/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <div className="z-10 flex items-center justify-between border-b border-zinc-800/60 pb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-[pulse_1.5s_infinite]"></div>
            <span className="text-[11px] font-black tracking-widest text-zinc-400 uppercase">Philly Car Rental Portal</span>
          </div>
        </div>
        <div className="text-[10px] bg-zinc-900/80 border border-zinc-800 px-3 py-1 rounded-full text-zinc-400 font-bold font-mono">
          {isFirebaseActive ? "Firestore Mode" : "Demo Mode"}
        </div>
      </div>

      {/* Main Orb Center Container */}
      <div className="z-10 flex-1 flex flex-col items-center justify-center py-8">
        
        {/* Animated Voice Orb */}
        <div className="relative flex items-center justify-center my-8">
          {/* Glowing background halos */}
          <div className={`absolute w-56 h-56 rounded-full bg-blue-500/5 blur-3xl transition-all duration-1000 ${isConnected ? 'opacity-100 scale-125' : 'opacity-0'}`}></div>
          <div className={`absolute w-[18rem] h-[18rem] rounded-full bg-indigo-500/5 blur-3xl transition-all duration-1000 ${isConnected ? 'opacity-100 scale-125' : 'opacity-0'}`}></div>

          {/* Outer rotating/pulsing dashes */}
          <AnimatePresence>
            {isConnected && (
              <motion.div 
                initial={{ opacity: 0, rotate: 0 }}
                animate={{ opacity: 0.15, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute w-44 h-44 rounded-full border border-dashed border-indigo-400"
              />
            )}
          </AnimatePresence>

          {/* Core Orb */}
          <div 
            className={`w-36 h-36 rounded-full bg-gradient-to-tr from-indigo-700 to-blue-500 shadow-[0_0_50px_10px_rgba(99,102,241,0.25)] flex items-center justify-center transition-all duration-500 relative z-20 ${
              isConnected 
                ? 'scale-110 shadow-[0_0_60px_20px_rgba(99,102,241,0.5)] border border-indigo-400/30' 
                : 'scale-100 opacity-40 hover:opacity-50 grayscale-[40%]'
            }`}
          >
            {/* Inner dynamic ring */}
            <div className={`w-28 h-28 rounded-full bg-[#080914] flex items-center justify-center border border-white/5 relative overflow-hidden ${isConnected ? 'animate-[pulse_1.8s_infinite]' : ''}`}>
              
              {/* Core static point */}
              <div className={`w-5 h-5 rounded-full transition-all duration-300 ${isConnected ? 'bg-indigo-400 scale-125 shadow-[0_0_15px_rgba(129,140,248,0.8)]' : 'bg-zinc-600'}`}></div>
              
              {/* Dynamic waveform simulation (glowing bars) */}
              {isConnected && (
                <div className="absolute inset-0 flex items-center justify-center gap-1 px-4 opacity-40">
                  <div className="w-1 h-6 bg-indigo-500/80 rounded animate-[pulse_0.4s_infinite]"></div>
                  <div className="w-1 h-10 bg-blue-400/85 rounded animate-[pulse_0.6s_infinite_0.1s]"></div>
                  <div className="w-1 h-3 bg-indigo-400/80 rounded animate-[pulse_0.5s_infinite_0.2s]"></div>
                  <div className="w-1 h-8 bg-blue-500/85 rounded animate-[pulse_0.3s_infinite_0.1s]"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status texts */}
        <div className="text-center space-y-2 mt-4 px-6 max-w-sm">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            {isConnected ? "Elite Virtual Receptionist" : "System Standby"}
          </p>
          <h2 className="text-lg font-black tracking-tight text-white leading-snug">
            {statusText}
          </h2>
          <p className="text-[11px] text-zinc-500 italic max-w-xs mx-auto">
            Try saying: "Hi, I'm John Doe. I would like to book an SUV for 5 days."
          </p>
        </div>

        {/* Live Decoded Fields from Gemini Tool Calculation */}
        {(customerName || carType) && (
          <div className="w-full max-w-xs mt-6 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3 z-10">
            <h4 className="text-[10px] font-black tracking-wider text-indigo-400 uppercase flex items-center gap-1.5 border-b border-zinc-800/40 pb-2">
              <Layers className="w-3.5 h-3.5" /> Bookings Details Extracted
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#0e101f] p-2.5 rounded-xl border border-zinc-800/30">
                <span className="block text-[9px] text-zinc-500 font-bold uppercase mb-0.5">Guest Name</span>
                <span className="font-extrabold text-white capitalize truncate block">{customerName}</span>
              </div>
              <div className="bg-[#0e101f] p-2.5 rounded-xl border border-zinc-800/30">
                <span className="block text-[9px] text-zinc-500 font-bold uppercase mb-0.5">Vehicle Type</span>
                <span className="font-extrabold text-emerald-400 uppercase tracking-wide block">{carType || "Detecting..."}</span>
              </div>
              <div className="bg-[#0e101f] p-2.5 rounded-xl border border-zinc-800/30">
                <span className="block text-[9px] text-zinc-500 font-bold uppercase mb-0.5">Days Limit</span>
                <span className="font-extrabold text-white block">{duration ? `${duration} Days` : "0"}</span>
              </div>
              <div className="bg-[#0e101f] p-2.5 rounded-xl border border-zinc-800/30">
                <span className="block text-[9px] text-zinc-500 font-bold uppercase mb-0.5">Sync Status</span>
                <span className="text-[10px] text-indigo-300 font-bold flex items-center gap-1 mt-0.5 leading-none">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Synced
                </span>
              </div>
            </div>

            {/* Financial Recalculations summary */}
            {(additionalFee > 0 || newTotal > 0) && (
              <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between text-zinc-400">
                  <span>Additional Premium:</span>
                  <span className="text-white font-mono font-bold">+${additionalFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-300 border-t border-indigo-900/30 pt-1.5 mt-1 font-bold">
                  <span className="flex items-center gap-1 text-indigo-300">
                    <DollarSign className="w-3.5 h-3.5" /> Total Rental Cost:
                  </span>
                  <span className="text-emerald-400 font-mono">${newTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Button controls and logs */}
      <div className="z-10 mt-auto space-y-4">
        
        {/* Toggle call button */}
        <div className="flex justify-center">
          <button
            onClick={isConnected ? handleDisconnect : startConnection}
            disabled={isLoading}
            className={`w-full max-w-xs py-4 px-6 rounded-full font-extrabold text-sm tracking-wide shadow-lg flex items-center justify-center gap-2.5 transition-all duration-300 border ${
              isConnected
                ? "bg-red-600/10 hover:bg-red-600/20 text-red-500 border-red-500/40 active:translate-y-0.5"
                : "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent active:translate-y-0.5 hover:shadow-[0_0_25px_rgba(99,102,241,0.4)]"
            } cursor-pointer`}
          >
            {isLoading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
            ) : isConnected ? (
              <>
                <PhoneOff className="w-4.5 h-4.5" /> Cancel Connection
              </>
            ) : (
              <>
                <Phone className="w-4.5 h-4.5" /> Start Phone Call
              </>
            )}
          </button>
        </div>

        {/* Minimal logs terminal */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 max-w-md mx-auto">
          <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2 mb-2">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest font-mono">Real-time Connection Logs</span>
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="h-20 overflow-y-auto font-mono text-[9px] text-zinc-400 space-y-1.5 scrollbar-hide text-left">
            {clientLogs.length === 0 ? (
              <p className="text-zinc-600 italic">No connection log events recorded yet...</p>
            ) : (
              clientLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed truncate hover:text-white">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
