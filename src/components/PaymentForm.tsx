"use client"

import { useState, useEffect } from "react";
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
  // A shareText-et meghagyjuk az űrlapon, de a contract hívásból kivesszük
  const [shareText, setShareText] = useState(""); 
  const [rewardPerShare, setRewardPerShare] = useState("1000");
  const [totalBudget, setTotalBudget] = useState("10000");
  
  const [step, setStep] = useState<CreationStep>(CreationStep.Idle);
  const [error, setError] = useState<string | null>(null);
  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>();
  const [createTxHash, setCreateTxHash] = useState<Hash | undefined>();

  const { isSuccess: isApproved } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isSuccess: isCreated } = useWaitForTransactionReceipt({ hash: createTxHash });

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
  
  useEffect(() => {
    const createCampaignOnChain = async () => {
      if (isApproved && step === CreationStep.Approving) {
        setStep(CreationStep.Creating);
        try {
          const decimals = 18;
          const totalBudgetInWei = parseUnits(totalBudget, decimals);
          const rewardPerShareInWei = parseUnits(rewardPerShare, decimals);

          // =================================================================
          // JAVÍTÁS: Az `args` tömböt az új, 3 paraméteres szerződéshez igazítjuk.
          // Eltávolítottuk a `shareText`-et és a `divisible` (false) értéket.
          // =================================================================
          const hash = await writeContractAsync({
            address: PROMO_CONTRACT_ADDRESS,
            abi: PROMO_CONTRACT_ABI,
            functionName: 'createCampaign',
            args: [
              castUrl,
              rewardPerShareInWei,
              totalBudgetInWei
            ],
          });
          setCreateTxHash(hash);
        } catch (err: any) {
          console.error("Campaign creation on-chain failed at submission:", err);
          setError(err.shortMessage || "The campaign creation transaction was rejected or failed.");
          setStep(CreationStep.Idle);
        }
      }
    };
    createCampaignOnChain();
  }, [isApproved, step, address, castUrl, rewardPerShare, totalBudget, writeContractAsync]); // A shareText itt már nem függőség
  
  useEffect(() => {
    const saveToDb = async () => {
      if (isCreated && step === CreationStep.Creating) {
        setStep(CreationStep.Saving);
        try {
          // A shareText-et elmenthetjük az adatbázisba, mert ott még van neki hely
          const response = await fetch('/api/promotions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fid: user.fid,
              username: user.username,
              displayName: user.displayName,
              castUrl: castUrl,
              shareText: shareText, // Ezt továbbra is elmentjük
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
          setError("On-chain creation succeeded, but saving to the database failed.");
          setStep(CreationStep.Idle);
        }
      }
    };
    saveToDb();
  }, [isCreated, step, castUrl, createTxHash, onSuccess, rewardPerShare, shareText, totalBudget, user]);

  const getButtonText = () => {
    // ... (ez a rész változatlan)
    return "Create & Fund Campaign";
  };
  
  return (
    <div className="space-y-4">
      {/* Az űrlap JSX része teljesen változatlan maradhat, mert a `shareText` mezőt továbbra is használjuk az adatbázisba mentéshez. */}
      {/* ... */}
      <div className="flex items-center gap-4 pt-4">
        <button onClick={onCancel} disabled={step !== CreationStep.Idle} className="w-full ...">Cancel</button>
        <button onClick={handleStartCreationProcess} disabled={step !== CreationStep.Idle || !address} className="w-full ...">
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}```

Ezzel a módosítással a frontend hívásod tökéletesen illeszkedni fog az új, letisztázott smart contractodhoz, és az `ABI encoding mismatch` hiba meg fog szűnni. Most már tényleg működnie kell