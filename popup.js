const fields = ["FirstName","LastName","Email","Phone","Country","Address1","Address2","City","State","PostalCode","Serial","ProductNumber","Issue"];

const statusEl     = document.getElementById("status");
const submitBtn    = document.getElementById("btnSubmit");
const clearBtn     = document.getElementById("btnClear");
const pasteArea    = document.getElementById("pasteArea");
const btnParse     = document.getElementById("btnParse");
const btnPasteClear= document.getElementById("btnPasteClear");
const btnAIParse   = document.getElementById("btnAIParse");
const aiStatus     = document.getElementById("aiStatus");
const aiSpinner    = document.getElementById("aiSpinner");

// ── Country helpers ──────────────────────────────────────────────

const COUNTRY_MAP = {
  "au": "Australia", "aus": "Australia", "australia": "Australia",
  "nz": "New Zealand", "nzl": "New Zealand", "new zealand": "New Zealand",
  "sg": "Singapore", "sin": "Singapore", "singapore": "Singapore",
  "my": "Malaysia", "mys": "Malaysia", "malaysia": "Malaysia",
  "ph": "Philippines", "phl": "Philippines", "philippines": "Philippines",
  "id": "Indonesia", "idn": "Indonesia", "indonesia": "Indonesia"
};

const COUNTRY_CODES = {
  "Australia": "+61", "New Zealand": "+64", "Singapore": "+65",
  "Malaysia": "+60", "Philippines": "+63", "Indonesia": "+62"
};

function normaliseCountry(raw) {
  if (!raw) return "";
  return COUNTRY_MAP[raw.trim().toLowerCase()] || raw.trim();
}

function normalisePhone(phone, country) {
  if (!phone) return "";
  let p = phone.replace(/[\s\-().]/g, "");
  if (p.startsWith("+")) return p;
  const code = COUNTRY_CODES[country] || "";
  if (code) {
    if (p.startsWith("0")) p = p.slice(1);
    return code + p;
  }
  return p;
}

function normaliseEmail(email) {
  if (!email) return "";
  return email.replace(/^mailto:/i, "").replace(/[<>]/g, "").trim();
}

function normaliseIssue(issue) {
  if (!issue) return "";
  const words = issue.trim().split(/\s+/);
  return words.slice(0, 2).join(" ");
}

function parseAddress(raw) {
  if (!raw) return {};
  const parts = raw.split(",").map(p => p.trim());
  const result = { Address1: "", Address2: "", City: "", State: "", PostalCode: "", Country: "" };

  if (parts.length >= 3) {
    result.Address1 = parts[0] || "";
    result.Address2 = parts.length > 3 ? parts[1] : "";
    const cityPart  = parts.length > 3 ? parts[2] : parts[1];
    const lastPart  = parts[parts.length - 1];

    if (COUNTRY_MAP[lastPart.toLowerCase()]) {
      result.Country = normaliseCountry(lastPart);
    }

    const statePostPart = parts[parts.length - (result.Country ? 2 : 1)];
    const statePostMatch = statePostPart?.match(/^([A-Z]{2,3})\s+(\d{4,6})$/);
    if (statePostMatch) {
      result.State      = statePostMatch[1];
      result.PostalCode = statePostMatch[2];
    } else {
      const postcodeMatch = raw.match(/\b(\d{4,6})\b/);
      if (postcodeMatch) result.PostalCode = postcodeMatch[1];
      const stateMatch = raw.match(/\b([A-Z]{2,3})\b/);
      if (stateMatch) result.State = stateMatch[1];
    }

    result.City = cityPart?.replace(/[A-Z]{2,3}\s+\d{4,6}/, "").trim() || "";
  } else {
    result.Address1 = raw;
  }

  return result;
}

// ── Template detector ────────────────────────────────────────────

function isNumberedTemplate(text) {
  return /\b[1-9]\.\s*(device|serial|product|name|phone|email|issue|contact|country)/i.test(text);
}

// ── JS Parser for numbered template ─────────────────────────────

function parseTemplate(text) {
  const result = {};

  const extractors = [
    { key: "deviceName", regex: /\bdevice\s+name\s*:\s*(.+)/i },
    { key: "issue",      regex: /\bissue\s*:\s*(.+)/i },
    { key: "serial",     regex: /\bserial\s+(?:no\.?|number)\s*:\s*(.+)/i },
    { key: "product",    regex: /\bproduct\s+(?:no\.?|number)\s*:\s*(.+)/i },
    { key: "name",       regex: /\bname\s*:\s*(.+)/i },
    { key: "phone",      regex: /\bphone\s+(?:no\.?|number)\s*:\s*(.+)/i },
    { key: "email",      regex: /\bemail\s*:\s*(.+)/i },
    { key: "address",    regex: /\bcontact\s+address\s*:\s*(.+)/i },
    { key: "country",    regex: /\bcountry\s+of\s+purchase\s*:\s*(.+)/i },
  ];

  const lines = text.split("\n").map(l => l.replace(/^\s*\d+\.\s*/, "").trim());
  const cleaned = lines.join("\n");

  extractors.forEach(({ key, regex }) => {
    const match = cleaned.match(regex);
    if (match) result[key] = match[1].trim();
  });

  const country = normaliseCountry(result.country || "");
  const nameParts = (result.name || "").trim().split(/\s+/);
  const firstName = nameParts.slice(0, -1).join(" ") || nameParts[0] || "";
  const lastName  = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "NA";
  const addr = parseAddress(result.address || "");

  return {
    FirstName:     firstName,
    LastName:      lastName,
    Email:         normaliseEmail(result.email || ""),
    Country:       country || addr.Country || "",
    Phone:         normalisePhone(result.phone || "", country),
    Address1:      addr.Address1,
    Address2:      addr.Address2,
    City:          addr.City,
    State:         addr.State,
    PostalCode:    addr.PostalCode,
    Serial:        (result.serial || "").trim(),
    ProductNumber: (result.product || "").trim(),
    Issue:         normaliseIssue(result.issue || "")
  };
}

// ── Fill fields from parsed object ──────────────────────────────

function fillFields(data) {
  let filled = 0;
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (!el) return;
    const val = data[f];
    if (!val || val === "NA") return;
    if (el.tagName === "SELECT") {
      const opt = [...el.options].find(o => o.value.toLowerCase() === val.toLowerCase());
      if (opt) { el.value = opt.value; filled++; }
    } else {
      el.value = val;
      filled++;
    }
  });
  return filled;
}

// ── Fill fields from AI structured text output ───────────────────

function fillFromStructuredText(text) {
  const parsed = {};
  text.split("\n").forEach(line => {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) return;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    if (key && val && val !== "NA") parsed[key] = val;
  });

  // Safety-net cleanups regardless of model output
  if (parsed.Email)   parsed.Email   = normaliseEmail(parsed.Email);
  if (parsed.Country) parsed.Country = normaliseCountry(parsed.Country);
  if (parsed.Issue)   parsed.Issue   = normaliseIssue(parsed.Issue);
  if (parsed.Phone && parsed.Country) {
    parsed.Phone = normalisePhone(parsed.Phone, parsed.Country);
  }

  return fillFields(parsed);
}

// ── Restore saved form values on open ───────────────────────────

chrome.storage.local.get("formData", ({ formData }) => {
  if (!formData) return;
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el && formData[f]) el.value = formData[f];
  });
});

// ── Auto-detect on paste ─────────────────────────────────────────

pasteArea.addEventListener("paste", (e) => {
  setTimeout(() => {
    const text = pasteArea.value;
    if (isNumberedTemplate(text)) {
      const data   = parseTemplate(text);
      const filled = fillFields(data);
      setStatus(`⚡ Auto-parsed ${filled} fields — review and submit.`, "done");
    }
  }, 50);
});

// ── Parse button ─────────────────────────────────────────────────

btnParse.addEventListener("click", () => {
  const text = pasteArea.value.trim();
  if (!text) { setStatus("Paste some data first.", "error"); return; }

  if (isNumberedTemplate(text)) {
    const data   = parseTemplate(text);
    const filled = fillFields(data);
    setStatus(`⚡ Parsed ${filled} fields instantly — review and submit.`, "done");
  } else {
    const filled = fillFromStructuredText(text);
    if (filled > 0) {
      setStatus(`Parsed ${filled} field${filled > 1 ? "s" : ""} — review and submit.`, "done");
    } else {
      setStatus("Format not recognised. Try AI Parse for freeform text.", "error");
    }
  }
});

// ── Clear paste area ─────────────────────────────────────────────

btnPasteClear.addEventListener("click", () => {
  pasteArea.value = "";
  setAiStatus("", "");
});

// ── Clear all ────────────────────────────────────────────────────

clearBtn.addEventListener("click", () => {
  pasteArea.value = "";
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = "";
  });
  chrome.storage.local.remove("formData");
  setStatus("", "");
  setAiStatus("", "");
});

// ── AI Parse button — always sends to Ollama ─────────────────────

btnAIParse.addEventListener("click", async () => {
  const rawText = pasteArea.value.trim();
  if (!rawText) { setAiStatus("Paste some raw data first.", "error"); return; }

  setAiStatus("Sending to AI…", "");
  aiSpinner.classList.add("active");
  btnAIParse.disabled = true;

  const AI_PROMPT = `Convert the given details into the format below with the specified labels.
Rules:
* Keep the issue short (maximum 2 words), e.g., "WiFi Issue", "Boot Issue", "Keyboard Issue".
* Split the full name into FirstName and LastName. Include middle names as part of FirstName unless it is clear they belong to the surname.
* For phone numbers, add the appropriate country code with a leading "+" based on the country provided. Remove spaces, brackets, and dashes.
* Extract the email address from any format (including "mailto:") and output only the plain email address, no angle brackets.
* Parse the address into Address1, Address2, City, State, PostalCode, and Country.
* If a postal code, city, state, or country can be confidently determined from the address, populate the corresponding fields.
* Do not invent specific street numbers or apartment details that are not provided.
* If any field cannot be determined, output "NA". Every field must have a value.
* Output all values as plain text only. No Markdown, no code blocks, no explanation.
* Output ONLY the 13 fields below, nothing else.
* Country must be one of: Australia, New Zealand, Singapore, Malaysia, Philippines, Indonesia.
* Preserve serial numbers and product numbers exactly as provided.

Output ONLY these 13 lines:
FirstName:
LastName:
Email:
Country:
Phone:
Address1:
Address2:
City:
State:
PostalCode:
Serial:
ProductNumber:
Issue:

Raw data:
${rawText}`;

  try {
    const result = await chrome.runtime.sendMessage({ action: "ollamaRequest", prompt: AI_PROMPT });
    if (!result || !result.ok) throw new Error(result?.error || "No response from Ollama.");
    const text = result.response || "";
    if (!text.trim()) throw new Error("Empty response from AI.");
    const filled = fillFromStructuredText(text);
    setAiStatus(`✦ AI filled ${filled} field${filled !== 1 ? "s" : ""} — review and submit.`, "done");
  } catch (err) {
    console.error("AI Parse error:", err);
    setAiStatus("✗ " + (err.message || "AI parse failed. Is Ollama running?"), "error");
  } finally {
    aiSpinner.classList.remove("active");
    btnAIParse.disabled = false;
  }
});

// ── Submit ───────────────────────────────────────────────────────

submitBtn.addEventListener("click", async () => {
  const data = {};
  fields.forEach(f => {
    const el = document.getElementById(f);
    data[f] = el ? el.value.trim() : "";
  });

  if (!data.FirstName || !data.LastName || !data.Email || !data.Serial || !data.Country) {
    setStatus("Fill in First Name, Last Name, Email, Country and Serial Number.", "error");
    return;
  }

  chrome.storage.local.set({ formData: data });
  await chrome.storage.local.set({ caseData: data, caseStatus: "pending" });

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.storage.local.set({ originTabId: activeTab.id });

  try {
    await chrome.tabs.sendMessage(activeTab.id, { action: "startAutomation", data });
    setStatus("Automation running on current CRM tab…", "running");
    submitBtn.disabled = true;
  } catch (err) {
    setStatus("✗ Could not reach CRM tab. Make sure you're on the CRM page.", "error");
  }
});

// ── Listen for automation result ─────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "automationDone") {
    setStatus("✓ Case created successfully!", "done");
    submitBtn.disabled = false;
    chrome.storage.local.remove("caseData");
  }
  if (msg.action === "automationError") {
    setStatus("✗ Error: " + (msg.error || "Something went wrong."), "error");
    submitBtn.disabled = false;
  }
});

// ── Status helpers ────────────────────────────────────────────────

function setStatus(text, type) {
  statusEl.textContent = text;
  statusEl.className = "status " + type;
}

function setAiStatus(text, type) {
  aiStatus.textContent = text;
  aiStatus.className = "ai-status" + (text ? " visible" : "") + (type ? " " + type : "");
}