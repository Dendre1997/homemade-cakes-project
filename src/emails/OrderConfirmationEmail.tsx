import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Text,
  Img,
  Section,
  Row,
  Column,
  Hr,
  Link,
  Button,
} from "@react-email/components";
import { Order, CartItem } from "@/types";
import { format } from "date-fns";
import { SENDER_EMAIL } from "@/lib/email";

export interface OrderConfirmationEmailProps {
  order: Order;
  flavorMap?: Record<string, string>;
  diameterMap?: Record<string, string>;
  shapeMap?: Record<string, string>;
  pickupAddress?: string;
  eTransferEmail?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

const InstaLink = process.env.NEXT_PUBLIC_BAKERY_DM_HANDLE_INSTAGRAM;
const FacebookLink = process.env.NEXT_PUBLIC_BAKERY_DM_HANDLE_FACEBOOK;

// ─── Colour tokens ──────────────────────────────────────────────────────────
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
  shapeMap = {},
  pickupAddress,
  eTransferEmail,
}: OrderConfirmationEmailProps) => {
  const isPaid = order.isPaid;
  const expectedMethod = order.paymentDetails?.expectedMethod;
  const orderIdShort = order._id.toString().slice(-6).toUpperCase();
  const dateFormatted = format(new Date(order.createdAt), "MMMM d, yyyy");
  
  const isDelivery = order.deliveryInfo?.method === "delivery";
  const hasPickupAddress = !isDelivery && typeof pickupAddress === "string" && pickupAddress.trim() !== "";

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

  const getShapeName = (id?: string) => {
    if (!id) return "";
    if (id.length === 24 && /^[0-9a-fA-F]+$/.test(id))
      return shapeMap[id] || "";
    return id;
  };

  // ── addon extraction ──────────────────────────────────────────────────────
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
      <Head>
        {/* ── Progressive enhancement: media queries for email clients that support them ── */}
        <style>{`
          @media screen and (max-width: 480px) {
            .email-section { padding-left: 14px !important; padding-right: 14px !important; }
            .email-header  { padding: 22px 14px 18px !important; }
            .email-footer  { padding: 20px 14px !important; }
            .total-amount  { font-size: 22px !important; }
            .header-title  { font-size: 20px !important; }
            .help-card     { padding: 12px !important; }
            .thumb-col     { width: 52px !important; padding-right: 8px !important; }
            .thumb-img     { width: 44px !important; height: 44px !important; }
          }
        `}</style>
      </Head>
      <Preview>Thank you for your order! #{orderIdShort}</Preview>

      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* ── HEADER ── */}
          <Section style={styles.header} className="email-header">
            <Link href={`${baseUrl}`}>
              <Img
                src={`${baseUrl}/logo_1.2.svg`}
                width="72"
                height="72"
                alt="D&K Creations"
                style={styles.logo}
              />
            </Link>
            <Text style={styles.headerDate}>
              {format(new Date(order.createdAt), "MMM d, yyyy · h:mm a")}
            </Text>
            <Text style={styles.headerTitle} className="header-title">
              Thank you for your order,{"\n"}
              {order.customerInfo.name}!
            </Text>
            <Text style={styles.headerSub}>
              Check your order details below.
            </Text>
          </Section>

          {/* ── WHITE CONTENT CARD ── */}
          <Section style={styles.card}>
            {/* ── TOTAL ── */}
            <Section style={styles.section} className="email-section">
              <Row>
                <Column>
                  <Text style={styles.totalLabel}>Total</Text>
                </Column>
                <Column align="right">
                  <Text style={styles.totalAmount} className="total-amount">
                    ${order.totalAmount.toFixed(2)}
                  </Text>
                </Column>
              </Row>
            </Section>

            <Hr style={styles.divider} />

            {/* ── LINE ITEMS ── */}
            <Section style={styles.section} className="email-section">
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
                const displayShape = isCustom
                  ? item.customShape ||
                    getShapeName(item.selectedConfig?.cake?.shapeId)
                  : getShapeName(item.shapeId as any);

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
                const itemAddonCost =
                  (item.addons || []).reduce((s, a) => s + a.price, 0) *
                  item.quantity;
                const itemBaseTotal = rowTotal - itemAddonCost;
                const hasAddons = item.addons && item.addons.length > 0;

                return (
                  <Section
                    key={idx}
                    style={idx > 0 ? { marginTop: "16px" } : {}}
                  >
                    {/* Item main row */}
                    <Row>
                      {/* Thumbnail */}
                      <Column style={styles.thumbCol} className="thumb-col">
                        {itemImages.length > 0 ? (
                          <Img
                            src={itemImages[0]}
                            width="52"
                            height="52"
                            alt={item.name}
                            style={styles.thumb}
                            className="thumb-img"
                          />
                        ) : (
                          <Section style={styles.thumbPlaceholder} />
                        )}
                      </Column>

                      {/* Details */}
                      <Column style={styles.itemDetailsCol}>
                        <Row>
                          <Column style={styles.itemNameCol}>
                            <Text style={styles.itemName}>{item.name}</Text>
                          </Column>
                          <Column style={styles.itemPriceCol} align="right">
                            <Text style={styles.itemPrice}>
                              ${itemBaseTotal.toFixed(2)}
                            </Text>
                          </Column>
                        </Row>

                        {(displaySize || displayShape || displayFlavor) && (
                          <Text style={styles.itemMeta}>
                            {[
                              displaySize && `Size: ${displaySize}`,
                              displayShape && `Shape: ${displayShape}`,
                              displayFlavor && `Flavor: ${displayFlavor}`,
                            ]
                              .filter(Boolean)
                              .join("  ·  ")}
                          </Text>
                        )}

                        {item.flavorNote && item.flavorNote !== "No" && (
                          <Text style={styles.itemMeta}>
                            Flavor Note: {item.flavorNote}
                          </Text>
                        )}

                        {item.quantity > 1 && (
                          <Text style={styles.itemMeta}>
                            Qty: {item.quantity}
                          </Text>
                        )}

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

                    {/* Addon sub-rows */}
                    {hasAddons && (
                      <Row style={{ marginTop: "8px" }}>
                        <Column style={{ width: "60px" }} />
                        <Column>
                          {item.addons!.map((addon, aIdx) => (
                            <Row
                              key={aIdx}
                              style={aIdx > 0 ? { marginTop: "4px" } : {}}
                            >
                              <Column>
                                <Text style={styles.addonName}>
                                  + {addon.name}
                                  {addon.variantName &&
                                  addon.variantName.trim() !== ""
                                    ? ` · ${addon.variantName}`
                                    : ""}
                                </Text>
                              </Column>
                              <Column align="right">
                                <Text style={styles.addonPrice}>
                                  {addon.price > 0
                                    ? `+$${addon.price.toFixed(2)}`
                                    : "Free"}
                                </Text>
                              </Column>
                            </Row>
                          ))}
                        </Column>
                      </Row>
                    )}
                  </Section>
                );
              })}
            </Section>

            <Hr style={styles.divider} />

            {/* ── PAYMENT ── */}
            <Section style={styles.section} className="email-section">
              <Text style={styles.sectionHeader}>Payment</Text>

              {isPaid ? (
                <Row>
                  <Column>
                    <Text style={styles.paymentMethod}>
                      ✅ Payment confirmed
                    </Text>
                  </Column>
                  <Column align="right" style={styles.paymentAmountCol}>
                    <Text style={styles.paymentAmount}>
                      ${order.totalAmount.toFixed(2)}
                    </Text>
                  </Column>
                </Row>
              ) : expectedMethod === "e-transfer" ? (
                <Section style={styles.paymentBanner}>
                  <Text style={styles.paymentBannerText}>
                    Pay the total amount of{" "}
                    <strong>${order.totalAmount.toFixed(2)}</strong> the day
                    before pickup
                    {eTransferEmail ? (
                      <>
                        {" "}
                        by sending an e-transfer to{" "}
                        <strong>{eTransferEmail}</strong>.
                      </>
                    ) : (
                      <> via e-transfer. Payment details will follow separately.</>
                    )}
                  </Text>

                  {order.paymentToken && (
                    <Section style={{ textAlign: "center", marginTop: "14px" }}>
                      <Button
                        href={`${baseUrl}/pay/${order._id}?token=${order.paymentToken}`}
                        style={styles.payNowButton}
                      >
                        Pay Now via e-Transfer
                      </Button>
                    </Section>
                  )}
                </Section>
              ) : expectedMethod === "cash" ? (
                <Section style={styles.paymentBanner}>
                  <Text style={styles.paymentBannerText}>
                    Pay the total amount of{" "}
                    <strong>${order.totalAmount.toFixed(2)}</strong> at the
                    pickup in cash.
                  </Text>
                </Section>
              ) : null}
            </Section>

            <Hr style={styles.divider} />

            {/* ── FULFILLMENT ── */}
            <Section style={styles.section} className="email-section">
              <Text style={styles.sectionHeader}>
                {isDelivery ? "Delivery" : "Pickup"}
              </Text>

              {order.deliveryInfo.deliveryDates?.length > 0 &&
                order.deliveryInfo.deliveryDates.map((dateObj, idx) => (
                  <Row key={idx} style={idx > 0 ? { marginTop: "8px" } : {}}>
                    <Column style={styles.infoLabelCol}>
                      <Text style={styles.infoLabel}>
                        {isDelivery ? "Delivery date" : "Pickup date"}
                      </Text>
                    </Column>
                    <Column align="right" style={styles.infoValueCol}>
                      <Text style={styles.infoValue}>
                        {format(new Date(dateObj.date), "EEE, MMM d, yyyy")}
                      </Text>
                      <Text style={styles.infoValueSub}>
                        {dateObj.timeSlot}
                      </Text>
                    </Column>
                  </Row>
                ))}

              {isDelivery && (
                <Row style={{ marginTop: "10px" }}>
                  <Column style={styles.infoLabelCol}>
                    <Text style={styles.infoLabel}>Address</Text>
                  </Column>
                  <Column align="right" style={styles.infoValueCol}>
                    <Text style={styles.infoValue}>
                      {order.deliveryInfo.address || "Pending"}
                    </Text>
                  </Column>
                </Row>
              )}

              {hasPickupAddress && (
                <Row style={{ marginTop: "10px" }}>
                  <Column style={styles.infoLabelCol}>
                    <Text style={styles.infoLabel}>Pickup Location</Text>
                  </Column>
                  <Column align="right" style={styles.infoValueCol}>
                    <Text style={styles.infoValue}>
                      {pickupAddress}
                    </Text>
                  </Column>
                </Row>
              )}
            </Section>

            <Hr style={styles.divider} />

            {/* ── ADDITIONAL INFORMATION ── */}
            <Section style={styles.section} className="email-section">
              <Text style={styles.sectionHeader}>Additional information</Text>

              <Row>
                <Column style={styles.infoLabelCol}>
                  <Text style={styles.infoLabel}>Order ID</Text>
                </Column>
                <Column align="right" style={styles.infoValueCol}>
                  <Text style={styles.infoValueMono}>#{orderIdShort}</Text>
                </Column>
              </Row>

              <Row style={{ marginTop: "8px" }}>
                <Column style={styles.infoLabelCol}>
                  <Text style={styles.infoLabel}>Customer</Text>
                </Column>
                <Column align="right" style={styles.infoValueCol}>
                  <Text style={styles.infoValue}>
                    {order.customerInfo.name}
                  </Text>
                </Column>
              </Row>

              <Row style={{ marginTop: "8px" }}>
                <Column style={styles.infoLabelCol}>
                  <Text style={styles.infoLabel}>Phone</Text>
                </Column>
                <Column align="right" style={styles.infoValueCol}>
                  <Text style={styles.infoValue}>
                    {order.customerInfo.phone}
                  </Text>
                </Column>
              </Row>

              {order.customerInfo.email &&
                !order.customerInfo.email.includes("placeholder.com") && (
                  <Row style={{ marginTop: "8px" }}>
                    <Column style={styles.infoLabelCol}>
                      <Text style={styles.infoLabel}>Email</Text>
                    </Column>
                    <Column align="right" style={styles.infoValueCol}>
                      <Text style={styles.infoValue}>
                        {order.customerInfo.email}
                      </Text>
                    </Column>
                  </Row>
                )}

              {order.customerInfo.socialPlatform &&
                order.customerInfo.socialNickname?.trim() && (
                  <Row style={{ marginTop: "8px" }}>
                    <Column style={styles.infoLabelCol}>
                      <Text style={styles.infoLabel}>Social</Text>
                    </Column>
                    <Column align="right" style={styles.infoValueCol}>
                      <Text style={styles.infoLabel}>
                        @{order.customerInfo.socialNickname} (
                        {order.customerInfo.socialPlatform})
                      </Text>
                    </Column>
                  </Row>
                )}
            </Section>

            <Hr style={styles.divider} />

            {/* ── NEED HELP ── */}
            <Section style={styles.section} className="email-section">
              <Section style={styles.helpCard} className="help-card">
                <Text style={styles.helpTitle}>Need help?</Text>
                <Text style={styles.helpText}>
                  Need help or have a question? Log in and chat directly with
                  the baker—we’re happy to help!
                  <Link
                    href={`${baseUrl}/contact`}
                    style={{ color: C.primary60 }}
                  >
                    Click here
                  </Link>
                </Text>
              </Section>
            </Section>
          </Section>
          {/* ── END CARD ── */}

          {/* ── DARK FOOTER ── */}
          <Section style={styles.footer} className="email-footer">
            <Text style={styles.footerThanks}>
              Thank you for your order! 💖
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

export default OrderConfirmationEmail;

// ─── STYLES ────────────────────────────────────────────────────────────────

const styles = {
  // ── layout
  body: {
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    backgroundColor: C.grayBg,
    margin: "0",
    padding: "0",
    // Prevent iOS auto-zoom on small screens
    WebkitTextSizeAdjust: "100%",
    MsTextSizeAdjust: "100%",
  },
  container: {
    margin: "0 auto",
    // Use percentage width so it fills narrow viewports without a fixed pixel value
    width: "100%",
    maxWidth: "600px",
  },

  // ── header
  // Reduced side padding from 32px → 20px so it breathes on 320px screens
  header: {
    backgroundColor: "#EBEBEB",
    padding: "28px 20px 24px",
  },
  logo: {
    display: "block",
    marginBottom: "20px",
    // Cap so logo never overflows on tiny screens
    maxWidth: "72px",
    height: "auto",
  },
  headerDate: {
    color: "#666666",
    fontSize: "13px",
    fontWeight: "400",
    margin: "0 0 10px",
    lineHeight: "1.4",
  },
  // Reduced from 26px → 22px so long names don't overflow on 320px
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

  // ── shared section pad — reduced from 32px → 20px sides
  section: {
    padding: "20px 20px",
  },

  // ── divider
  divider: {
    borderColor: "#E5E7EB",
    borderTopWidth: "1px",
    margin: "0",
  },

  // ── total hero row
  totalLabel: {
    color: "#000000",
    fontSize: "16px",
    fontWeight: "700",
    margin: "0",
    lineHeight: "1.4",
  },
  // Reduced from 28px → 24px so "$1,234.00" doesn't overflow at 320px
  totalAmount: {
    color: "#000000",
    fontSize: "24px",
    fontWeight: "800",
    margin: "0",
    textAlign: "right" as const,
    lineHeight: "1.2",
    letterSpacing: "-0.5px",
    whiteSpace: "nowrap" as const,
  },

  // ── line items
  // Fixed at 52px — narrow enough that the right column still has ~230px on a 320px screen
  thumbCol: {
    width: "52px",
    paddingRight: "10px",
    verticalAlign: "top",
  },
  thumb: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    objectFit: "cover" as const,
    border: `1px solid ${C.grayBorder2}`,
    display: "block",
    // Prevents image from overflowing its cell
    maxWidth: "100%",
  },
  thumbPlaceholder: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    backgroundColor: C.grayBorder,
    border: `1px solid ${C.grayBorder2}`,
    display: "block",
  },
  itemDetailsCol: {
    verticalAlign: "top",
    // Take remaining width so name + price row has room
    width: "100%",
  },
  // Explicit column widths for the name/price inner row prevent overlap
  itemNameCol: {
    // Flex-grow substitute: take most of the space, leave ~70px for price
    width: "65%",
  },
  itemPriceCol: {
    width: "35%",
    // Prevent wrapping of short price strings like "$25.00"
    whiteSpace: "nowrap" as const,
  },
  itemName: {
    color: "#111111",
    fontSize: "14px",
    fontWeight: "700",
    margin: "0",
    lineHeight: "1.4",
    wordBreak: "break-word" as const,
    overflowWrap: "break-word" as const,
  },
  itemPrice: {
    color: "#111111",
    fontSize: "14px",
    fontWeight: "600",
    margin: "0",
    textAlign: "right" as const,
    lineHeight: "1.4",
    whiteSpace: "nowrap" as const,
  },
  itemMeta: {
    color: "#888888",
    fontSize: "12px",
    fontWeight: "400",
    margin: "3px 0 0",
    lineHeight: "1.4",
    wordBreak: "break-word" as const,
    overflowWrap: "break-word" as const,
  },

  // ── addon sub-rows (indented)
  addonName: {
    color: "#888888",
    fontSize: "12px",
    fontWeight: "400",
    margin: "0",
    lineHeight: "1.4",
    wordBreak: "break-word" as const,
    overflowWrap: "break-word" as const,
  },
  addonPrice: {
    color: "#888888",
    fontSize: "12px",
    fontWeight: "500",
    margin: "0",
    textAlign: "right" as const,
    lineHeight: "1.4",
    whiteSpace: "nowrap" as const,
  },

  // ── financial summary
  summaryLabel: {
    color: "#555555",
    fontSize: "13px",
    fontWeight: "400",
    margin: "0",
    lineHeight: "1.5",
    wordBreak: "break-word" as const,
    overflowWrap: "break-word" as const,
  },
  // Pin value column to a fixed min-width so prices never get squished
  summaryValueCol: {
    whiteSpace: "nowrap" as const,
    width: "80px",
  },
  summaryValue: {
    color: "#555555",
    fontSize: "13px",
    fontWeight: "400",
    margin: "0",
    textAlign: "right" as const,
    lineHeight: "1.5",
    whiteSpace: "nowrap" as const,
  },

  // extras sub-block
  extrasBlock: {
    borderLeft: `3px solid ${C.primaryBorder}`,
    paddingLeft: "12px",
    margin: "10px 0 6px",
  },
  extrasHeader: {
    color: C.primary40,
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "1.5px",
    textTransform: "uppercase" as const,
    margin: "0 0 6px",
  },
  extrasItem: {
    color: C.primary60,
    fontSize: "12px",
    fontWeight: "400",
    margin: "0",
    lineHeight: "1.5",
    wordBreak: "break-word" as const,
    overflowWrap: "break-word" as const,
  },
  extrasValueCol: {
    whiteSpace: "nowrap" as const,
    width: "80px",
  },
  extrasItemPrice: {
    color: C.primary60,
    fontSize: "12px",
    fontWeight: "600",
    margin: "0",
    textAlign: "right" as const,
    lineHeight: "1.5",
    whiteSpace: "nowrap" as const,
  },

  // discount
  discountLabel: {
    color: C.green700,
    fontSize: "13px",
    fontWeight: "400",
    margin: "0",
    lineHeight: "1.5",
    wordBreak: "break-word" as const,
  },
  discountValueCol: {
    whiteSpace: "nowrap" as const,
    width: "80px",
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
    fontSize: "13px",
    fontWeight: "600",
    margin: "0",
    textAlign: "right" as const,
    lineHeight: "1.5",
    whiteSpace: "nowrap" as const,
  },

  // ── section header
  sectionHeader: {
    color: "#000000",
    fontSize: "16px",
    fontWeight: "700",
    margin: "0 0 14px",
    lineHeight: "1.3",
  },

  // ── payment
  paymentMethod: {
    color: C.green700,
    fontSize: "14px",
    fontWeight: "500",
    margin: "0",
    lineHeight: "1.5",
  },
  paymentAmountCol: {
    whiteSpace: "nowrap" as const,
    width: "100px",
  },
  paymentAmount: {
    color: "#111111",
    fontSize: "14px",
    fontWeight: "600",
    margin: "0",
    textAlign: "right" as const,
    lineHeight: "1.5",
    whiteSpace: "nowrap" as const,
  },
  paymentBanner: {
    backgroundColor: C.amber100,
    border: `1px solid #FDE68A`,
    borderRadius: "10px",
    // Tighter padding on sides for narrow screens
    padding: "12px 14px",
  },
  paymentBannerText: {
    color: "#92400E",
    fontSize: "13px",
    fontWeight: "400",
    margin: "0",
    lineHeight: "1.6",
    wordBreak: "break-word" as const,
    overflowWrap: "break-word" as const,
  },
  payNowButton: {
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

  // ── info rows — label column fixed, value column flex
  // Label gets a fixed min-width so it never crushes the value
  infoLabelCol: {
    width: "40%",
    minWidth: "80px",
  },
  // Value column takes remaining space; text wraps gracefully
  infoValueCol: {
    width: "60%",
  },
  infoLabel: {
    color: "#888888",
    fontSize: "13px",
    fontWeight: "400",
    margin: "0",
    lineHeight: "1.5",
  },
  infoValue: {
    color: "#111111",
    fontSize: "13px",
    fontWeight: "500",
    margin: "0",
    textAlign: "right" as const,
    lineHeight: "1.5",
    wordBreak: "break-word" as const,
    overflowWrap: "break-word" as const,
  },
  infoValueSub: {
    color: "#888888",
    fontSize: "12px",
    fontWeight: "400",
    margin: "2px 0 0",
    textAlign: "right" as const,
    lineHeight: "1.4",
    wordBreak: "break-word" as const,
  },
  infoValueMono: {
    color: "#111111",
    fontSize: "13px",
    fontWeight: "700",
    fontFamily: "monospace",
    margin: "0",
    textAlign: "right" as const,
    lineHeight: "1.5",
    // Order IDs are short uppercase hex — no break needed, but guard anyway
    wordBreak: "break-all" as const,
  },
  socialLink: {
    color: C.primary60,
    fontSize: "13px",
    fontWeight: "500",
    textDecoration: "underline",
    display: "block",
    textAlign: "right" as const,
    wordBreak: "break-word" as const,
    overflowWrap: "break-word" as const,
  },

  // ── need help card — reduced padding for narrow screens
  helpCard: {
    border: `1px solid #E5E7EB`,
    borderRadius: "12px",
    padding: "14px 16px",
    backgroundColor: C.white,
  },
  helpTitle: {
    color: "#000000",
    fontSize: "14px",
    fontWeight: "700",
    margin: "0 0 6px",
    lineHeight: "1.4",
  },
  helpText: {
    color: "#555555",
    fontSize: "13px",
    fontWeight: "400",
    margin: "0",
    lineHeight: "1.6",
    wordBreak: "break-word" as const,
    overflowWrap: "break-word" as const,
  },

  // ── dark footer — reduced side padding
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
