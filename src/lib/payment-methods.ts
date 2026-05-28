/**
 * Single source of truth for the payment account details displayed
 * on both the initial enrollment wizard and the monthly-payment page.
 *
 * Add a new method (UPI, PayPal, Wise, Payoneer, JazzCash, etc.):
 *   - Append a new entry to the relevant region's array below.
 *   - Both the enrollment view and the monthly-payment page will pick
 *     it up automatically — no UI edits needed.
 *
 * Conventions:
 *   - One *region* groups multiple *methods* a sister can use to pay
 *     in that currency.
 *   - Each method has a short `title` (e.g. "Bank Transfer", "UPI")
 *     and an ordered list of `fields` (label/value rows).
 *   - Set `mono: true` on a field for long alphanumeric values
 *     (account numbers, IBANs, UPI IDs, SWIFT codes) so they render
 *     in a monospaced font and stay legible at small sizes.
 */

export type PaymentRegion = "pk" | "in" | "intl";

export interface PaymentField {
  label: string;
  value: string;
  /** Render value in monospaced font (good for account numbers/codes). */
  mono?: boolean;
}

export interface PaymentMethod {
  /** Short heading shown above the field list — e.g. "Bank Transfer", "UPI". */
  title: string;
  fields: PaymentField[];
}

export interface RegionPaymentInfo {
  /** Display label shown next to the region flag/icon. */
  label: string;
  /** Emoji or short prefix shown before the label. */
  flag: string;
  /** Ordered list of methods sisters can use in this region. */
  methods: PaymentMethod[];
}

export const PAYMENT_METHODS: Record<PaymentRegion, RegionPaymentInfo> = {
  pk: {
    flag: "🇵🇰",
    label: "Pakistan",
    methods: [
      {
        title: "Bank Transfer",
        fields: [
          { label: "Bank Name", value: "Bank Alfalah" },
          { label: "Account Name", value: "Sana Ahmed" },
          { label: "Account Number", value: "56185002604899", mono: true },
          { label: "IBAN", value: "PK81ALFH5618005002604899", mono: true },
        ],
      },
      // Add more PK methods here — e.g. JazzCash, EasyPaisa, RAAST QR:
      // {
      //   title: "JazzCash",
      //   fields: [{ label: "Mobile Number", value: "03XX-XXXXXXX", mono: true }],
      // },
    ],
  },

  in: {
    flag: "🇮🇳",
    label: "India",
    methods: [
      {
        title: "Bank Transfer",
        fields: [
          { label: "Bank Name", value: "HDFC Bank" },
          { label: "Account Name", value: "Kareemunnisa Shaik" },
          { label: "Account Number", value: "50100433613784", mono: true },
          { label: "IFSC Code", value: "HDFC0009377", mono: true },
        ],
      },
      // Add UPI / PhonePe / GPay / Paytm here — e.g.:
      // {
      //   title: "UPI",
      //   fields: [{ label: "UPI ID", value: "kareemunnisa@hdfc", mono: true }],
      // },
    ],
  },

  intl: {
    flag: "🌍",
    label: "International",
    methods: [
      {
        title: "International Wire (SWIFT)",
        fields: [
          { label: "Bank Name", value: "Bank Alfalah" },
          { label: "Account Name", value: "Sana Ahmed" },
          { label: "Account Number", value: "56185002604899", mono: true },
          { label: "IBAN", value: "PK81ALFH5618005002604899", mono: true },
          { label: "SWIFT / BIC", value: "ALFHPKKA", mono: true },
          {
            label: "Bank Address",
            value: "Bank Alfalah Limited, Karachi, Pakistan",
          },
        ],
      },
      // Add PayPal / Wise / Payoneer here — e.g.:
      // {
      //   title: "PayPal",
      //   fields: [{ label: "PayPal Email", value: "sana@nisaalhuda.org", mono: true }],
      // },
      // {
      //   title: "Wise",
      //   fields: [{ label: "Wise Email", value: "sana@nisaalhuda.org", mono: true }],
      // },
    ],
  },
};

/**
 * Helper note shown alongside the payment methods on both views.
 */
export const PAYMENT_REFERENCE_NOTE =
  "Please include your full name in the payment reference so we can match it to your application.";
