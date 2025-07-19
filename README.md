# Farcaster Miniapp Tracker

🏆 **Farcaster miniapp toplista és statisztikák**

## ✨ Funkciók

- 📊 **246 miniapp** valós idejű rangsora
- ❤️ **Favoritok** mentése localStorage-ban
- 🔄 **Automatikus frissítés** naponta 2x
- 📱 **Reszponzív design** minden eszközön
- 🎯 **Farcaster Frame** támogatás

## 🚀 Technológia

- **Next.js 14** - React framework
- **TypeScript** - Típusbiztonság
- **Tailwind CSS** - Styling
- **Vercel** - Deployment
- **GitHub Actions** - Cron jobs

## 📊 Adatforrás

- **top_miniapps.json** - Statikus miniapp adatok
- **Automatikus frissítés** - Naponta 2x
- **JSON fájl tárolás** - Public mappában
- **Valós adatok** - Farcaster API-ból származó

## 🔧 Környezeti változók

Nincs szükség környezeti változókra - a projekt a `top_miniapps.json` fájlt használja.

## 🎯 Cron Job

- **GitHub Actions** - Naponta 2:00 AM és 2:00 PM UTC
- **Automatikus adatfrissítés** - JSON fájlokban
- **Egyszerű token** - Test token használata

## 📱 Használat

1. **Főoldal** - Teljes miniapp lista
2. **Favoritok** - Kattints a szívre
3. **Megnyitás** - Közvetlen link a miniapp-hoz
4. **Megosztás** - Social media megosztás

## 🚀 Deployment

- **Vercel** - Automatikus deployment GitHub-ról
- **GitHub Actions** - Cron job automation
- **Statikus adatok** - Nincs szükség API kulcsokra

---

**Utolsó frissítés:** 2025-01-19 23:45 UTC - Clean version without demo data or Bearer token dependencies
