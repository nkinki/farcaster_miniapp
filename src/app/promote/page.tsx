{`const handleCreateCampaign = async () => {
  if (!castUrl.trim()) {
    await triggerHaptic("error");
    alert("Please enter a cast URL");
    return;
  }

  if (!isAuthenticated) {
    await triggerHaptic("error");
    alert("Please connect your Farcaster account first");
    return;
  }

  if (!isWalletConnected) {
    await triggerHaptic("error");
    alert("Please connect your wallet first");
    return;
  }

  setIsCreating(true);

  try {
    console.log("Creating blockchain campaign with data:", {
      castUrl,
      shareText: shareText || "Share this promotion!",
      rewardPerShare,
      totalBudget,
    });

    // 1. CHESS token approve
    const { write: approve } = useChessToken().approve({
      address: CONTRACTS.FarcasterPromo,
      amount: totalBudget,
    });
    await approve();

    // 2. Create campaign on blockchain
    const { write: create } = useFarcasterPromo().createCampaign({
      args: [castUrl, shareText || "Share this promotion!", rewardPerShare, totalBudget, false],
    });
    const tx = await create();
    const receipt = await tx.wait();
    const campaignId = receipt.events.find((e) => e.event === "CampaignCreated").args.campaignId.toString();

    // 3. Fund campaign (stake to treasury)
    const { write: fund } = useFarcasterPromo().fundCampaign({
      args: [campaignId, totalBudget],
    });
    await fund();

    // 4. Save to Neon DB
    const dbResponse = await fetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fid: currentUser.fid,
        username: currentUser.username,
        display_name: currentUser.displayName,
        cast_url: castUrl,
        share_text: shareText || null,
        reward_per_share: rewardPerShare,
        total_budget: totalBudget,
        shares_count: 0,
        remaining_budget: totalBudget,
        status: "active",
        blockchain_hash: receipt.transactionHash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    if (dbResponse.ok) {
      console.log("Campaign saved to Neon DB successfully!");
      await triggerHaptic("success");
      alert("Campaign created and funded successfully!");
      setCastUrl("");
      setShareText("");
      setShowForm(false);
      fetchPromotions(); // Refresh the list
    } else {
      console.error("Failed to save to Neon DB");
      alert("Campaign created, but failed to save to database.");
    }
  } catch (error) {
    console.error("Error creating campaign:", error);
    alert(\`Error: \${error instanceof Error ? error.message : "Unknown error"}\`);
  } finally {
    setIsCreating(false);
  }
};`}