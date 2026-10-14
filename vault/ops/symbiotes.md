# VENOM-RAID Symbiote Intelligence Dossier

**Author:** Jacob Trevino  
**Classification:** Internal Ops / Classified  
**Last Updated:** 2026-10-13  
**Central Host:** VENOM-RAID (`192.168.68.105`)  

---

## 1. Overview

The VENOM-RAID ecosystem hosts three specialized, containerized autonomous symbiote agents guarding server infrastructure, network perimeter, and technical estimating operations. All three agents run locally in Docker on Unraid with GPU acceleration, custom dark/bioluminescent glassmorphism dashboards, and autonomous decision loops.

```
                     ┌─────────────────────────────────────────────────────────────┐
                     │                 VENOM-RAID (192.168.68.105)                 │
                     └──────┬───────────────────────┬───────────────────────┬──────┘
                            │                       │                       │
             ┌──────────────┴──────────────┐ ┌──────┴──────────────┐ ┌──────┴──────────────┐
             │   TOXIN (Port 8001)         │ │  LASHER (Port 8002) │ │   SCORN (Port 8003) │
             │   Plex Media Guardian       │ │  Deco & Android     │ │   AgXcel Estimator  │
             ├─────────────────────────────┤ ├─────────────────────┤ ├─────────────────────┤
             │ • Quadro P2000 (GPU 0)      │ │ • Quadro P2000(GPU1)│ │ • NVIDIA Pair (LLM) │
             │ • Plex API + Tautulli       │ │ • Android ADB 5555  │ │ • Fluid Dynamics    │
             │ • Auto-tune Transcoder      │ │ • Deco BE25 Wi-Fi 7 │ │ • 4,589 Parts Cat.  │
             │ • Client Remediations       │ │ • 13 Ring Sentinels │ │ • Codex Training    │
             │ • Discord / Pushover alerts │ │ • Presence Tracking │ │ • Interactive BOM   │
             └─────────────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

---

## 2. Agent 1: TOXIN (`Agent-Plex-Toxin`)

- **Role:** Plex Media Server Guardian Symbiote
- **Persona:** Patrick Mulligan / Toxin (third-generation symbiote, red/black tendrils, fiercely protective of media quality, hates buffering/stuttering and CPU burn-in).
- **Web UI:** `http://192.168.68.105:8001`
- **Docker Container:** `Agent-Plex-Toxin` (host networking)
- **GitHub Repository (Private):** [Dragonking42/Plex-Assistant-Toxin](https://github.com/Dragonking42/Plex-Assistant-Toxin)
- **Primary Bindings:**
  - **Hardware:** Dedicated NVIDIA Quadro P2000 (GPU 0)
  - **Plex Service:** `http://localhost:32400`
  - **Tautulli Service:** `http://192.168.68.105:8181`
- **Key Capabilities:**
  - Deep stream inspection & transcode reason diagnostics (subtitle burn detection, audio downmixing, resolution scaling).
  - Tautulli client remediation guides (auto-identifying problematic client devices like Roku/FireStick that force transcode burn-in).
  - Autonomous preference adjustment (`AUTO` mode) within strict bounds (throttling buffers, background transcode presets, hardware acceleration).
  - Proactive push notifications via Discord Webhook and Pushover.
  - Emergency Kill Switch reverting all automated changes within 24 hours.

---

## 3. Agent 2: LASHER (`Agent-Deco-Lasher`)

- **Role:** Deco Wi-Fi 7 Mesh, Ring Camera & Android ADB Guardian Symbiote
- **Persona:** Lasher (emerald-tendril Life Foundation symbiote, sensory whips extended across airwaves, tactile ADB touch control).
- **Web UI:** `http://192.168.68.105:8002`
- **Docker Container:** `Agent-Deco-Lasher` (host networking)
- **GitHub Repository (Private):** [Dragonking42/Deco-Assistant-Lasher](https://github.com/Dragonking42/Deco-Assistant-Lasher)
- **Primary Bindings:**
  - **Hardware:** Dedicated NVIDIA Quadro P2000 (GPU 1)
  - **Android ADB Neural Link:** `192.168.68.105:5555` (physical touchscreen automation)
  - **Network Mesh:** TP-Link Deco BE25 Wi-Fi 7 (3 nodes: Dining Room [Main], Laundry Room, Garage, 100% wired 2.5 Gbps backhaul)
  - **Perimeter Sentinels:** 13 Ring security cameras on 2.4 GHz IoT band
- **Key Capabilities:**
  - Real-time Android screen mirroring and remote tap/input execution via ADB.
  - Automated app management (launching, backgrounding, ANR recovery for TP-Link Deco and Ring apps).
  - Host Presence Fence tracking Jake's iPhone 15 Pro (`192.168.68.150` / `c8:6c:3d:0b:7c:76`):
    - When `HOME`: Sentinels stand down.
    - When `AWAY`: Triggers automated full Sentinel Lockdown & arming.
  - Rogue Biomass Hunt: Audits active client connections against `known_clients.json` whitelist; supports one-touch quarantine in the Deco app.
  - VIP QoS Priority Strike: Protects core systems (`VENOM-RAID`, gaming rig, 4K streamers) during bandwidth surges.
  - Persistent autonomy mode (`AUTO-HUNT` vs `SUGGEST`) backed by disk storage.

---

## 4. Agent 3: SCORN (`Agent-Estimator-Scorn`)

- **Role:** AgXcel Estimating Symbiote & Hydraulic Engineering Fabricator
- **Persona:** Scorn (techno-organic symbiote, Carnage bloodline fused with Tanis Nieves' neural prosthetics; feeds on raw inquiries, dealer emails, and equipment specs).
- **Web UI:** `http://192.168.68.105:8003`
- **Docker Container:** `Agent-Estimator-Scorn` (host networking)
- **GitHub Repository (Private):** [Dragonking42/Estimator-Assistant-Scorn](https://github.com/Dragonking42/Estimator-Assistant-Scorn)
- **Primary Bindings:**
  - **Hardware / Inference:** NVIDIA Pair local LLM API (`http://localhost:11434/v1`, `qwen2.5:14b-instruct`)
  - **Storage Array:** `/mnt/user/appdata/scorn-estimator` mapped to `/data`
  - **Master Inventory:** 4,589 authentic AgXcel parts catalog (`parts_db.json`)
  - **Codex Memory:** Verified training estimates directory (`/data/training/`)
- **Key Capabilities:**
  - Neural text inquiry parser converting messy farmer/dealer notes into structured machine parameters.
  - Mathematical fluid dynamics engine ($GPM = (rows \times spacing \times speed \times GPA) / 5940$), specific gravity calculations, 11-color microtubing bands, and 12 orifice disc pressure curves.
  - 13-step authentic Bill of Materials (BOM) assembler.
  - Interactive BOM manipulation: inline part number editing with catalog auto-query, quantity and price adjustment, custom line item insertion, and real-time total recalculation.
  - Codex Training & Few-Shot Learning: One-click assimilation of verified and user-manipulated estimates into persistent memory to train the local LLM.

---

## 5. Operational Runbook

| Action | Target | Command / Endpoint |
| :--- | :--- | :--- |
| Check Toxin State | VENOM-RAID | `curl -s http://127.0.0.1:8001/api/state` |
| Check Lasher State | VENOM-RAID | `curl -s http://127.0.0.1:8002/api/state` |
| Check Scorn Vitals | VENOM-RAID | `curl -s http://127.0.0.1:8003/vitals` |
| Restart Toxin | VENOM-RAID | `docker restart Agent-Plex-Toxin` |
| Restart Lasher | VENOM-RAID | `docker restart Agent-Deco-Lasher` |
| Restart Scorn | VENOM-RAID | `docker restart Agent-Estimator-Scorn` |
| View Android Screen | VENOM-RAID | `http://192.168.68.105:8002/api/screen` |
| Toggle Toxin Autonomy | Toxin UI | `POST /mode` (`auto` / `suggest`) |
| Toggle Lasher Autonomy| Lasher UI | `POST /mode` (`auto` / `suggest`) |
| Export AgXcel Parts CSV| Scorn UI | `GET /api/inventory/export` |
