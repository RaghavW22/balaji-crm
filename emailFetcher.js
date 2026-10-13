import 'dotenv/config';
import dns from 'dns';
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import https from 'https';
import http from 'http';
import { parseIndiaMartEmail, DEFAULT_TARGET_SENDER } from './src/utils/indiamartParser.js';

// ----------------------------------------------------------------------
// ⚙️ CONFIGURATION
// ----------------------------------------------------------------------
const SELLER_EMAIL = (process.env.SELLER_EMAIL || process.env.VITE_SELLER_EMAIL || '').trim();
const SELLER_APP_PASSWORD = (process.env.SELLER_APP_PASSWORD || process.env.SELLER_EMAIL_PASSWORD || process.env.VITE_SELLER_PASSWORD || '').trim();

// Allowed Senders List (Includes both buyershelpdesk@indiamart.com and 25128067@pvgcoet.ac.in)
const DEFAULT_ALLOWED_SENDERS = [
  'buyershelpdesk@indiamart.com',
  '25128067@pvgcoet.ac.in'
];

let ALLOWED_SENDERS = [...DEFAULT_ALLOWED_SENDERS];
if (process.env.TARGET_SENDER_EMAIL) {
  const envSenders = process.env.TARGET_SENDER_EMAIL.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  for (const s of envSenders) {
    if (!ALLOWED_SENDERS.includes(s)) ALLOWED_SENDERS.push(s);
  }
}
const TARGET_SENDER = ALLOWED_SENDERS.join(', ');
const IMAP_HOST = process.env.IMAP_HOST || 'imap.gmail.com';
const IMAP_PORT = parseInt(process.env.IMAP_PORT || '993', 10);
const POLL_INTERVAL_SECONDS = parseInt(process.env.POLL_INTERVAL_SECONDS || '15', 10);

// Auto Email Reply Settings
const AUTO_REPLY_ENABLED = (process.env.AUTO_REPLY_EMAIL_ENABLED || 'true').trim().toLowerCase() === 'true';
const SMTP_HOST = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_FROM_NAME = (process.env.SMTP_FROM_NAME || 'Balaji Enterprises').trim();
const GOOGLE_SCRIPT_WEBHOOK_URL = (process.env.GOOGLE_SCRIPT_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbzy0XG4GVI6jgPv_IO7DAUI5oTEEQ9RhL38vT8JmNLSa6Gxtk6NESSkYOJDpqQmxzhE/exec').trim();

// Note: Firebase is NOT initialized in the backend fetcher.
// The Node.js process cannot authenticate as a Firestore user, which would cause
// continuous PERMISSION_DENIED gRPC stream errors. Lead/reply data is shared
// with the frontend via local JSON cache files + the HTTP API on port 5001.

// Terminal ANSI Color Formatting
const c = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
  inverse: '\x1b[7m'
};

const getTs = () => new Date().toLocaleTimeString('en-US', { hour12: false });

console.log(`${c.cyan}${c.bold}`);
console.log(`================================================================================`);
console.log(` 📧 BALAJI CRM - LIVE TERMINAL EMAIL READER & INGESTION ENGINE`);
console.log(`================================================================================${c.reset}`);
console.log(`🎯 ${c.bold}Target Sender Filters${c.reset}: ${c.green}${c.bold}${ALLOWED_SENDERS.join(', ')}${c.reset}`);
console.log(`📡 ${c.bold}IMAP Server Host    ${c.reset} : ${IMAP_HOST}:${IMAP_PORT}`);
console.log(`⏱️  ${c.bold}Polling Frequency   ${c.reset} : Every ${POLL_INTERVAL_SECONDS} seconds`);
console.log(`👤 ${c.bold}Mailbox Account     ${c.reset} : ${SELLER_EMAIL ? `${c.green}${SELLER_EMAIL}${c.reset}` : `${c.yellow}[Not yet configured in .env]${c.reset}`}`);
console.log(`🔒 ${c.bold}Processing Mode     ${c.reset} : ${c.green}Read Each Email Strictly Once (No Demos)${c.reset}`);
console.log(`${c.cyan}================================================================================${c.reset}\n`);

if (!SELLER_EMAIL || !SELLER_APP_PASSWORD) {
  console.log(`${c.yellow}${c.bold}⚠️  ACTION NEEDED TO READ LIVE GMAIL INBOX IN THIS TERMINAL:${c.reset}`);
  console.log(`Configure SELLER_EMAIL and SELLER_APP_PASSWORD in .env.`);
}



import fs from 'fs';

const LEADS_FILE         = './leads_cache.json';
const PROCESSED_UIDS_FILE = './processed_uids.json';
const PRODUCTS_FILE      = './products_cache.json';    // Written by frontend via POST /api/sync-products
const SENT_REPLIES_FILE  = './sent_replies_cache.json'; // Stores all auto-reply emails sent by the backend

// Load or initialize processed UIDs
let processedUids = new Set();
try {
  if (fs.existsSync(PROCESSED_UIDS_FILE)) {
    const raw = fs.readFileSync(PROCESSED_UIDS_FILE, 'utf8');
    processedUids = new Set(JSON.parse(raw || '[]'));
  }
} catch (e) {
  processedUids = new Set();
}

// Helper to save leads locally so the website can immediately access them
function saveLeadToCache(leadData) {
  try {
    let existing = [];
    if (fs.existsSync(LEADS_FILE)) {
      const raw = fs.readFileSync(LEADS_FILE, 'utf8');
      existing = JSON.parse(raw || '[]');
    }
    // Prevent duplicate entries:
    // 1) Same emailUid
    // 2) Same buyer phone AND same product name (prevents duplicate forwards of the exact same inquiry)
    const isDup = existing.some(item => 
      (leadData.emailUid && item.emailUid === leadData.emailUid) ||
      (item.buyer?.phone && leadData.buyer?.phone && 
       item.buyer.phone === leadData.buyer.phone && 
       item.product?.name === leadData.product?.name)
    );
    if (!isDup) {
      existing.unshift(leadData);
      fs.writeFileSync(LEADS_FILE, JSON.stringify(existing, null, 2));
      console.log(`📁 ${c.cyan}Cached lead locally in leads_cache.json for website display (UID: ${leadData.emailUid || 'N/A'})${c.reset}`);
    } else {
      console.log(`ℹ️  Inquiry for "${leadData.product?.name}" from ${leadData.buyer?.name} is already registered. Skipping duplicate.`);
    }
  } catch (err) {
    console.error('Local cache error:', err.message);
  }
}

// Helper to log every sent auto-reply for display in the dashboard
function saveSentReplyToCache(replyData) {
  try {
    let existing = [];
    if (fs.existsSync(SENT_REPLIES_FILE)) {
      const raw = fs.readFileSync(SENT_REPLIES_FILE, 'utf8');
      existing = JSON.parse(raw || '[]');
    }
    existing.unshift(replyData);
    // Keep last 200 sent replies
    if (existing.length > 200) existing = existing.slice(0, 200);
    fs.writeFileSync(SENT_REPLIES_FILE, JSON.stringify(existing, null, 2));
  } catch (_) {}
}

// ----------------------------------------------------------------------
// 📖 Print Full Email Content & Parse in Terminal
// ----------------------------------------------------------------------
async function displayAndProcessEmail(rawBody, senderRaw, subjectRaw, dateRaw, uid = null) {
  const senderClean = (senderRaw || '').trim();
  const subjectClean = (subjectRaw || '(No Subject)').trim();
  const dateClean = dateRaw ? new Date(dateRaw).toLocaleString() : new Date().toLocaleString();

  console.log(`\n${c.magenta}================================================================================${c.reset}`);
  console.log(`[${getTs()}] 📬 ${c.bold}${c.inverse} EMAIL RECEIVED & DISPLAYED IN TERMINAL ${c.reset} ${uid ? `(UID: ${uid})` : ''}`);
  console.log(`${c.magenta}--------------------------------------------------------------------------------${c.reset}`);
  console.log(`${c.bold}FROM   :${c.reset} ${c.yellow}${senderClean}${c.reset}`);
  console.log(`${c.bold}SUBJECT:${c.reset} ${c.white}${c.bold}${subjectClean}${c.reset}`);
  console.log(`${c.bold}DATE   :${c.reset} ${dateClean}`);
  console.log(`${c.cyan}----------------------------- FULL EMAIL MESSAGE BODY --------------------------${c.reset}`);
  console.log(rawBody ? rawBody.trim() : `${c.gray}(Empty message body)${c.reset}`);
  console.log(`${c.cyan}--------------------------------------------------------------------------------${c.reset}`);

  // Check sender against allowed senders list
  const isTargetMatch = ALLOWED_SENDERS.some(sender => 
    senderClean.toLowerCase().includes(sender) || 
    (rawBody || '').toLowerCase().includes(sender)
  );

  if (!isTargetMatch) {
    console.log(`[${getTs()}] ${c.red}⏭️  FILTER VERDICT: SKIPPED (Email is not from ${ALLOWED_SENDERS.join(' or ')})${c.reset}`);
    console.log(`${c.magenta}================================================================================${c.reset}\n`);
    return false;
  }

  console.log(`[${getTs()}] ${c.green}${c.bold}🎯 FILTER VERDICT: MATCH! Sender recognized (${senderClean}). Processing lead...${c.reset}`);

  // Run parser
  const parseResult = parseIndiaMartEmail(rawBody, senderClean, ALLOWED_SENDERS);
  if (!parseResult.success) {
    console.log(`[${getTs()}] ${c.red}❌ Parser Alert: ${parseResult.error}${c.reset}`);
    console.log(`${c.magenta}================================================================================${c.reset}\n`);
    return false;
  }

  const lead = parseResult.data;
  console.log(`\n${c.green}📋 EXTRACTED CRM LEAD INFORMATION:${c.reset}`);
  console.log(`     • ${c.bold}Product Name   :${c.reset} ${c.cyan}${lead.product?.name}${c.reset}`);
  console.log(`     • ${c.bold}Required Qty   :${c.reset} ${lead.product?.quantity || 'N/A'}`);
  console.log(`     • ${c.bold}Buyer Name     :${c.reset} ${lead.buyer?.name || 'Customer'}`);
  console.log(`     • ${c.bold}Company        :${c.reset} ${lead.buyer?.company || 'IndiaMART Buyer'}`);
  console.log(`     • ${c.bold}Mobile Phone   :${c.reset} ${c.green}${lead.buyer?.phone || 'N/A'}${c.reset}`);
  console.log(`     • ${c.bold}Location       :${c.reset} ${lead.buyer?.location?.city}, ${lead.buyer?.location?.state}`);
  console.log(`     • ${c.bold}Order Value    :${c.reset} ${lead.product?.orderValue || 'N/A'}`);
  console.log(`     • ${c.bold}Requirement    :${c.reset} ${lead.product?.requirement_details}`);

  console.log(`\n💬 ${c.bold}WhatsApp Bot Status:${c.reset} ${c.green}Auto-reply template & catalog photo ready for ${lead.buyer?.phone}${c.reset}`);

  // 3. ── AUTO EMAIL REPLY ──
  if (AUTO_REPLY_ENABLED) {
    let replyTo = '';
    if (lead.buyer?.email && lead.buyer.email.includes('@')) {
      const isSystemSender = ALLOWED_SENDERS.some(s => lead.buyer.email.toLowerCase() === s.toLowerCase());
      if (!isSystemSender) {
        replyTo = lead.buyer.email;
      }
    }

    if (!replyTo && senderClean.includes('@')) {
      if (!senderClean.toLowerCase().includes('indiamart.com')) {
        replyTo = senderClean.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] || '';
      }
    }

    if (replyTo && !replyTo.toLowerCase().includes('buyershelpdesk@indiamart.com')) {
      await sendAutoReplyEmail(replyTo, lead, subjectClean).catch(err =>
        console.log(`${c.yellow}⚠️  Auto-reply email could not be sent: ${err.message}${c.reset}`)
      );
    } else {
      console.log(`ℹ️  No buyer personal email found to auto-reply to (sender was ${senderClean}). Skipping automated reply.`);
    }
  } else {
    console.log(`ℹ️  Auto email reply is disabled (set AUTO_REPLY_EMAIL_ENABLED=true in .env to enable).`);
  }

  // Cache locally for instant UI sync on website
  saveLeadToCache({
    ...lead,
    subject: subjectClean,
    emailUid: uid,
    receivedAt: dateClean
  });

  console.log(`${c.magenta}================================================================================${c.reset}\n`);
  return true;
}

// ----------------------------------------------------------------------
// 🖼️  Catalog Matcher — matches buyer's enquired products against catalog
// ----------------------------------------------------------------------
async function matchEnquiredProductsToCatalog(enquiredList = [], fallbackProductName = '') {
  try {
    let allProducts = [];

    // Read from local products_cache.json (synced by frontend)
    if (fs.existsSync(PRODUCTS_FILE)) {
      try {
        const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
        const cached = JSON.parse(raw || '[]');
        if (Array.isArray(cached) && cached.length > 0) {
          allProducts = cached;
          console.log(`${c.cyan}📋 Loaded ${allProducts.length} catalog products from products_cache.json${c.reset}`);
        }
      } catch (_) {}
    }

    if (allProducts.length === 0) {
      console.log(`${c.yellow}⚠️  Catalog is empty — sync products from the dashboard first.${c.reset}`);
      return [];
    }

    const normalize = str => (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();

    // Helper: fuzzy match between words (handles 1 char typos, e.g. "disel" vs "diesel")
    const wordsSimilar = (w1, w2) => {
      if (w1 === w2) return true;
      if (w1.length > 3 && w2.length > 3) {
        if (w1.includes(w2) || w2.includes(w1)) return true;
        if (Math.abs(w1.length - w2.length) <= 1) {
          let diff = 0, i = 0, j = 0;
          while (i < w1.length && j < w2.length) {
            if (w1[i] !== w2[j]) {
              diff++;
              if (diff > 1) return false;
              if (w1.length > w2.length) i++;
              else if (w2.length > w1.length) j++;
              else { i++; j++; }
            } else {
              i++; j++;
            }
          }
          return true;
        }
      }
      return false;
    };

    // For each enquired item, find the best matching catalog product
    const matchedCatalogProducts = [];
    const seenIds = new Set();

    for (const enquiredItem of enquiredList) {
      // Strip price and unit suffixes from enquired line for accurate token matching
      // e.g. "Diesel Exhaust Fluid - ₹ 815 / Litre" -> "Diesel Exhaust Fluid"
      let cleanEnquiryName = enquiredItem
        .replace(/[-–—]\s*(?:price\s*:\s*)?(?:₹|rs\.?|\$)?\s*[\d,]+(?:\s*\/\s*[\w\s]+)?/i, '')
        .replace(/(?:price\s*:\s*)?(?:₹|rs\.?|\$)\s*[\d,]+(?:\s*\/\s*[\w\s]+)?/i, '')
        .trim();

      // If cleanEnquiryName was only a price string, fallback to fallbackProductName
      if (!cleanEnquiryName && fallbackProductName) {
        cleanEnquiryName = fallbackProductName;
      }

      const tokens = normalize(cleanEnquiryName || enquiredItem).split(/\s+/).filter(t => t.length > 2);
      if (tokens.length === 0) continue;

      let best = null, bestScore = 0;
      for (const prod of allProducts) {
        const prodNameNorm = normalize(prod.name);
        const prodTokens = prodNameNorm.split(/\s+/).filter(t => t.length > 2);
        const haystack = `${prodNameNorm} ${normalize(prod.specs)} ${normalize(prod.description)}`;

        let score = 0;
        const cleanEnquiryNorm = normalize(cleanEnquiryName);
        if (prodNameNorm === cleanEnquiryNorm) {
          score += 100;
        } else if (prodNameNorm.includes(cleanEnquiryNorm) || cleanEnquiryNorm.includes(prodNameNorm)) {
          score += 50;
        }

        for (const token of tokens) {
          if (prodNameNorm.includes(token)) {
            score += 10;
          } else if (prodTokens.some(pt => wordsSimilar(token, pt))) {
            score += 9;
          } else if (haystack.includes(token)) {
            score += 2;
          }
        }

        if (score > bestScore && score >= 6) {
          bestScore = score;
          best = prod;
        }
      }

      if (best && !seenIds.has(best.id)) {
        seenIds.add(best.id);
        matchedCatalogProducts.push({ catalogProduct: best, enquiredItem: cleanEnquiryName || enquiredItem });
        console.log(`${c.green}✔ Matched "${enquiredItem}" → "${best.name}" (score: ${bestScore})${c.reset}`);
      } else if (!best) {
        console.log(`${c.yellow}✘ No catalog match for: "${enquiredItem}"${c.reset}`);
      }
    }

    console.log(`${c.cyan}📦 ${matchedCatalogProducts.length}/${enquiredList.length} enquired products matched in catalog.${c.reset}`);
    return matchedCatalogProducts;
  } catch (err) {
    console.log(`${c.yellow}⚠️  Catalog match error: ${err.message}${c.reset}`);
    return [];
  }
}

// ----------------------------------------------------------------------
// 📥 Download Image as Buffer — hardened against wsarecv/socket-closed errors
// ----------------------------------------------------------------------
function downloadImageBuffer(imageUrl) {
  return new Promise((resolve) => {
    if (!imageUrl || !imageUrl.startsWith('http')) { resolve(null); return; }
    const protocol = imageUrl.startsWith('https') ? https : http;
    let settled = false;
    const done = (val) => { if (!settled) { settled = true; resolve(val); } };

    let req;
    try {
      req = protocol.get(imageUrl, { timeout: 5000 }, (res) => {
        if (res.statusCode !== 200) { res.resume(); done(null); return; }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const contentType = res.headers['content-type'] || 'image/jpeg';
          done({ buffer: Buffer.concat(chunks), contentType });
        });
        res.on('error', () => done(null));
      });
      req.setTimeout(5000, () => { req.destroy(); done(null); });
      req.on('error', () => {
        if (req && !req.destroyed) req.destroy();
        done(null);
      });
    } catch (_) { done(null); }
  });
}

// ----------------------------------------------------------------------
// 📨 Send one professional product email (called once per matched catalog product)
// ----------------------------------------------------------------------
async function sendProductReplyEmail(transporter, toEmail, buyerName, prod, cidMap, attachmentsForProd, fallbackTransporter = null) {
  // Build inline image rows for this product
  const cids = cidMap[prod.id] || [];
  const imageRowsHtml = cids.length > 0
    ? cids.map(cid =>
        `<tr><td align="center" style="padding:6px 0">
          <img src="cid:${cid}" alt="${prod.name}"
            style="width:100%;max-width:480px;height:auto;border-radius:6px;
                   border:1px solid #e2e8f0;display:block;margin:0 auto" />
        </td></tr>`
      ).join('')
    : (prod.imageUrl
        ? `<tr><td align="center" style="padding:6px 0">
            <img src="${prod.imageUrl}" alt="${prod.name}"
              style="width:100%;max-width:480px;height:auto;border-radius:6px;
                     border:1px solid #e2e8f0;display:block;margin:0 auto" />
          </td></tr>`
        : '');

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${prod.name} — Balaji Enterprises</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;padding:16px 8px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;
         border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.05)">

  <!-- HEADER -->
  <tr>
    <td style="background:#0f172a;padding:18px 22px">
      <div style="font-size:18px;font-weight:700;color:#ffffff;line-height:1.2;letter-spacing:-0.2px">
        Balaji Enterprises
      </div>
      <div style="font-size:12px;color:#94a3b8;margin-top:3px">
        Industrial Products &amp; Services &nbsp;|&nbsp; Nagpur
      </div>
    </td>
  </tr>

  <!-- GREETING -->
  <tr>
    <td style="padding:20px 22px 14px">
      <p style="margin:0 0 10px;font-size:15px;line-height:1.5;color:#0f172a">
        Dear <strong>${buyerName}</strong>,
      </p>
      <p style="margin:0;font-size:14px;color:#475569;line-height:1.6">
        Thank you for your enquiry. We are pleased to share the details of <strong style="color:#0f172a">${prod.name}</strong> from our catalog. Please find the product information below:
      </p>
    </td>
  </tr>

  <!-- PRODUCT IMAGES -->
  ${imageRowsHtml ? `
  <tr>
    <td style="padding:0 22px 14px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${imageRowsHtml}
      </table>
    </td>
  </tr>` : ''}

  <!-- PRODUCT DETAILS TABLE -->
  <tr>
    <td style="padding:0 22px 18px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
        style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;
               font-size:14px;border-collapse:collapse">
        <tr>
          <td colspan="2"
            style="background:#f1f5f9;padding:10px 14px;
                   font-size:13px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0">
            Product Specifications
          </td>
        </tr>
        <tr>
          <td style="padding:10px 14px;background:#f8fafc;color:#64748b;
                     width:36%;border-bottom:1px solid #e2e8f0;
                     vertical-align:top;font-size:13px">
            Product
          </td>
          <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;
                     font-weight:700;color:#0f172a;font-size:14px">
            ${prod.name}
          </td>
        </tr>
        <tr>
          <td style="padding:10px 14px;background:#f8fafc;color:#64748b;
                     border-bottom:1px solid #e2e8f0;vertical-align:top;font-size:13px">
            Price
          </td>
          <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0">
            <span style="font-size:16px;font-weight:700;color:#15803d">${prod.price}</span>
            <span style="font-size:12px;color:#64748b;margin-left:4px">
              ${prod.unit || 'per unit'}
            </span>
          </td>
        </tr>
        ${prod.specs ? `
        <tr>
          <td style="padding:10px 14px;background:#f8fafc;color:#64748b;
                     border-bottom:1px solid #e2e8f0;vertical-align:top;font-size:13px">
            Specifications
          </td>
          <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;
                     color:#334155;line-height:1.5">
            ${prod.specs}
          </td>
        </tr>` : ''}
        ${prod.description ? `
        <tr>
          <td style="padding:10px 14px;background:#f8fafc;color:#64748b;
                     vertical-align:top;font-size:13px">
            Description
          </td>
          <td style="padding:10px 14px;color:#475569;line-height:1.6">
            ${prod.description}
          </td>
        </tr>` : ''}
      </table>
    </td>
  </tr>

  <!-- CLOSING NOTE -->
  <tr>
    <td style="padding:0 22px 18px">
      <p style="margin:0;font-size:14px;color:#475569;line-height:1.6">
        Please feel free to contact us for bulk inquiries, orders, or any questions. We look forward to doing business with you.
      </p>
    </td>
  </tr>

  <!-- SIGNATURE & CONTACT -->
  <tr>
    <td style="padding:0 22px 24px">
      <div style="font-size:14px;line-height:1.6;color:#1e293b;border-top:1px solid #e2e8f0;padding-top:16px">
        <p style="margin:0 0 10px;font-size:14px;color:#64748b">Warm Regards,</p>
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px">
          Balaji Enterprises - 9022015965
        </div>
        <div style="font-size:13px;color:#334155;line-height:1.8;margin-bottom:4px">
          <strong>e.</strong> <a href="mailto:sales.nag2020@gmail.com" style="color:#1d4ed8;text-decoration:none">sales.nag2020@gmail.com</a>
          &nbsp;&nbsp;&nbsp;
          <strong>w.</strong> <a href="http://www.Balajiservices.co.in" target="_blank" style="color:#1d4ed8;text-decoration:none">www.Balajiservices.co.in</a>
        </div>
        <div style="font-size:13px;color:#475569;line-height:1.6">
          <strong>a.</strong> Plot No-U-1, Electronic Zone Square, Beside TCI Fright Godown, MIDC Hingna Nagpur - 440016
        </div>
      </div>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#f1f5f9;padding:10px 22px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:11px;color:#94a3b8">
        Balaji Enterprises &bull; Plot No-U-1, Electronic Zone Square, MIDC Hingna, Nagpur
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const textBody = [
    `Dear ${buyerName},`,
    ``,
    `Thank you for your enquiry. Please find below the details for: ${prod.name}`,
    ``,
    `PRODUCT DETAILS`,
    `  Name  : ${prod.name}`,
    `  Price : ${prod.price} ${prod.unit || 'per unit'}`,
    prod.specs       ? `  Specs : ${prod.specs}` : null,
    prod.description ? `  Info  : ${prod.description}` : null,
    ``,
    `Warm Regards,`,
    `Balaji Enterprises - 9022015965`,
    `e. sales.nag2020@gmail.com   w. www.Balajiservices.co.in`,
    `a. Plot No-U-1, Electronic Zone Square, Beside TCI Fright Godown, MIDC Hingna Nagpur - 440016`
  ].filter(l => l !== null).join('\n');

  // ── Primary Delivery: Google Apps Script HTTPS Webhook (Port 443 — 100% reliable on Render) ──
  if (GOOGLE_SCRIPT_WEBHOOK_URL) {
    try {
      console.log(`${c.cyan}🚀 Sending email via Google Apps Script HTTPS Webhook...${c.reset}`);
      const imagesForWebhook = (attachmentsForProd || []).map(a => ({
        cid: a.cid,
        base64: a.content ? Buffer.from(a.content).toString('base64') : '',
        contentType: a.contentType || 'image/jpeg',
        filename: a.filename || 'product.jpg'
      }));

      const res = await fetch(GOOGLE_SCRIPT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail,
          subject: `${prod.name} — Balaji Enterprises`,
          text: textBody,
          html: htmlBody,
          fromName: SMTP_FROM_NAME,
          images: imagesForWebhook
        })
      });

      const resText = await res.text();
      let resJson = {};
      try { resJson = JSON.parse(resText); } catch (_) {}

      if (res.ok && resJson.success) {
        console.log(`${c.green}✅ Product email sent via Google Apps Script: "${prod.name}" → ${toEmail}${c.reset}`);
        return;
      } else {
        console.log(`${c.yellow}⚠️ Webhook response: ${resText.slice(0, 150)}. Falling back to SMTP...${c.reset}`);
      }
    } catch (whErr) {
      console.log(`${c.yellow}⚠️ Webhook delivery failed (${whErr.message}). Falling back to SMTP...${c.reset}`);
    }
  }

  // ── Fallback Delivery: Direct SMTP (for local dev / environments with unblocked SMTP ports) ──
  const mailOptions = {
    from: `"${SMTP_FROM_NAME}" <${SELLER_EMAIL}>`,
    to: toEmail,
    subject: `${prod.name} — Balaji Enterprises`,
    html: htmlBody,
    text: textBody,
    attachments: attachmentsForProd
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`${c.green}✅ Product email sent via SMTP: "${prod.name}" → ${toEmail}${c.reset}`);
  } catch (primaryErr) {
    console.log(`${c.yellow}⚠️ Primary SMTP failed (${primaryErr.message}). Retrying via fallback...${c.reset}`);
    if (fallbackTransporter) {
      try {
        await fallbackTransporter.sendMail(mailOptions);
        console.log(`${c.green}✅ Product email sent via fallback: "${prod.name}" → ${toEmail}${c.reset}`);
      } catch (fallbackErr) {
        throw new Error(`Primary failed: ${primaryErr.message} | Fallback failed: ${fallbackErr.message}`);
      }
    } else {
      throw primaryErr;
    }
  }
}

// ----------------------------------------------------------------------
// 📨 Outbound SMTP Transporter (Pure IPv4 SSL Port 465)
// ----------------------------------------------------------------------
async function getSmtpTransporters() {
  const cleanPassword = SELLER_APP_PASSWORD.replace(/\s+/g, '');
  const targetHost = (SMTP_HOST || 'smtp.gmail.com').trim();
  const targetPort = SMTP_PORT || 465;

  let ipv4Addresses = [];
  try {
    const res = await dns.promises.lookup(targetHost, { all: true, family: 4 });
    ipv4Addresses = (res || []).map(r => r.address).filter(Boolean);
  } catch (err) {
    console.log(`${c.yellow}⚠️ DNS IPv4 lookup failed (${err.message}). Using hostname direct.${c.reset}`);
  }

  // Passing resolved IPv4 addresses directly forces Nodemailer to bypass its internal
  // random DNS resolver which picks IPv6 and crashes with ENETUNREACH on cloud hosts like Render.
  const primaryHost = ipv4Addresses[0] || targetHost;
  const fallbackHost = ipv4Addresses[1] || ipv4Addresses[0] || targetHost;

  const primary = nodemailer.createTransport({
    host: primaryHost,
    port: targetPort,
    secure: targetPort === 465,
    tls: {
      servername: targetHost,
      rejectUnauthorized: false
    },
    auth: { user: SELLER_EMAIL, pass: cleanPassword },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 35000
  });

  // Fallback: Port 587 STARTTLS (open and unrestricted on Koyeb)
  const fallback = nodemailer.createTransport({
    host: fallbackHost,
    port: 587,
    secure: false,
    tls: {
      servername: targetHost,
      rejectUnauthorized: false
    },
    auth: { user: SELLER_EMAIL, pass: cleanPassword },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 35000
  });

  return { primary, fallback, primaryHost };
}

// ----------------------------------------------------------------------
// 📨 Auto Email Reply — one separate email per matched catalog product
// ----------------------------------------------------------------------
async function sendAutoReplyEmail(toEmail, lead, originalSubject) {
  if (!SELLER_EMAIL || !SELLER_APP_PASSWORD) {
    console.log(`${c.yellow}⚠️  Auto-reply skipped: SELLER_EMAIL / SELLER_APP_PASSWORD not configured in .env${c.reset}`);
    return;
  }

  const { primary: transporter, fallback: fallbackTransporter, primaryHost } = await getSmtpTransporters();
  console.log(`${c.cyan}🔌 Outbound SMTP configured via pure IPv4 (${primaryHost}:${SMTP_PORT || 465})...${c.reset}`);

  const buyerName    = lead.buyer?.name || 'Valued Customer';
  const enquiredList = lead.enquiredProductsList || [];

  if (enquiredList.length === 0) {
    console.log(`${c.yellow}⚠️  No enquired products list found under "Products enquired by the buyer". No emails sent.${c.reset}`);
    return;
  }

  // ── Match buyer's enquired products against seller's catalog ──
  console.log(`${c.cyan}🔍 Matching ${enquiredList.length} enquired product(s) against catalog...${c.reset}`);
  const matches = await matchEnquiredProductsToCatalog(enquiredList, lead.product?.name);

  if (matches.length === 0) {
    console.log(`${c.yellow}⚠️  None of the ${enquiredList.length} enquired products matched the catalog. No emails sent.${c.reset}`);
    return;
  }

  console.log(`${c.green}📬 Sending ${matches.length} separate product email(s) to ${toEmail}...${c.reset}`);

  let sentCount = 0;
  let totalImages = 0;

  for (const { catalogProduct: prod, enquiredItem } of matches) {
    // Collect all image URLs for this product (primary + extraImageUrls)
    const extraUrls = Array.isArray(prod.extraImageUrls)
      ? prod.extraImageUrls.filter(u => u && u.startsWith('http'))
      : (typeof prod.extraImageUrls === 'string'
          ? prod.extraImageUrls.split(/[,\n]+/).map(s => s.trim()).filter(u => u.startsWith('http'))
          : []);
    const allUrls = [...(prod.imageUrl ? [prod.imageUrl] : []), ...extraUrls];

    const attachmentsForProd = [];
    const cidMapForProd = {};
    const cids = [];

    for (let i = 0; i < allUrls.length; i++) {
      const imgData = await downloadImageBuffer(allUrls[i]);
      if (!imgData) continue;
      const ext = imgData.contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const cid = `prod_${prod.id || Math.random().toString(36).slice(2)}_img${i}@crm`;
      attachmentsForProd.push({
        filename: `${(prod.name || 'product').replace(/[^a-z0-9]/gi, '_')}_${i + 1}.${ext}`,
        content: imgData.buffer,
        contentType: imgData.contentType,
        cid
      });
      cids.push(cid);
    }
    if (cids.length > 0) {
      cidMapForProd[prod.id] = cids;
      console.log(`${c.green}🖼️  ${cids.length} image(s) ready for "${prod.name}"${c.reset}`);
    }

    try {
      await sendProductReplyEmail(transporter, toEmail, buyerName, prod, cidMapForProd, attachmentsForProd, fallbackTransporter);
      sentCount++;
      totalImages += attachmentsForProd.length;

      saveSentReplyToCache({
        sentAt: new Date().toISOString(),
        to: toEmail,
        subject: `${prod.name} — Balaji Enterprises`,
        buyerName,
        productName: prod.name,
        matchedProductName: prod.name,
        enquiredItem,
        imageCount: attachmentsForProd.length
      });
    } catch (err) {
      console.log(`${c.yellow}⚠️  Failed to send email for "${prod.name}": ${err.message}${c.reset}`);
    }

    // Delay between individual emails to prevent SMTP throttling
    if (matches.length > 1) await new Promise(r => setTimeout(r, 1200));
  }

  console.log(`${c.green}${c.bold}📧 Done: ${sentCount}/${matches.length} separate product emails sent to ${toEmail}${totalImages > 0 ? ` (${totalImages} image${totalImages > 1 ? 's' : ''} total)` : ''}.${c.reset}`);
}

// ----------------------------------------------------------------------
// 🔄 Live IMAP Inbox Polling Loop
// ----------------------------------------------------------------------
let isPolling = false;

async function pollInbox() {
  if (isPolling) {
    return;
  }
  isPolling = true;

  if (!SELLER_EMAIL || !SELLER_APP_PASSWORD) {
    console.log(`[${getTs()}] ⏳ [LISTENING] Active in terminal. Looking for emails from: ${c.green}${TARGET_SENDER}${c.reset}`);
    console.log(`           ↳ Set SELLER_EMAIL & SELLER_APP_PASSWORD in .env for live IMAP connection.`);
    isPolling = false;
    return;
  }

  const cleanPassword = SELLER_APP_PASSWORD.replace(/\s+/g, '');
  const imapConfig = {
    imap: {
      user: SELLER_EMAIL,
      password: cleanPassword,
      host: IMAP_HOST,
      port: IMAP_PORT,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 12000
    }
  };

  let connection = null;
  try {
    console.log(`[${getTs()}] 🔌 Checking Gmail (${c.cyan}${SELLER_EMAIL}${c.reset})...`);
    connection = await imaps.connect(imapConfig);
    await connection.openBox('INBOX');
    console.log(`[${getTs()}] 🟢 ${c.bold}${c.green}AUTHENTICATED & CONNECTED TO GMAIL!${c.reset}`);
    console.log(`[${getTs()}] 🔍 Scanning inbox for emails from: ${c.bold}${c.cyan}${ALLOWED_SENDERS.join(', ')}${c.reset}...`);

    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false
    };

    let allMessages = [];
    for (const sender of ALLOWED_SENDERS) {
      try {
        const msgs = await connection.search([['HEADER', 'FROM', sender]], fetchOptions);
        allMessages = allMessages.concat(msgs);
      } catch (err) {
        console.warn(`Search for ${sender} notice:`, err.message);
      }
    }

    // Deduplicate messages by UID
    const seenMap = new Map();
    for (const item of allMessages) {
      const uid = item.attributes?.uid;
      if (uid && !seenMap.has(uid)) {
        seenMap.set(uid, item);
      } else if (!uid) {
        seenMap.set(Math.random(), item);
      }
    }
    const messages = Array.from(seenMap.values());

    if (fs.existsSync(PROCESSED_UIDS_FILE)) {
      try {
        processedUids = new Set(JSON.parse(fs.readFileSync(PROCESSED_UIDS_FILE, 'utf8') || '[]'));
      } catch (_) {}
    }

    if (messages.length === 0) {
      console.log(`[${getTs()}] 📭 0 emails found from ${c.green}${ALLOWED_SENDERS.join(', ')}${c.reset}. (Listening live every ${POLL_INTERVAL_SECONDS}s)`);
    } else {
      // Find messages that haven't been processed yet
      const newMessages = messages.filter(item => {
        const uid = item.attributes?.uid;
        return !processedUids.has(uid);
      });

      if (newMessages.length === 0) {
        console.log(`[${getTs()}] 📭 All ${messages.length} email(s) from ${c.green}${TARGET_SENDER}${c.reset} are already processed and up to date.`);
      } else {
        console.log(`[${getTs()}] ${c.magenta}${c.bold}📬 Found ${newMessages.length} new email(s) from ${TARGET_SENDER}! Processing into CRM:${c.reset}`);

        for (let i = 0; i < newMessages.length; i++) {
          const item = newMessages[i];
          const uid = item.attributes?.uid;
          if (uid) {
            processedUids.add(uid);
            try {
              fs.writeFileSync(PROCESSED_UIDS_FILE, JSON.stringify([...processedUids], null, 2));
            } catch (_) {}
          }

          const allParts = item.parts.find(p => p.which === '');
          const rawContent = allParts ? allParts.body : '';
          const parsed = await simpleParser(rawContent);

          const fromAddress = parsed.from?.text || parsed.from?.value?.[0]?.address || TARGET_SENDER;
          const subject = parsed.subject || '(No Subject)';
          const body = parsed.text || rawContent;
          const date = parsed.date || new Date();

          console.log(`\n[${getTs()}] Displaying email [${i + 1}/${newMessages.length}] (UID: ${uid || 'N/A'}) in terminal...`);
          await displayAndProcessEmail(body, fromAddress, subject, date, uid);
        }
      }
    }
  } catch (error) {
    console.log(`[${getTs()}] ${c.red}❌ IMAP Notice: ${error.message}${c.reset}`);
    if (error.message.includes('simultaneous connections')) {
      console.log(`[${getTs()}] ${c.yellow}⏳ Cooldown: Waiting for Gmail to release socket...${c.reset}`);
      await new Promise(r => setTimeout(r, 15000));
    }
  } finally {
    if (connection) {
      try {
        connection.end();
      } catch (_) {}
    }
    isPolling = false;
  }
}

// ----------------------------------------------------------------------
// 🌐 Built-in Local HTTP API Server for Website Integration (Port 5001)
// ----------------------------------------------------------------------
const apiServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'online', 
      service: 'Balaji CRM Email Engine', 
      timestamp: new Date().toISOString() 
    }));
    return;
  }

  if (req.url === '/api/leads') {
    let leads = [];
    if (fs.existsSync(LEADS_FILE)) {
      try {
        leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8') || '[]');
      } catch (_) {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, count: leads.length, leads }));
    return;
  }

  if (req.url === '/api/fetch-now' || req.url === '/api/sync') {
    pollInbox().then(() => {
      let leads = [];
      if (fs.existsSync(LEADS_FILE)) {
        try {
          leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8') || '[]');
        } catch (_) {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Inbox checked successfully', leads }));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    });
    return;
  }

  if (req.url === '/api/clear-leads' && req.method === 'POST') {
    try {
      fs.writeFileSync(LEADS_FILE, JSON.stringify([], null, 2));
    } catch (_) {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'All leads cleared' }));
    return;
  }

  // ── GET /api/products — serve cached product catalog ──
  if (req.url === '/api/products' && req.method === 'GET') {
    let products = [];
    if (fs.existsSync(PRODUCTS_FILE)) {
      try { products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8') || '[]'); } catch (_) {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, count: products.length, products }));
    return;
  }

  // ── POST /api/sync-products — frontend pushes latest product catalog (with imageUrls) ──
  if (req.url === '/api/sync-products' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const products = Array.isArray(payload.products) ? payload.products : [];
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
        console.log(`📦 ${c.cyan}Product catalog synced: ${products.length} product(s) cached locally for email auto-reply.${c.reset}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: products.length }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // ── GET /api/sent-replies — return log of all auto-reply emails sent ──
  if (req.url === '/api/sent-replies' && req.method === 'GET') {
    let replies = [];
    if (fs.existsSync(SENT_REPLIES_FILE)) {
      try { replies = JSON.parse(fs.readFileSync(SENT_REPLIES_FILE, 'utf8') || '[]'); } catch (_) {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, count: replies.length, replies }));
    return;
  }

  // ── POST /api/clear-sent-replies — clear all sent replies log ──
  if (req.url === '/api/clear-sent-replies' && req.method === 'POST') {
    try {
      fs.writeFileSync(SENT_REPLIES_FILE, JSON.stringify([], null, 2));
      console.log(`🧹 ${c.cyan}All sent replies cleared from cache.${c.reset}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'All sent replies cleared' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // ── POST /api/delete-sent-reply — delete single sent reply ──
  if (req.url === '/api/delete-sent-reply' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        let replies = [];
        if (fs.existsSync(SENT_REPLIES_FILE)) {
          replies = JSON.parse(fs.readFileSync(SENT_REPLIES_FILE, 'utf8') || '[]');
        }
        if (payload.sentAt) {
          replies = replies.filter(r => r.sentAt !== payload.sentAt);
        } else if (typeof payload.index === 'number') {
          replies.splice(payload.index, 1);
        }
        fs.writeFileSync(SENT_REPLIES_FILE, JSON.stringify(replies, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: replies.length }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

const API_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;
apiServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`ℹ️ Ingestion API port ${API_PORT} is already active and serving.`);
  } else {
    console.error('API server error:', err.message);
  }
});

apiServer.listen(API_PORT, '0.0.0.0', () => {
  console.log(`🌐 ${c.green}Live Ingestion API Server online (Port: ${API_PORT}) | Engine Ready${c.reset}`);
});

// ----------------------------------------------------------------------
// 🔄 Strictly Sequential Polling Loop (Zero Overlapping Connections)
// ----------------------------------------------------------------------
async function startSequentialPolling() {
  while (true) {
    await pollInbox();
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_SECONDS * 1000));
  }
}

startSequentialPolling();

// Interactive terminal trigger:
// Press Enter anytime to manually check inbox for any new emails
process.stdin.setEncoding('utf8');
process.stdin.on('data', async (data) => {
  const input = data.trim().toLowerCase();
  if (input === '' || input === 'check' || input === 'sync') {
    console.log(`\n[${getTs()}] 🔄 Checking for new emails from ${ALLOWED_SENDERS.join(', ')}...`);
    await pollInbox();
  }
});

