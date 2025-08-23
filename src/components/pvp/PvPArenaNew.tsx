"use client"

import { useState, useEffect } from "react"
import type { User } from "../../types/user"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { type Address, BaseError } from "viem"
import PvpRefundABI from "@/abis/PvpRefund.abi.json"; 

const PVP_REFUND_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PVP_REFUND_CONTRACT_ADDRESS as Address;

interface ReclaimableGame {
  id: number;
  status: string;
}

interface RoomPlayer {
  user: User;
  isReady: boolean;
  hasStaked: boolean;
}

interface Room {
  id: number;
  name: string;
  players: RoomPlayer[];
  status: 'empty' | 'waiting' | 'ready' | 'playing';
  stake: number;
  maxPlayers: number;
}

interface PvPArenaNewProps {
  user: User
  onMatchFound: (opponent: User, isPlayerWhite: boolean, gameId: string) => void
  onBackToMenu: () => void
  onNoOpponentFound?: () => void
  onlinePlayers: number | null;
}

export default function PvPArenaNew({ user, onMatchFound, onBackToMenu, onNoOpponentFound, onlinePlayers }: PvPArenaNewProps) {
  const { address: walletAddress, isConnected } = useAccount();
  const { data: hash, writeContractAsync, isPending: isTxPending, error: txError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const [currentStep, setCurrentStep] = useState<"menu" | "room" | "reclaim">("menu")
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [isReady, setIsReady] = useState(false)
  
  const [message, setMessage] = useState("")
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [totalGames, setTotalGames] = useState<number | null>(null)
  const [reclaimableGames, setReclaimableGames] = useState<ReclaimableGame[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [activeReclaimGameId, setActiveReclaimGameId] = useState<number | null>(null);

  // Fix szobák inicializálása
  useEffect(() => {
    const initialRooms: Room[] = [
      { id: 1, name: "Alpha Arena", players: [], status: 'empty', stake: 10000, maxPlayers: 2 },
      { id: 2, name: "Beta Battle", players: [], status: 'empty', stake: 10000, maxPlayers: 2 },
      { id: 3, name: "Gamma Ground", players: [], status: 'empty', stake: 10000, maxPlayers: 2 },
      { id: 4, name: "Delta Dome", players: [], status: 'empty', stake: 10000, maxPlayers: 2 }
    ];
    setRooms(initialRooms);
  }, []);

  useEffect(() => {
    const initialCheck = async () => {
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
          setReclaimableGames(reclaimData.reclaimableGames);
          setCurrentStep("reclaim");
        }
      } catch (error) {
        console.error("Failed to fetch reclaimable games:", error);
      }
      setIsChecking(false);
    };
    initialCheck();
  }, [user.fid]);

  // Szobák állapotának frissítése
  useEffect(() => {
    const updateRooms = async () => {
      try {
        const response = await fetch('/api/pvp/rooms-status');
        const data = await response.json();
        if (data.success) {
          setRooms(data.rooms as Room[]);
        }
      } catch (error) {
        addDebug(`❌ Failed to update rooms: ${error}`);
      }
    };

    const interval = setInterval(updateRooms, 2000); // 2 másodpercenként frissítés
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
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
            setCurrentStep("menu");
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

  const handleJoinRoom = async (room: Room) => {
    if (isJoining) return;
    
    setIsJoining(true);
    addDebug(`🚪 Joining room: ${room.name}`);

    try {
      // Csatlakozás a szobához
      const response = await fetch("/api/pvp/rooms-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: 'join',
          roomId: room.id,
          playerFid: user.fid,
          playerName: user.displayName,
          playerAvatar: user.pfpUrl
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setSelectedRoom(room);
        setCurrentStep("room");
        setIsReady(false);
        addDebug(`✅ Joined room: ${room.name}`);
      } else {
        throw new Error(data.error || "Failed to join room");
      }
    } catch (error) {
      addDebug(`❌ Room error: ${error}`);
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsJoining(false);
    }
  };

  const handleReady = async () => {
    if (!selectedRoom) return;
    
    try {
      setIsReady(true);
      addDebug(`✅ Player ready in room ${selectedRoom.name}`);
      
      // Kiszolgálónak jelezzük, hogy ready vagy
      await fetch("/api/pvp/rooms-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: 'ready',
          roomId: selectedRoom.id,
          playerFid: user.fid
        }),
      });
      
      // Ellenőrizzük, hogy mindkét játékos ready-e
      checkRoomReady();
    } catch (error) {
      addDebug(`❌ Ready error: ${error}`);
      setIsReady(false);
    }
  };

  const checkRoomReady = async () => {
    if (!selectedRoom) return;
    
    try {
      const response = await fetch(`/api/pvp/room-status?roomId=${selectedRoom.id}`);
      const data = await response.json();
      
      if (data.success && data.room) {
        const room = data.room as Room;
        const readyPlayers = room.players.filter((p: RoomPlayer) => p.isReady);
        
        if (readyPlayers.length === 2) {
          // Mindkét játékos ready - indulhat a játék
          addDebug("🎯 Both players ready! Starting game...");
          startGame();
        }
      }
    } catch (error) {
      addDebug(`❌ Room check error: ${error}`);
    }
  };

  const startGame = async () => {
    if (!selectedRoom) return;
    
    try {
      addDebug("🚀 Starting PvP game...");
      
      // Kiszolgálónak jelezzük, hogy indul a játék
      const response = await fetch("/api/pvp/rooms-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: 'start',
          roomId: selectedRoom.id,
          playerFid: user.fid
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Játék indítása
        const opponent = selectedRoom.players.find((p: RoomPlayer) => p.user.fid !== user.fid)?.user;
        if (opponent) {
          onMatchFound(opponent, true, String(selectedRoom.id));
        }
      }
    } catch (error) {
      addDebug(`❌ Start game error: ${error}`);
    }
  };

  const handleLeaveRoom = async () => {
    if (!selectedRoom) return;
    
    try {
      addDebug("🚫 Leaving room...");
      
      await fetch('/api/pvp/leave-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: selectedRoom.id, playerFid: user.fid })
      });
      
      addDebug("✅ Left room");
      setCurrentStep("menu");
      setSelectedRoom(null);
      setIsReady(false);
      setIsJoining(false);
    } catch (error) {
      addDebug(`❌ Failed to leave room: ${error}`);
    }
  };

  const getRoomStatusColor = (status: string) => {
    switch (status) {
      case 'empty': return '#10B981'; // Zöld
      case 'waiting': return '#F59E0B'; // Sárga
      case 'ready': return '#3B82F6'; // Kék
      case 'playing': return '#8B5CF6'; // Lila
      default: return '#6B7280';
    }
  };

  const getRoomStatusText = (status: string) => {
    switch (status) {
      case 'empty': return 'JOIN';
      case 'waiting': return 'JOIN';
      case 'ready': return 'READY';
      case 'playing': return 'PLAYING';
      default: return 'UNKNOWN';
    }
  };

  const isRoomJoinable = (room: Room) => {
    return room.status === 'empty' || room.status === 'waiting';
  };

  const getCurrentPlayerInRoom = () => {
    if (!selectedRoom) return null;
    return selectedRoom.players.find((p: RoomPlayer) => p.user.fid === user.fid);
  };

  const getOpponentInRoom = () => {
    if (!selectedRoom) return null;
    return selectedRoom.players.find((p: RoomPlayer) => p.user.fid !== user.fid);
  };

  const canStartGame = () => {
    if (!selectedRoom) return false;
    const readyPlayers = selectedRoom.players.filter((p: RoomPlayer) => p.isReady);
    return readyPlayers.length === 2;
  };

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

      <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto", position: "relative", zIndex: 10 }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "700", margin: "0 0 8px 0", background: "linear-gradient(45deg, #FF6B35, #F7931E, #FFD700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textShadow: "0 0 30px rgba(255, 107, 53, 0.5)", animation: "glow 2s ease-in-out infinite alternate" }}>
            ⚔️ PvP Arena v3.0 - ULTIMATE
          </h1>
          <p style={{ fontSize: "14px", color: "#888", margin: 0 }}>
            Choose a room and challenge players for 50,000 $CHESS rewards!
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
        ) : currentStep === "room" && selectedRoom ? (
          // SZOBA BELSEJE - BELSŐ MENÜ
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ background: "transparent", border: "2px solid rgba(16, 185, 129, 0.6)", borderRadius: "12px", padding: "24px", textAlign: "center", boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)" }}>
              <div style={{ fontSize: "32px", marginBottom: "16px" }}>🏠</div>
              <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: "700", color: "#10B981" }}>
                {selectedRoom.name}
              </h2>
              <p style={{ margin: 0, color: "#888", fontSize: "14px" }}>
                Room Status: {selectedRoom.status.toUpperCase()}
              </p>
            </div>

            {/* JÁTÉKOSOK LISTÁJA */}
            <div style={{ background: "transparent", border: "1px solid rgba(59, 130, 246, 0.6)", borderRadius: "12px", padding: "20px", boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "600", color: "#3B82F6", textAlign: "center" }}>
                👥 Players in Room
              </h3>
              
              {selectedRoom.players.length === 0 ? (
                <div style={{ textAlign: "center", color: "#888", fontSize: "14px" }}>
                  No players in room yet...
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {selectedRoom.players.map((player, index) => (
                    <div key={player.user.fid} style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px",
                      background: "rgba(59, 130, 246, 0.1)",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      borderRadius: "8px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ fontSize: "20px" }}>
                          {player.user.fid === user.fid ? "👤" : "👥"}
                        </div>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "white" }}>
                            {player.user.displayName || "Anonymous"}
                          </div>
                          <div style={{ fontSize: "11px", color: "#888" }}>
                            {player.user.fid === user.fid ? "You" : "Opponent"}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {player.isReady && (
                          <span style={{ color: "#10B981", fontSize: "12px", fontWeight: "600" }}>✅ READY</span>
                        )}
                        {player.hasStaked && (
                          <span style={{ color: "#FFC107", fontSize: "12px", fontWeight: "600" }}>💰 STAKED</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AKCIÓ GOMBOK */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {!isReady ? (
                <button 
                  onClick={handleReady}
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: 'white',
                    background: '#10B981',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  🎯 I'M READY TO PLAY
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "16px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px" }}>
                  <div style={{ color: "#10B981", fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>
                    ✅ You are Ready!
                  </div>
                  <div style={{ color: "#888", fontSize: "14px" }}>
                    Waiting for opponent to be ready...
                  </div>
                </div>
              )}

              {canStartGame() && (
                <button 
                  onClick={startGame}
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: 'white',
                    background: '#FF6B35',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 0 20px rgba(255, 107, 53, 0.3)',
                    animation: 'pulse 2s ease-in-out infinite'
                  }}
                >
                  🚀 START GAME & STAKE {selectedRoom.stake.toLocaleString()} $CHESS
                </button>
              )}

              <button 
                onClick={handleLeaveRoom}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#EF4444',
                  background: 'transparent',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                🚪 Leave Room
              </button>
            </div>

            <div style={{ background: "transparent", border: "1px solid rgba(255, 193, 7, 0.6)", borderRadius: "8px", padding: "16px", textAlign: "center", boxShadow: "0 0 20px rgba(255, 193, 7, 0.3)" }}>
              <div style={{ fontSize: "14px", color: "#FFC107", fontWeight: "600", marginBottom: "4px" }}>💰 ROOM STAKE</div>
              <div style={{ fontSize: "20px", color: "#FFC107", fontWeight: "700", textShadow: "0 0 15px #FFC107" }}>
                {selectedRoom.stake.toLocaleString()} $CHESS
              </div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                Stake will be collected when game starts
              </div>
            </div>
          </div>
        ) : currentStep === "menu" ? (
          // FŐ MENÜ - SZOBÁK LISTÁJA
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            <div style={{
              background: "transparent",
              border: "1px solid rgba(16, 185, 129, 0.6)",
              borderRadius: "8px",
              padding: "16px",
              textAlign: "center",
              boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)",
              animation: "onlinePulse 2.5s ease-in-out infinite alternate"
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 10px #10B981',
                  animation: 'greenPulse 1.5s ease-in-out infinite'
                }} />
                <div style={{ fontSize: "14px", color: "#10B981", fontWeight: "600" }}>LIVE ARENA STATUS</div>
              </div>
              <div style={{ fontSize: "22px", color: "white", fontWeight: "700", textShadow: "0 0 10px #10B981", letterSpacing: "1px" }}>
                {onlinePlayers === null ? '...' : onlinePlayers} Players Online
              </div>
            </div>

            {/* Fix szobák megjelenítése */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {rooms.map((room) => (
                <div key={room.id} style={{
                  background: "transparent",
                  border: `2px solid ${getRoomStatusColor(room.status)}`,
                  borderRadius: "12px",
                  padding: "20px",
                  textAlign: "center",
                  boxShadow: `0 0 20px ${getRoomStatusColor(room.status)}40`,
                  transition: "all 0.3s ease",
                  cursor: isRoomJoinable(room) ? "pointer" : "default",
                  opacity: isRoomJoinable(room) ? 1 : 0.7
                }}
                onClick={() => isRoomJoinable(room) && handleJoinRoom(room)}
                >
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>
                    {room.status === 'empty' && "🏠"}
                    {room.status === 'waiting' && "⏳"}
                    {room.status === 'ready' && "✅"}
                    {room.status === 'playing' && "🎮"}
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px", color: getRoomStatusColor(room.status) }}>
                    {room.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "12px" }}>
                    {room.status === 'empty' && "No players"}
                    {room.status === 'waiting' && `${room.players.length}/2 players`}
                    {room.status === 'ready' && `${room.players.length}/2 ready`}
                    {room.status === 'playing' && "Game in progress"}
                  </div>
                  
                  {room.players.length > 0 && (
                    <div style={{ fontSize: "11px", color: "#10B981", marginBottom: "8px" }}>
                      Players: {room.players.map((p: RoomPlayer) => p.user.displayName || "Anonymous").join(", ")}
                    </div>
                  )}
                  
                  <div style={{ fontSize: "10px", color: "#666", marginBottom: "12px" }}>
                    Stake: {room.stake.toLocaleString()} $CHESS
                  </div>
                  
                  <button
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: 'white',
                      background: getRoomStatusColor(room.status),
                      border: 'none',
                      borderRadius: '6px',
                      cursor: isRoomJoinable(room) ? 'pointer' : 'not-allowed',
                      opacity: isRoomJoinable(room) ? 1 : 0.5,
                      transition: 'all 0.3s ease'
                    }}
                    disabled={!isRoomJoinable(room)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isRoomJoinable(room)) handleJoinRoom(room);
                    }}
                  >
                    {getRoomStatusText(room.status)}
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ background: "transparent", border: "1px solid rgba(16, 185, 129, 0.6)", borderRadius: "8px", padding: "16px", textAlign: "center", boxShadow: "0 0 15px rgba(16, 185, 129, 0.3)", animation: "statsPulse 3s ease-in-out infinite alternate" }}>
                <div style={{ fontSize: "20px", marginBottom: "4px" }}>🎮</div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#10B981", textShadow: "0 0 10px #10B981" }}>{totalGames === null ? '...' : totalGames}</div>
                <div style={{ fontSize: "11px", color: "#888" }}>Games Played</div>
              </div>
              <div style={{ background: "transparent", border: "1px solid rgba(59, 130, 246, 0.6)", borderRadius: "8px", padding: "16px", textAlign: "center", boxShadow: "0 0 15px rgba(59, 130, 246, 0.3)", animation: "statsPulse 3s ease-in-out infinite alternate 0.5s" }}>
                <div style={{ fontSize: "20px", marginBottom: "4px" }}>⚡</div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#3B82F6", textShadow: "0 0 10px #3B82F6" }}>READY</div>
                <div style={{ fontSize: "11px", color: "#888" }}>System</div>
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
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes glow { 0% { text-shadow: 0 0 30px rgba(255, 107, 53, 0.5); } 100% { text-shadow: 0 0 40px rgba(255, 107, 53, 0.8); } }
        @keyframes pulse { 0% { opacity: 0.4; } 100% { opacity: 0.8; } }
        @keyframes borderPulse { 0% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.2); } 100% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.4); } }
        @keyframes neonPulse { 0% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.4), inset 0 0 20px rgba(0, 255, 255, 0.1); } 100% { box-shadow: 0 0 30px rgba(0, 255, 255, 0.8), inset 0 0 30px rgba(0, 255, 255, 0.2); } }
        @keyframes statsPulse { 0% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.3); } 100% { box-shadow: 0 0 25px rgba(16, 185, 129, 0.5); } }
        @keyframes goldPulse { 0% { box-shadow: 0 0 20px rgba(255, 193, 7, 0.3); } 100% { box-shadow: 0 0 30px rgba(255, 193, 7, 0.6); } }
        @keyframes redPulse { 0% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); } 100% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.6); } }
        @keyframes searchPulse { 0% { box-shadow: 0 0 30px rgba(255, 107, 53, 0.4); } 100% { box-shadow: 0 0 50px rgba(255, 107, 53, 0.8); } }
        @keyframes onlinePulse { 0% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); } 100% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.6); } }
        @keyframes greenPulse { 0% { box-shadow: 0 0 8px #10B981; opacity: 1; } 50% { box-shadow: 0 0 12px #34D399; opacity: 0.7; } 100% { box-shadow: 0 0 8px #10B981; opacity: 1; } }
      `}</style>
    </div>
  )
}
