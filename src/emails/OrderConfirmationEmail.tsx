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
import { SENDER_EMAIL } from "@/lib/email";

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
  primary: "#4A2E2C",
  primary60: "#7D5553",
  primary40: "#9B7A78",
  primary10: "#F5EFEE",
  primaryBorder: "#C4A09E",
  white: "#FFFFFF",
  grayBg: "#F9FAFB",
  grayBorder: "#F3F4F6",
  grayBorder2: "#E5E7EB",
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
  const isPaid = order.isPaid;
  const expectedMethod = order.paymentDetails?.expectedMethod;
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

  // ── addon extraction (mirrors ClientReceiptCard) ──────────────────────────
  const allAddons = order.items.flatMap((item) =>
    (item.addons || []).map((addon) => ({
      ...addon,
      itemQuantity: item.quantity,
    })),
  );

  const addonsCost = order.items.reduce((acc, item) => {
    const itemAddonsCost = (item.addons || []).reduce(
      (sum, addon) => sum + addon.price,
      0,
    );
    return acc + itemAddonsCost * item.quantity;
  }, 0);

  return (
    <Html>
      <Head />
      <Preview>Thank you for your order! #{orderIdShort}</Preview>

      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* ── HEADER ──────────────────────────────────────────────── */}
          <Section style={styles.header}>
            <Img
              src={`${baseUrl}/logo_1.2.svg`}
              width="80"
              height="80"
              alt="D&K Creations"
              style={styles.logo}
            />
            <Text style={styles.headerDate}>{dateFormatted}</Text>
            <Text style={styles.headerTitle}>
              Thanks for your order, {order.customerInfo.name}!
            </Text>
            <Text style={styles.headerSubtitle}>
              We can't wait to make something special for you. Check your order
              details below.
            </Text>
          </Section>

          {/* ── MAIN CARD ─────────────────────────────────────────────── */}
          <Section style={styles.mainCard}>
            {/* ── FINANCIAL BREAKDOWN ──────────────────────────────────── */}
            <Section style={styles.section}>
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

              <Hr style={styles.hr} />

              {/* Per-item rows — base price only (rowTotal minus that item's addon cost) */}
              {order.items.map((item: CartItem, idx: number) => {
                const itemAddonCost =
                  (item.addons || []).reduce((s, a) => s + a.price, 0) *
                  item.quantity;
                const itemBaseTotal =
                  (item.rowTotal || item.price * item.quantity) - itemAddonCost;
                return (
                  <Row key={idx} style={{ marginBottom: "10px" }}>
                    <Column>
                      <Text style={styles.finLabel}>
                        {item.name}
                        {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                      </Text>
                    </Column>
                    <Column align="right">
                      <Text style={styles.finValue}>
                        ${itemBaseTotal.toFixed(2)}
                      </Text>
                    </Column>
                  </Row>
                );
              })}

              {/* Extras sub-block — left-border accent, only shown when addons exist */}
              {allAddons.length > 0 && (
                <Section style={styles.extrasBlock}>
                  <Text style={styles.extrasLabel}>Extras</Text>
                  {allAddons.map((addon, idx) => (
                    <Row
                      key={idx}
                      style={{ marginTop: idx === 0 ? "0" : "4px" }}
                    >
                      <Column>
                        <Text style={styles.extrasItem}>
                          {addon.name}
                          {addon.variantName && addon.variantName.trim() !== ""
                            ? ` · ${addon.variantName}`
                            : ""}
                          {addon.itemQuantity > 1
                            ? ` (×${addon.itemQuantity})`
                            : ""}
                        </Text>
                      </Column>
                      <Column align="right">
                        <Text style={styles.extrasItemPrice}>
                          {addon.price > 0
                            ? `+$${(addon.price * addon.itemQuantity).toFixed(2)}`
                            : "Free"}
                        </Text>
                      </Column>
                    </Row>
                  ))}
                </Section>
              )}

              {/* Discount */}
              {order.discountInfo && order.discountInfo.amount > 0 && (
                <Row>
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
                      −${order.discountInfo.amount.toFixed(2)}
                    </Text>
                  </Column>
                </Row>
              )}
            </Section>

            <Hr style={styles.hrSection} />

            {/* ── ITEMS ─────────────────────────────────────────────────── */}
            <Section style={styles.section}>
              <Text style={styles.sectionHeader}>Items</Text>

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
                  ? item.customSize ||
                    getDiameterName(item.selectedConfig?.cake?.diameterId)
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
                const hasAddons = item.addons && item.addons.length > 0;

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
                    {/* ── image + details row */}
                    <Row>
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
                      </Column>
                    </Row>

                    {/* ── addon block — indented to align with the details column */}
                    {hasAddons && (
                      <Row style={{ marginTop: "8px" }}>
                        {/* spacer matches image column exactly */}
                        <Column style={{ width: "64px" }} />
                        <Column>
                          <Section style={styles.itemAddonBlock}>
                            <Text style={styles.itemAddonLabel}>Add-ons</Text>
                            {item.addons!.map((addon, aIdx) => (
                              <Row
                                key={aIdx}
                                style={{ marginTop: aIdx === 0 ? "0" : "5px" }}
                              >
                                <Column>
                                  <Text style={styles.itemAddonName}>
                                    {addon.name}
                                  </Text>
                                  {addon.variantName &&
                                    addon.variantName.trim() !== "" && (
                                      <Text style={styles.itemAddonVariant}>
                                        {addon.variantName}
                                      </Text>
                                    )}
                                </Column>
                                <Column align="right">
                                  <Text style={styles.itemAddonPrice}>
                                    {addon.price > 0
                                      ? `+$${addon.price.toFixed(2)}`
                                      : "Free"}
                                  </Text>
                                </Column>
                              </Row>
                            ))}
                          </Section>
                        </Column>
                      </Row>
                    )}
                  </Section>
                );
              })}
            </Section>

            <Hr style={styles.hrSection} />

            {/* ── FULFILLMENT ───────────────────────────────────────────── */}
            <Section style={styles.section}>
              <Text style={styles.sectionHeader}>
                {isDelivery ? "Delivery" : "Pickup"}
              </Text>

              {order.deliveryInfo.deliveryDates?.length > 0 &&
                order.deliveryInfo.deliveryDates.map((dateObj, idx) => (
                  <Row key={idx} style={{ marginBottom: "12px" }}>
                    <Column>
                      <Text style={styles.infoLabel}>Date &amp; Time</Text>
                    </Column>
                    <Column align="right">
                      <Text style={styles.infoValue}>
                        {format(new Date(dateObj.date), "EEE, MMMM d, yyyy")}
                      </Text>
                      <Text style={styles.infoValueSub}>
                        {dateObj.timeSlot}
                      </Text>
                    </Column>
                  </Row>
                ))}

              {isDelivery && (
                <Row>
                  <Column>
                    <Text style={styles.infoLabel}>Address</Text>
                  </Column>
                  <Column align="right">
                    <Text style={styles.infoValue}>
                      {order.deliveryInfo.address || "Address pending"}
                    </Text>
                  </Column>
                </Row>
              )}
            </Section>

            <Hr style={styles.hrSection} />

            {/* ── ORDER INFORMATION ─────────────────────────────────────── */}
            <Section style={styles.section}>
              <Text style={styles.sectionHeader}>Order Information</Text>

              <Row style={{ marginBottom: "12px" }}>
                <Column>
                  <Text style={styles.infoLabel}>Order ID</Text>
                </Column>
                <Column align="right">
                  <Text style={styles.infoValueMono}>#{orderIdShort}</Text>
                </Column>
              </Row>

              <Row style={{ marginBottom: "12px" }}>
                <Column>
                  <Text style={styles.infoLabel}>Date</Text>
                </Column>
                <Column align="right">
                  <Text style={styles.infoValue}>{dateFormatted}</Text>
                </Column>
              </Row>

              <Row style={{ marginBottom: "12px" }}>
                <Column>
                  <Text style={styles.infoLabel}>Customer</Text>
                </Column>
                <Column align="right">
                  <Text style={styles.infoValue}>
                    {order.customerInfo.name}
                  </Text>
                </Column>
              </Row>

              <Row style={{ marginBottom: "12px" }}>
                <Column>
                  <Text style={styles.infoLabel}>Phone</Text>
                </Column>
                <Column align="right">
                  <Text style={styles.infoValue}>
                    {order.customerInfo.phone}
                  </Text>
                </Column>
              </Row>

              {order.customerInfo.email &&
                !order.customerInfo.email.includes("placeholder.com") && (
                  <Row style={{ marginBottom: "12px" }}>
                    <Column>
                      <Text style={styles.infoLabel}>Email</Text>
                    </Column>
                    <Column align="right">
                      <Text style={styles.infoValue}>
                        {order.customerInfo.email}
                      </Text>
                    </Column>
                  </Row>
                )}

              {order.customerInfo.socialPlatform &&
                order.customerInfo.socialNickname?.trim() && (
                  <Row style={{ marginBottom: "12px" }}>
                    <Column>
                      <Text style={styles.infoLabel}>Social</Text>
                    </Column>
                    <Column align="right">
                      
                    <Text>
                    @{order.customerInfo.socialNickname}
                    </Text>
                    </Column>
                  </Row>
                )}

              <Row>
                <Column>
                  <Text style={styles.infoLabel}>Payment Status</Text>
                </Column>
                <Column align="right">
                  {isPaid ? (
                    <Text style={styles.badgePaid}>PAID</Text>
                  ) : (
                    <Text style={styles.badgePending}>PENDING</Text>
                  )}
                </Column>
              </Row>
            </Section>

            {/* ── PAYMENT INSTRUCTIONS ──────────────────────────────────── */}
            {isPaid ? (
              <Section style={styles.paymentBannerPaid}>
                <Text style={styles.paymentBannerText}>
                  ✅ Payment Confirmed — Thank you!
                </Text>
              </Section>
            ) : expectedMethod === "e-transfer" ? (
              <Section style={styles.paymentBannerUnpaid}>
                <Text style={styles.paymentBannerText}>
                  <strong>Action Required:</strong> Your request is approved!
                  Payment of <strong>${order.totalAmount.toFixed(2)}</strong>{" "}
                  via e-transfer
                  <Link
                    href={`mailto:${SENDER_EMAIL}`}
                    style={{ color: C.amber700 }}
                  >
                    {SENDER_EMAIL}
                  </Link>{" "}
                  to secure your spot.
                </Text>
              </Section>
            ) : expectedMethod === "cash" ? (
              <Section style={styles.paymentBannerUnpaid}>
                <Text style={styles.paymentBannerText}>
                  💵 <strong>Payment Due at Pickup:</strong> Your order is
                  approved! Please bring{" "}
                  <strong>${order.totalAmount.toFixed(2)}</strong> in cash when
                  you pick up your order.
                </Text>
              </Section>
            ) : null}

            <Hr style={styles.hrSection} />

            {/* ── NEED HELP ─────────────────────────────────────────────── */}
            <Section style={styles.section}>
              <Section style={styles.helpCard}>
                <Text style={styles.helpTitle}>Need help?</Text>
                <Text style={styles.helpText}>
                  Our support team is happy to help with any concern you might
                  have.
                </Text>
                <Link href={`mailto:${SENDER_EMAIL}`} style={styles.helpButton}>
                  Contact support
                </Link>
              </Section>
            </Section>
          </Section>
          {/* ── END MAIN CARD ──────────────────────────────────────────── */}

          {/* ── FOOTER ──────────────────────────────────────────────────── */}
          <Section style={styles.footer}>
            <Section style={styles.footerLinksSection}>
              <Link
                href={`https://www.instagram.com/${InstaLink}`}
                style={styles.footerLink}
              >
                Instagram
              </Link>
              <Hr style={styles.footerHr} />
              <Link href={FacebookLink} style={styles.footerLink}>
                Facebook
              </Link>
              <Hr style={styles.footerHr} />
            </Section>
            <Text style={styles.footerThanks}>
              Thank you for your order! 💖
            </Text>
            <Img
              src={`${baseUrl}/logo_1.2.svg`}
              width="60"
              height="60"
              alt="D&K Creations"
              style={styles.footerLogo}
            />
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default OrderConfirmationEmail;

// ─── STYLES ────────────────────────────────────────────────────────────────

const styles = {
  // ── layout
  body: {
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    margin: "0",
    padding: "0",
    backgroundColor: "#EAE0DF",
  },
  container: {
    margin: "0 auto",
    width: "520px",
    maxWidth: "100%",
  },

  // ── header — warm brand bg, left-aligned, Uber-style
  header: {
    backgroundColor: C.primary10,
    padding: "32px 32px 28px",
  },
  logo: {
    display: "block",
    marginBottom: "20px",
  },
  headerDate: {
    color: C.primary40,
    fontSize: "13px",
    fontWeight: "400",
    margin: "0 0 10px",
  },
  headerTitle: {
    color: C.primary,
    fontSize: "26px",
    fontWeight: "800",
    lineHeight: "1.25",
    margin: "0 0 12px",
  },
  headerSubtitle: {
    color: C.primary60,
    fontSize: "14px",
    fontWeight: "400",
    lineHeight: "1.5",
    margin: "0",
  },

  // ── main card — white body
  mainCard: {
    backgroundColor: C.white,
  },

  // ── shared section wrapper
  section: {
    padding: "24px 32px",
  },
  sectionHeader: {
    color: C.primary,
    fontSize: "18px",
    fontWeight: "700",
    margin: "0 0 16px",
  },

  // ── dividers
  hr: {
    borderColor: C.grayBorder2,
    margin: "16px 0",
  },
  hrSection: {
    borderColor: C.grayBorder2,
    margin: "0",
  },

  // ── financial — total (large, prominent at top)
  totalLabel: {
    color: C.primary,
    fontSize: "20px",
    fontWeight: "700",
    margin: "0",
  },
  totalAmount: {
    color: C.primary,
    fontSize: "28px",
    fontWeight: "800",
    margin: "0",
    textAlign: "right" as const,
  },

  // ── financial — per-item rows
  finLabel: {
    color: C.primary60,
    fontSize: "14px",
    fontWeight: "400",
    margin: "0",
  },
  finValue: {
    color: C.primary60,
    fontSize: "14px",
    fontWeight: "400",
    margin: "0",
    textAlign: "right" as const,
  },

  // ── financial — extras sub-block
  extrasBlock: {
    borderLeft: `2px solid ${C.primaryBorder}`,
    paddingLeft: "10px",
    margin: "4px 0 10px",
  },
  extrasLabel: {
    color: C.primary40,
    fontSize: "9px",
    fontWeight: "700",
    letterSpacing: "2px",
    textTransform: "uppercase" as const,
    margin: "0 0 6px",
  },
  extrasItem: {
    color: C.primary60,
    fontSize: "13px",
    fontWeight: "400",
    margin: "0",
  },
  extrasItemPrice: {
    color: C.primary60,
    fontSize: "13px",
    fontWeight: "600",
    margin: "0",
    textAlign: "right" as const,
  },

  // ── financial — discount
  discountLabel: {
    color: C.green700,
    fontSize: "14px",
    fontWeight: "400",
    margin: "0 0 8px",
  },
  discountBadge: {
    backgroundColor: C.green100,
    color: C.green700,
    fontSize: "9px",
    fontWeight: "700",
    padding: "2px 5px",
    borderRadius: "4px",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  },
  discountAmount: {
    color: C.green700,
    fontSize: "14px",
    fontWeight: "600",
    margin: "0 0 8px",
    textAlign: "right" as const,
  },

  // ── line items
  itemRow: {
    paddingTop: "14px",
    paddingBottom: "14px",
  },
  itemImgCol: {
    width: "64px",
    paddingRight: "12px",
    verticalAlign: "top",
  },
  itemImg: {
    width: "56px",
    height: "56px",
    borderRadius: "10px",
    objectFit: "cover" as const,
    border: `1px solid ${C.grayBorder}`,
    display: "block",
  },
  itemImgPlaceholder: {
    width: "56px",
    height: "56px",
    borderRadius: "10px",
    backgroundColor: C.grayBorder,
    border: `1px solid ${C.grayBorder2}`,
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
  },
  itemName: {
    color: C.primary,
    fontSize: "14px",
    fontWeight: "700",
    margin: "0",
    lineHeight: "1.3",
  },
  itemPrice: {
    color: C.primary,
    fontSize: "14px",
    fontWeight: "600",
    margin: "0",
    textAlign: "right" as const,
  },
  itemMeta: {
    color: C.primary40,
    fontSize: "12px",
    fontWeight: "400",
    margin: "3px 0 0",
    lineHeight: "1.4",
  },

  // ── item addon block
  itemAddonBlock: {
    backgroundColor: C.grayBg,
    border: `1px solid ${C.grayBorder}`,
    borderRadius: "8px",
    padding: "8px 12px",
  },
  itemAddonLabel: {
    color: C.primary40,
    fontSize: "9px",
    fontWeight: "700",
    letterSpacing: "2px",
    textTransform: "uppercase" as const,
    margin: "0 0 6px",
  },
  itemAddonName: {
    color: C.primary60,
    fontSize: "12px",
    fontWeight: "700",
    margin: "0",
    lineHeight: "1.3",
  },
  itemAddonVariant: {
    color: C.primary40,
    fontSize: "11px",
    fontWeight: "400",
    margin: "1px 0 0",
  },
  itemAddonPrice: {
    color: C.primary,
    fontSize: "12px",
    fontWeight: "700",
    margin: "0",
    textAlign: "right" as const,
  },

  // ── info rows — fulfillment & order information
  infoLabel: {
    color: C.primary40,
    fontSize: "13px",
    fontWeight: "400",
    margin: "0",
  },
  infoValue: {
    color: C.primary,
    fontSize: "14px",
    fontWeight: "500",
    margin: "0",
    textAlign: "right" as const,
  },
  infoValueSub: {
    color: C.primary60,
    fontSize: "13px",
    fontWeight: "400",
    margin: "2px 0 0",
    textAlign: "right" as const,
  },
  infoValueMono: {
    color: C.primary,
    fontSize: "14px",
    fontWeight: "700",
    fontFamily: "monospace",
    margin: "0",
    textAlign: "right" as const,
  },
  socialLink: {
    color: C.primary60,
    fontSize: "13px",
    fontWeight: "500",
    textDecoration: "underline",
    display: "block",
    textAlign: "right" as const,
  },

  // ── status badges
  badgePaid: {
    backgroundColor: C.green100,
    color: C.green700,
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 10px",
    borderRadius: "999px",
    letterSpacing: "1px",
    margin: "0",
    display: "inline-block",
    textAlign: "right" as const,
  },
  badgePending: {
    backgroundColor: C.amber100,
    color: C.amber700,
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 10px",
    borderRadius: "999px",
    letterSpacing: "1px",
    margin: "0",
    display: "inline-block",
    textAlign: "right" as const,
  },

  // ── payment instruction banners
  paymentBannerPaid: {
    backgroundColor: C.green100,
    borderTop: `1px solid #BBF7D0`,
    padding: "16px 32px",
    textAlign: "center" as const,
  },
  paymentBannerUnpaid: {
    backgroundColor: C.amber100,
    borderTop: `1px solid #FDE68A`,
    padding: "16px 32px",
    textAlign: "center" as const,
  },
  paymentBannerText: {
    fontSize: "13px",
    fontWeight: "500",
    margin: "0",
    lineHeight: "1.6",
  },

  // ── need help card
  helpCard: {
    border: `1px solid ${C.grayBorder2}`,
    borderRadius: "12px",
    padding: "20px 24px",
    textAlign: "center" as const,
  },
  helpTitle: {
    color: C.primary,
    fontSize: "16px",
    fontWeight: "700",
    margin: "0 0 6px",
    textAlign: "center" as const,
  },
  helpText: {
    color: C.primary60,
    fontSize: "13px",
    fontWeight: "400",
    lineHeight: "1.5",
    margin: "0 0 14px",
    textAlign: "center" as const,
  },
  helpButton: {
    backgroundColor: C.grayBg,
    border: `1px solid ${C.grayBorder2}`,
    borderRadius: "8px",
    color: C.primary,
    fontSize: "13px",
    fontWeight: "600",
    padding: "10px 24px",
    textDecoration: "none",
    display: "block",
    textAlign: "center" as const,
  },

  // ── footer — dark brand background, Uber-style link list
  footer: {
    backgroundColor: C.primary,
  },
  footerLinksSection: {
    padding: "0 32px",
  },
  footerLink: {
    color: C.white,
    fontSize: "14px",
    fontWeight: "400",
    textDecoration: "none",
    display: "block",
    padding: "16px 0",
  },
  footerHr: {
    borderColor: "rgba(255,255,255,0.12)",
    margin: "0",
  },
  footerThanks: {
    color: "rgba(255,255,255,0.55)",
    fontSize: "13px",
    fontWeight: "400",
    textAlign: "center" as const,
    margin: "20px 32px 16px",
  },
  footerLogo: {
    display: "block",
    margin: "0 auto 28px",
  },
} as const;
