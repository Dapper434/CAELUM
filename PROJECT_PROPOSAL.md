# CAELUM Project Proposal

---

## 1. Project Overview

* **Project Name:** CAELUM (*Centralized Agent Environment for Lifesaving and Urgent Mobility*)
* **Focus:** Healthcare logistics and emergency access
* **Team Members & Roles:**
  * **Kevin Ongaro** &mdash; *Team Lead / Full-Stack Software Engineer*  
    **Role:** System Architecture & Orchestration. Drives the multi-agent orchestration pipeline, managing the precise handoff between deterministic Python workers and the Llama 3.1 8B orchestrator, ensuring the strict Pydantic JSON context payload executes without hallucinations.
  * **Antony Maina** &mdash; *Data Scientist*  
    **Role:** Intelligence Layer & Predictive Modeling. Focuses on tuning the Holt-Winters exponential smoothing parameters for the Forecasting Worker and optimizing document chunking and cosine similarity thresholds for the Nemotron RAG Retriever.
  * **Edwin Ngengi** &mdash; *Full-Stack Software Engineer*  
    **Role:** Core Operational Infrastructure & Backend. Implements the Supabase PostgreSQL relational schema, `pgvector` embedding store, Python backend microservices, and hard database state validation logic.
  * **Caren Chemjor** &mdash; *Frontend Lead / Full-Stack Software Engineer*  
    **Role:** User Interface & Real-time Client Systems. Drives the React 18+ component architecture, Tailwind CSS design system, WebSockets for live inventory and alert sync, and the Human Approval Inbox.

---

## 2. Problem Statement

### Template Format
> **Regional hospital transfusion officers and emergency clinical coordinators** experience **preventable blood stockouts during urgent surgeries while nearby hospitals incinerate expiring units** because **inventory data is trapped in isolated facility silos and transfers rely on frantic, 45-minute phone-call chains without real-time logistics or policy visibility.** This makes it difficult for them to **secure compatible donor blood within the critical golden hour of trauma and obstetric emergencies, leading to preventable maternal and accident mortalities.** We want to explore a solution that helps them **proactively predict shortages, deterministically route units approaching expiration, and approve verified emergency transfers in under 5 seconds with absolute clinical trust and zero hallucination risk.**

### Project Statement
Blood is a perishable, non-fungible biological resource (packed red blood cells expire strictly within 35–42 days). In regional healthcare networks across Kenya, blood banking faces a devastating logistics paradox: Level 4 sub-county hospitals routinely face acute shortages of O-negative or B-positive blood during postpartum hemorrhages and road trauma cases, while a Level 5 facility just 35 km away incinerates viable units whose calendar expiration elapsed without local surgical demand. 

Currently, inter-hospital coordination relies on manual telephone calls, fragmented messaging groups, and reactive panic. Stressed laboratory officers must juggle clinical matching, transit refrigeration rules (2°C–6°C cold chain), and administrative hospital policies under intense time pressure. CAELUM replaces this broken status quo with an intelligent, human-supervised multi-agent logistics platform that unifies inventory visibility, predicts stockouts before they happen, and coordinates safe transfers between facilities.

---

## 3. Target Users & Community Insights

* **Primary Users:**
  * **Hospital Blood Bank Technologists & Transfusion Officers:** Medical laboratory personnel responsible for logging blood donations, monitoring shelf-life, and packing units for emergency transfusions.
  * **Regional Health Network Coordinators:** Medical administrators responsible for monitoring inter-facility reserves, county quotas, and emergency dispatch corridors.
* **Secondary Users:**
  * **Emergency & Maternity Surgical Teams:** Doctors and nurse anesthetists who urgently need verified, compatible blood products delivered on time.
  * **Emergency Medical Couriers:** Dispatch teams executing temperature-monitored, cold-chain transport between facilities.
* **Key User Needs:**
  * **Immediate Regional Stock Visibility:** Instant, accurate knowledge of available units across nearby facilities sorted by ABO/Rh group and shelf life.
  * **Deterministic Transit & Viability Guarantees:** Absolute certainty that travel times and handling margins will not breach cold-chain safety or unit expiration dates.
  * **Policy Clarity Without Administrative Delay:** Instant cross-referencing against Ministry of Health standard operating procedures (SOPs) and bilateral hospital transfer agreements without consulting paper binders during crises.
  * **Preserved Clinical Agency:** Clinicians must never be replaced by automated algorithms; they require transparent, plain-language reasoning before signing off on any transfer.

---

## 4. Proposed Solution & Key Features

CAELUM is a **Hybrid Multi-Agent Logistics System** that unites predictive statistics, deterministic routing constraints, and a single-shot AI policy evaluator to eliminate blood wastage and collapse emergency transfer coordination time from 45 minutes to under 5 seconds.

* **Core Feature 1 (Demonstrable Prototype): Unified Inventory Ledger & Predictive Shortage Forecasting**  
  A centralized Supabase database providing a real-time, tamper-resistant view of regional blood reserves. A deterministic Python Forecasting Worker uses classical Holt-Winters exponential smoothing on historical draw logs to project facility depletion up to 72 hours in advance, flagging impending shortages before fridges run empty.

* **Core Feature 2: Deterministic Logistics Corridors & Vector Policy Retrieval**  
  When a shortage is detected, a deterministic Logistics Worker calculates pairwise road travel times and enforces hard constraints:
  $$\text{Transit Time} + \text{Handling Margin} < \text{Remaining Shelf Life}$$
  $$\text{Donor Post-Transfer Reserve} \ge 3 \text{ Days of Cover}$$
  Simultaneously, an AI Policy Retriever (powered by NVIDIA Nemotron embeddings and `pgvector`) searches unstructured hospital SOPs to verify bilateral agreements and emergency transfer protocols.

* **Core Feature 3: Single-Shot Orchestration & Human-in-the-Loop (HITL) Approval Inbox**  
  The filtered candidates and policy rules are injected into a strictly typed Pydantic JSON payload evaluated by a Llama 3.1 8B Orchestrator in a single shot. The AI outputs a structured recommendation with clear clinical rationale. A Python hard validator checks chosen unit IDs against database primary keys to eliminate any hallucination risk. The React dashboard presents the clinical coordinator with an actionable **Approval Card** for one-click authorization and courier dispatch.

---

## 5. Role of Technology & AI

* **Why this technology?**  
  * **React 18 & Tailwind CSS:** Delivers an ultra-responsive, zero-latency clinical dashboard suited for high-stress emergency operations rooms.
  * **Supabase (PostgreSQL & pgvector):** Combines ACID-compliant relational tracking of biological unit lot numbers with high-dimensional vector search for hospital policy retrieval in a single secure infrastructure.
  * **Classical Python Statistics (Statsmodels):** Ensures mathematical demand forecasting is auditable, repeatable, and completely transparent, avoiding black-box arithmetic.

* **Role of AI:**  
  AI is intentionally restricted from performing life-critical math or executing autonomous dispatches:
  1. **Zero Mathematical Delegation:** The AI is never asked to calculate distances, subtract shelf lives, or invent unit codes. All hard constraints are computed deterministically by verifiable code before the AI is invoked.
  2. **Qualitative Decision Support:** The AI acts solely as an intelligent synthesizer. It ingests the pre-verified options and policy excerpts to explain the clinical and operational trade-offs in clear, natural language (e.g., explaining why a facility 8 km further away was chosen because the closer hospital would fall below its minimum emergency trauma reserve).
  3. **Strict Human Authority:** The final action is always taken by a human clinical officer. AI eliminates cognitive fatigue and administrative decision paralysis, empowering human healthcare workers to make fast, life-saving choices with confidence.

---

## 6. Trust, Safety, and Data Privacy

* **Source Transparency:** Every transfer recommendation is fully traceable. The UI displays the exact mathematical inputs (distance, remaining shelf-life, donor safety buffer) and cites the specific section of the hospital transfer SOP retrieved from the vector store.
* **Data Minimization & Sovereign AI:** The platform handles zero patient-identifying data. Only anonymized unit serial numbers, blood groups, and facility coordinates are processed. Furthermore, CAELUM is designed for on-premise, air-gapped deployment via containerized microservices (NVIDIA NIM), ensuring complete data sovereignty compliant with the **Kenya Data Protection Act (2019)**. No healthcare metrics leave the local network.
* **Human Oversight & Hard Fail-Safes:** A tripartite verification layer guarantees that if the AI hallucinates an unverified unit ID or returns invalid JSON, the transaction is rejected instantly and the system falls back to the top mathematically verified corridor. The human manager can override, re-route, or reject any proposal at will.

---

## 7. Friday Build Plan & Execution Roadmap

* **Thursday (Orientation, Discovery & Phase 1 Build):**
  * Finalized problem definition, user journey mapping, and the Orchestrator-Worker Multi-Agent architecture.
  * Designed and initialized the Supabase schema (facilities, inventory lots, transfer manifests, and `pgvector` tables).
  * Built the baseline deterministic Python workers (Holt-Winters forecasting and transit constraint calculator).
  * Scaffolded the React 18 frontend with Vite and established the Tailwind design system.

* **Friday Morning (09:00 AM – 11:30 AM) &mdash; Building Phase 2:**
  * **09:00 AM – 10:15 AM:** Integrate the Llama 3.1 8B single-shot orchestrator with strict Pydantic JSON schema output parsing. Implement the Nemotron policy embedding and retrieval pipeline.
  * **10:15 AM – 11:30 AM:** Implement WebSocket live sync between Supabase and the React dashboard. Build out the Shortage Alerts Panel and the Human-in-the-Loop Approval Card with dynamic clinical rationales.

* **Friday Midday (11:30 AM – 12:45 PM) &mdash; Testing & Hard Verification:**
  * **11:30 AM – 12:15 PM:** Execute comprehensive unit tests on deterministic math workers (verifying edge cases: boundary shelf-life, zero-stock donors, and invalid routes).
  * **12:15 PM – 12:45 PM:** Adversarial testing: inject malformed payloads and hallucinated unit IDs into the orchestrator pipeline to confirm the Python Hard Validator blocks 100% of invalid transactions and triggers the deterministic fallback.

* **Friday Afternoon (12:45 PM – 01:30 PM) &mdash; Final Touches & Project Completion:**
  * **12:45 PM – 01:15 PM:** Final UI polish: responsive layout adjustments, transition animations, and courier dispatch confirmation alerts.
  * **01:15 PM – 01:30 PM:** Walk through the screens, and check the repository and demo links.

---

## 8. Potential Limitations & Future Scope

* **Current Limitations:**
  * This version models a regional cluster of up to 10 hospital nodes focusing on packed red blood cells (RBC) and platelets.
  * Travel times are modeled using regional velocity matrices and Haversine distances rather than real-time GPS traffic feeds.
* **Future Roadmap:**
  * **IoT Cold-Chain Telemetry:** Integrating Bluetooth Low Energy (BLE) temperature loggers inside smart transport cooler boxes to trigger automatic route recalculation if temperatures exceed 6°C.
  * **Autonomous Aerial Dispatch:** Connecting CAELUM's dispatch manifest directly to medical drone delivery APIs (e.g., Zipline) for rapid cross-county transport to remote rural clinics.
  * **National Federation:** Interconnecting county blood databases with the Kenya National Blood Transfusion Service (KNBTS) for nationwide inventory balance during national emergencies.
