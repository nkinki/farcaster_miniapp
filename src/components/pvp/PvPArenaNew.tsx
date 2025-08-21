"use client"

import { useState, useEffect, useRef } from "react"
import type { User } from "../../types/user"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { type Address, BaseError } from "viem"
import PvpRefundABI from "@/abis/PvpRefund.abi.json"; 

const PVP_REFUND_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PVP_REFUND_CONTRACT_ADDRESS as Address;

interface ReclaimableGame {
  id: number;
  status: string;
}

interface PvPArenaNewProps {
  user: User
  onMatchFound: (opponent: User, isPlayerWhite: boolean, gameId: string) => void
  onBackToMenu: () => void
}

export default function PvPArenaNew({ user, onMatchFound, onBackToMenu }: PvPArenaNewProps) {
  const { address: walletAddress, isConnected } = useAccount();
  const { data: hash, writeContractAsync, isPending: isTxPending, error: txError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const [currentStep, setCurrentStep] = useState<"menu" | "searching" | "creating" | "waiting" | "reclaim">("menu")
  const [message, setMessage] = useState("")
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [totalGames, setTotalGames] = useState<number | null>(null)
  const [reclaimableGames, setReclaimableGames] = useState<ReclaimableGame[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [activeReclaimGameId, setActiveReclaimGameId] = useState<number | null>(null);

  // Ref-ek az időzítők tárolásához
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentStepRef = useRef<"menu" | "searching" | "creating" | "waiting" | "reclaim">("menu")

  // Debug wrapper for setCurrentStep
  const setCurrentStepWithDebug = (step: "menu" | "searching" | "creating" | "waiting" | "reclaim") => {
    addDebug(`🔄 currentStep changing from '${currentStep}' to '${step}'`)
    currentStepRef.current = step // Frissítjük a ref-et is
    setCurrentStep(step)
  }

  // Debug component render - csak egyszer fut le
  useEffect(() => {
    addDebug(`🔄 Component mounted with currentStep: '${currentStep}'`)
  }, []) // Üres dependency array = csak egyszer fut le

  useEffect(() => {
    const initialCheck = async () => {
      addDebug("🔄 useEffect initialCheck started")
      setIsChecking(true);
      try {
        const statsRes = await fetch('/api/pvp/game-stats');
        const statsData = await statsRes.json();
        setTotalGames(statsData.success ? statsData.totalGames : 0);
      } catch (error) {
        console.error("Failed to fetch game stats:", error);
        setTotalGames(0);
      }
      try {
        const reclaimRes = await fetch(`/api/pvp/check-reclaimable-games?playerFid=${user.fid}`);
        const reclaimData = await reclaimRes.json();
        if (reclaimData.success && reclaimData.reclaimableGames.length > 0) {
          addDebug("🔄 useEffect found reclaimable games, setting currentStep to 'reclaim'")
          setReclaimableGames(reclaimData.reclaimableGames);
          setCurrentStepWithDebug("reclaim");
        }
      } catch (error) {
        console.error("Failed to fetch reclaimable games:", error);
      }
      setIsChecking(false);
      addDebug("🔄 useEffect initialCheck completed")
    };
    initialCheck();
  }, [user.fid]);

  useEffect(() => {
    addDebug(`🔄 useEffect transaction state changed: isConfirming=${isConfirming}, isConfirmed=${isConfirmed}, txError=${!!txError}`)
    if (isConfirming) {
        setMessage("Transaction sent, waiting for confirmation...");
        addDebug("⏳ Transaction is confirming...");
    }
    if (isConfirmed) {
        setMessage("Stake successfully reclaimed!");
        addDebug(`✅ Reclaim transaction confirmed on-chain! Hash: ${hash}`);
        const updatedGames = reclaimableGames.filter(g => g.id !== activeReclaimGameId);
        setReclaimableGames(updatedGames);
        if (updatedGames.length === 0) {
            addDebug("🔄 useEffect: no more reclaimable games, setting currentStep to 'menu'")
            setCurrentStepWithDebug("menu");
            setMessage("");
        }
        setActiveReclaimGameId(null);
    }
    if (txError) {
        const errorMessage = txError instanceof BaseError ? txError.shortMessage : txError.message;
        setMessage(`Error: ${errorMessage}`);
        addDebug(`❌ Tx Error: ${errorMessage}`);
        setActiveReclaimGameId(null);
    }
  }, [isConfirming, isConfirmed, txError, hash, reclaimableGames, activeReclaimGameId]);

  // Cleanup időzítők komponens unmount-olásakor
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const addDebug = (msg: string) => {
    setDebugInfo((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${msg}`])
  }
   
  const handleReclaim = async (gameId: number) => {
    setActiveReclaimGameId(gameId);
    setMessage("Requesting approval from server...");
    addDebug(`🔥 Reclaim started for game ${gameId}`);

    if (!isConnected || !walletAddress) {
        const errorMsg = "Error: Wallet not connected.";
        setMessage(errorMsg);
        addDebug(`❌ Reclaim failed: ${errorMsg}`);
        setActiveReclaimGameId(null);
        return;
    }

    try {
      const response = await fetch('/api/pvp/reclaim-stake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerFid: user.fid, playerAddress: walletAddress }),
      });
      const data = await response.json();
      addDebug(`✅ Server response: ${JSON.stringify(data)}`);
      
      if (!data.success || !data.reclaimApproved) {
        throw new Error(data.error || "Reclaim not approved by server.");
      }
      
      setMessage("Please approve the transaction in your wallet...");
      addDebug("⛓️ Initiating on-chain transaction...");
      
      await writeContractAsync({
        address: PVP_REFUND_CONTRACT_ADDRESS,
        abi: PvpRefundABI,
        functionName: 'reclaimWithSignature',
        args: [BigInt(data.voucher.gameId), BigInt(data.voucher.amount), BigInt(data.voucher.nonce), data.voucher.signature]
      });
    } catch (error) {
      const errorMessage = error instanceof BaseError 
        ? error.shortMessage 
        : error instanceof Error 
        ? error.message 
        : "An unknown error occurred.";
        
      console.error("Reclaim transaction failed:", errorMessage);
      setMessage(`Transaction failed: ${errorMessage.slice(0, 100)}...`);
      addDebug(`❌ Reclaim transaction failed: ${errorMessage}`);
      setActiveReclaimGameId(null);
    }
  };

  const handleFindMatch = async () => {
    addDebug("🔥 Find Match clicked!")
    setCurrentStepWithDebug("searching")
    setMessage("Looking for opponents...")

    try {
      addDebug("📡 Calling find-waiting-rooms API...")
      const response = await fetch(`/api/pvp/find-waiting-rooms?playerFid=${user.fid}`)
      addDebug(`📊 Response status: ${response.status}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`API Error: ${response.status} - ${errorData?.error || 'Unknown error'}`)
      }

      const data = await response.json()
      addDebug(`📋 Found ${data.rooms?.length || 0} rooms`)

      if (data.success && data.rooms && data.rooms.length > 0) {
        const room = data.rooms[0]
        addDebug(`🏠 Joining room ${room.id}`)
        await joinRoom(room.id)
      } else {
        addDebug("🏗️ No rooms found, creating new one")
        await createRoom()
      }
    } catch (error) {
      addDebug(`❌ Error: ${error}`)
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setCurrentStepWithDebug("menu")
    }
  }

  const joinRoom = async (roomId: string) => {
    try {
      setMessage("Joining room...")
      const response = await fetch("/api/pvp/join-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: roomId, playerFid: user.fid, playerName: user.displayName, playerAvatar: user.pfpUrl }),
      })
      const data = await response.json()
      addDebug(`🎮 Join result: ${data.success}`)

      if (data.success) {
        const opponent: User = { fid: data.game.player1_fid, displayName: data.game.player1_name, pfpUrl: data.game.player1_avatar }
        addDebug("✅ Match found! Starting game...")
        onMatchFound(opponent, false, data.game.id)
      } else {
        throw new Error(data.error || "Failed to join room")
      }
    } catch (error) {
      addDebug(`❌ Join error: ${error}`)
      setMessage(`Join failed: ${error instanceof Error ? error.message : String(error)}`)
      setCurrentStepWithDebug("menu")
    }
  }

  const createRoom = async () => {
    try {
      setCurrentStepWithDebug("creating")
      setMessage("Creating new room...")
      const response = await fetch("/api/pvp/create-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerFid: user.fid, playerName: user.displayName, playerAvatar: user.pfpUrl }),
      })
      const data = await response.json()
      addDebug(`🏠 Room created: ${data.success}`)

      if (data.success) {
        addDebug(`🏠 Room created successfully, setting currentStep to 'waiting'`)
        setCurrentStepWithDebug("waiting")
        setMessage("Room created! Waiting for an opponent...")
        addDebug(`🏠 Starting wait timer for game ${data.game.id}`)
        startWaitingForOpponent(data.game.id)
      } else {
        throw new Error(data.error || "Failed to create room")
      }
    } catch (error) {
      addDebug(`❌ Create error: ${error}`)
      setMessage(`Create failed: ${error instanceof Error ? error.message : String(error)}`)
      setCurrentStepWithDebug("menu")
    }
  }

  const startWaitingForOpponent = (gameId: number) => {
    // Töröljük a korábbi időzítőket
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    
    intervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/pvp/game-state?gameId=${gameId}&playerFid=${user.fid}`)
        const data = await response.json()
        if (data.success && data.gameState?.player2?.fid) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          addDebug("👥 Opponent joined!")
          const opponent: User = { fid: data.gameState.player2.fid, displayName: data.gameState.player2.name, pfpUrl: data.gameState.player2.avatar }
          onMatchFound(opponent, true, String(gameId))
        }
      } catch (error) {
        addDebug(`❌ Polling error: ${error}`)
      }
    }, 3000)

    // 8 másodperc után AI ellenféllel indul a játék
    timeoutRef.current = setTimeout(() => {
      addDebug(`⏰ 8 seconds passed - currentStep: ${currentStepRef.current}`)
      if (currentStepRef.current === "waiting") {
        addDebug("⏰ 8 seconds passed - starting AI opponent game")
        setMessage("No human opponent found. Starting AI game...")
        
        // AI ellenfél létrehozása és játék indítása
        const aiOpponent: User = { 
          fid: -1, // Speciális AI FID
          displayName: "AI Opponent", 
          pfpUrl: "/farchess-logo.png" 
        }
        onMatchFound(aiOpponent, true, String(gameId))
      } else {
        addDebug(`⏰ 8 seconds passed but currentStep is not 'waiting' (${currentStepRef.current})`)
      }
    }, 8000)

    // 60 másodperc timeout
    const longTimeout = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (currentStepRef.current === "waiting") {
        addDebug("⏰ Timeout - no opponent found")
        setMessage("No opponent found. Try again.")
        setCurrentStepWithDebug("menu")
      }
    }, 60000)
    
    // Töröljük a hosszú timeout-ot, ha a komponens unmount-ol
    timeoutRef.current = longTimeout
  }

  const handleCancel = () => {
    addDebug("🚫 Search cancelled")
    setCurrentStepWithDebug("menu")
    setMessage("")
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0F0F23",
        color: "white",
        padding: "0",
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 107, 53, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)`, animation: "pulse 4s ease-in-out infinite alternate" }} />
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", position: "relative", zIndex: 10 }}>
        <button onClick={onBackToMenu} style={{ background: "transparent", border: "1px solid rgba(120, 119, 198, 0.3)", borderRadius: "8px", color: "#7877C6", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", transition: "all 0.3s ease", boxShadow: "0 0 10px rgba(120, 119, 198, 0.2)" }}>
          ← Back to Menu
        </button>
      </div>

      <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto", position: "relative", zIndex: 10 }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "700", margin: "0 0 8px 0", background: "linear-gradient(45deg, #FF6B35, #F7931E, #FFD700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textShadow: "0 0 30px rgba(255, 107, 53, 0.5)", animation: "glow 2s ease-in-out infinite alternate" }}>
            ⚔️ PvP Arena
          </h1>
          <p style={{ fontSize: "14px", color: "#888", margin: 0 }}>
            Challenge players worldwide for 20,000 $CHESS!
          </p>
        </div>

        <div style={{ background: "transparent", border: "1px solid rgba(139, 92, 246, 0.4)", borderRadius: "12px", padding: "16px", marginBottom: "24px", textAlign: "center", boxShadow: "0 0 20px rgba(139, 92, 246, 0.2)", animation: "borderPulse 3s ease-in-out infinite" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "16px" }}>👤</span>
            <span style={{ fontSize: "16px", fontWeight: "600" }}>{user.displayName || "Anonymous"}</span>
            <span style={{ background: "transparent", border: "1px solid #8B5CF6", color: "#8B5CF6", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", fontWeight: "600", boxShadow: "0 0 10px rgba(139, 92, 246, 0.3)" }}>
              ID
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "#666" }}>FID: {user.fid}</div>
        </div>
        
        {isChecking ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "24px", animation: "spin 1.5s linear infinite" }}>⏳</div>
            <p style={{ color: "#888", marginTop: "10px" }}>Checking game status...</p>
          </div>
        ) : currentStep === "reclaim" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h2 style={{ textAlign: 'center', color: '#FFC107', textShadow: '0 0 10px #FFC107' }}>Expired Games</h2>
            <p style={{ textAlign: 'center', color: '#aaa', marginTop: '-10px', fontSize: '14px' }}>
              The following games have expired due to inactivity. You can reclaim your stake.
            </p>
            {reclaimableGames.map(game => (
              <div key={game.id} style={{ border: '1px solid rgba(239, 68, 68, 0.6)', borderRadius: '12px', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#ddd' }}>
                  Your stake in game <strong>#{game.id}</strong> is reclaimable.
                </p>
                <button
                  onClick={() => handleReclaim(game.id)}
                  disabled={activeReclaimGameId !== null}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: 'white',
                    background: '#EF4444',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: (activeReclaimGameId !== null) ? 'not-allowed' : 'pointer',
                    opacity: (activeReclaimGameId !== null) ? 0.6 : 1,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {(isTxPending || isConfirming) && activeReclaimGameId === game.id ? 'Processing...' : 'Reclaim Stake (10,000 $CHESS)'}
                </button>
              </div>
            ))}
             <p style={{color: '#888', textAlign: 'center', fontSize: '12px', minHeight: '18px'}}>{message}</p>
          </div>
        ) : currentStep === "menu" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <button onClick={handleFindMatch} style={{ background: "transparent", border: "2px solid #00FFFF", borderRadius: "12px", color: "#00FFFF", fontSize: "18px", fontWeight: "700", padding: "18px", cursor: "pointer", transition: "all 0.3s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", boxShadow: `0 0 20px rgba(0, 255, 255, 0.4), inset 0 0 20px rgba(0, 255, 255, 0.1)`, animation: "neonPulse 2s ease-in-out infinite alternate", textTransform: "uppercase", letterSpacing: "1px" }}>
              🔍 Find Match
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ background: "transparent", border: "1px solid rgba(16, 185, 129, 0.6)", borderRadius: "8px", padding: "16px", textAlign: "center", boxShadow: "0 0 15px rgba(16, 185, 129, 0.3)", animation: "statsPulse 3s ease-in-out infinite alternate" }}>
                <div style={{ fontSize: "20px", marginBottom: "4px" }}>🎮</div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#10B981", textShadow: "0 0 10px #10B981" }}>{totalGames === null ? '...' : totalGames}</div>
                <div style={{ fontSize: "11px", color: "#888" }}>Games Played</div>
              </div>
              <div style={{ background: "transparent", border: "1px solid rgba(59, 130, 246, 0.6)", borderRadius: "8px", padding: "16px", textAlign: "center", boxShadow: "0 0 15px rgba(59, 130, 246, 0.3)", animation: "statsPulse 3s ease-in-out infinite alternate 0.5s" }}>
                <div style={{ fontSize: "20px", marginBottom: "4px" }}>⚡</div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#3B82F6", textShadow: "0 0 10px #3B82F6" }}>~30s</div>
                <div style={{ fontSize: "11px", color: "#888" }}>Avg Wait</div>
              </div>
            </div>
            <div style={{ background: "transparent", border: "1px solid rgba(255, 193, 7, 0.6)", borderRadius: "8px", padding: "16px", textAlign: "center", boxShadow: "0 0 20px rgba(255, 193, 7, 0.3)", animation: "goldPulse 2.5s ease-in-out infinite alternate" }}>
              <div style={{ fontSize: "14px", color: "#FFC107", fontWeight: "600", marginBottom: "4px" }}>💰 PRIZE POOL</div>
              <div style={{ fontSize: "20px", color: "#FFC107", fontWeight: "700", textShadow: "0 0 15px #FFC107", letterSpacing: "1px" }}>20,000 $CHESS</div>
            </div>
            <div style={{ background: "transparent", border: "1px solid rgba(239, 68, 68, 0.6)", borderRadius: "8px", padding: "16px", textAlign: "center", boxShadow: "0 0 20px rgba(239, 68, 68, 0.3)", animation: "redPulse 2.8s ease-in-out infinite alternate" }}>
              <div style={{ fontSize: "14px", color: "#EF4444", fontWeight: "600", marginBottom: "4px" }}>🎯 ENTRY STAKE</div>
              <div style={{ fontSize: "20px", color: "#EF4444", fontWeight: "700", textShadow: "0 0 15px #EF4444", letterSpacing: "1px" }}>10,000 $CHESS</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>
            <div style={{ background: "transparent", border: "2px solid rgba(255, 107, 53, 0.6)", borderRadius: "12px", padding: "32px", textAlign: "center", width: "100%", boxShadow: "0 0 30px rgba(255, 107, 53, 0.4)", animation: "searchPulse 1.5s ease-in-out infinite alternate" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px", animation: "spin 2s linear infinite" }}>
                {currentStep === "searching" && "🔍"}
                {currentStep === "creating" && "🏗️"}
                {currentStep === "waiting" && "⏳"}
              </div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "600", color: "#FF6B35", textShadow: "0 0 10px #FF6B35" }}>
                {currentStep === "searching" && "SEARCHING FOR OPPONENTS..."}
                {currentStep === "creating" && "CREATING ROOM..."}
                {currentStep === "waiting" && "WAITING FOR OPPONENT..."}
              </h3>
              <p style={{ margin: 0, color: "#888", fontSize: "14px" }}>{message}</p>
              
              {currentStep === "waiting" && (
                <p style={{ 
                  margin: '16px 0 0 0', 
                  color: '#cccccc',
                  fontSize: '14px', 
                  lineHeight: '1.6',
                  textWrap: 'pretty' as const
                }}>
                  If no opponent joins, please go back and try again.
                  <br />
                  If you have staked, you can reclaim it by re-entering the arena.
                </p>
              )}
            </div>
            <button onClick={handleCancel} style={{ background: "transparent", border: "1px solid rgba(239, 68, 68, 0.5)", borderRadius: "8px", color: "#EF4444", fontSize: "14px", padding: "12px 24px", cursor: "pointer", transition: "all 0.3s ease", boxShadow: "0 0 10px rgba(239, 68, 68, 0.2)" }}>
              Cancel
            </button>
          </div>
        )}

        {debugInfo.length > 0 && (
          <div style={{ background: "transparent", border: "1px solid rgba(120, 119, 198, 0.3)", borderRadius: "8px", padding: "12px", marginTop: "20px", fontSize: "11px", fontFamily: "monospace", boxShadow: "0 0 10px rgba(120, 119, 198, 0.2)" }}>
            <div style={{ color: "#7877C6", marginBottom: "8px", fontSize: "12px" }}>🐛 Debug Log:</div>
            {debugInfo.map((log, i) => (
              <div key={i} style={{ marginBottom: "4px", wordBreak: "break-all", color: "#ccc" }}>{log}</div>
            ))}
            <button onClick={() => setDebugInfo([])} style={{ background: "transparent", border: "1px solid #555", color: "#ccc", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", marginTop: "8px", boxShadow: "0 0 5px rgba(85, 85, 85, 0.3)" }}>
              Clear Log
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
        
        @keyframes glow {
          0% { textShadow: 0 0 30px rgba(255, 107, 53, 0.5); }
          100% { textShadow: 0 0 50px rgba(255, 107, 53, 0.8); }
        }
        
        @keyframes borderPulse {
          0% { border-color: rgba(139, 92, 246, 0.4); }
          100% { border-color: rgba(139, 92, 246, 0.8); }
        }
        
        @keyframes neonPulse {
          0% { boxShadow: 0 0 20px rgba(0, 255, 255, 0.4), inset 0 0 20px rgba(0, 255, 255, 0.1); }
          100% { boxShadow: 0 0 30px rgba(0, 255, 255, 0.6), inset 0 0 30px rgba(0, 255, 255, 0.2); }
        }
        
        @keyframes statsPulse {
          0% { boxShadow: 0 0 15px rgba(16, 185, 129, 0.3); }
          100% { boxShadow: 0 0 25px rgba(16, 185, 129, 0.5); }
        }
        
        @keyframes goldPulse {
          0% { boxShadow: 0 0 20px rgba(255, 193, 7, 0.3); }
          100% { boxShadow: 0 0 30px rgba(255, 193, 7, 0.5); }
        }
        
        @keyframes redPulse {
          0% { boxShadow: 0 0 20px rgba(239, 68, 68, 0.3); }
          100% { boxShadow: 0 0 30px rgba(239, 68, 68, 0.5); }
        }
        
        @keyframes searchPulse {
          0% { boxShadow: 0 0 30px rgba(255, 107, 53, 0.4); }
          100% { boxShadow: 0 0 40px rgba(255, 107, 53, 0.6); }
        }
      `}</style>
    </div>
  )
}
