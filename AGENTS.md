# AGENTS.md

Docs-only repo (UFPA software engineering coursework 2026.4 — EC01025 Engenharia de Software, Prof. Victor Ferreira, ITEC/UFPA). No code, build, test, lint, or CI.

## File inventory
- `README.md` — product canvas: arm-motor physio adherence, real arm hardware (no simulated data), single flow: wear hardware → guided movements → immediate result + weekly evolution → physio reviews panel.
- `LIMITACOES.md` — currently just "no known limitations"; update if real limits appear.
- `IA.md` — mandatory AI-usage log for the whole semester. Every AI-assisted contribution must append a dated entry: date, tool/model, affected artifact, reason. Append only, never rewrite history.
- `docs/P2_JoyForce_ESQUELETO_HOJE_04-11_com_URL_261104_124621.pdf` — submitted P2 artifact: **ERS (Documento de Requisitos) JoyForce, Esqueleto v0.1, 04/11/2026**. Treat as read-only proof of delivery: never edit, re-export, rename, or replace it. Extract text with `pdftotext -layout <pdf> <out.txt>` when reading.

## Sources of truth
- **Requirements (P2 ERS)** — the PDF in `docs/` is the authority for requirement IDs, thresholds, and acceptance criteria. `README.md` is the authority for product framing (problem, value, users). On conflict, follow the ERS numbers and flag the divergence; do not silently pick one.
- `README.md` — canvas; keep its section structure and pt-BR tone.
- `IA.md` — append-only log. ERS §11 states ChatGPT was used to reorganize P0/P1/P2 content into the skeleton format; confirm that entry exists in `IA.md` before the final delivery.

## Context from the P2 ERS (v0.1, 04/11/2026)
JoyForce = hardware + software for physiotherapists and patients in upper-limb rehabilitation. The device is used during movement exercises and the software records results so sessions can be compared. Central problem: evolution is scattered or perceived only subjectively; JoyForce turns part of it into comparable measures.

- **Team:** Kleberton Miranda; Elioth Almeida; Nikolle Lima; João Augusto Rocha; Bárbara Cecim.
- **Repository:** https://github.com/Eliothluy/joyforce
- **Version plan:** v0.1 skeleton for cross-inspection (04/11/2026) → v0.2 corrections after cross-inspection → v1.0 final P2 delivery (11/11/2026).
- **Stakeholders:** fisioterapeuta (usuário principal), paciente (usuário direto), clínica/centro de reabilitação (afetado/indireto), familiar ou cuidador (afetado, não usa), equipe JoyForce (desenvolvimento/manutenção).
- **ERS single flow:** cadastrar paciente → conectar e calibrar → avaliação inicial → registrar resultados → repetir sessões → comparar evolução.
- **Key glossary terms:** amplitude, avaliação, avaliação inicial, avaliação de acompanhamento, calibração, dispositivo JoyForce, exercício, repetição válida, sessão, zona neutra.

### Requirement IDs and thresholds (do not invent or renumber)
- **RU-01…RU-06** (user requirements, traced to HU-01, HU-02, HU-03, HU-04, HU-06, HU-08). RU-05 and RU-06 are written as "deveria" (should), not mandatory.
- **RF-01 Cadastrar paciente** — inputs: nome, data de nascimento, lesão/diagnóstico, telefone. Validates required fields; requires authenticated physiotherapist; on error nothing is written.
- **RF-02 Confirmar conexão** — shows "Conectado" within **≤ 3 s**, otherwise "Desconectado" and the session is blocked.
- **RF-03 Calibrar** — **3 s** of rest; variation **≤ 50 units inclusive** accepts the reference, above that it is rejected and a new attempt is requested.
- **RF-04 Registrar avaliação inicial** — patient + date + max reach frente, trás, esquerda, direita; exactly one initial evaluation, later ones are "acompanhamento".
- **RF-05 Contar movimentos completos** — counts a repetition when the movement leaves the neutral zone, reaches the threshold, and returns to the neutral zone within **≤ 10 s inclusive**; otherwise it is not counted.
- **RNF-01** p95 **≤ 100 ms** from sample receipt to visual update. **RNF-02** **50 Hz ± 5 Hz** over a 60 s window. **RNF-03** sample loss **≤ 2%** in a continuous 10 min session.
- **HU-01…HU-03** each with criteria **CA1 normal, CA2 exceção, CA3 limite** (e.g. HU-01 limite: exactly 10 digits; HU-02 limite: exactly 3,0 s; HU-03 limite: zero evaluations → "inicial").
- **ERS §7 assumptions:** the JoyForce has a connection mechanism to the computer during the session; initial use is upper-limb exercises performed over a table (the device slides on the table). **Documented change from P1:** HU-02 said connection "sem fio"; Release 1 generalizes it to "conectado ao software" to avoid anticipating the transport technology. New sensors (e.g. force) may come later without changing the single flow.

### Still open in the ERS (do not fill silently)
Sections reserved for v0.2 after cross-inspection: §3 user requirements consolidation, §4.2 decision tables, §4.4 interfaces, §5 use cases, §8 traceability matrix, §9 inspection received. Also unresolved:
- **Passo 3 da oficina (Aula 10)** — not identifiable from the submitted files; the team must confirm which artifact matches one of the five RF.
- **Questions to the client:** can a wired prototype satisfy HU-02 in Release 1? Which clinical metrics are validated first? Which artifact is the Passo 3?
- **Known divergences README × ERS:** README names the patient as main user while the ERS names the fisioterapeuta as "usuário principal"; README describes the patient wearing the hardware on the arm, the ERS describes reach measured by the device sliding on a table. Flag before editing either side.

## Hard scope (do not expand unprompted)
- Arm only. No clinical validation/certification, no auto-diagnosis or prescription, no replacement of the physiotherapist's clinical assessment, no full gamification/social ranking/multiplayer, no predictive AI/prognosis, no EHR/SUS/insurance/billing integration, no native offline mobile app, no full hospital-manager dashboard, no production-grade LGPD/medical certification (basic good practices only).

## Conventions
- Keep edits to Markdown prose (and the existing PDF as-is); do not introduce code scaffolding, manifests, or tooling unless explicitly requested.
- Preserve existing README structure and pt-BR tone; `AGENTS.md` stays in English.
- Never invent IDs, metrics, thresholds, or acceptance criteria. If a value is missing, write "a definir" or leave the ERS placeholder and list it under the open items.
- Weekly/dated prose goes in the order it happened; `IA.md` is append-only.
- Verify with `git status --short` and `git log --oneline -5` before/after doc edits; do not commit unless asked.
