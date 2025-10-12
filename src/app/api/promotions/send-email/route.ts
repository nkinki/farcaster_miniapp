import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
});

export async function POST(request: NextRequest) {
  try {
    const { promotionId, notificationType = 'new_promotion' } = await request.json();
    
    if (!promotionId) {
      return NextResponse.json({ error: 'Missing promotionId' }, { status: 400 });
    }

    const client = await pool.connect();
    
    try {
      // Promotion részletek lekérése
      const promotionResult = await client.query(`
        SELECT 
          id, fid, username, display_name, cast_url, share_text,
          reward_per_share, total_budget, remaining_budget, status, 
          action_type, created_at
        FROM promotions 
        WHERE id = $1
      `, [promotionId]);
      
      if (promotionResult.rows.length === 0) {
        return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
      }
      
      const promotion = promotionResult.rows[0];
      
      // Miniapp link generálása
      const miniappUrl = `https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank`;
      const promotionUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://farc-nu.vercel.app'}/promote`;
      
      // Email tárgy
      const emailSubject = `🚀 New Promotion: @${promotion.username} - ${promotion.reward_per_share} CHESS per ${promotion.action_type}`;
      
      // Email HTML tartalom
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1f2e; color: #ffffff; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #a64d79, #8e44ad); padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">🚀 New Promotion Created!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">APPRANK - Farcaster Promotion Platform</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <!-- Promotion Details -->
            <div style="background: #23283a; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #a64d79;">
              <h2 style="margin: 0 0 15px 0; color: #a64d79; font-size: 18px;">📊 Promotion Details</h2>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                  <strong style="color: #a64d79;">Creator:</strong><br>
                  <span style="color: #ffffff;">@${promotion.username}</span>
                </div>
                <div>
                  <strong style="color: #a64d79;">Action Type:</strong><br>
                  <span style="color: #ffffff; text-transform: capitalize;">${promotion.action_type}</span>
                </div>
                <div>
                  <strong style="color: #a64d79;">Reward per Action:</strong><br>
                  <span style="color: #4ade80; font-weight: bold;">${promotion.reward_per_share} CHESS</span>
                </div>
                <div>
                  <strong style="color: #a64d79;">Total Budget:</strong><br>
                  <span style="color: #4ade80; font-weight: bold;">${promotion.total_budget} CHESS</span>
                </div>
              </div>
              
              ${promotion.share_text ? `
                <div style="margin-top: 15px;">
                  <strong style="color: #a64d79;">Message:</strong><br>
                  <div style="background: #1a1f2e; padding: 10px; border-radius: 6px; margin-top: 5px; font-style: italic;">
                    "${promotion.share_text}"
                  </div>
                </div>
              ` : ''}
              
              <div style="margin-top: 15px;">
                <strong style="color: #a64d79;">Cast URL:</strong><br>
                <a href="${promotion.cast_url}" style="color: #60a5fa; text-decoration: none; word-break: break-all;">
                  ${promotion.cast_url}
                </a>
              </div>
            </div>
            
            <!-- Action Buttons -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${promotionUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #a64d79, #8e44ad); 
                        color: white; padding: 15px 30px; text-decoration: none; 
                        border-radius: 8px; font-weight: bold; margin: 0 10px;">
                🎯 View Promotion
              </a>
              <a href="${miniappUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #4ade80, #22c55e); 
                        color: white; padding: 15px 30px; text-decoration: none; 
                        border-radius: 8px; font-weight: bold; margin: 0 10px;">
                📱 Open Miniapp
              </a>
            </div>
            
            <!-- Farcaster Post Template -->
            <div style="background: #1a1f2e; border-radius: 8px; padding: 20px; margin-top: 20px; border: 1px solid #374151;">
              <h3 style="margin: 0 0 15px 0; color: #a64d79; font-size: 16px;">📱 Farcaster Post Template</h3>
              <div style="background: #0f172a; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 14px; line-height: 1.4; white-space: pre-wrap; color: #e2e8f0;">
🚀 NEW PROMOTION ALERT! 🚀

@${promotion.username} just created a new ${promotion.action_type} promotion!

💰 Reward: ${promotion.reward_per_share} CHESS per ${promotion.action_type}
📊 Budget: ${promotion.total_budget} CHESS
${promotion.share_text ? `💬 Message: "${promotion.share_text}"` : ''}

🎯 Join the promotion:
${promotionUrl}

📱 Or open in Farcaster:
${miniappUrl}

#APPRANK #Farcaster #Promotion #CHESS
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #374151; color: #9ca3af; font-size: 12px;">
              <p>This is an automated notification from APPRANK</p>
              <p>Created: ${new Date(promotion.created_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      `;
      
      // Email küldése
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://farc-nu.vercel.app'}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: emailSubject,
          html: emailHtml
        })
      });
      
      if (emailResponse.ok) {
        console.log(`✅ Promotion email sent for promotion ${promotionId}`);
      } else {
        console.log(`⚠️ Failed to send promotion email for promotion ${promotionId}`);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Promotion email sent successfully',
        promotion: {
          id: promotion.id,
          username: promotion.username,
          actionType: promotion.action_type,
          rewardPerShare: promotion.reward_per_share,
          totalBudget: promotion.total_budget
        },
        miniappUrl,
        promotionUrl,
        emailSubject
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error sending promotion email:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send promotion email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
