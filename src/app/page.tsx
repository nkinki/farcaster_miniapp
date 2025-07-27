// page.tsx

"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContracts,
} from "wagmi"
import { parseUnits } from "viem"

// EZ A SOR LETT FRISSÍTVE, HOGY A PROJEKT STRUKTÚRÁJÁNAK MEGFELELJEN
import {
  partyRegistrationContractAddress,
  partyRegistrationAbi,
  chessTokenContractAddress,
  erc20Abi,
} from "@/abis"

// A regisztrációs díj. A $CHESS 18 tizedesjeggyel rendelkezik.
const REGISTRATION_FEE = parseUnits("10000", 18)

export default function PartyPage() {
  const [status, setStatus] = useState("")
  const [needsApproval, setNeedsApproval] = useState(false)

  const { address, isConnected } = useAccount()
  const { data: hash, writeContract, isPending, error } = useWriteContract()

  // Hook a regisztráció és az engedély állapotának egyidejű lekérdezéséhez
  const { data: contractData, refetch: refetchContractData } = useReadContracts({
    contracts: [
      {
        address: partyRegistrationContractAddress,
        abi: partyRegistrationAbi,
        functionName: 'isRegistered',
        args: [address!],
      },
      {
        address: chessTokenContractAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address!, partyRegistrationContractAddress],
      },
    ],
    query: {
      enabled: isConnected && !!address, // Csak akkor fusson le, ha a felhasználó csatlakozva van
    },
  });
  
  const [isAlreadyRegistered, allowance] = contractData || [];

  useEffect(() => {
    if (allowance?.result === undefined) {
      setNeedsApproval(true);
      return;
    }
    setNeedsApproval(allowance.result < REGISTRATION_FEE);
  }, [allowance]);


  const handleRegister = async () => {
    if (!isConnected) {
      setStatus("Please connect your wallet first.")
      return
    }
    
    if (needsApproval) {
      setStatus("Waiting for approval... Please confirm in your wallet.")
      writeContract({
        address: chessTokenContractAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [partyRegistrationContractAddress, REGISTRATION_FEE],
      })
    } 
    else {
      setStatus("Processing registration... Please confirm in your wallet.")
      writeContract({
        address: partyRegistrationContractAddress,
        abi: partyRegistrationAbi,
        functionName: 'register',
      })
    }
  }

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (isConfirming) {
      setStatus(`Transaction is processing...`)
    }
    if (isConfirmed) {
        if(needsApproval){
            setStatus("Approval successful! You can now register.")
        } else {
            setStatus("Registration successful! Welcome to the party! 🎉")
        }
      refetchContractData()
    }
    if (error) {
      setStatus(`Error: ${error.shortMessage || error.message}`)
    }
  }, [isConfirming, isConfirmed, error, needsApproval, refetchContractData])
  
  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet to Register"
    if (isPending || isConfirming) return "Processing..."
    if (needsApproval) return "1. Approve 10,000 $CHESS"
    return "🎊 2. Register for Party 🎊"
  }


  return (
    <div
      style={{
        minHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        background: "#0F0F23",
        padding: "10px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ... a többi JSX és stílus változatlan ... */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 107, 53, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)
          `,
          animation: "backgroundPulse 4s ease-in-out infinite alternate",
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: '90%' }}>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: "700",
            opacity: 0.9,
            textTransform: "uppercase",
            letterSpacing: "4px",
            margin: "0 0 20px 0",
            background: "linear-gradient(45deg, #FF6B35, #F7931E, #FFD700)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 0 30px rgba(255, 107, 53, 0.5)",
            animation: "titleGlow 3s ease-in-out infinite alternate",
          }}
        >
          🎉 One Million <span style={{ textDecoration: "line-through" }}>Dollar</span> $CHESS Party! 🎉
        </h1>
        <p
          style={{
            fontSize: "1.25rem",
            opacity: 0.7,
            maxWidth: "32rem",
            margin: "0 auto 1rem auto",
            lineHeight: "1.5",
            color: "#888",
          }}
        >
           Register now for 10,000 $CHESS and join the tournament on Base!
        </p>

        {status && (
          <div style={{ 
            margin: "20px auto", 
            padding: "10px 20px",
            maxWidth: "32rem",
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            color: isConfirmed ? "#34d399" : "#FFD700",
            border: isConfirmed ? "1px solid #34d399" : "1px solid #FFD700",
            minHeight: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <p>{status}</p>
          </div>
        )}

        <div style={{marginTop: '20px', marginBottom: '20px'}}>
            {!isConnected ? (
                <p style={{color: '#FFD700'}}>Please connect your wallet to participate.</p>
            ) : isAlreadyRegistered?.result ? (
                <div style={{
                    color: '#34d399', 
                    fontWeight: 'bold', 
                    fontSize: '1.2rem', 
                    border: '2px solid #34d399', 
                    padding: '16px 32px',
                    borderRadius: '12px',
                    display: 'inline-block'
                }}>
                    ✅ You are successfully registered!
                </div>
            ) : (
                <Button
                    onClick={handleRegister}
                    disabled={isPending || isConfirming}
                    style={{
                      lineHeight: "1.4",
                      padding: "16px 32px",
                      background: "linear-gradient(45deg, #FF6B35, #F7931E)",
                      border: "2px solid #FFD700",
                      borderRadius: "12px",
                      color: "white",
                      fontSize: "1.2em",
                      fontWeight: "700",
                      cursor: (isPending || isConfirming) ? "not-allowed" : "pointer",
                      transition: "all 0.3s",
                      boxShadow: "0 0 20px rgba(255, 107, 53, 0.4)",
                      animation: "partyPulse 2.5s ease-in-out infinite alternate",
                      textTransform: "uppercase",
                      letterSpacing: "2px",
                      opacity: (isPending || isConfirming) ? 0.6 : 1,
                    }}
                >
                    {getButtonText()}
                </Button>
            )}
        </div>

        <Link href="/" passHref>
          <Button
            style={{
              lineHeight: "1.4",
              padding: "12px 24px",
              background: "transparent",
              border: "2px solid #FFD700",
              borderRadius: "8px",
              color: "#FFD700",
              fontSize: "1em",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
          >
            Back to Home
          </Button>
        </Link>
      </div>
      <style jsx>{`
        @keyframes backgroundPulse {
          0% {
            opacity: 0.4;
          }
          100% {
            opacity: 0.8;
          }
        }
        @keyframes titleGlow {
          0% {
            text-shadow: 0 0 30px rgba(255, 107, 53, 0.5);
          }
          100% {
            text-shadow: 0 0 40px rgba(255, 107, 53, 0.8), 0 0 60px rgba(255, 193, 7, 0.4);
          }
        }
        @keyframes partyPulse {
          0% {
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
          }
          100% {
            box-shadow: 0 0 35px rgba(255, 215, 0, 0.7);
          }
        }
      `}</style>
    </div>
  )
}