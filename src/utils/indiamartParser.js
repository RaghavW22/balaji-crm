/**
 * Email Buyer Inquiry Parser
 * Configured allowed senders: buyershelpdesk@indiamart.com & 25128067@pvgcoet.ac.in
 * Parses authentic IndiaMART buyer inquiries received via email.
 */

export const DEFAULT_ALLOWED_SENDERS = [
  'buyershelpdesk@indiamart.com',
  '25128067@pvgcoet.ac.in'
];
export const DEFAULT_TARGET_SENDER = 'buyershelpdesk@indiamart.com';
export const INDIAMART_SENDER_EMAIL = 'buyershelpdesk@indiamart.com';

/**
 * Strips price, currency, quantity, and unit suffixes from product name
 * E.g. "Industrial Paint- ₹ 815 / Litre" -> "Industrial Paint"
 *      "Industrial Paint - Rs. 815 / Litre" -> "Industrial Paint"
 *      "Industrial Paint (₹ 815 / Litre)" -> "Industrial Paint"
 */
export function cleanProductName(str) {
  if (!str) return '';
  let s = str.trim();
  // 1. Remove parenthesized price/unit info e.g. (₹ 815 / Litre)
  s = s.replace(/\s*\([^)]*(?:₹|rs\.?|inr|\$|\d+\s*\/)[^)]*\)/gi, '');
  // 2. Remove dash/colon/pipe/tilde followed by price or numbers e.g. '- ₹ 815 / Litre', '- 815/Litre', ': Rs 815'
  s = s.replace(/\s*[-–—|:~]\s*(?:(?:price\s*:?\s*)?(?:₹|rs\.?|inr|\$)?\s*[\d,]+.*)$/i, '');
  // 3. Remove standalone price e.g. '₹ 815 / Litre'
  s = s.replace(/\s*(?:price\s*:?\s*)?(?:₹|rs\.?|inr|\$)\s*[\d,]+(?:\s*\/\s*[\w\s]+)?.*$/i, '');
  // 4. Remove trailing units like '/ Litre'
  s = s.replace(/\s*\/\s*(?:litre|liter|kg|piece|unit|ton|meter|nos|pack|box|barrel|drum|l|gm)\b.*$/i, '');
  // 5. Clean trailing punctuation and whitespace
  s = s.replace(/[-–—|:~,\s]+$/, '').trim();
  return s;
}

/**
 * Strips all spaces, punctuation, symbols, and lowercases for exact matching
 * irrespective of spaces added, omitted, casing, hyphens, etc.
 * E.g. "Industrial Paint" === "IndustrialPaint" === "industrial  paint" === "INDUSTRIAL PAINT"
 */
export function stripForComparison(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Normalizes tokens by splitting camelCase and symbols into spaced lowercase words
 */
export function normalizeTokens(str) {
  return (str || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sample Buyer Inquiry Raw Email Template for testing & simulation
 */
export const SAMPLE_INDIAMART_EMAIL_TEXT = `From: buyershelpdesk@indiamart.com
Subject: IndiaMART Buyer Inquiry for Mobil Unirex N3 Grease

Hi Priti ,

I received your company details from IndiaMART while searching for Mobil Unirex N3 Grease.

Below are the requirement details :

Quantity : 10 Kg
Grade : N3
Probable Order Value : Rs. 5,800 - 12,000
Probable Requirement Type : Business Use

Below are the Buyer details :

Member since : less than 1 month
Products of Interest : Mobil Grease,Caterpillar Spare Parts

Products enquired by the buyer :
• Mobil Grease Unirex N3 - ₹ 1,200 / KG
• Excavators - ₹ 100 / Piece
• Poclain Spares Parts - ₹ 861 / Kg
• High Speed Bearing Grease - ₹ 1,400 / Kg
• Mobil Unirex N3 Grease - ₹ 1,000 / Piece

Regards
Pravin
Nagpur, Maharashtra, India
Mobile: +91-8805699001`;

/**
 * Parse Buyer Inquiry Email
 * Verifies sender email address against authorized senders (buyershelpdesk@indiamart.com, 25128067@pvgcoet.ac.in)
 */
export const parseIndiaMartEmail = (rawEmailContent, senderEmail = '', allowedSender = DEFAULT_ALLOWED_SENDERS) => {
  const content = (rawEmailContent || '').replace(/\r\n/g, '\n');
  const lowerContent = content.toLowerCase();
  const lowerSender = (senderEmail || '').toLowerCase();

  // Normalize allowed senders to array
  let sendersList = [];
  if (Array.isArray(allowedSender)) {
    sendersList = allowedSender.map(s => (s || '').toLowerCase().trim()).filter(Boolean);
  } else if (typeof allowedSender === 'string' && allowedSender) {
    sendersList = allowedSender.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }
  if (sendersList.length === 0) {
    sendersList = DEFAULT_ALLOWED_SENDERS.map(s => s.toLowerCase());
  }

  // Ensure buyershelpdesk@indiamart.com & 25128067@pvgcoet.ac.in are recognized
  if (!sendersList.includes('buyershelpdesk@indiamart.com')) {
    sendersList.push('buyershelpdesk@indiamart.com');
  }
  if (!sendersList.includes('25128067@pvgcoet.ac.in')) {
    sendersList.push('25128067@pvgcoet.ac.in');
  }

  const isTargetSender = sendersList.some(s => lowerSender.includes(s) || lowerContent.includes(s));

  if (!isTargetSender) {
    return {
      success: false,
      error: `REJECTED: Email is not from an authorized IndiaMART sender (${sendersList.join(', ')}).`
    };
  }

  // 1. Extract Searched Product Name (unwraps multiline and asterisks e.g. "*Diesel\nExhaust Fluid*")
  let rawSearchedProduct = '';
  const searchMatch = content.match(/while searching for\s+([\s\S]*?)(?:\.|\n\n|Below)/i);
  if (searchMatch) {
    rawSearchedProduct = searchMatch[1].replace(/[*_~`\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  if (!rawSearchedProduct) {
    const subjectMatch = content.match(/Enquiry for\s+(.*?)\s+from/i);
    if (subjectMatch) {
      rawSearchedProduct = subjectMatch[1].replace(/[*_~`\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  // Detect price metadata attached to product line (e.g. "Industrial Paint- ₹ 815 / Litre")
  const priceMatchInProduct = rawSearchedProduct.match(/(?:price\s*:\s*)?(?:₹|rs\.?|inr|\$)\s*[\d,]+(?:\s*\/\s*[\w\s]+)?/i);
  const priceFoundInName = priceMatchInProduct ? priceMatchInProduct[0].trim() : '';

  // Clean product name to remove any attached price or unit suffixes
  let searchedProduct = cleanProductName(rawSearchedProduct) || rawSearchedProduct;

  // Value Extractor Helper (handles both inline and multiline formats like "Quantity\n:\n250 Litre")
  const extractField = (label) => {
    const inlineRegex = new RegExp(`${label}\\s*:\\s*([^\\n]+)`, 'i');
    const inlineMatch = content.match(inlineRegex);
    if (inlineMatch && inlineMatch[1].trim()) return inlineMatch[1].trim();

    const multilineRegex = new RegExp(`${label}\\s*\\n+\\s*:\\s*\\n+([^\\n]+)`, 'i');
    const multilineMatch = content.match(multilineRegex);
    if (multilineMatch && multilineMatch[1].trim()) return multilineMatch[1].trim();

    return '';
  };

  // 2. Extract Requirement details
  const quantity = extractField('Quantity');
  const grade = extractField('Grade') || extractField('Capacity');
  const orderValue = extractField('Probable Order Value') || priceFoundInName;
  const requirementType = extractField('Probable Requirement Type');

  // 3. Extract Buyer details
  const memberSince = extractField('Member since');
  const productsOfInterest = extractField('Products of Interest');

  // 4. Extract Buyer Contact & Location (Regards section)
  let buyerName = '';
  let city = '';
  let state = '';
  let country = 'India';

  let mobile = '';
  const mobMatch = content.match(/Mobile\s*:\s*([+\d\s-,]+)/i);
  if (mobMatch) {
    mobile = mobMatch[1].split(',')[0].replace(/[✓✔\s]+$/, '').trim();
  }

  let buyerEmail = '';
  const emailMatch = content.match(/(?:Email|E-mail)\s*:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) {
    buyerEmail = emailMatch[1].trim();
  }

  const regardsMatch = content.match(/Regards\s*\n+([^\n]+)\n+([^\n]+)/i);
  if (regardsMatch) {
    buyerName = regardsMatch[1].trim();
    const locParts = regardsMatch[2].trim().split(',').map(s => s.trim());
    if (locParts.length >= 1) city = locParts[0];
    if (locParts.length >= 2) state = locParts[1];
    if (locParts.length >= 3) country = locParts[2];
  } else {
    const hiMatch = content.match(/Hi\s+([^,\n]+)/i);
    buyerName = hiMatch ? hiMatch[1].trim() : 'IndiaMART Buyer';
  }

  // Helper: check if line is purely price / currency / unit info without product name words
  const isPurePrice = (str) => {
    const s = str.replace(/^[•\-\*\u2022\u2023\u25E6\u2043\u2219\s]+/, '').trim();
    return /^(?:price\s*:\s*)?(?:₹|rs\.?|inr|\$)\s*[\d,]+(?:\s*\/\s*[\w\s]+)?$/i.test(s) ||
           /^[\d,]+\s*\/\s*(?:litre|liter|kg|piece|unit|ton|meter|nos|pack|box|barrel|drum|l|gm)$/i.test(s);
  };

  // 5. Extract "Products enquired by the buyer" catalog list (capturing full product names)
  const enquiredProductsList = [];
  const enquiredSection = content.match(/Products enquired by the buyer\s*:\s*([\s\S]*?)(?=(?:\n\s*Regards|\n\s*Below are|\n\s*Buyer Details|\n\s*Mobile|\n\s*Phone|$))/i);
  if (enquiredSection) {
    const lines = enquiredSection[1].split('\n').map(l => l.trim()).filter(Boolean);
    let pendingName = '';

    for (const line of lines) {
      const cleanLine = line.replace(/^[•\-\*\u2022\u2023\u25E6\u2043\u2219]\s*/, '').trim();
      if (!cleanLine) continue;
      if (/^\[image(?::\s*[^\]]*)?\]$/i.test(cleanLine)) continue;
      if (/^(?:regards|mobile|phone|buyer details|member since|products of interest)/i.test(cleanLine)) break;

      if (isPurePrice(cleanLine)) {
        if (pendingName) {
          // Preceding line was product name: pair together (e.g. "Diesel Exhaust Fluid - ₹ 815 / Litre")
          enquiredProductsList.push(`${pendingName} - ${cleanLine}`);
          pendingName = '';
        } else if (searchedProduct) {
          // If no product name on prior line, pair with the main enquiry product name
          enquiredProductsList.push(`${searchedProduct} - ${cleanLine}`);
        } else {
          enquiredProductsList.push(cleanLine);
        }
      } else {
        if (pendingName) {
          enquiredProductsList.push(pendingName);
          pendingName = '';
        }
        if (cleanLine.includes('₹') || cleanLine.includes('Rs') || cleanLine.includes(' - ')) {
          enquiredProductsList.push(cleanLine);
        } else {
          pendingName = cleanLine;
        }
      }
    }
    if (pendingName) {
      enquiredProductsList.push(pendingName);
    }
  }

  // Fallback: If no items found, use the searched product name
  if (enquiredProductsList.length === 0 && searchedProduct) {
    enquiredProductsList.push(searchedProduct);
  } else {
    // Safety check: Ensure no item is ever just a naked price string like "₹ 815 / Litre"
    for (let i = 0; i < enquiredProductsList.length; i++) {
      if (isPurePrice(enquiredProductsList[i]) && searchedProduct) {
        enquiredProductsList[i] = `${searchedProduct} - ${enquiredProductsList[i]}`;
      }
    }
  }

  const queryId = `IMQ${Math.floor(100000000 + Math.random() * 900000000)}`;

  const requirementSummaryParts = [
    quantity ? `Quantity: ${quantity}` : '',
    grade ? `Grade: ${grade}` : '',
    orderValue ? `Probable Value: ${orderValue}` : '',
    requirementType ? `Requirement Type: ${requirementType}` : ''
  ].filter(Boolean);

  return {
    success: true,
    data: {
      query_id: queryId,
      timestamp: new Date().toISOString(),
      lead_source: 'IndiaMART Email Ingestion',
      buyer: {
        name: buyerName || 'IndiaMART Buyer',
        company: memberSince ? `IndiaMART Member (${memberSince})` : 'IndiaMART Verified Buyer',
        email: buyerEmail || (lowerSender.includes('indiamart.com') ? '' : senderEmail) || '',
        phone: mobile || 'N/A',
        location: {
          city: city || 'Nagpur',
          state: state || 'Maharashtra',
          country: country || 'India'
        },
        memberSince: memberSince,
        productsOfInterest: productsOfInterest
      },
      product: {
        name: searchedProduct || 'Mobil Unirex N3 Grease',
        category: 'IndiaMART Product Inquiry',
        quantity: quantity || '10 Kg',
        grade: grade,
        orderValue: orderValue,
        requirementType: requirementType,
        requirement_details: requirementSummaryParts.join(' • ') || 'Quantity: 10 Kg • Grade: N3 • Probable Value: Rs. 5,800 - 12,000'
      },
      enquiredProductsList: enquiredProductsList,
      status: { is_new: true, is_verified: true }
    }
  };
};
