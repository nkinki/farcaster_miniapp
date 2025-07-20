# Farcaster Miniapp Categories

## What is a category?

Farcaster miniapp categories help users find applications that suit their needs. Categories can be set using meta tags.

## Available Categories

The Farcaster miniapp system supports the following categories:

### 🎮 Gaming
- Games and entertainment applications
- Example: `content="gaming"`

### 📊 Analytics
- Data analysis and statistics
- Example: `content="analytics"` (we use this)

### 🛒 Commerce
- E-commerce and shopping
- Example: `content="commerce"`

### 🎨 Creative
- Artistic and creative applications
- Example: `content="creative"`

### 📱 Social
- Social media and communication
- Example: `content="social"`

### 🛠️ Utility
- Useful tools and utilities
- Example: `content="utility"`

### 🎓 Education
- Educational and learning applications
- Example: `content="education"`

### 💰 Finance
- Financial and investment applications
- Example: `content="finance"`

### 🏥 Health
- Healthcare and wellness applications
- Example: `content="health"`

### 🏠 Lifestyle
- Lifestyle and personal development
- Example: `content="lifestyle"`

## How to set up a category?

### 1. Meta tag setup

In the `src/app/layout.tsx` file:

```tsx
<head>
  <meta name="farcaster:category" content="analytics" />
</head>
```

### 2. Frame meta tag

```tsx
export const metadata: Metadata = {
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: "https://your-domain.com/og-image.png",
      buttons: [
        {
          label: "🏆 View Rankings",
          action: "post",
        },
      ],
      postUrl: "https://your-domain.com/api/frame",
    }),
  },
};
```

### 3. Miniapp meta tags

```tsx
<head>
  <meta name="farcaster:app" content="miniapp" />
  <meta name="farcaster:category" content="analytics" />
  <meta name="farcaster:title" content="🏆 Miniapps Rankings" />
  <meta name="farcaster:description" content="Farcaster miniapp toplist and statistics" />
  <meta name="farcaster:image" content="https://your-domain.com/og-image.png" />
  <meta name="farcaster:url" content="https://your-domain.com" />
</head>
```

## Why "analytics" category?

Our application belongs to the "analytics" category because:

1. **Data Analysis**: Displays real-time miniapp rankings and statistics
2. **Metrics**: Tracks 24h, 72h and weekly changes
3. **Category Analysis**: Analyzes and ranks miniapp categories
4. **Trend Analysis**: Identifies rising and falling applications

## Changing category

If you want to use a different category, simply modify the `content` value:

```tsx
<meta name="farcaster:category" content="utility" />
```

## Testing

You can test the category setup in the Farcaster Miniapp Debug Tool:

1. Open the [Farcaster Miniapp Debug Tool](https://warpcast.com/~/developers/frames)
2. Enter your app URL
3. Check the meta tags
4. Test the Frame functionality

## Additional Information

- [Farcaster Miniapp Documentation](https://docs.farcaster.xyz/miniapps)
- [Frame SDK Documentation](https://docs.farcaster.xyz/frames)
- [Meta Tags Reference](https://docs.farcaster.xyz/miniapps/sharing) 