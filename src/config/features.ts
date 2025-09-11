// Feature flags for safe rollout of new functionality
// This allows us to enable/disable features without code changes

export const FEATURES = {
  // Comment functionality for promotions
  ENABLE_COMMENTS: process.env.ENABLE_COMMENTS === 'true' || false,
  
  // Enhanced promotion system
  ENABLE_ENHANCED_PROMOTIONS: process.env.ENABLE_ENHANCED_PROMOTIONS === 'true' || false,
  
  // Analytics and tracking
  ENABLE_COMMENT_ANALYTICS: process.env.ENABLE_COMMENT_ANALYTICS === 'true' || false,
  
  // Debug mode
  DEBUG_MODE: process.env.DEBUG_MODE === 'true' || false,
} as const;

// Helper function to check if a feature is enabled
export const isFeatureEnabled = (feature: keyof typeof FEATURES): boolean => {
  return FEATURES[feature];
};

// Helper function to get feature status for debugging
export const getFeatureStatus = () => {
  return {
    comments: FEATURES.ENABLE_COMMENTS,
    enhancedPromotions: FEATURES.ENABLE_ENHANCED_PROMOTIONS,
    commentAnalytics: FEATURES.ENABLE_COMMENT_ANALYTICS,
    debugMode: FEATURES.DEBUG_MODE,
  };
};

// Environment variables documentation
/*
To enable features, set these environment variables:

ENABLE_COMMENTS=true                    # Enable comment functionality
ENABLE_ENHANCED_PROMOTIONS=true        # Enable enhanced promotion system
ENABLE_COMMENT_ANALYTICS=true          # Enable comment analytics
DEBUG_MODE=true                        # Enable debug mode

Example .env.local:
ENABLE_COMMENTS=true
ENABLE_ENHANCED_PROMOTIONS=true
ENABLE_COMMENT_ANALYTICS=false
DEBUG_MODE=false
*/
