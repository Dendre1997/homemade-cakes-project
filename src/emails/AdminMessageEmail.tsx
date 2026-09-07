import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

export interface AdminMessageEmailProps {
  customerName: string;
  /** Free-form admin (or AI-drafted) message body. Plain text only. */
  bodyText: string;
  /** 6-character short code, e.g. "A1B2C3". Rendered as "#A1B2C3". */
  orderNumber?: string;
  actionButton?: { label: string; url: string };
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

const InstaLink = process.env.NEXT_PUBLIC_BAKERY_DM_HANDLE_INSTAGRAM;
const FacebookLink = process.env.NEXT_PUBLIC_BAKERY_DM_HANDLE_FACEBOOK;

// ─── Colour tokens (shared with OrderConfirmationEmail) ─────────────────────
const C = {
  primary: "#4A2E2C",
  primary60: "#7D5553",
  white: "#FFFFFF",
  grayBg: "#F9FAFB",
  grayBorder2: "#E5E7EB",
};

const PREVIEW_LENGTH = 100;

/**
 * Collapse the body into a single-line inbox preview. Email clients otherwise
 * pull whatever text follows the logo, which is usually the greeting.
 */
function buildPreview(bodyText: string): string {
  const flat = bodyText.replace(/\s+/g, " ").trim();
  return flat.length > PREVIEW_LENGTH
    ? `${flat.slice(0, PREVIEW_LENGTH - 1)}…`
    : flat;
}

/**
 * Split on blank lines so each paragraph becomes its own <Text>. Outlook
 * collapses `white-space: pre-wrap`, so real block elements are the only
 * reliable way to keep paragraph spacing; `pre-line` preserves the single
 * newlines that remain inside a paragraph.
 */
function toParagraphs(bodyText: string): string[] {
  return bodyText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export const AdminMessageEmail = ({
  customerName,
  bodyText,
  orderNumber,
  actionButton,
}: AdminMessageEmailProps) => {
  const paragraphs = toParagraphs(bodyText);

  return (
    <Html>
      <Head>
        <style>{`
          @media screen and (max-width: 480px) {
            .email-section { padding-left: 14px !important; padding-right: 14px !important; }
            .email-header  { padding: 22px 14px 18px !important; }
            .email-footer  { padding: 20px 14px !important; }
            .header-title  { font-size: 20px !important; }
          }
        `}</style>
      </Head>
      <Preview>{buildPreview(bodyText)}</Preview>

      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* ── HEADER ── */}
          <Section style={styles.header} className="email-header">
            <Link href={baseUrl}>
              <Img
                src={`${baseUrl}/logo_1.2.svg`}
                width="72"
                height="72"
                alt="D&K Creations"
                style={styles.logo}
              />
            </Link>
            <Text style={styles.headerTitle} className="header-title">
              Hi {customerName}!
            </Text>
            <Text style={styles.headerSub}>
              A message from Anastasiia at D&amp;K Creations
              {orderNumber ? ` about order #${orderNumber}` : ""}.
            </Text>
          </Section>

          {/* ── WHITE CONTENT CARD ── */}
          <Section style={styles.card}>
            <Section style={styles.section} className="email-section">
              {paragraphs.map((paragraph, idx) => (
                <Text
                  key={idx}
                  style={idx === 0 ? styles.bodyFirst : styles.bodyParagraph}
                >
                  {paragraph}
                </Text>
              ))}
            </Section>

            {actionButton && (
              <Section style={styles.buttonSection} className="email-section">
                <Button href={actionButton.url} style={styles.actionButton}>
                  {actionButton.label}
                </Button>
              </Section>
            )}

            <Hr style={styles.divider} />

            {/* ── SIGN-OFF ── */}
            <Section style={styles.section} className="email-section">
              <Text style={styles.signOff}>
                Warmly,
                <br />
                Anastasiia · D&amp;K Creations
              </Text>

              {orderNumber && (
                <Text style={styles.orderRef}>
                  Order reference: <strong>#{orderNumber}</strong>
                </Text>
              )}

              <Text style={styles.replyHint}>
                Just reply to this email if you have any questions — it comes
                straight to us.
              </Text>
            </Section>
          </Section>

          {/* ── DARK FOOTER ── */}
          <Section style={styles.footer} className="email-footer">
            <Text style={styles.footerThanks}>
              Thank you for choosing D&amp;K Creations! 💖
            </Text>
            <Row style={{ marginTop: "16px" }}>
              <Column
                align="right"
                style={{ width: "50%", paddingRight: "8px" }}
              >
                <Link
                  href={`https://www.instagram.com/${InstaLink}`}
                  style={styles.footerLink}
                >
                  Instagram
                </Link>
              </Column>
              <Column style={{ width: "2px" }}>
                <Text style={styles.footerSep}>·</Text>
              </Column>
              <Column align="left" style={{ width: "50%", paddingLeft: "8px" }}>
                <Link href={FacebookLink} style={styles.footerLink}>
                  Facebook
                </Link>
              </Column>
            </Row>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default AdminMessageEmail;

// ─── STYLES ────────────────────────────────────────────────────────────────

const styles = {
  body: {
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    backgroundColor: C.grayBg,
    margin: "0",
    padding: "0",
    WebkitTextSizeAdjust: "100%",
    MsTextSizeAdjust: "100%",
  },
  container: {
    margin: "0 auto",
    width: "100%",
    maxWidth: "600px",
  },

  // ── header
  header: {
    backgroundColor: "#EBEBEB",
    padding: "28px 20px 24px",
  },
  logo: {
    display: "block",
    marginBottom: "20px",
    maxWidth: "72px",
    height: "auto",
  },
  headerTitle: {
    color: "#000000",
    fontSize: "22px",
    fontWeight: "800",
    margin: "0 0 8px",
    lineHeight: "1.25",
    letterSpacing: "-0.3px",
    wordBreak: "break-word" as const,
    overflowWrap: "break-word" as const,
  },
  headerSub: {
    color: "#444444",
    fontSize: "14px",
    fontWeight: "400",
    margin: "0",
    lineHeight: "1.5",
  },

  // ── white content card
  card: {
    backgroundColor: C.white,
  },
  section: {
    padding: "20px 20px",
  },

  // ── message body
  bodyFirst: {
    color: "#111111",
    fontSize: "15px",
    fontWeight: "400",
    margin: "0",
    lineHeight: "1.7",
    whiteSpace: "pre-line" as const,
    wordBreak: "break-word" as const,
    overflowWrap: "break-word" as const,
  },
  bodyParagraph: {
    color: "#111111",
    fontSize: "15px",
    fontWeight: "400",
    margin: "14px 0 0",
    lineHeight: "1.7",
    whiteSpace: "pre-line" as const,
    wordBreak: "break-word" as const,
    overflowWrap: "break-word" as const,
  },

  // ── call to action
  buttonSection: {
    padding: "0 20px 24px",
    textAlign: "center" as const,
  },
  actionButton: {
    backgroundColor: C.primary,
    color: C.white,
    fontSize: "14px",
    fontWeight: "700",
    textDecoration: "none",
    textAlign: "center" as const,
    padding: "12px 28px",
    borderRadius: "10px",
    display: "inline-block",
  },

  divider: {
    borderColor: C.grayBorder2,
    borderTopWidth: "1px",
    margin: "0",
  },

  // ── sign-off
  signOff: {
    color: "#111111",
    fontSize: "14px",
    fontWeight: "500",
    margin: "0",
    lineHeight: "1.6",
  },
  orderRef: {
    color: "#888888",
    fontSize: "13px",
    fontWeight: "400",
    margin: "12px 0 0",
    lineHeight: "1.5",
  },
  replyHint: {
    color: C.primary60,
    fontSize: "13px",
    fontWeight: "400",
    margin: "12px 0 0",
    lineHeight: "1.6",
  },

  // ── dark footer
  footer: {
    backgroundColor: "#1a1a1a",
    padding: "24px 20px",
    textAlign: "center" as const,
  },
  footerThanks: {
    color: "#AAAAAA",
    fontSize: "13px",
    fontWeight: "500",
    margin: "0",
    textAlign: "center" as const,
  },
  footerLink: {
    color: "#FFFFFF",
    fontSize: "13px",
    fontWeight: "500",
    textDecoration: "none",
  },
  footerSep: {
    color: "#555555",
    fontSize: "13px",
    textAlign: "center" as const,
    margin: "0",
    lineHeight: "1.5",
  },
} as const;
