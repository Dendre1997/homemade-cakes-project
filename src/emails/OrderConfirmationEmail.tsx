// src/emails/OrderConfirmationEmail.tsx
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Text,
  Img,
  Button,
  Section,
  Row,
  Column,
  Hr,
  Link,
} from "@react-email/components";
import { Order, CartItem } from "@/types";
import { format } from "date-fns";

interface OrderConfirmationEmailProps {
  order: Order;
  flavorMap?: Record<string, string>;
  diameterMap?: Record<string, string>;
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

const InstaLink = process.env.NEXT_PUBLIC_BAKERY_DM_HANDLE_INSTAGRAM;
const FacebookLink = process.env.NEXT_PUBLIC_BAKERY_DM_HANDLE_FACEBOOK;

// ─── Colour tokens (mirrors the Tailwind primary palette) ──────────────────
const C = {
  primary: "#4A2E2C", // text-primary
  primary60: "#7D5553", // text-primary/60
  primary40: "#9B7A78", // text-primary/40
  primary10: "#F5EFEE", // bg-primary/10  (card bg)
  primaryBorder: "#C4A09E", // border-primary/60
  white: "#FFFFFF",
  grayBg: "#F9FAFB", // bg-gray-50
  grayBorder: "#F3F4F6", // border-gray-100
  grayBorder2: "#E5E7EB", // border-gray-200
  green100: "#DCFCE7",
  green700: "#15803D",
  amber100: "#FEF3C7",
  amber700: "#B45309",
  purple50: "#FAF5FF",
  purpleBorder: "#EDE9FE",
};

export const OrderConfirmationEmail = ({
  order,
  flavorMap = {},
  diameterMap = {},
}: OrderConfirmationEmailProps) => {
  const isPaid = order.paymentDetails?.status === "paid" || order.isPaid;
  const orderIdShort = order._id.toString().slice(-6).toUpperCase();
  const dateFormatted = format(new Date(order.createdAt), "MMMM d, yyyy");
  const isDelivery = order.deliveryInfo.method === "delivery";

  // ── helpers ───────────────────────────────────────────────────────────────
  const getFlavorName = (id?: string) => {
    if (!id) return "";
    if (id.length === 24 && /^[0-9a-fA-F]+$/.test(id))
      return flavorMap[id] || id;
    return id;
  };

  const getDiameterName = (id?: string) => {
    if (!id) return "";
    if (id.length === 24 && /^[0-9a-fA-F]+$/.test(id))
      return diameterMap[id] || id;
    return id;
  };

  const subtotal = order.items.reduce(
    (acc, item) => acc + (item.rowTotal || item.price * item.quantity),
    0,
  );

  return (
    <Html>
      <Head />
      <Preview>Thank you for your order! #{orderIdShort}</Preview>

      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* ── CARD WRAPPER ──────────────────────────────────────────────── */}
          <Section style={styles.card}>
            {/* ── HEADER ──────────────────────────────────────────────────── */}
            <Section style={styles.header}>
              <Img
                src={`${baseUrl}/logo_1.2.svg`}
                width="100"
                height="100"
                alt="D&K Creations"
                style={styles.logo}
              />
              <Text style={styles.headerSubtitle}>
                Order Summary&nbsp;&nbsp;
                {isPaid ? (
                  <span style={styles.badgePaid}>PAID</span>
                ) : (
                  <span style={styles.badgePending}>PENDING</span>
                )}
              </Text>
            </Section>

            {/* ── META ────────────────────────────────────────────────────── */}
            <Section style={styles.metaSection}>
              <Row>
                <Column style={{ width: "50%" }}>
                  <Text style={styles.metaLabel}>Order ID</Text>
                  <Text style={styles.metaValueMono}>#{orderIdShort}</Text>
                </Column>
                
              </Row>

              <Text style={{ ...styles.metaLabel, marginTop: "16px" }}>
                Customer
              </Text>
              <Text style={styles.metaCustomerName}>
                {order.customerInfo.name}
              </Text>
              <Text style={styles.metaDetail}>{order.customerInfo.phone}</Text>
              {order.customerInfo.email &&
                !order.customerInfo.email.includes("placeholder.com") && (
                  <Text style={styles.metaDetail}>
                    {order.customerInfo.email}
                  </Text>
                )}
              {order.customerInfo.socialPlatform &&
                order.customerInfo.socialNickname?.trim() && (
                  <Text style={styles.metaDetail}>
                    Social:{" "}
                    <Link
                      href={`https://${order.customerInfo.socialPlatform}.com/${order.customerInfo.socialNickname}`}
                      style={styles.socialLink}
                    >
                      @{order.customerInfo.socialNickname} (
                      {order.customerInfo.socialPlatform})
                    </Link>
                  </Text>
                )}
            </Section>

            <Hr style={styles.divider} />

            {/* ── FULFILLMENT ─────────────────────────────────────────────── */}
            <Section style={styles.sectionPad}>
              <Text style={styles.sectionLabel}>
                {isDelivery ? "🚚  Delivery To" : "🏪  Pickup"}
              </Text>

              {order.deliveryInfo.deliveryDates?.length > 0 &&
                order.deliveryInfo.deliveryDates.map((dateObj, idx) => (
                  <Section key={idx} style={styles.dateCard}>
                    <Text style={styles.dateCardMain}>
                      {format(new Date(dateObj.date), "EEE, MMMM d, yyyy")}
                    </Text>
                    <Text style={styles.dateCardSub}>{dateObj.timeSlot}</Text>
                  </Section>
                ))}

              {isDelivery && (
                <Section style={styles.addressCard}>
                  <Text style={styles.addressText}>
                    {order.deliveryInfo.address || "Address pending"}
                  </Text>
                </Section>
              )}
            </Section>

            <Hr style={styles.divider} />

            {/* ── LINE ITEMS ──────────────────────────────────────────────── */}
            <Section style={styles.sectionPad}>
              <Text style={styles.sectionLabel}>Items</Text>

              {order.items.map((item: CartItem, idx: number) => {
                const isCustom = item.productType === "custom" || item.isCustom;
                const displayFlavor = isCustom
                  ? item.customFlavor ||
                    getFlavorName(
                      item.selectedConfig?.cake?.flavorId || item.flavor,
                    )
                  : getFlavorName(
                      item.flavor || item.selectedConfig?.cake?.flavorId,
                    );
                const displaySize = isCustom
                  ? item.customSize || getDiameterName(item.selectedConfig?.cake?.diameterId)
                  : getDiameterName(item.diameterId);

                const itemImages = item.imageUrls?.length
                  ? item.imageUrls
                  : item.imageUrl
                    ? [item.imageUrl]
                    : order.referenceImages?.length
                      ? [
                          order.referenceImages[
                            Math.min(idx, order.referenceImages.length - 1)
                          ],
                        ]
                      : [];

                const rowTotal = item.rowTotal || item.price * item.quantity;
                const isLast = idx === order.items.length - 1;

                return (
                  <Section
                    key={idx}
                    style={{
                      ...styles.itemRow,
                      borderBottom: isLast
                        ? "none"
                        : `1px solid ${C.grayBorder}`,
                    }}
                  >
                    <Row>
                      {/* Image(s) */}
                      <Column style={styles.itemImgCol}>
                        {itemImages.length > 0 ? (
                          <Img
                            src={itemImages[0]}
                            width="56"
                            height="56"
                            alt={item.name}
                            style={styles.itemImg}
                          />
                        ) : (
                          <Section style={styles.itemImgPlaceholder}>
                            <Text style={styles.itemImgPlaceholderText}>
                              No Img
                            </Text>
                          </Section>
                        )}
                      </Column>

                      {/* Details */}
                      <Column style={styles.itemDetailsCol}>
                        <Row>
                          <Column>
                            <Text style={styles.itemName}>{item.name}</Text>
                          </Column>
                          <Column align="right">
                            <Text style={styles.itemPrice}>
                              ${rowTotal.toFixed(2)}
                            </Text>
                          </Column>
                        </Row>
                        {displaySize && (
                          <Text style={styles.itemMeta}>
                            Size: {displaySize}
                          </Text>
                        )}
                        {displayFlavor && (
                          <Text style={styles.itemMeta}>
                            Flavor: {displayFlavor}
                          </Text>
                        )}
                        <Text style={styles.itemMeta}>
                          Qty: {item.quantity}
                        </Text>
                        {item.inscription && (
                          <Text style={styles.itemMeta}>
                            Inscription: {item.inscription}
                          </Text>
                        )}
                        {item.designInstructions && (
                          <Text style={styles.itemMeta}>
                            Instructions: {item.designInstructions}
                          </Text>
                        )}
                        {item.addons && item.addons.length > 0 && (
                          <Section style={{ marginTop: "4px" }}>
                            <Text style={styles.itemMeta}>Addons:</Text>
                            {item.addons.map((addon, aIdx) => (
                              <Text key={aIdx} style={{ ...styles.itemMeta, paddingLeft: "8px" }}>
                                • {addon.name} {addon.variantName && `(${addon.variantName})`} - ${addon.price.toFixed(2)}
                              </Text>
                            ))}
                          </Section>
                        )}
                      </Column>
                    </Row>
                  </Section>
                );
              })}
            </Section>

            {/* ── FINANCIAL BREAKDOWN ──────────────────────────────────────── */}
            <Section style={styles.financialSection}>
              <Row style={styles.finRow}>
                <Column>
                  <Text style={styles.finLabel}>Subtotal</Text>
                </Column>
                <Column align="right">
                  <Text style={styles.finLabel}>${subtotal.toFixed(2)}</Text>
                </Column>
              </Row>

              {order.discountInfo && order.discountInfo.amount > 0 && (
                <Row style={styles.discountRow}>
                  <Column>
                    <Text style={styles.discountLabel}>
                      Discount
                      {(order.discountInfo.code || order.discountInfo.name) && (
                        <span style={styles.discountBadge}>
                          {" "}
                          {order.discountInfo.code || order.discountInfo.name}
                        </span>
                      )}
                    </Text>
                  </Column>
                  <Column align="right">
                    <Text style={styles.discountAmount}>
                      -${order.discountInfo.amount.toFixed(2)}
                    </Text>
                  </Column>
                </Row>
              )}

              <Hr style={styles.totalDivider} />

              <Row>
                <Column>
                  <Text style={styles.totalLabel}>Total</Text>
                </Column>
                <Column align="right">
                  <Text style={styles.totalAmount}>
                    ${order.totalAmount.toFixed(2)}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* ── CTA ─────────────────────────────────────────────────────── */}
            {/* <Section style={styles.ctaSection}>
              <Button href={`${baseUrl}/profile`} style={styles.ctaButton}>
                View Order Status
              </Button>
            </Section> */}

            {/* ── FOOTER ──────────────────────────────────────────────────── */}
            <Section style={styles.footer}>
              <Text style={styles.footerThanks}>
                Thank you for your order! 💖
              </Text>
              <Text style={styles.footerHandle}>
                @d&amp;kcreations &bull; d&amp;kcreations.com
              </Text>
              <Row style={{ marginTop: "16px" }}>
                <Column align="center">
                  <Link
                    href={`https://www.instagram.com/${InstaLink}`}
                    style={styles.socialLinkFooter}
                  >
                    Instagram
                  </Link>
                  {"  ·  "}
                  <Link
                    href={FacebookLink}
                    style={styles.socialLinkFooter}
                  >
                    Facebook
                  </Link>
                </Column>
              </Row>
            </Section>
          </Section>
          {/* ── END CARD ───────────────────────────────────────────────────── */}
        </Container>
      </Body>
    </Html>
  );
};

export default OrderConfirmationEmail;

// ─── STYLES ────────────────────────────────────────────────────────────────

const styles = {
  // layout
  body: {
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    margin: "0",
    padding: "24px 0 48px",
  },
  container: {
    margin: "0 auto",
    width: "400px",
    maxWidth: "100%",
  },

  // card shell — mirrors rounded-2xl shadow-xl border border-primary/60
  card: {
    backgroundColor: C.primary10,
    borderRadius: "16px",
    border: `1px solid ${C.primaryBorder}`,
    overflow: "hidden",
  },

  // ── header
  header: {
    padding: "24px 24px 20px",
    textAlign: "center" as const,
  },
  logo: {
    display: "block",
    margin: "0 auto 8px",
  },
  headerSubtitle: {
    color: C.primary60,
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "3px",
    textTransform: "uppercase" as const,
    textAlign: "center" as const,
    margin: "0",
  },
  badgePaid: {
    backgroundColor: "#DCFCE7",
    color: "#15803D",
    fontSize: "9px",
    fontWeight: "700",
    padding: "2px 7px",
    borderRadius: "999px",
    letterSpacing: "1px",
    display: "inline-block",
  },
  badgePending: {
    backgroundColor: "#FEF3C7",
    color: "#B45309",
    fontSize: "9px",
    fontWeight: "700",
    padding: "2px 7px",
    borderRadius: "999px",
    letterSpacing: "1px",
    display: "inline-block",
  },

  // ── meta section — mirrors the gray-50/80 grid block
  metaSection: {
    backgroundColor: "rgba(249,250,251,0.8)",
    borderTop: `1px solid ${C.grayBorder}`,
    borderBottom: `1px solid ${C.grayBorder}`,
    padding: "16px 24px",
  },
  metaLabel: {
    color: C.primary40,
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "2px",
    textTransform: "uppercase" as const,
    margin: "0 0 2px",
  },
  metaValue: {
    color: C.primary,
    fontSize: "14px",
    fontWeight: "500",
    margin: "0",
  },
  metaValueMono: {
    color: C.primary,
    fontSize: "14px",
    fontWeight: "700",
    fontFamily: "monospace",
    margin: "0",
  },
  metaCustomerName: {
    color: C.primary,
    fontSize: "16px",
    fontWeight: "700",
    margin: "0",
  },
  metaDetail: {
    color: C.primary40,
    fontSize: "13px",
    margin: "2px 0 0",
  },
  socialLink: {
    color: C.primary60,
    fontWeight: "600",
    textDecoration: "underline",
  },

  // ── shared
  divider: {
    borderColor: C.grayBorder,
    margin: "0",
  },
  sectionPad: {
    padding: "16px 24px",
  },
  sectionLabel: {
    color: C.primary60,
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "2px",
    textTransform: "uppercase" as const,
    margin: "0 0 12px",
  },

  // ── fulfillment
  dateCard: {
    backgroundColor: "rgba(250,245,255,0.5)",
    border: `1px solid ${C.purpleBorder}`,
    borderRadius: "12px",
    padding: "10px 14px",
    marginBottom: "8px",
  },
  dateCardMain: {
    color: C.primary,
    fontSize: "14px",
    fontWeight: "700",
    margin: "0",
  },
  dateCardSub: {
    color: C.primary40,
    fontSize: "13px",
    margin: "2px 0 0",
  },
  addressCard: {
    backgroundColor: C.grayBg,
    border: `1px solid ${C.grayBorder}`,
    borderRadius: "12px",
    padding: "10px 14px",
    marginTop: "8px",
  },
  addressText: {
    color: C.primary40,
    fontSize: "13px",
    fontWeight: "500",
    margin: "0",
  },

  // ── line items
  itemRow: {
    paddingTop: "12px",
    paddingBottom: "12px",
  },
  itemImgCol: {
    width: "72px",
    verticalAlign: "top",
  },
  itemImg: {
    width: "56px",
    height: "56px",
    borderRadius: "12px",
    objectFit: "cover" as const,
    border: `1px solid ${C.grayBorder}`,
    display: "block",
  },
  itemImgPlaceholder: {
    width: "56px",
    height: "56px",
    borderRadius: "12px",
    backgroundColor: C.grayBorder,
    border: `1px solid ${C.grayBorder2}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  itemImgPlaceholderText: {
    color: C.primary40,
    fontSize: "9px",
    fontWeight: "500",
    textAlign: "center" as const,
    margin: "0",
    lineHeight: "56px",
  },
  itemDetailsCol: {
    verticalAlign: "top",
    paddingLeft: "8px",
  },
  itemName: {
    color: C.primary60,
    fontSize: "13px",
    fontWeight: "700",
    margin: "0",
    lineHeight: "1.3",
  },
  itemPrice: {
    color: C.primary,
    fontSize: "13px",
    fontWeight: "600",
    margin: "0",
    textAlign: "right" as const,
  },
  itemMeta: {
    color: C.primary40,
    fontSize: "11px",
    fontWeight: "500",
    margin: "2px 0 0",
    lineHeight: "1.4",
  },

  // ── financial
  financialSection: {
    backgroundColor: "rgba(249,250,251,0.5)",
    borderTop: `1px solid ${C.grayBorder}`,
    padding: "20px 24px",
  },
  finRow: {
    marginBottom: "8px",
  },
  finLabel: {
    color: C.primary40,
    fontSize: "13px",
    fontWeight: "500",
    margin: "0",
  },
  discountRow: {
    backgroundColor: "#F0FDF4",
    borderRadius: "6px",
    padding: "4px 8px",
    margin: "4px -8px",
  },
  discountLabel: {
    color: "#15803D",
    fontSize: "13px",
    fontWeight: "500",
    margin: "0",
  },
  discountBadge: {
    backgroundColor: "#DCFCE7",
    color: "#15803D",
    fontSize: "9px",
    fontWeight: "700",
    padding: "2px 5px",
    borderRadius: "4px",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  },
  discountAmount: {
    color: "#15803D",
    fontSize: "13px",
    fontWeight: "500",
    margin: "0",
  },
  totalDivider: {
    borderColor: C.grayBorder2,
    margin: "12px 0",
  },
  totalLabel: {
    color: C.primary40,
    fontSize: "18px",
    fontWeight: "800",
    margin: "0",
  },
  totalAmount: {
    color: C.primary,
    fontSize: "24px",
    fontWeight: "800",
    margin: "0",
    textAlign: "right" as const,
  },

  // ── CTA
  ctaSection: {
    padding: "16px 24px",
    textAlign: "center" as const,
    borderTop: `1px solid ${C.grayBorder}`,
  },
  ctaButton: {
    backgroundColor: "transparent",
    border: `1px solid ${C.primaryBorder}`,
    borderRadius: "10px",
    color: C.primary60,
    fontSize: "13px",
    fontWeight: "700",
    padding: "10px 24px",
    textDecoration: "none",
    display: "inline-block",
  },

  // ── footer
  footer: {
    backgroundColor: C.grayBg,
    borderTop: `1px solid ${C.primaryBorder}`,
    padding: "20px 24px",
    textAlign: "center" as const,
  },
  footerThanks: {
    color: C.primary40,
    fontSize: "13px",
    fontWeight: "600",
    margin: "0 0 4px",
    textAlign: "center" as const,
  },
  footerHandle: {
    color: C.primary40,
    fontSize: "12px",
    margin: "0",
    textAlign: "center" as const,
  },
  socialLinkFooter: {
    color: C.primary60,
    fontSize: "12px",
    fontWeight: "600",
    textDecoration: "none",
  },
} as const;
