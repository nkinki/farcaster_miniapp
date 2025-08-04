"use client"

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { parseUnits, type Hash, decodeEventLog } from "viem";
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
  Idle, Approving, Creating, Saving, Done,
}

const budgetOptions = [10000, 100000, 500000, 1000000, 5000000];
const rewardOptions = [1000, 2000, 5000, 10000, 20000];

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${num / 1000000}M`;
  if (num >= 1000) return `${num / 1000}K`;
  return num.toString();
};

export default function PaymentForm({ user, onSuccess, onCancel }: PaymentFormProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [castUrl, setCastUrl] = useState("https://warpcast.com/dwr/0x5c7987b7");
  const [shareText, setShareText] = useState("");
  const [rewardPerShare, setRewardPerShare] = useState(rewardOptions[0].toString());
  const [totalBudget, setTotalBudget] = useState(budgetOptions[0].toString());
  
  const [step, setStep] = useState<CreationStep>(CreationStep.Idle);
  const [error, setError] = useState<string | null>(null);
  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>();
  const [createTxHash, setCreateTxHash] = useState<Hash | undefined>();

  const { isSuccess: isApproved } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isSuccess: isCreated, data: receipt } = useWaitForTransactionReceipt({ hash: createTxHash });

  const handleStartCreationProcess = async () => {
    setError(null);
    if (!castUrl || !rewardPerShare || !totalBudget || !address) {
      setError("Please fill all fields and connect your wallet.");
      return;
    }
    if (Number(rewardPerShare) > Number(totalBudget)) {
        setError("Reward per share cannot be greater than the total budget.");
        return;
    }
    setStep(CreationStep.Approving);
    try {
      const decimals = 18;
      const totalBudgetInWei = parseUnits(totalBudget, decimals);
      const hash = await writeContractAsync({
        address: CHESS_TOKEN_ADDRESS, abi: CHESS_TOKEN_ABI, functionName: 'approve',
        args: [PROMO_CONTRACT_ADDRESS, totalBudgetInWei],
      });
      setApproveTxHash(hash);
    } catch (err: any) {
      console.error("Approval failed:", err);
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
          const hash = await writeContractAsync({
            address: PROMO_CONTRACT_ADDRESS, abi: PROMO_CONTRACT_ABI, functionName: 'createCampaign',
            args: [castUrl, rewardPerShareInWei, totalBudgetInWei],
          });
          setCreateTxHash(hash);
        } catch (err: any) {
          console.error("Creation failed:", err);
          setError(err.shortMessage || "Creation transaction failed.");
          setStep(CreationStep.Idle);
        }
      }
    };
    createCampaignOnChain();
  }, [isApproved, step, address, castUrl, rewardPerShare, totalBudget, writeContractAsync]);
  
  useEffect(() => {
    const saveToDb = async () => {
      if (isCreated && step === CreationStep.Creating && receipt) {
        setStep(CreationStep.Saving);
        try {
          // A 'CampaignCreated' esemény logjának megkeresése és dekódolása
          const eventLog = receipt.logs.map(log => {
            try {
              return decodeEventLog({ abi: PROMO_CONTRACT_ABI, ...log });
            } catch { return null; }
          }).find(decoded => decoded?.eventName === 'CampaignCreated');

          if (!eventLog || typeof eventLog.args.campaignId !== 'bigint') {
            throw new Error("CampaignCreated event log not found or invalid.");
          }
          
          const contractCampaignId = Number(eventLog.args.campaignId);
          console.log(`Smart contract generated Campaign ID: ${contractCampaignId}`);

          const response = await fetch('/api/promotions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fid: user.fid, username: user.username, displayName: user.displayName,
              castUrl: castUrl, shareText: shareText,
              rewardPerShare: Number(rewardPerShare), totalBudget: Number(totalBudget),
              blockchainHash: createTxHash, status: 'active',
              contractCampaignId: contractCampaignId // Itt adjuk át az új ID-t
            }),
          });
          if (!response.ok) throw new Error('Failed to save to database.');
          
          setStep(CreationStep.Done);
          onSuccess();
        } catch (err: any) {
          console.error("Saving to DB failed:", err);
          setError("On-chain success, but saving to DB failed. Contact support.");
          setStep(CreationStep.Idle);
        }
      }
    };
    saveToDb();
  }, [isCreated, step, receipt, user, castUrl, shareText, rewardPerShare, totalBudget, createTxHash, onSuccess]);

  const getButtonText = () => { /* ... változatlan ... */ };
  
  return (
    <div className="space-y-4">
      {/* ... a JSX rész teljes egészében változatlan ... */}
    </div>
  );
}