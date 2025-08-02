"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useSignIn } from "@farcaster/auth-kit"
import { sdk } from "@farcaster/frame-sdk"
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  useReadContract,
  useSimulateContract,
} from "wagmi"
import { formatEther } from "viem"
import partyAbi from "@/abis/PartyRegistration.json" // Győződj meg arról, hogy ez a helyes ABI
import Web3Providers from "@/components/Web3Providers"
import { PartyStats } from "@/components/party-stats"
import PvPGame from "@/components/pvp/PvPGame"
import { CONTRACTS } from "@/config/contracts"
import { ContractDebug } from "@/components/ContractDebug"
import ERC20_ABI from "@/abis/ERC20.json" // Declare ERC20_ABI

const PARTY_CONTRACT_ADDRESS = CONTRACTS.FarcasterPromo // Ez a PartyRegistration szerződés címe
const CHESS_TOKEN_ADDRESS = "0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07"
const BASE_MAINNET_CHAIN_ID = 8453

// Define allowed registration amounts in CHESS tokens (without 10^18 multiplier)
const ALLOWED_AMOUNTS = [10_000, 100_000, 500_000, 1_000_000, 5_000_000] as const // Use 'as const' for type safety

function PartyContent() {
  const [status, setStatus] = useState<string | null>(null)
  const [simError, setSimError] = useState<string | null>(null)
  const [farcasterProfile, setFarcasterProfile] = useState<{ fid: number; username: string } | null>(null)
  const { address, isConnected, chain } = useAccount()
  const [showPvP, setShowPvP] = useState(false)

  // State for selected registration amount
  const [selectedAmount, setSelectedAmount] = useState<(typeof ALLOWED_AMOUNTS)[number]>(ALLOWED_AMOUNTS[0]) // Default to 10k

  const { signIn } = useSignIn({
    onSuccess(data) {
      if (data.fid && data.username) {
        setFarcasterProfile({ fid: data.fid, username: data.username })
        localStorage.setItem("farcasterProfile", JSON.stringify({ fid: data.fid, username: data.username }))
        setStatus("Farcaster sign-in successful! You can now proceed.")
      } else {
        setStatus("Farcaster sign-in failed to retrieve profile data.")
      }
    },
    onError(error) {
      console.error("Farcaster sign-in error:", error)
      setStatus("Farcaster sign-in failed. Please try again.")
    },
  })

  useEffect(() => {
    const savedProfile = localStorage.getItem("farcasterProfile")
    if (savedProfile) {
      setFarcasterProfile(JSON.parse(savedProfile))
    } else {
      sdk.context
        .then((ctx) => {
          const farcasterUser = ctx.user as { fid: number; username?: string } | undefined
          if (farcasterUser?.fid && farcasterUser.username) {
            const profile = { fid: farcasterUser.fid, username: farcasterUser.username }
            setFarcasterProfile(profile)
            localStorage.setItem("farcasterProfile", JSON.stringify(profile))
          }
        })
        .catch((error) => {
          console.warn("Frame context unavailable, falling back to sign-in:", error)
        })
    }
  }, [])

  const { data: ethBalance } = useBalance({ address })

  const { data: chessBalance, refetch: refetchChessBalance } = useReadContract({
    address: CHESS_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address },
  })

  const {
    data: allowance,
    refetch: refetchAllowance,
    isLoading: isAllowanceLoading,
  } = useReadContract({
    address: CHESS_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, PARTY_CONTRACT_ADDRESS],
    query: { enabled: !!address },
  })

  const { data: isRegistered, refetch: refetchIsRegistered } = useReadContract({
    address: PARTY_CONTRACT_ADDRESS,
    abi: partyAbi,
    functionName: "isRegistered",
    args: [address!],
    query: { enabled: !!address },
  })

  // Calculate required fee based on selected amount
  const requiredFeeBigInt = BigInt(selectedAmount) * BigInt(10 ** 18)

  let needsApproval = false
  if (!isAllowanceLoading && typeof allowance === "bigint") {
    needsApproval = allowance < requiredFeeBigInt
  }

  const {
    data: registrationSim,
    error: registrationSimError,
    isLoading: isSimulating,
  } = useSimulateContract({
    address: PARTY_CONTRACT_ADDRESS,
    abi: partyAbi,
    functionName: "register",
    args: [requiredFeeBigInt], // Pass the selected amount to the register function
    query: {
      enabled: isConnected && !!address && !!farcasterProfile && !needsApproval && !isRegistered,
    },
  })

  useEffect(() => {
    if (registrationSimError) {
      if (registrationSimError.message.includes("insufficient funds")) setSimError("Insufficient ETH for gas fees.")
      else
        setSimError(`Transaction will likely fail: ${registrationSimError.message}. Please check console for details.`)
    } else {
      setSimError(null)
    }
  }, [registrationSimError])

  const { writeContract: writeApproval, data: approvalHash, isPending: isApprovePending } = useWriteContract()
  const { writeContract: writeRegistration, data: registrationHash, isPending: isRegisterPending } = useWriteContract()

  const { isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({ hash: approvalHash })
  const { isSuccess: isRegistrationConfirmed } = useWaitForTransactionReceipt({ hash: registrationHash })

  const handleTransactionSuccess = useCallback(async () => {
    if (!address || !registrationHash) return
    setStatus("On-chain registration complete. Saving to database...")
    try {
      await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          transaction_hash: registrationHash,
          status: "completed",
          farcaster_fid: farcasterProfile?.fid,
          farcaster_username: farcasterProfile?.username,
        }),
      })
      setStatus("Registration successful! Your participation is recorded.")
      refetchIsRegistered()
      refetchChessBalance()
    } catch (error) {
      if (error instanceof Error) setStatus(`On-chain success, but DB save failed: ${error.message}`)
    }
  }, [address, registrationHash, farcasterProfile, refetchIsRegistered, refetchChessBalance])

  useEffect(() => {
    if (isApprovalConfirmed) {
      setStatus("Approval confirmed! Now you can register.")
      refetchAllowance()
    }
  }, [isApprovalConfirmed, refetchAllowance])

  useEffect(() => {
    if (isRegistrationConfirmed) {
      handleTransactionSuccess()
    }
  }, [isRegistrationConfirmed, handleTransactionSuccess])

  const handleApprove = () => {
    if (!address) return
    setStatus(`Approving ${selectedAmount} $CHESS tokens...`)
    writeApproval({
      address: CHESS_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [PARTY_CONTRACT_ADDRESS, requiredFeeBigInt], // Approve the selected amount
    })
  }

  const handleRegister = () => {
    if (!registrationSim?.request) return
    setStatus("Registering for party...")
    writeRegistration(registrationSim.request)
  }

  const isWrongNetwork = isConnected && (!chain || chain.id !== BASE_MAINNET_CHAIN_ID)
  let hasInsufficientCHESS = true
  if (isConnected && typeof chessBalance === "bigint") {
    hasInsufficientCHESS = chessBalance < requiredFeeBigInt
  }

  if (showPvP && farcasterProfile) {
    const user = {
      fid: farcasterProfile.fid,
      username: farcasterProfile.username,
      displayName: farcasterProfile.username,
      pfpUrl: undefined,
    }
    return <PvPGame user={user} onBackToMenu={() => setShowPvP(false)} />
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white bg-[#0F0F23] p-4">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 uppercase tracking-widest bg-gradient-to-r from-orange-500 via-yellow-500 to-yellow-400 bg-clip-text text-transparent">
          🎉 One Million $CHESS Party!
        </h1>

        <div className="my-8 w-full max-w-2xl">
          <PartyStats />
        </div>

        <button
          onClick={() => {
            console.log("🔥 PvP Mode clicked!")
            setShowPvP(true)
          }}
          style={{
            background: "transparent",
            border: "2px solid rgba(255, 215, 0, 0.6)",
            borderRadius: "12px",
            padding: "20px 25px",
            margin: "20px auto",
            maxWidth: "440px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 0 38px rgba(255, 215, 0, 0.4)",
            animation: "balancePulse 2.5s ease-in-out infinite alternate",
            color: "#FF6B35",
            cursor: "pointer",
            transition: "all 0.3s",
            display: "block",
            width: "100%",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.boxShadow = "0 0 25px rgba(255, 107, 53, 0.5)"
            e.currentTarget.style.borderColor = "rgba(255, 107, 53, 0.8)"
            e.currentTarget.style.textShadow = "0 0 6px #FF6B35"
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.boxShadow = "0 0 38px rgba(255, 215, 0, 0.4)"
            e.currentTarget.style.borderColor = "rgba(255, 215, 0, 0.6)"
            e.currentTarget.style.textShadow = "none"
          }}
        >
          <div
            style={{
              fontSize: "1.2em",
              fontWeight: "600",
              color: "#FF6B35",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "1px",
              textShadow: "0 0 19px #FF6B35",
            }}
          >
            ⚔️ Enter the Arena
          </div>
          <div
            style={{
              fontSize: "1em",
              fontWeight: "bold",
              color: "#FFF",
              textShadow: "0 0 25px rgba(255, 107, 53, 0.8)",
            }}
          >
            Entry: 10,000 $CHESS. Winner takes all.
          </div>
        </button>

        <div className="mb-6 space-y-4">
          {!isConnected ? (
            <div className="p-4 bg-orange-600 text-white rounded-lg">⚠️ Please connect your wallet to participate!</div>
          ) : isRegistered ? (
            <div className="p-6 bg-green-900/50 border border-green-400 rounded-lg">
              <h2 className="text-2xl font-bold text-green-400">✅ You are registered!</h2>
              <p className="mt-2 text-white/80">Welcome to the party. View the live stats above.</p>
            </div>
          ) : (
            <>
              {!farcasterProfile ? (
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="mb-2 text-yellow-400">First, sign in with Farcaster!</p>
                  <Button
                    onClick={() => signIn()}
                    className="px-8 py-4 text-lg font-bold bg-purple-600 hover:bg-purple-700 rounded-xl"
                  >
                    Sign in with Farcaster
                  </Button>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-gray-800 rounded-lg text-sm text-left">
                    <p className="mb-2 text-lg text-green-400">Signed in as: @{farcasterProfile.username}</p>
                    <hr className="my-2 border-white/10" />
                    <div>
                      ETH Balance: {ethBalance ? Number.parseFloat(formatEther(ethBalance.value)).toFixed(5) : "0"} ETH
                    </div>
                    <div>
                      CHESS Balance: {typeof chessBalance === "bigint" ? (chessBalance / 10n ** 18n).toString() : "0"}{" "}
                      $CHESS
                    </div>
                    <div className="mt-2">Required: {selectedAmount.toLocaleString()} $CHESS + gas</div>
                    <div>
                      Approval Status:{" "}
                      {isAllowanceLoading ? "Checking..." : needsApproval ? "❌ Required" : "✅ Approved"}
                    </div>
                  </div>

                  {/* Amount selection buttons */}
                  <div className="p-4 bg-gray-800 rounded-lg text-sm text-left">
                    <p className="mb-2 text-lg text-yellow-400">Select Registration Amount:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {ALLOWED_AMOUNTS.map((amount) => (
                        <Button
                          key={amount}
                          onClick={() => setSelectedAmount(amount)}
                          className={`px-4 py-2 text-md font-bold rounded-lg ${
                            selectedAmount === amount
                              ? "bg-blue-600 hover:bg-blue-700"
                              : "bg-gray-700 hover:bg-gray-600"
                          }`}
                        >
                          {amount.toLocaleString()} $CHESS
                        </Button>
                      ))}
                    </div>
                  </div>

                  {isWrongNetwork && (
                    <div className="p-4 bg-red-600 text-white rounded-lg">
                      ⚠️ Wrong Network! Please switch to Base Mainnet.
                    </div>
                  )}
                  {hasInsufficientCHESS && (
                    <div className="p-4 bg-red-600 text-white rounded-lg">⚠️ Insufficient $CHESS tokens!</div>
                  )}
                  {simError && !needsApproval && (
                    <div className="p-4 bg-red-600 text-white rounded-lg">⚠️ {simError}</div>
                  )}

                  {!isWrongNetwork &&
                    !hasInsufficientCHESS &&
                    (needsApproval ? (
                      <Button
                        onClick={handleApprove}
                        disabled={isApprovePending}
                        className="px-8 py-4 text-lg font-bold bg-blue-600 hover:bg-blue-700 rounded-xl"
                      >
                        {isApprovePending ? "Approving..." : `1️⃣ Approve ${selectedAmount.toLocaleString()} $CHESS`}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleRegister}
                        disabled={isRegisterPending || isSimulating || !!registrationSimError}
                        className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 rounded-xl"
                      >
                        {isSimulating
                          ? "Preparing..."
                          : isRegisterPending
                            ? "Registering..."
                            : `2️⃣ Register for Party (${selectedAmount.toLocaleString()} $CHESS)`}
                      </Button>
                    ))}
                </>
              )}
            </>
          )}
        </div>

        {status && <div className="mx-auto my-6 p-4 bg-gray-800/80 text-yellow-400 rounded-xl max-w-md">{status}</div>}

        <Link href="/">
          <Button
            variant="outline"
            className="px-6 py-3 bg-transparent border-2 border-yellow-400 text-yellow-400 rounded-lg"
          >
            Back to Home
          </Button>
        </Link>

        {/* Add debug component temporarily */}
        <ContractDebug />
      </div>
      <style jsx>{`
    @keyframes balancePulse {
      0% {
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.4);
      }
      100% {
        box-shadow: 0 0 50px rgba(255, 215, 0, 0.8);
      }
    }
  `}</style>
    </div>
  )
}

export default function PartyPage() {
  useEffect(() => {
    try {
      sdk.actions.ready()
    } catch (error) {
      console.warn("Frame actions not available:", error)
    }
  }, [])

  return (
    <Web3Providers>
      <PartyContent />
    </Web3Providers>
  )
}
