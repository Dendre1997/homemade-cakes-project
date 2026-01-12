// src/emails/OrderConfirmationEmail.tsx
import {
  Body,
  Container,
  Head,
  Heading,
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

interface OrderConfirmationEmailProps {
  order: Order;
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const OrderConfirmationEmail = ({ order }: OrderConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Thank you for your order! #{order._id.slice(-6).toUpperCase()}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        {/* 1. Header with Logo */}
        <Section style={header}>
          <Img
            src={`${baseUrl}/logo-placeholder.png`} 
            width="180"
            height="45"
            alt="Homemade Cakes Logo"
          />
        </Section>

        {/* 2. Main Heading & Personalized Greeting */}
        <Section style={content}>
          <Heading style={h1}>Thank you for your order!</Heading>
          <Text style={greeting}>Hi {order.customerInfo.name},</Text>
          <Text style={text}>
            We`ve received your order and will get started on it right away.
            We`re so excited to bake for you!
          </Text>

          {/* 3. Order Summary Card */}
          <Section style={summaryCard}>
            <Row>
              <Column>
                <Text style={summaryLabel}>Order Number</Text>
                <Text style={summaryValue}>
                  #{order._id.slice(-6).toUpperCase()}
                </Text>
              </Column>
              <Column align="right">
                <Text style={summaryLabel}>Order Total</Text>
                <Text style={summaryValue}>
                  ${order.totalAmount.toFixed(2)} CAD
                </Text>
              </Column>
            </Row>
          </Section>

          {/* 4. Item Details */}
          <Heading as="h2" style={sectionHeading}>
            Your Order:
          </Heading>
          {order.items.map((item: CartItem) => (
            <Row key={item.id} style={itemRow}>
              <Column>
                <Text style={itemText}>
                  {item.name} (x{item.quantity})
                  <br />
                  <span style={itemFlavor}>{item.flavor}</span>
                </Text>
              </Column>
              <Column align="right">
                <Text style={itemPrice}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </Column>
            </Row>
          ))}

          <Hr style={hr} />

          {/* 5. "What's Next?" Section */}
          <Heading as="h2" style={sectionHeading}>
            What`s Next?
          </Heading>
          <Text style={text}>
            We`re already working on your order. We`ll contact you if any
            questions arise. In the meantime, you can view your order status on
            your profile page.
          </Text>

          {/* 6. Call to Action Button */}
          <Section style={ctaSection}>
            <Button style={secondaryButton} href={`${baseUrl}/profile`}>
              View Order Status
            </Button>
          </Section>
        </Section>

        {/* 7. Decorative Footer with Socials */}
        <Section style={footer}>
          <Row>
            <Column align="center">
              <Text style={footerText}>Stay connected with us!</Text>
              <Row style={{ marginTop: "16px" }}>
                <Column align="right" style={{ paddingRight: "8px" }}>
                  <Link href="https://instagram.com">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="#ffff"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </Link>
                </Column>
                <Column align="left" style={{ paddingLeft: "8px" }}>
                  <Link href="https://facebook.com">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                                            viewBox="0 0 24 24"
                                            fill="#ffff"
                    >
                      <path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2 10h-2v2h2v6h3v-6h1.82l.18-2h-2v-.833c0-.478.096-.667.558-.667h1.442v-2.5h-2.404c-1.798 0-2.596.792-2.596 2.308v1.692z" />
                    </svg>
                  </Link>
                </Column>
              </Row>
            </Column>
          </Row>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default OrderConfirmationEmail;

// --- STYLES ---

const main = {
  backgroundColor: "#F5F2ED", 
  fontFamily:
    '"Existence Light", "Helvetica Neue", Helvetica, Arial, sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  width: "580px",
  maxWidth: "100%",
};

const header = {
  padding: "20px 0",
  textAlign: "center" as const,
  backgroundColor: "#F5F2ED",
};

const content = {
  backgroundColor: "#FFFFFF",
  padding: "32px",
  borderRadius: "8px",
  border: "1px solid #EAE2D8",
};

const h1 = {
  fontFamily: '"Appleberry", "Georgia", serif',
  color: "#4A2E2C",
  fontSize: "32px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 30px 0",
};

const greeting = {
  color: "#4A2E2C",
  fontSize: "20px",
  lineHeight: "28px",
};

const text = {
  color: "#4A2E2C",
  fontSize: "16px",
  lineHeight: "26px",
};

const summaryCard = {
  backgroundColor: "#F5F2ED",
  borderRadius: "8px",
  border: "1px solid #C58C5F",
  padding: "20px",
  margin: "24px 0",
};

const summaryLabel = {
  fontSize: "14px",
  color: "rgba(74, 46, 44, 0.8)",
  margin: "0",
};

const summaryValue = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#4A2E2C",
  margin: "4px 0 0 0",
};

const sectionHeading = {
  color: "#4A2E2C",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "32px 0 16px 0",
};

const itemRow = { padding: "8px 0" };
const itemText = { color: "#4A2E2C", fontSize: "16px", margin: "0" };
const itemFlavor = { fontSize: "14px", color: "rgba(74, 46, 44, 0.8)" };
const itemPrice = { ...itemText, fontWeight: "bold" };
const hr = { borderColor: "#EAE2D8", margin: "24px 0" };

const ctaSection = { padding: "24px 0", textAlign: "center" as const };

const secondaryButton = {
  backgroundColor: "transparent",
  border: "1px solid #C58C5F",
  borderRadius: "8px",
  color: "#C58C5F",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  padding: "12px 24px",
};

const footer = {
  backgroundColor: "#4A2E2C",
  padding: "32px",
  marginTop: "32px",
  borderRadius: "8px",
};

const footerText = {
  color: "#F5F2ED",
  fontSize: "14px",
  textAlign: "center" as const,
};
