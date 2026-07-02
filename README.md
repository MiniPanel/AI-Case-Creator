# AI Case Creator

> An AI-powered Chrome extension that automates CRM case creation by combining a locally hosted Large Language Model (LLM) with browser automation.

---

## Overview

AI Case Creator was developed to eliminate the repetitive and time-consuming process of manually creating customer support cases.

The extension uses a locally hosted **Qwen2.5 Large Language Model** running through **Ollama** to transform raw customer conversations into structured case information. The processed data is then automatically entered into the appropriate CRM fields using browser automation.

By combining AI-powered information extraction with deterministic automation, the extension significantly reduces manual effort while ensuring consistency in case documentation.

---

## Problem Statement

Creating customer support cases involves manually reviewing customer conversations, extracting relevant information, and entering it into multiple CRM fields.

For support engineers handling numerous customer interactions daily, this process becomes repetitive and time-consuming.

The manual workflow typically includes:

- Reading the complete customer conversation
- Identifying relevant customer information
- Summarizing the issue
- Documenting troubleshooting performed
- Filling multiple CRM fields
- Navigating through the case creation workflow

This process can take approximately **6–7 minutes per case**, reducing the time available to actively assist customers.

---

## Solution

AI Case Creator automates the case creation workflow through two distinct stages.

### Stage 1 – AI-Based Information Extraction

The user simply drags and drops the raw customer conversation into the extension.

The conversation is processed locally using **Qwen2.5** through **Ollama**, where carefully designed prompts extract only the information required for case creation.

The AI converts unstructured text into structured data including:

- Customer information
- Product details
- Problem description
- Troubleshooting performed
- Resolution summary
- Required case notes

The purpose of AI is **not to automate browser interactions**, but to intelligently clean, organize, and structure customer data for downstream automation.

---

### Stage 2 – Browser Automation

Once structured data is generated, JavaScript handles the remaining workflow.

The extension automatically:

- Maps extracted values to CRM fields
- Populates the required forms
- Navigates through the case creation process
- Performs repetitive UI interactions
- Completes the majority of manual data entry

This separation ensures that AI is responsible for understanding the conversation, while deterministic automation performs the repetitive browser actions.

---

## Features

- AI-assisted case creation
- Local LLM integration (Ollama + Qwen2.5)
- Prompt engineering for structured output
- Drag-and-drop customer conversation input
- Automatic CRM form population
- Browser workflow automation
- Structured JSON-based data handling
- Privacy-friendly local AI processing

---

## Technology Stack

- JavaScript
- HTML
- CSS
- Chrome Extension APIs
- Ollama
- Qwen2.5
- JSON

---

## Workflow

1. User opens the extension.
2. Raw customer conversation is dragged into the input box.
3. Qwen2.5 processes the conversation locally via Ollama.
4. The LLM extracts and structures the required information.
5. JavaScript maps the structured data to CRM fields.
6. Browser automation completes repetitive form filling and navigation.
7. The support engineer reviews the generated information before final submission.

---

## Impact

- Reduced average case creation time from **6–7 minutes to approximately 1 minute**.
- Eliminated repetitive manual data entry.
- Improved consistency of customer case documentation.
- Increased time available for customer interaction.
- Streamlined a repetitive workflow without replacing human decision-making.

---

## Future Enhancements

- Support for multiple CRM platforms
- Configurable prompt templates
- Function-calling support for modern LLMs
- Multi-language conversation parsing
- AI-assisted troubleshooting recommendations
- Retrieval-Augmented Generation (RAG) for knowledge base integration

---

## Disclaimer

This project was developed independently as a productivity and workflow automation tool for learning and process improvement. It is not affiliated with or endorsed by HP Inc., Microsoft, or Ollama. The project does not expose, transmit, or store proprietary customer information, and all AI processing is performed locally using a self-hosted language model.
