# Cadre SEO Roadmap

**Erstellt:** 2026-04-09
**Basis:** SEO Audit der Waitlist-Landingpage cadre.run

---

## Kurzfristig (1-2 Wochen)

### 1. Cadre vs. PaperclipCloud Vergleichsseite
- **Route:** `/compare/cadre-vs-paperclipcloud`
- **Target Keyword:** `paperclipcloud alternative`, `cadre vs paperclipcloud`
- **Inhalt:** Feature-by-Feature Vergleich, Pricing, Token-Optimierung (60%), Subscription Support, vertikale Module vs. Vanilla Hosting
- **Referenz:** PaperclipCloud hat bereits eine Vergleichsseite (paperclipcloud.com/compare/paperclipcloud-vs-self-hosting) — Cadre braucht das Gegenstück
- **Schema:** ComparisonPage oder Article mit FAQ

### 2. Cadre vs. Self-Hosting Vergleichsseite
- **Route:** `/compare/cadre-vs-self-hosting`
- **Target Keyword:** `paperclip self host vs managed`, `paperclip deploy guide`
- **Inhalt:** Zeitaufwand, Docker-Komplexität, Security-Hardening, Monitoring, laufende Wartung — alles was Cadre abnimmt
- **Daten aus:** Comparison.astro (Setup Time, Docker/DevOps, Token Optimization etc.)

### 3. Google Search Console einrichten
- Sitemap submitten (https://cadre.run/sitemap-index.xml)
- URL-Inspection für Hauptseite
- Core Web Vitals monitoren
- Index Coverage prüfen

### 4. Organization Schema erweitern
- Eigenes Organization JSON-LD mit:
  - Logo, Name, URL
  - Social Profiles (@runcadre)
  - Founder/Team Info
  - sameAs Links
- In BaseLayout.astro neben SoftwareApplication-Schema

---

## Mittelfristig (1-2 Monate)

### 5. "What is Paperclip" Educational Guide
- **Route:** `/guides/what-is-paperclip`
- **Target Keyword:** `what is paperclip AI`, `paperclip open source`
- **Inhalt:** Erklärung von Paperclip, wie es funktioniert, Architektur, Use Cases — mit natürlichem Verweis auf Cadre als managed Option
- **Warum:** Hoher informationaler Traffic von Leuten die Paperclip entdecken (42k GitHub Stars)
- **Format:** Long-form Guide (2000+ Wörter), mit Diagrammen, Code-Snippets

### 6. Paperclip Hosting Comparison Guide
- **Route:** `/guides/best-paperclip-hosting-2026`
- **Target Keyword:** `best hosting for paperclip 2026`, `paperclip hosting comparison`
- **Inhalt:** Ehrlicher Vergleich aller Optionen (Cadre, PaperclipCloud, Hostinger, Railway, Zeabur, Virtua.Cloud, Self-Host)
- **Referenz:** papercliphosting.ai macht das bereits — Cadre muss besseren Content liefern
- **Format:** Tabelle + Pro/Con + Empfehlungen nach Use Case

### 7. Use-Case Page: Content Agencies
- **Route:** `/use-cases/content-agencies`
- **Target Keyword:** `AI content team agency`, `AI content automation agency`
- **Inhalt:** Wie Agenturen Cadre nutzen um 24/7 Content-Pipelines aufzubauen — Research, Writing, Publishing mit Human-in-the-Loop
- **Teaser für:** Content Module (Phase 2)

### 8. Use-Case Page: German SME / Mittelstand DMS
- **Route:** `/use-cases/dokumentenmanagement-mittelstand`
- **Target Keyword:** `KI Dokumentenmanagement Mittelstand`, `GoBD KI`
- **Sprache:** Deutsch
- **Inhalt:** Wie Cadre GoBD-konformes AI-Dokumentenmanagement ermöglicht — Auto-Tagging, RAG, Compliance
- **Teaser für:** DMS Module (Phase 3)

### 9. Token Optimization Guide
- **Route:** `/guides/paperclip-token-optimization`
- **Target Keyword:** `paperclip token cost`, `reduce AI agent token usage`
- **Inhalt:** Wie Cadres Optimierungs-Engine 60% Tokens spart, technische Erklärung, Vorher/Nachher
- **Differenzierung:** Kein anderer Paperclip-Hoster bietet das

### 10. Weitere Vergleichsseiten
- `/compare/cadre-vs-railway` — Target: `paperclip railway deploy`
- `/compare/cadre-vs-hostinger` — Target: `paperclip hostinger VPS`
- `/compare/cadre-vs-zeabur` — Target: `paperclip zeabur`

### 11. Blog starten
- Pillar-Artikel rund um AI Company, Paperclip Best Practices, Use Cases
- 1-2 Posts pro Woche
- Interne Verlinkung zu Vergleichs- und Use-Case-Seiten

---

## Keyword-Cluster Referenz

**Cluster 1 — Paperclip Hosting (Primary):**
paperclip hosting, managed paperclip, paperclip cloud, paperclip deploy, paperclip VPS, best hosting for paperclip, paperclipcloud alternative

**Cluster 2 — Zero-Human Company:**
zero human company, AI company platform, run AI company, AI agent orchestration

**Cluster 3 — Use Cases (Long-tail):**
AI content team automation, AI agents for content agencies, AI back-office automation SME, AI document management GDPR, paperclip token optimization

**Cluster 4 — Deutsch:**
Paperclip hosten, KI Firma aufbauen, GoBD KI Dokumentenmanagement, KI Automatisierung Mittelstand
