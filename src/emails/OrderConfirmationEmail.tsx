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
                <Column style={{ width: "50%" }}>
                  <Text style={styles.metaLabel}>Date</Text>
                  <Text style={styles.metaValue}>{dateFormatted}</Text>
                </Column>
              </Row>

              <Hr style={styles.metaDivider} />

              <Text style={styles.metaLabel}>Customer</Text>
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
                {isDelivery ? "Delivery To" : "Pickup"}
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

            {/* ── FINANCIAL BREAKDOWN ──────────────────────────────────────── */}
            <Section style={styles.financialSection}>
              {/* Per-item rows — base price only (rowTotal minus that item's addon cost) */}
              {order.items.map((item: CartItem, idx: number) => {
                const itemAddonCost =
                  (item.addons || []).reduce((s, a) => s + a.price, 0) *
                  item.quantity;
                const itemBaseTotal =
                  (item.rowTotal || item.price * item.quantity) - itemAddonCost;
                return (
                  <Row key={idx}>
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
                    <Section style={styles.discountRow}>
                      <Text style={styles.discountLabel}>
                        Discount
                        {(order.discountInfo.code ||
                          order.discountInfo.name) && (
                            <span style={styles.discountBadge}>
                              {" "}
                              {order.discountInfo.code || order.discountInfo.name}
                            </span>
                          )}
                      </Text>
                    </Section>
                  </Column>
                  <Column align="right">
                    <Text style={styles.discountAmount}>
                      −${order.discountInfo.amount.toFixed(2)}
                    </Text>
                  </Column>
                </Row>
              )}

              <Hr style={styles.totalDivider} />

              {/* Total */}
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

            {/* ── PAYMENT INSTRUCTIONS ─────────────────────────────────────── */}
            {isPaid ? (
              <Section style={styles.paymentInstructionBanner.paid}>
                <Text style={styles.paymentInstructionBanner.text}>
                  ✅ Payment Confirmed — Thank you!
                </Text>
              </Section>
            ) : expectedMethod === "e-transfer" ? (
              <Section style={styles.paymentInstructionBanner.unpaid}>
                <Text style={styles.paymentInstructionBanner.text}>
                  📩 <strong>Action Required:</strong> Your order is approved!
                  Please send{" "}
                  <strong>${order.totalAmount.toFixed(2)}</strong> via
                  e-transfer to{" "}
                  <Link href={`mailto:${SENDER_EMAIL}`} style={{ color: C.amber700 }}>
                    {SENDER_EMAIL}
                  </Link>{" "}
                  to secure your spot.
                </Text>
              </Section>
            ) : expectedMethod === "cash" ? (
              <Section style={styles.paymentInstructionBanner.unpaid}>
                <Text style={styles.paymentInstructionBanner.text}>
                  💵 <strong>Payment Due at Pickup:</strong> Your order is
                  approved! Please bring{" "}
                  <strong>${order.totalAmount.toFixed(2)}</strong> in cash when
                  you pick up your order.
                </Text>
              </Section>
            ) : null}

            {/* ── FOOTER ──────────────────────────────────────────────────── */}
            <Section style={styles.footer}>
              <Text style={styles.footerThanks}>
                Thank you for your order! 💖
              </Text>
              <Text style={styles.footerHandle}>
                {/* @d&amp;kcreations &bull; d&amp;kcreations.com */}
              </Text>
              <Row style={{ marginTop: "16px" }}>
                <Column
                  align="right"
                  style={{ width: "50%", paddingRight: "8px" }}
                >
                  <Link
                    href={`https://www.instagram.com/${InstaLink}`}
                    style={styles.socialLinkFooter}
                  >
                    Instagram
                  </Link>
                </Column>
                <Column style={{ width: "2px" }}>
                  <Text style={styles.footerSep}>·</Text>
                </Column>
                <Column
                  align="left"
                  style={{ width: "50%", paddingLeft: "8px" }}
                >
                  <Link href={FacebookLink} style={styles.socialLinkFooter}>
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

  // card shell
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

  // ── meta section
  metaSection: {
    backgroundColor: "rgba(249,250,251,0.8)",
    borderTop: `1px solid ${C.grayBorder}`,
    borderBottom: `1px solid ${C.grayBorder}`,
    padding: "16px 24px",
  },
  metaDivider: {
    borderColor: C.grayBorder,
    margin: "12px 0",
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
    padding: "20px 24px",
  },
  sectionLabel: {
    color: C.primary60,
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "2px",
    textTransform: "uppercase" as const,
    margin: "0 0 10px",
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
    width: "64px",
    paddingRight: "8px",
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

  // ── item addon block (indented card, aligned with details column)
  itemAddonBlock: {
    backgroundColor: C.grayBg,
    border: `1px solid ${C.grayBorder}`,
    borderRadius: "10px",
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
    fontWeight: "500",
    margin: "1px 0 0",
  },
  itemAddonPrice: {
    color: C.primary,
    fontSize: "12px",
    fontWeight: "700",
    margin: "0",
    textAlign: "right" as const,
  },

  // ── financial
  financialSection: {
    backgroundColor: "rgba(249,250,251,0.5)",
    borderTop: `1px solid ${C.grayBorder}`,
    padding: "20px 24px",
  },
  finLabel: {
    color: C.primary40,
    fontSize: "13px",
    fontWeight: "500",
    margin: "0 0 7px",
  },
  finValue: {
    color: C.primary40,
    fontSize: "13px",
    fontWeight: "500",
    margin: "0 0 7px",
    textAlign: "right" as const,
  },

  // extras sub-block — left border accent in primaryBorder (matches the visualization)
  extrasBlock: {
    borderLeft: `2px solid ${C.primaryBorder}`,
    borderRadius: "0",
    paddingLeft: "10px",
    margin: "4px 0 8px",
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
    fontSize: "12px",
    fontWeight: "500",
    margin: "0",
  },
  extrasItemPrice: {
    color: C.primary60,
    fontSize: "12px",
    fontWeight: "700",
    margin: "0",
    textAlign: "right" as const,
  },

  // discount
  discountRow: {
    borderLeft: `3px solid #86EFAC`,
    borderRadius: "0",
    paddingLeft: "8px",
    margin: "0 0 8px",
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
    margin: "0 0 8px",
    textAlign: "right" as const,
  },

  // total
  totalDivider: {
    borderColor: C.grayBorder2,
    margin: "4px 0 12px",
  },
  totalLabel: {
    color: C.primary40,
    fontSize: "13px",
    fontWeight: "500",
    margin: "0",
  },
  totalAmount: {
    color: C.primary,
    fontSize: "24px",
    fontWeight: "800",
    margin: "0",
    textAlign: "right" as const,
  },

  // ── CTA (kept for future use)
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


  // ── payment instruction banner
  paymentInstructionBanner: {
    paid: {
      backgroundColor: C.green100,
      borderTop: `1px solid #BBF7D0`,
      padding: "14px 24px",
      textAlign: "center" as const,
    },
    unpaid: {
      backgroundColor: C.amber100,
      borderTop: `1px solid #FDE68A`,
      padding: "14px 24px",
      textAlign: "center" as const,
    },
    text: {
      fontSize: "13px",
      fontWeight: "500",
      margin: "0",
      lineHeight: "1.6",
    },
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
  footerSep: {
    color: C.primary40,
    fontSize: "12px",
    textAlign: "center" as const,
    margin: "0",
  },
  socialLinkFooter: {
    color: C.primary60,
    fontSize: "12px",
    fontWeight: "600",
    textDecoration: "none",
  },
} as const;
