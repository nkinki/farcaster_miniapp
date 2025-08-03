"use client"

import { useState } from "react";
import { useAccount } from "wagmi";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, type Hash } from "viem";
import { PROMO_CONTRACT_ADDRESS, PROMO_CONTRACT_ABI, CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from "@/lib/contracts";

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

// Enum a folyamat lépéseinek követésére
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

  const [castUrl, setCastUrl] = useState("https://warpcast.com/dwr/0x5c7987b7");
  const [shareText, setShareText] = useState("");
  const [rewardPerShare, setRewardPerShare] = useState("1000");
  const [totalBudget, setTotalBudget] = useState("10000");
  
  const [step, setStep] = useState<CreationStep>(CreationStep.Idle);
  const [error, setError] = useState<string | null>(null);
  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>();
  const [createTxHash, setCreateTxHash] = useState<Hash | undefined>();

  // Hook, ami figyeli az approve tranzakció sikerességét
  const { isLoading: isApproving, isSuccess: isApproved } = useWaitForTransactionReceipt({ 
    hash: approveTxHash, 
  });

  // Hook, ami figyeli a create tranzakció sikerességét
  const { isLoading: isCreating, isSuccess: isCreated } = useWaitForTransactionReceipt({ 
    hash: createTxHash, 
  });

  const handleCreateCampaign = async () => {
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
      console.error("Approval failed:", err);
      setError(err.shortMessage || "User rejected the approval transaction.");
      setStep(CreationStep.Idle);
    }
  };
  
  // Ez az effekt akkor fut le, ha az `approve` tranzakció sikeres lett.
  useEffect(() => {
    const createCampaignOnChain = async () => {
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
          console.error("Campaign creation on-chain failed:", err);
          setError(err.shortMessage || "User rejected the campaign creation transaction.");
          setStep(CreationStep.Idle);
        }
      }
    };
    createCampaignOnChain();
  }, [isApproved, step]);
  
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

          if (!response.ok) throw new Error('Failed to save to DB.');

          setStep(CreationStep.Done);
          alert("Campaign created successfully!");
          onSuccess();

        } catch (err: any) {
          console.error("Saving to DB failed:", err);
          setError("On-chain creation succeeded, but saving to database failed. Please contact support.");
          setStep(CreationStep.Idle);
        }
      }
    };
    saveToDb();
  }, [isCreated, step]);

  const getButtonText = () => {
    if (step === CreationStep.Approving || isApproving) return "1/2: Awaiting Approval...";
    if (step === CreationStep.Creating || isCreating) return "2/2: Awaiting Creation...";
    if (step === CreationStep.Saving) return "Saving...";
    if (step === CreationStep.Done) return "Success!";
    return "Create & Fund Campaign";
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white text-center">Create a New Promotion</h2>
      {/* ... (az űrlap input mezői változatlanok) ... */}
      {error && <p className="text-red-400 text-sm text-center bg-red-900/50 p-3 rounded-md">{error}</p>}
      <div className="flex items-center gap-4 pt-4">
        <button onClick={onCancel} disabled={step !== CreationStep.Idle} className="w-full ...">Cancel</button>
        <button onClick={handleCreateCampaign} disabled={step !== CreationStep.Idle || !address} className="w-full ...">
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}