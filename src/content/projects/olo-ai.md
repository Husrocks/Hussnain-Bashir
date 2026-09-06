---
title: "OLO AI - Intelligent Call Screener & Voice Agent"
slug: "olo-ai"
summary: "Engineered a full-featured telephony engine and outbound calling platform powered by Retell AI and Groq for autonomous sales conversations."
role: "Full-Stack AI Developer"
year: 2026
featured: true
heroImage: "./olo-ai.jpg"
repoUrl: "https://github.com/Husrocks/OLO-AI-"
stack: ["React 19", "Node.js", "Fastify", "PostgreSQL", "Redis", "Retell AI", "Groq", "WebSockets"]
---

## Overview

OLO AI is a modern outbound calling platform built to eliminate wasted agent time and maximize sales efficiency. Evolving from a basic on-premises screener, OLO AI is now a full-featured telephony engine powered by **Retell AI** and **Groq**. 

It operates in two distinct modes:
1. **Screener Mode:** The AI acts as a silent filter. It calls leads, navigates voicemails, and instantly bridges the call to a live agent the exact second a real human answers.
2. **AI Agent Mode:** The AI acts as a fully autonomous sales representative. Armed with a dynamic Knowledge Base, it holds complete conversations and transfers highly qualified leads to human closers.

## Core Capabilities

- **Dual-Mode Dialing Engine:** Seamlessly switches between silent human-detection screening and full AI-driven voice conversations.
- **Groq-Powered Classification:** Real-time post-call transcript analysis using lightning-fast LLMs to extract insights, classify lead intent, and automatically schedule callbacks.
- **Real-Time Agent Alerts:** Built with Socket.io, the backend pushes live "HUMAN DETECTED" alerts directly to the agent's browser to initiate instant call handoffs.
- **Automated Status Rules:** A Redis + BullMQ queueing engine automatically routes leads post-call based on AI classification.
