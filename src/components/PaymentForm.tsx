"use client"

import { useState, useEffect } from "react"
import { FiAlertCircle } from "react-icons/fi"
import { useFarcasterPromo, useCampaignExists } from "../hooks/useFarcasterPromo"
import { useChessToken } from "../hooks/useChessToken"
import { usePromotion } from "../hooks/usePromotions"
import { useAccount, useSimulateContract } from "wagmi"
import FARCASTER_PROMO_ABI from "../abis/FarcasterPromo.json"
import { CONTRACTS } from "../config/contracts"

// Eltávolítva a declare global blokk a window.ethereum-hoz

interface PaymentFormProps {
  promotionId: string
  onPaymentComplete: (amount: number, hash: string) => void
  onCancel: () => void
  // Új propok az új kampány létrehozásához
  newCampaignData?: {
    castUrl: string
    shareText: string
    rewardPerShare: number
    totalBudget: number
    user: {
      fid: number
      username: string
      displayName: string
    }
  }
}

export default function PaymentForm({ promotionId, onPaymentComplete, onCancel, newCampaignData }: PaymentFormProps) {
  const [rewardPerShare, setRewardPerShare] = useState<number>(newCampaignData?.rewardPerShare || 10000) // Alapértelmezett 10k
  const [error, setError] = useState<string>("")
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)
  const [isSavingToDb, setIsSavingToDb] = useState(false)
  const [campaignCreated, setCampaignCreated] = useState(false)

  // Wagmi hookok
  const { address, isConnected } = useAccount()
  const {
    fundCampaign,
    isFundingCampaign,
    fundCampaignHash,
    createCampaign,
    isCreatingCampaign: isCreatingCampaignFromHook,
    createCampaignHash: createCampaignData,
    createCampaignError,
    createCampaignReceiptError,
  } = useFarcasterPromo()
  const {
    balance,
    allowance,
    approve,
    isApproving,
    needsApproval,
    isApproveSuccess,
    approveError,
    balanceError,
    allowanceError,
    balanceLoading,
    allowanceLoading,
    approveFarcasterPromo,
  } = useChessToken()

  // Hibakeresési naplózás a PaymentForm-hoz
  console.log("🎯 PaymentForm Debug:", {
    address,
    isConnected,
    balance: balance?.toString(),
    allowance: allowance?.toString(),
    balanceError: balanceError?.message,
    allowanceError: allowanceError?.message,
    balanceLoading,
    allowanceLoading,
    isApproving,
    isApproveSuccess,
    approveError: approveError?.message,
    userAgent: navigator.userAgent,
    isFarcasterApp: navigator.userAgent.includes("Farcaster") || window.location.hostname.includes("farcaster"),
  })

  // Neon DB promóciós adatok (csak meglévő kampányokhoz)
  const {
    promotion,
    loading: promotionLoading,
    error: promotionError,
  } = usePromotion(promotionId === "new" ? undefined : Number(promotionId))

  // Blokklánc kampány ellenőrzés (kompatibilitás céljából)
  const {
    exists: campaignExists,
    campaign: blockchainCampaign,
    error: campaignError,
    isLoading: campaignLoading,
  } = useCampaignExists(promotionId === "new" ? undefined : BigInt(promotionId))

  // Időtúllépés hozzáadása a betöltési állapothoz
  const [loadingTimeout, setLoadingTimeout] = useState(false)

  useEffect(() => {
    if (campaignLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true)
      }, 10000) // 10 másodperc időtúllépés

      return () => clearTimeout(timer)
    } else {
      setLoadingTimeout(false)
    }
  }, [campaignLoading])

  // Kampány létrehozásának szimulálása új kampányokhoz - with error handling
  const { data: createSimulationData, error: createSimulationError } = useSimulateContract({
    address: CONTRACTS.FarcasterPromo as `0x${string}`,
    abi: FARCASTER_PROMO_ABI,
    functionName: "createCampaign",
    args: newCampaignData
      ? [
          newCampaignData.castUrl.startsWith("http")
            ? newCampaignData.castUrl
            : `https://warpcast.com/~/conversations/${newCampaignData.castUrl}`,
          newCampaignData.shareText || "Share this promotion!",
          BigInt(newCampaignData.rewardPerShare) * BigInt(10 ** 18), // Megfelelő BigInt konverzió
          BigInt(newCampaignData.totalBudget) * BigInt(10 ** 18), // Megfelelő BigInt konverzió
          true, // osztható
        ]
      : promotion
        ? [
            promotion.cast_url.startsWith("http")
              ? promotion.cast_url
              : `https://warpcast.com/~/conversations/${promotion.cast_url}`,
            promotion.share_text || "Share this promotion!",
            BigInt(rewardPerShare) * BigInt(10 ** 18), // Megfelelő BigInt konverzió
            BigInt(promotion.total_budget) * BigInt(10 ** 18), // Megfelelő BigInt konverzió
            true, // osztható
          ]
        : undefined,
    query: {
      enabled: isConnected && !!address && (!!newCampaignData || (!!promotion && !campaignExists && !campaignLoading)),
      retry: (failureCount, error) => {
        // Skip retry for connector-related errors
        if (error?.message?.includes('getChainId') ||
            error?.message?.includes('connector') ||
            error?.message?.includes('chain')) {
          console.warn('Skipping simulation retry for connector error:', error.message)
          return false
        }
        return failureCount < 2
      },
      retryDelay: 1000,
    },
  })

  // Szimulációs állapot hibakeresése
  console.log("Simulation debug:", {
    isConnected,
    address,
    newCampaignData: !!newCampaignData,
    promotion: !!promotion,
    campaignExists,
    campaignLoading,
    enabled: isConnected && !!address && (!!newCampaignData || (!!promotion && !campaignExists && !campaignLoading)),
    simulationData: !!createSimulationData,
    simulationError: createSimulationError?.message,
  })

  const handleRewardPerShareChange = (value: number) => {
    setRewardPerShare(value)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
    return num.toString()
  }

  const handleCreateCampaign = async () => {
    if (!isConnected) {
      setError("Kérjük, először csatlakoztassa a pénztárcáját.")
      return
    }

    // Új kampányok esetén ellenőrizze a newCampaignData-t
    if (promotionId === "new") {
      if (!newCampaignData) {
        setError("Hiányoznak az új kampány adatai.")
        return
      }
    } else {
      // Meglévő kampányok esetén ellenőrizze a promóciót
      if (!promotion) {
        setError(`A ${promotionId} promóció nem létezik az adatbázisban.`)
        return
      }

      if (promotion.status !== "active") {
        setError(`A ${promotionId} promóció nem aktív (állapot: ${promotion.status}).`)
        return
      }
    }

    // Ellenőrizze a minimális értékeket
    const rewardPerShareValue = promotionId === "new" ? newCampaignData?.rewardPerShare || 0 : rewardPerShare
    const totalBudgetValue = promotionId === "new" ? newCampaignData?.totalBudget || 0 : promotion?.total_budget || 0

    if (rewardPerShareValue <= 0) {
      setError("A megosztásonkénti jutalomnak nagyobbnak kell lennie nullánál.")
      return
    }

    if (totalBudgetValue <= 0) {
      setError("A teljes költségvetésnek nagyobbnak kell lennie nullánál.")
      return
    }

    if (rewardPerShareValue > totalBudgetValue) {
      setError("A megosztásonkénti jutalom nem lehet nagyobb, mint a teljes költségvetés.")
      return
    }

    // Ellenőrizze a szimuláció eredményét, mielőtt írási kísérletet tesz
    // Skip simulation check if it's a connector error
    if (!createSimulationData && promotionId === "new" && newCampaignData) {
      const isConnectorError = createSimulationError?.message?.includes('getChainId') ||
                              createSimulationError?.message?.includes('connector')
      
      if (!isConnectorError) {
        setError(
          createSimulationError?.message ||
            "A kampány létrehozásának szimulációja sikertelen. Részletekért nézze meg a konzolt.",
        )
        return
      } else {
        console.warn("Skipping simulation check due to connector error, proceeding with campaign creation")
      }
    }

    setError("")

    try {
      setIsCreatingCampaign(true)

      const campaignData = promotionId === "new" ? newCampaignData! : promotion!
      console.log("Blokklánc kampány létrehozása ehhez:", campaignData)

      // Használja a továbbfejlesztett createCampaign függvényt megfelelő paraméterekkel
      if (promotionId === "new" && newCampaignData) {
        createCampaign({
          castUrl: newCampaignData.castUrl.startsWith("http")
            ? newCampaignData.castUrl
            : `https://warpcast.com/~/conversations/${newCampaignData.castUrl}`,
          shareText: newCampaignData.shareText || "Share this promotion!",
          rewardPerShare: BigInt(newCampaignData.rewardPerShare) * BigInt(10 ** 18),
          totalBudget: BigInt(newCampaignData.totalBudget) * BigInt(10 ** 18),
          divisible: true,
        })
      } else if (promotion) {
        createCampaign({
          castUrl: promotion.cast_url.startsWith("http")
            ? promotion.cast_url
            : `https://warpcast.com/~/conversations/${promotion.cast_url}`,
          shareText: promotion.share_text || "Share this promotion!",
          rewardPerShare: BigInt(rewardPerShare) * BigInt(10 ** 18),
          totalBudget: BigInt(promotion.total_budget) * BigInt(10 ** 18),
          divisible: true,
        })
      }
    } catch (err) {
      console.error("Hiba a blokklánc kampány létrehozásakor:", err)
      setError(err instanceof Error ? err.message : "A kampány létrehozása sikertelen.")
      setIsCreatingCampaign(false)
    }
  }

  // Sikeres kampánylétrehozás kezelése
  useEffect(() => {
    if (createCampaignData) {
      console.log("Kampány sikeresen létrehozva a blokkláncon:", createCampaignData)

      // Ha ez egy új kampány, mentse el a Neon DB-be
      if (promotionId === "new" && newCampaignData) {
        saveNewCampaignToDb(createCampaignData)
      } else {
        setIsCreatingCampaign(false)
        // Ne töltse újra, csak mutassa a sikerüzenetet
        console.log("Kampány sikeresen létrehozva!")
        setCampaignCreated(true)
      }
    }
  }, [createCampaignData, promotionId, newCampaignData])

  // Jóváhagyás sikerének kezelése
  useEffect(() => {
    if (isApproveSuccess) {
      console.log("CHESS token jóváhagyása sikeres!")
      // Ne töltse újra, csak mutassa a sikerüzenetet
      console.log("✅ CHESS jóváhagyás sikeresen befejeződött!")
    }
  }, [isApproveSuccess])

  // Jóváhagyási hiba kezelése
  useEffect(() => {
    if (approveError) {
      console.error("CHESS token jóváhagyása sikertelen:", approveError)
      setError(`Jóváhagyás sikertelen: ${approveError.message}`)
    }
  }, [approveError])

  // Kampánylétrehozási hibák kezelése a hookból
  useEffect(() => {
    if (createCampaignError) {
      console.error("Kampánylétrehozási írási hiba:", createCampaignError)
      setError(`A kampány létrehozása sikertelen: ${createCampaignError.message}`)
      setIsCreatingCampaign(false)
    }
  }, [createCampaignError])

  useEffect(() => {
    if (createCampaignReceiptError) {
      console.error("Kampánylétrehozási nyugta hiba:", createCampaignReceiptError)
      setError(`A kampány tranzakciója sikertelen: ${createCampaignReceiptError.message}`)
      setIsCreatingCampaign(false)
    }
  }, [createCampaignReceiptError])

  // Új kampány mentése a Neon DB-be a sikeres blokklánc létrehozás után
  const saveNewCampaignToDb = async (blockchainHash: string) => {
    if (!newCampaignData) return

    try {
      setIsSavingToDb(true)
      console.log("Új kampány mentése a Neon DB-be:", newCampaignData)

      const response = await fetch("/api/promotions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fid: newCampaignData.user.fid,
          username: newCampaignData.user.username,
          displayName: newCampaignData.user.displayName,
          castUrl: newCampaignData.castUrl,
          shareText: newCampaignData.shareText || undefined,
          rewardPerShare: newCampaignData.rewardPerShare,
          totalBudget: newCampaignData.totalBudget,
          blockchainHash: blockchainHash, // Tárolja a blokklánc tranzakció hash-ét
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Kampány sikeresen mentve a Neon DB-be:", data)

        // Hívja meg az onPaymentComplete-t a blokklánc hash-el
        onPaymentComplete(newCampaignData.totalBudget, blockchainHash)

        // Űrlap visszaállítása
        setIsCreatingCampaign(false)
        setIsSavingToDb(false)

        // Sikerüzenet megjelenítése újratöltés helyett
        console.log("🎉 Kampány sikeresen létrehozva és mentve!")
        console.log("📋 Kampány részletei:", {
          blockchainHash,
          totalBudget: newCampaignData.totalBudget,
          castUrl: newCampaignData.castUrl,
        })

        // Kampány létrehozva jelző beállítása
        setCampaignCreated(true)
      } else {
        const errorData = await response.json()
        console.error("Sikertelen mentés a Neon DB-be:", errorData)
        setError(
          `A kampány létrehozva a blokkláncon, de nem sikerült menteni az adatbázisba: ${errorData.error || "Ismeretlen hiba"}`,
        )
        setIsCreatingCampaign(false)
        setIsSavingToDb(false)
      }
    } catch (error) {
      console.error("Hiba a Neon DB-be mentéskor:", error)
      setError(
        `A kampány létrehozva a blokkláncon, de nem sikerült menteni az adatbázisba: ${error instanceof Error ? error.message : "Ismeretlen hiba"}`,
      )
      setIsCreatingCampaign(false)
      setIsSavingToDb(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4">
        {/* Pénztárca állapota */}
        <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm">
          <p>
            <strong>Pénztárca állapota:</strong>
          </p>
          <p>Csatlakoztatva: {isConnected ? "Igen" : "Nem"}</p>
          <p>
            Cím:{" "}
            {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : "Nincs csatlakoztatva"}
          </p>
          <p>
            Szerződés: {CONTRACTS.FarcasterPromo.substring(0, 6)}...
            {CONTRACTS.FarcasterPromo.substring(CONTRACTS.FarcasterPromo.length - 4)}
          </p>
        </div>

        {/* Hibakereső panel */}
        <div className="mt-3 p-2 bg-red-900 bg-opacity-50 rounded border border-red-500">
          <p className="text-red-300 font-bold text-xs">🔧 HIBAKERESÉSI INFÓ:</p>
          <p className="text-red-200 text-xs">
            Egyenleg:{" "}
            {balanceLoading
              ? "Betöltés..."
              : balanceError
                ? `Hiba: ${balanceError.message}`
                : balance
                  ? `${(Number(balance) / 1e18).toFixed(2)} CHESS`
                  : "0 CHESS"}
          </p>
          <p className="text-red-200 text-xs">
            Engedély:{" "}
            {allowanceLoading
              ? "Betöltés..."
              : allowanceError
                ? `Hiba: ${allowanceError.message}`
                : allowance
                  ? `${(Number(allowance) / 1e18).toFixed(2)} CHESS`
                  : "0 CHESS"}
          </p>
          <p className="text-red-200 text-xs">
            Jóváhagyás szükséges: {needsApproval(BigInt(10000) * BigInt(10 ** 18)) ? "Igen" : "Nem"}
          </p>
          <p className="text-red-200 text-xs">
            CHESS Token: {CONTRACTS.CHESS_TOKEN.substring(0, 6)}...
            {CONTRACTS.CHESS_TOKEN.substring(CONTRACTS.CHESS_TOKEN.length - 4)}
          </p>
          <p className="text-red-200 text-xs">Jóváhagyás folyamatban: {isApproving ? "Igen" : "Nem"}</p>
          <p className="text-red-200 text-xs">Jóváhagyás sikeres: {isApproveSuccess ? "Igen" : "Nem"}</p>
          {approveError && <p className="text-red-400 text-xs">Jóváhagyási hiba: {approveError.message}</p>}
          {createSimulationError && (
            <p className="text-red-400 text-xs">Szimulációs hiba: {createSimulationError.message}</p>
          )}{" "}
          {createCampaignError && <p className="text-red-400 text-xs">Írási hiba: {createCampaignError.message}</p>}{" "}
          {createCampaignReceiptError && (
            <p className="text-red-400 text-xs">Nyugta hiba: {createCampaignReceiptError.message}</p>
          )}{" "}
          <button
            onClick={async () => {
              console.log("🚀 KÉNYSZERÍTETT JÓVÁHAGYÁS TESZT")
              try {
                // Clear any previous errors
                setError("")
                
                // Check wallet connection
                if (!address || !isConnected) {
                  setError("Pénztárca nincs csatlakoztatva")
                  return
                }
                
                console.log("Debug approval attempt:", {
                  address,
                  isConnected,
                  amount: (BigInt(10000) * BigInt(10 ** 18)).toString()
                })
                
                // Add delay to ensure connector is ready
                await new Promise(resolve => setTimeout(resolve, 300))
                
                approveFarcasterPromo(BigInt(10000) * BigInt(10 ** 18))
              } catch (error) {
                console.error("Debug approval error:", error)
                if (error instanceof Error) {
                  if (error.message.includes('getChainId') || error.message.includes('connector')) {
                    setError("Connector hiba - próbálja újra csatlakoztatni a pénztárcát")
                  } else {
                    setError(`Debug jóváhagyási hiba: ${error.message}`)
                  }
                }
              }
            }}
            disabled={isApproving || !address || !isConnected}
            className="mt-2 px-2 py-1 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 text-white text-xs rounded"
          >
            {isApproving ? "Jóváhagyás..." : "🚀 Kényszerített jóváhagyás 10K CHESS"}
          </button>
        </div>

        {/* Kampány létrehozási űrlap */}
        {promotionId === "new" && newCampaignData && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Új kampány létrehozása</h3>

            {/* Kampány összefoglaló */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Kampány összefoglaló</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Cast URL:</span>
                  <span className="text-white truncate max-w-[200px]">{newCampaignData.castUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Megosztási szöveg:</span>
                  <span className="text-white">"{newCampaignData.shareText || "Ossza meg ezt a promóciót!"}"</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Jutalom megosztásonként:</span>
                  <span className="text-green-400">{formatNumber(newCampaignData.rewardPerShare)} $CHESS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Teljes költségvetés:</span>
                  <span className="text-blue-400">{formatNumber(newCampaignData.totalBudget)} $CHESS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Osztható:</span>
                  <span className="text-green-400">Igen ✓</span>
                </div>
              </div>
            </div>

            {/* Kampány létrehozása gomb */}
            <button
              onClick={handleCreateCampaign}
              disabled={isCreatingCampaign || isCreatingCampaignFromHook || isSavingToDb || (!createSimulationData && createSimulationError && !createSimulationError.message?.includes('getChainId'))}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {isCreatingCampaign || isCreatingCampaignFromHook
                ? "Kampány létrehozása..."
                : isSavingToDb
                  ? "Mentés az adatbázisba..."
                  : "Új kampány létrehozása"}
            </button>

            {/* Megjegyzés a CHESS finanszírozásról */}
            <div className="mt-4 p-3 bg-blue-900 bg-opacity-20 rounded-lg">
              <p className="text-xs text-blue-400">
                <strong>Megjegyzés:</strong> A kampány létrehozása ingyenes. A CHESS token finanszírozás a kampány
                létrehozása után lesz elérhető.
              </p>
            </div>
          </div>
        )}

        {/* Sikerüzenetek */}
        {isApproveSuccess && (
          <div className="flex items-center gap-2 text-green-400 mb-4 p-3 bg-green-900 bg-opacity-20 rounded-lg">
            <span className="text-lg">✅</span>
            <span className="text-sm">CHESS token sikeresen jóváhagyva!</span>
          </div>
        )}

        {campaignCreated && (
          <div className="flex items-center gap-2 text-green-400 mb-4 p-3 bg-green-900 bg-opacity-20 rounded-lg">
            <span className="text-lg">🎉</span>
            <span className="text-sm">Kampány sikeresen létrehozva a blokkláncon és mentve az adatbázisba!</span>
          </div>
        )}

        {/* Hibaüzenet */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 mb-4 p-3 bg-red-900 bg-opacity-20 rounded-lg">
            <FiAlertCircle />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Műveleti gombok */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Mégse
          </button>

          {/* Jóváhagyás gomb a finanszírozáshoz */}
          {needsApproval(BigInt(10000) * BigInt(10 ** 18)) && (
            <button
              onClick={async () => {
                console.log("🎯 Jóváhagyás gomb megnyomva")
                console.log("📋 Jóváhagyási paraméterek:", {
                  spender: CONTRACTS.FarcasterPromo,
                  amount: (BigInt(10000) * BigInt(10 ** 18)).toString(),
                })

                try {
                  // Clear any previous errors
                  setError("")
                  
                  // Check wallet connection
                  if (!address || !isConnected) {
                    setError("Kérjük, először csatlakoztassa a pénztárcáját.")
                    return
                  }

                  // Add delay to ensure connector is ready
                  await new Promise(resolve => setTimeout(resolve, 200))

                  // Use the correct function signature
                  approveFarcasterPromo(BigInt(10000) * BigInt(10 ** 18))
                } catch (error) {
                  console.error("❌ Approval button error:", error)
                  if (error instanceof Error) {
                    if (error.message.includes('getChainId') || error.message.includes('connector')) {
                      setError("Pénztárca kapcsolati hiba. Kérjük, csatlakoztassa újra a pénztárcáját.")
                    } else {
                      setError(`Jóváhagyási hiba: ${error.message}`)
                    }
                  }
                }
              }}
              disabled={isApproving || !address || !isConnected}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {isApproving ? "Jóváhagyás..." : !address ? "Pénztárca csatlakoztatása szükséges" : "CHESS jóváhagyása"}
            </button>
          )}
        </div>

        {/* Biztonsági figyelmeztetés */}
        <div className="mt-4 p-3 bg-yellow-900 bg-opacity-20 rounded-lg">
          <p className="text-xs text-yellow-400">
            <strong>Biztonsági figyelmeztetés:</strong> Ez a tranzakció kampányt hoz létre a blokkláncon. Győződjön meg
            arról, hogy minden részlet helyes, mielőtt folytatja.
          </p>
        </div>
      </div>
    </div>
  )
}