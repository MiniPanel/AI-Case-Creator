// content.js

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.action !== "startAutomation") return;
  console.log("🚀 HP Automation Started");
  const data = msg.data;

  try {

    // --- PHASE 1: NAVIGATION ---

    // Step 1: Click HPI Search Page
    console.log('Step 1: Clicking HPI Search Page');
    const homepage = [...document.querySelectorAll('span')]
      .find(e => e.textContent.trim() === 'HPI Search Page');
    if (!homepage) throw new Error('HPI Search Page button not found. Make sure you are on the CRM page.');
    realClick(homepage);
    await waitForIdle();

    // Step 2: Customer Information
    console.log('Step 2: Clicking Customer Information');
    const customerInfoMatch = await waitForText('li.panel-link', 'Customer Information', 15000);
    realClick(customerInfoMatch);

    // Wait for the customerInformation panel to become active AND create-new-btn to appear
    // (works whether 0 records or existing records are found — we always click Create New)
    await waitForElement('#customerInformation.active', 15000);
    console.log('Step 3: Clicking Create New (ignoring any existing records)');
    const createNewBtn = await waitForElement('button.create-new-btn', 15000);
    realClick(createNewBtn);
    await waitForIdle();

    // Step 4: Contact
    console.log('Step 4: Clicking Contact');
    const contact = await waitForElement('li.subMenuLiStyle[title="Contact"]', 15000);
    realClick(contact);
    await waitForElement('#FirstName', 15000);
    await waitForIdle();
    console.log("✅ Form loaded. Starting data entry...");

    // --- PHASE 2: CUSTOMER DATA ENTRY ---

    const customerFields = {
      "FirstName":    data.FirstName,
      "LastName":     data.LastName,
      "Email":        data.Email,
      "Country-input":data.Country,
      "PhoneNumber":  data.Phone,
      "AddressLine1": data.Address1,
      "AddressLine2": data.Address2,
      "City":         data.City,
      "Province":     data.State,
      "PostalCode":   data.PostalCode
    };

    for (const [id, value] of Object.entries(customerFields)) {
      if (value) {
        console.log(`Filling ${id}...`);
        await fillFieldRobustly(id, value);
        await sleep(300);
      }
    }

    // --- PHASE 3: SAVE CONTACT & ADD ASSET ---

    console.log("💾 Saving contact...");
    await clickByTextWhenReady("Verify & Save");
    await waitForIdle(20000); // save can be slow

    // Dismiss success checkbox if it appears
    const checkbox = document.querySelector(".ms-Checkbox-checkmark");
    if (checkbox) {
      checkbox.click();
      await waitForIdle();
    }

    console.log("💻 Adding Asset...");
    await clickByTextWhenReady("New Asset");
    await waitForIdle();

    await waitForElementById("company", 15000);
    await fillFieldRobustly("company", data.Serial);
    await sleep(300);

    await clickByTextWhenReady("Search");
    await waitForIdle(15000);

    // Wait for search results to appear before selecting
    await waitForElement('.asset-info-sp_tbl-body .tr', 15000);
    selectLaptop(data.Serial, data.ProductNumber);
    await sleep(500);

    await clickByTextWhenReady("Select");
    await waitForIdle();

    await clickByTextWhenReady("Save");
    await waitForIdle(15000); // asset save can be slow

    // Wait for asset row to appear in the list
    await selectAddedAsset(data.Serial, data.ProductNumber);

    // --- PHASE 4: CREATE CASE ---

    console.log("📝 Creating Case...");
    await clickByTextWhenReady("Create Case");
    await waitForIdle(15000);

    // Wait for subject field to appear
    await waitForElementById("caseObject", 15000);
    const subject = createSubject(data.Country, data.Issue);
    console.log(`Setting subject to: ${subject}`);
    await fillFieldRobustly("caseObject", subject);
    await sleep(300);

    await clickByTextWhenReady("Done");
    await waitForIdle(20000); // final save/redirect

    console.log("✅ Automation Complete!");
    chrome.runtime.sendMessage({ action: "automationDone" });

  } catch (err) {
    console.error("❌ Automation Failed:", err);
    chrome.runtime.sendMessage({ action: "automationError", error: err.message });
  }
});

// ---------- Helpers ----------

// Wait for CRM loading spinners/overlays to disappear, then a short settle delay
async function waitForIdle(timeout = 15000) {
  const spinnerSelectors = [
    '.ms-Spinner',
    '.ms-Overlay',
    '[data-is-focusable="true"][aria-busy="true"]',
    '.pa-loadingSpinner',
    '.blockUI',
    '.loading-indicator'
  ];

  const start = Date.now();

  // First wait for any spinner to appear (brief grace period)
  await sleep(300);

  // Then wait for ALL spinners to be gone
  await new Promise((resolve, reject) => {
    const check = () => {
      const anyVisible = spinnerSelectors.some(sel => {
        const el = document.querySelector(sel);
        return el && el.offsetParent !== null; // visible in DOM
      });

      if (!anyVisible) return resolve();
      if (Date.now() - start > timeout) return reject(new Error('Page took too long to load (spinner timeout)'));
      setTimeout(check, 200);
    };
    check();
  });

  // Small settle delay after spinner disappears
  await sleep(400);
}

// Wait for an element by CSS selector
const waitForElement = (selector, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (Date.now() - start > timeout) return reject(new Error(`Timeout waiting for element: ${selector}`));
      setTimeout(check, 200);
    };
    check();
  });
};

// Wait for an element by ID
const waitForElementById = (id, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const el = document.getElementById(id);
      if (el) return resolve(el);
      if (Date.now() - start > timeout) return reject(new Error(`Timeout waiting for element #${id}`));
      setTimeout(check, 200);
    };
    check();
  });
};

// Wait for an element matching selector whose text matches exactly
const waitForText = (selector, text, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const match = [...document.querySelectorAll(selector)]
        .find(e => e.textContent.trim() === text);
      if (match) return resolve(match);
      if (Date.now() - start > timeout) return reject(new Error(`Timeout waiting for text: "${text}"`));
      setTimeout(check, 200);
    };
    check();
  });
};

// Click a button/span/element by visible text — waits for it to appear first
async function clickByTextWhenReady(text, timeout = 15000) {
  console.log(`🖱️ Waiting to click: "${text}"`);
  const start = Date.now();

  const el = await new Promise((resolve, reject) => {
    const check = () => {
      const candidates = [...document.querySelectorAll("button, span, li, div[role='button']")];
      const target = candidates.find(e => e.innerText && e.innerText.trim() === text);
      if (target) return resolve(target.closest('button') || target);
      if (Date.now() - start > timeout) return reject(new Error(`Timeout waiting to click: "${text}"`));
      setTimeout(check, 200);
    };
    check();
  });

  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  await sleep(200);
  el.click();
  console.log(`✅ Clicked: "${text}"`);
}

const realClick = (el) => {
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(type => {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
  });
};

async function fillFieldRobustly(id, value) {
  const el = document.getElementById(id);
  if (!el) { console.warn(`Element #${id} not found`); return; }

  el.focus();
  await sleep(100);

  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, value);
  } else {
    el.value = value;
  }

  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();
}

function selectLaptop(serial, product) {
  const rows = document.querySelectorAll(".asset-info-sp_tbl-body .tr");
  rows.forEach(r => {
    const sn = r.children[0]?.innerText.trim();
    const pn = r.children[2]?.innerText.trim();
    if (sn === serial && pn === product) r.click();
  });
}

async function selectAddedAsset(serial, product, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const rows = document.querySelectorAll(".hw_tbl-body .trCursorEnable");
    for (const row of rows) {
      const cells = row.querySelectorAll(".td");
      if (cells.length < 3) continue;
      if (cells[1].innerText.trim() === product && cells[2].innerText.trim() === serial) {
        row.click();
        return;
      }
    }
    await sleep(400);
  }
  throw new Error(`Asset row not found for Serial: ${serial}, Product: ${product}`);
}

function createSubject(country, issue) {
  const map = {
    "Australia":   "AU",
    "New Zealand": "NZ",
    "Singapore":   "SG",
    "Malaysia":    "MY",
    "Philippines": "PH",
    "Indonesia":   "ID"
  };
  return `${map[country] || country}/${issue}`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}