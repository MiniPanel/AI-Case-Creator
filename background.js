// Relay messages from content script back to popup and inject banner
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.action === "automationDone" || msg.action === "automationError") {

    // Broadcast to popup (it may be closed, ignore errors)
    chrome.runtime.sendMessage(msg).catch(() => {});

    // Inject alert banner into the same CRM tab
    if (sender.tab?.id) {
      const isSuccess = msg.action === "automationDone";
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        func: injectBanner,
        args: [isSuccess, msg.error || null]
      });
    }
    return;
  }

  // Handle Ollama fetch from popup (runs locally, no data leaves your PC)
  if (msg.action === "ollamaRequest") {
    fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5:7b",
        prompt: msg.prompt,
        stream: false
      })
    })
    .then(r => {
      if (!r.ok) throw new Error(`Ollama returned status ${r.status}`);
      return r.json();
    })
    .then(data => sendResponse({ ok: true, response: data.response }))
    .catch(err => sendResponse({ ok: false, error: err.message || "Could not reach Ollama. Is it running?" }));

    return true; // keeps the message channel open for the async response
  }

});


// Injected into the original tab to show the notification banner
function injectBanner(isSuccess, errorMsg) {

  // Remove existing banner if any
  document.getElementById("hp-auto-banner")?.remove();

  const banner = document.createElement("div");
  banner.id = "hp-auto-banner";

  Object.assign(banner.style, {
    position:     "fixed",
    top:          "20px",
    right:        "20px",
    zIndex:       "2147483647",
    padding:      "14px 18px",
    borderRadius: "10px",
    fontFamily:   "'Segoe UI', system-ui, sans-serif",
    fontSize:     "13px",
    fontWeight:   "500",
    color:        "#fff",
    background:   isSuccess
                    ? "linear-gradient(135deg, #0096d6, #0057a8)"
                    : "linear-gradient(135deg, #e05c5c, #9b2020)",
    boxShadow:    "0 4px 20px rgba(0,0,0,0.3)",
    minWidth:     "260px",
    maxWidth:     "360px",
    lineHeight:   "1.4",
    cursor:       "pointer",
    transition:   "opacity 0.4s"
  });

  banner.innerHTML = isSuccess
    ? `<strong>✓ HP Case Created</strong><br><span style="opacity:0.8;font-size:11px">Automation completed successfully.</span>`
    : `<strong>✗ Automation Failed</strong><br><span style="opacity:0.8;font-size:11px">${errorMsg || "Check the CRM and try again."}</span>`;

  // Click to dismiss
  banner.addEventListener("click", () => {
    banner.style.opacity = "0";
    setTimeout(() => banner.remove(), 400);
  });

  document.body.appendChild(banner);

  // Auto-dismiss after 8 seconds
  setTimeout(() => {
    if (banner.isConnected) {
      banner.style.opacity = "0";
      setTimeout(() => banner.remove(), 400);
    }
  }, 8000);

}
