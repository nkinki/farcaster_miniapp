# Farcaster Miniapp Tracker

🏆 **Farcaster miniapp toplist and statistics**

## ✨ Features

- 📊 **246 miniapps** real-time rankings
- ❤️ **Favorites** saved in localStorage
- 🔄 **Automatic updates** 2x daily
- 📱 **Responsive design** on all devices
- 🎯 **Farcaster Frame** support
- 📈 **24h, 72h, weekly** ranking changes
- 🏷️ **Category-based** browsing
- 📧 **Email notifications** for automatic updates

## 🚀 Technology

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vercel** - Deployment
- **GitHub Actions** - Cron jobs
- **Farcaster Frame SDK** - Miniapp integration
- **Email notifications** - SMTP automation

## 📊 Data Source

- **top_miniapps.json** - Static miniapp data
- **Automatic updates** - 2x daily
- **JSON file storage** - In public folder
- **Real data** - From Farcaster API

## 🔧 Environment Variables

### Optional email notifications
```env
EMAIL_SENDER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_RECIPIENT=recipient@example.com
```

### Farcaster Miniapp category
The application belongs to the **"analytics"** category as it provides data analysis and statistical functions.

## 🎯 Cron Job

- **GitHub Actions** - Daily at 2:00 AM and 2:00 PM UTC
- **Automatic data updates** - In JSON files
- **Simple token** - Using test token

## 📱 Usage

1. **Homepage** - Complete miniapp list
2. **Favorites** - Click the heart
3. **Open** - Direct link to miniapp
4. **Share** - Social media sharing

## 🚀 Deployment

- **Vercel** - Automatic deployment from GitHub
- **GitHub Actions** - Cron job automation
- **Static data** - No API keys needed
- **Farcaster Frame** - Meta tag configuration

## 📚 Documentation

- [Email Setup](EMAIL_SETUP.md) - Email notification setup
- [Automation](AUTOMATION.md) - Automation details
- [Categories](CATEGORIES.md) - Farcaster categories

---

**Last updated:** 2025-01-20 - Farcaster miniapp category and Frame integration
