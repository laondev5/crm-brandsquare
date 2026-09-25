/**
 * The currencies a quotation can be written in.
 *
 * Every African currency, plus the dollar and the handful of others machinery
 * is actually priced in when it is imported. ISO codes throughout, because
 * that is what the quotation says on paper and what a bank will recognise.
 *
 * Symbols are only given where they are written in Latin script. A dirham or
 * a Sudanese pound has an Arabic symbol that will not render in the standard
 * PDF fonts, so those fall back to the code — which is what a bank transfer
 * would quote anyway. The code is never wrong; a broken glyph is.
 */

export interface Currency {
  code: string;
  name: string;
  symbol?: string;
}

/** Shown at the top of the list, because they are what gets used. */
export const COMMON_CURRENCIES = ["NGN", "USD"];

export const CURRENCIES: Currency[] = [
  { code: "DZD", name: "Algerian dinar" },
  { code: "AOA", name: "Angolan kwanza", symbol: "Kz" },
  { code: "XOF", name: "West African CFA franc", symbol: "CFA" },
  { code: "XAF", name: "Central African CFA franc", symbol: "FCFA" },
  { code: "BWP", name: "Botswana pula", symbol: "P" },
  { code: "BIF", name: "Burundian franc", symbol: "FBu" },
  { code: "CVE", name: "Cape Verdean escudo" },
  { code: "KMF", name: "Comorian franc", symbol: "CF" },
  { code: "CDF", name: "Congolese franc", symbol: "FC" },
  { code: "DJF", name: "Djiboutian franc", symbol: "Fdj" },
  { code: "EGP", name: "Egyptian pound" },
  { code: "ERN", name: "Eritrean nakfa", symbol: "Nfk" },
  { code: "ETB", name: "Ethiopian birr", symbol: "Br" },
  { code: "GMD", name: "Gambian dalasi", symbol: "D" },
  { code: "GHS", name: "Ghanaian cedi", symbol: "GH₵" },
  { code: "GNF", name: "Guinean franc", symbol: "FG" },
  { code: "KES", name: "Kenyan shilling", symbol: "KSh" },
  { code: "LSL", name: "Lesotho loti", symbol: "L" },
  { code: "LRD", name: "Liberian dollar", symbol: "L$" },
  { code: "LYD", name: "Libyan dinar" },
  { code: "MGA", name: "Malagasy ariary", symbol: "Ar" },
  { code: "MWK", name: "Malawian kwacha", symbol: "MK" },
  { code: "MRU", name: "Mauritanian ouguiya", symbol: "UM" },
  { code: "MUR", name: "Mauritian rupee", symbol: "₨" },
  { code: "MAD", name: "Moroccan dirham" },
  { code: "MZN", name: "Mozambican metical", symbol: "MT" },
  { code: "NAD", name: "Namibian dollar", symbol: "N$" },
  { code: "NGN", name: "Nigerian naira", symbol: "₦" },
  { code: "RWF", name: "Rwandan franc", symbol: "FRw" },
  { code: "STN", name: "São Tomé and Príncipe dobra", symbol: "Db" },
  { code: "SCR", name: "Seychellois rupee", symbol: "₨" },
  { code: "SLE", name: "Sierra Leonean leone", symbol: "Le" },
  { code: "SOS", name: "Somali shilling", symbol: "Sh" },
  { code: "ZAR", name: "South African rand", symbol: "R" },
  { code: "SSP", name: "South Sudanese pound" },
  { code: "SDG", name: "Sudanese pound" },
  { code: "SZL", name: "Swazi lilangeni", symbol: "E" },
  { code: "TZS", name: "Tanzanian shilling", symbol: "TSh" },
  { code: "TND", name: "Tunisian dinar" },
  { code: "UGX", name: "Ugandan shilling", symbol: "USh" },
  { code: "ZMW", name: "Zambian kwacha", symbol: "ZK" },
  { code: "ZWG", name: "Zimbabwe gold", symbol: "ZiG" },

  // Not African, but machinery is bought in these.
  { code: "USD", name: "US dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "Pound sterling", symbol: "£" },
  { code: "CNY", name: "Chinese yuan", symbol: "¥" },
  { code: "INR", name: "Indian rupee", symbol: "₹" },
  { code: "AED", name: "UAE dirham" },
];

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function currency(code: string): Currency | undefined {
  return BY_CODE.get((code || "").toUpperCase());
}

/** "NGN — Nigerian naira (₦)", for a dropdown. */
export function currencyLabel(c: Currency): string {
  return `${c.code} — ${c.name}${c.symbol ? ` (${c.symbol})` : ""}`;
}

/** Alphabetical by name, which is how somebody looks for one. */
export const CURRENCIES_BY_NAME = [...CURRENCIES].sort((a, b) => a.name.localeCompare(b.name));
