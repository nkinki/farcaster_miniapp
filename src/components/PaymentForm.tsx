"use client"

// JAVÍTÁS: Itt adjuk hozzá a hiányzó 'useState' és 'useEffect' importokat.
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, type Hash } from "viem";
import { PROMO_CONTRACT_ADDRESS, PROMO_CONTRACT_ABI, CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from "@/lib/contracts";

// Típusok és Enum a komponenshez
interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
}

interface PaymentFormProps {
  user: FarcasterUser;
  onSuccess: () => void;
  onCancel: () => void;
}

enum CreationStep {
  Idle,
  Approving,
  AwaitingApproval,
  Creating,
  AwaitingCreation,
  Saving,
  Done,
}

export default function PaymentForm({ user, onSuccess, onCancel }: PaymentFormProps) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Form state-ek
  const [castUrl, setCastUrl] = useState("https://warpcast.com/dwr/0x5c7987b7");
  const [shareText, setShareText] = useState("");
  const [rewardPerShare, setRewardPerShare] = useState("1000");
  const [totalBudget, setTotalBudget] = useState("10000");
  
  // Folyamatkezelő state-ek
  const [step, setStep] = useState<CreationStep>(CreationStep.Idle);
  const [error, setError] = useState<string | null>(null);
  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>();
  const [createTxHash, setCreateTxHash] = useState<Hash | undefined>();

  // Hook, ami figyeli az approve tranzakció sikerességét
  const { isSuccess: isApproved } = useWaitForTransactionReceipt({ 
    hash: approveTxHash, 
  });

  // Hook, ami figyeli a create tranzakció sikerességét
  const { isSuccess: isCreated } = useWaitForTransactionReceipt({ 
    hash: createTxHash, 
  });

  // Első gombnyomásra lefutó függvény
  const handleStartCreationProcess = async () => {
    setError(null);
    if (!castUrl || !rewardPerShare || !totalBudget || !address) {
      setError("Please fill all fields and connect your wallet.");
      return;
    }

    setStep(CreationStep.Approving);
    
    try {
      const decimals = 18;
      const totalBudgetInWei = parseUnits(totalBudget, decimals);

      const hash = await writeContractAsync({
        address: CHESS_TOKEN_ADDRESS,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        args: [PROMO_CONTRACT_ADDRESS, totalBudgetInWei],
      });
      setApproveTxHash(hash);
    } catch (err: any) {
      console.error("Approval failed at submission:", err);
      setError(err.shortMessage || "User rejected the approval transaction.");
      setStep(CreationStep.Idle);
    }
  };
  
  // Ez az effekt akkor fut le, ha az `approve` tranzakció sikeres lett.
  useEffect(() => {
    const createCampaignOnChain = async () => {
      // Csak akkor lép tovább, ha az 'approve' sikeres volt, és még a jó lépésben vagyunk
      if (isApproved && step === CreationStep.Approving) {
        setStep(CreationStep.Creating);
        try {
          const decimals = 18;
          const totalBudgetInWei = parseUnits(totalBudget, decimals);
          const rewardPerShareInWei = parseUnits(rewardPerShare, decimals);

          const hash = await writeContractAsync({
            address: PROMO_CONTRACT_ADDRESS,
            abi: PROMO_CONTRACT_ABI,
            functionName: 'createCampaign',
            args: [castUrl, shareText, rewardPerShareInWei, totalBudgetInWei, false],
          });
          setCreateTxHash(hash);
        } catch (err: any) {
          console.error("Campaign creation on-chain failed at submission:", err);
          setError(err.shortMessage || "The campaign creation transaction was rejected or failed.");
          setStep(CreationStep.Idle); // Hiba esetén visszaáll alapállapotba
        }
      }
    };
    createCampaignOnChain();
  }, [isApproved, step, address, castUrl, rewardPerShare, shareText, totalBudget, writeContractAsync]);
  
  // Ez az effekt akkor fut le, ha a `createCampaign` tranzakció is sikeres lett.
  useEffect(() => {
    const saveToDb = async () => {
      if (isCreated && step === CreationStep.Creating) {
        setStep(CreationStep.Saving);
        try {
          const response = await fetch('/api/promotions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fid: user.fid,
              username: user.username,
              displayName: user.displayName,
              castUrl: castUrl,
              shareText: shareText,
              rewardPerShare: Number(rewardPerShare),
              totalBudget: Number(totalBudget),
              blockchainHash: createTxHash,
              status: 'active'
            }),
          });

          if (!response.ok) throw new Error('Failed to save to the database.');

          setStep(CreationStep.Done);
          alert("Campaign created successfully!");
          onSuccess();

        } catch (err: any) {
          console.error("Saving to database failed:", err);
          setError("On-chain creation succeeded, but saving to the database failed. Please contact support.");
          setStep(CreationStep.Idle);
        }
      }
    };
    saveToDb();
  }, [isCreated, step, castUrl, createTxHash, onSuccess, rewardPerShare, shareText, totalBudget, user]);

  // Dinamikus gombfelirat
  const getButtonText = () => {
    switch (step) {
      case CreationStep.Approving: return "1/2: Approving in wallet...";
      case CreationStep.Creating: return "2/2: Creating in wallet...";
      case CreationStep.Saving: return "Saving Details...";
      case CreationStep.Done: return "Success!";
      default: return "Create & Fund Campaign";
    }
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white text-center">Create a New Promotion</h2>
      {/* Az űrlap input mezői */}
      <div>
        <label htmlFor="castUrl" className="block text-sm font-medium text-purple-300">Cast URL*</label>
        <input type="text" id="castUrl" value={castUrl} onChange={(e) => setCastUrl(e.target.value)} className="mt-1 block w-full bg-[#181c23] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
      </div>
      <div>
        <label htmlFor="shareText" className="block text-sm font-medium text-purple-300">Share Text (Optional)</label>
        <input type="text" id="shareText" value={shareText} onChange={(e) => setShareText(e.target.value)} className="mt-1 block w-full bg-[#181c23] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="rewardPerShare" className="block text-sm font-medium text-purple-300">Reward / Share ($CHESS)*</label>
          <input type="number" id="rewardPerShare" value={rewardPerShare} onChange={(e) => setRewardPerShare(e.target.value)} className="mt-1 block w-full bg-[#181c23] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
        </div>
        <div>
          <label htmlFor="totalBudget" className="block text-sm font-medium text-purple-300">Total Budget ($CHESS)*</label>
          <input type="number" id="totalBudget" value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)} className="mt-1 block w-full bg-[#181c23] border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
        </div>
      </div>
      
      {error && <p className="text-red-400 text-sm text-center bg-red-900/50 p-3 rounded-md">{error}</p>}
      
      {/* Gombok */}
      <div className="flex items-center gap-4 pt-4">
        <button onClick={onCancel} disabled={step !== CreationStep.Idle} className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50">
          Cancel
        </button>
        <button onClick={handleStartCreationProcess} disabled={step !== CreationStep.Idle || !address} className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}