import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://farc-nu.vercel.app';

    // Minden Diamond VIP NFT ugyanazt a prémium képet és leírást kapja
    const metadata = {
        name: `Diamond VIP #${id}`,
        description: "The elite Diamond VIP Membership for the AppRank ecosystem. Holders receive 2x seasonal points, daily $CHESS bundles, and exclusive access to the high-stakes Lambo Lotto.",
        image: `${baseUrl}/diamond-vip.png`,
        external_url: `${baseUrl}/promote`,
        attributes: [
            {
                trait_type: "Membership Level",
                value: "Diamond"
            },
            {
                trait_type: "Daily Reward",
                value: "300,000 $CHESS Bundle"
            },
            {
                trait_type: "Points Multiplier",
                value: "2x"
            }
        ]
    };

    return NextResponse.json(metadata);
}
