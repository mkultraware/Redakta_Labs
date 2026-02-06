# Redakta Labs by Sekura

Passiv OSINT-analys av domäners attackyta. Byggd med Next.js 14, Tailwind CSS och Netlify Functions.

## 🔒 Säkerhet & Integritet

- **Ingen data lagras** – Alla analyser körs i realtid utan caching
- **Cloudflare Turnstile** – Skyddar mot automatiserade anrop
- **Passivt endast** – Endast DNS-uppslag, ingen aktiv scanning

## 🚀 Snabbstart

```bash
# Installera beroenden
npm install

# Starta utvecklingsserver (Turnstile inaktiverat utan env vars)
npm run dev

# Bygg för produktion
npm run build
```

## 🛠️ Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Netlify Functions (stateless)
- **Anti-abuse**: Cloudflare Turnstile
- **Hosting**: Netlify

## 📋 Funktioner

### Attack Surface Quickcheck
- **E-postspoofing-skydd**: Kontrollerar SPF/DMARC (visar aldrig raw-strängar)
- **Svartlistestatus**: DNSBL-kontroll mot kända listor
- **Typosquat-radar**: Genererar ≤15 lookalikes, visar upp till 3 resolvade
- **DNS-översikt**: Presence-only för MX, SPF, DMARC, NS, A/AAAA

### API

```bash
POST /.netlify/functions/quickcheck
Content-Type: application/json

{
  "domain": "exempel.se",
  "turnstileToken": "cf-turnstile-token-here"
}
```

## 🔧 Miljövariabler

| Variabel | Beskrivning |
|----------|-------------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (publik) |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key (backend) |

### Lokal utveckling

Skapa `.env.local`:

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key
```

**OBS**: Utan dessa variabler fungerar appen lokalt men utan captcha-skydd.

## 📁 Projektstruktur

```
redakta-labs/
├── netlify/
│   └── functions/
│       └── quickcheck.ts   # Stateless OSINT-funktion
├── src/
│   ├── app/
│   │   ├── page.tsx        # Landing page + resultat
│   │   ├── layout.tsx      # Root layout
│   │   └── globals.css     # Design system
│   └── components/
│       ├── DomainInput.tsx # Med Turnstile-widget
│       ├── VerdictCard.tsx
│       ├── SkeletonLoader.tsx
│       ├── Header.tsx
│       └── Footer.tsx
├── netlify.toml
└── package.json
```

## 🚀 Deploy till Netlify

1. Pusha till GitHub
2. Koppla repo till Netlify
3. Lägg till miljövariabler i Netlify Dashboard:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
4. Deploy!

## ⚠️ Disclaimer

Passiv OSINT-analys. Resultaten är indikativa och ersätter inte en fullständig säkerhetsrevision.

---

**100% Gratis av [SEKURA.SE](https://sekura.se)**
