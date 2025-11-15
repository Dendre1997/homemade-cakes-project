// src/emails/NewOrderEmail.tsx
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
} from "@react-email/components";
import * as React from "react";
import { Order, CartItem } from "@/types";

interface NewOrderEmailProps {
  order: Order;
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const NewOrderEmail = ({ order }: NewOrderEmailProps) => (
  <Html>
    <Head />
    <Preview>New Order! #{order._id.slice(-6).toUpperCase()}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* 1. Header with Logo */}
        <Section style={header}>
          <Img
            src={`${baseUrl}/logo-placeholder.png`} // <-- Replace with your actual logo URL
            width="180"
            height="45"
            alt="Homemade Cakes Logo"
          />
        </Section>

        {/* 2. Main Heading */}
        <Heading style={h1}>New Order! 🎉</Heading>
        <Text style={orderIdText}>
          Order #{order._id.slice(-6).toUpperCase()}
        </Text>

        <Section style={card}>
          {/* 3. Customer Details */}
          <Heading as="h2" style={sectionHeading}>
            Customer
          </Heading>
          <Text style={details}>
            <strong>Name:</strong> {order.customerInfo.name}
          </Text>
          <Text style={details}>
            <strong>Email:</strong> {order.customerInfo.email}
          </Text>
          <Text style={details}>
            <strong>Phone:</strong> {order.customerInfo.phone}
          </Text>

          <Hr style={hr} />

          {/* 4. Order Items */}
          <Heading as="h2" style={sectionHeading}>
            Order
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

          {/* 5. Total */}
          <Row style={totalRow}>
            <Column>
              <Text style={totalTitle}>Total</Text>
            </Column>
            <Column align="right">
              <Text style={totalValue}>${order.totalAmount.toFixed(2)}</Text>
            </Column>
          </Row>
        </Section>

        {/* 6. Call to Action Button */}
        <Section style={ctaSection}>
          <Button style={button} href={`${baseUrl}/admin/orders/${order._id}`}>
            View in Admin Panel
          </Button>
        </Section>

        {/* 7. Footer */}
        <Text style={footer}>Homemade Cakes</Text>
      </Container>
    </Body>
  </Html>
);

export default NewOrderEmail;

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

const h1 = {
  fontFamily: '"Appleberry", "Georgia", serif',
  color: "#4A2E2C", 
  fontSize: "32px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0",
};

const orderIdText = {
  color: "#4A2E2C",
  fontSize: "18px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "10px 0 30px 0",
};

const card = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #EAE2D8", 
  borderRadius: "8px",
  padding: "32px",
};

const sectionHeading = {
  color: "#4A2E2C",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0 0 16px 0",
};

const details = {
  color: "#4A2E2C",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 8px 0",
};

const itemRow = {
  padding: "8px 0",
};

const itemText = {
  color: "#4A2E2C",
  fontSize: "16px",
  margin: "0",
};

const itemFlavor = {
  fontSize: "14px",
  color: "rgba(74, 46, 44, 0.8)",
};

const itemPrice = {
  ...itemText,
  fontWeight: "bold",
};

const hr = {
  borderColor: "#EAE2D8",
  margin: "24px 0",
};

const totalRow = {
  marginTop: "16px",
};

const totalTitle = {
  color: "#4A2E2C",
  fontSize: "18px",
  fontWeight: "bold",
};

const totalValue = {
  ...totalTitle,
};

const ctaSection = {
  padding: "32px 0",
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#C58C5F",
  borderRadius: "8px",
  color: "#FFFFFF",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const footer = {
  color: "rgba(74, 46, 44, 0.6)",
  fontSize: "14px",
  textAlign: "center" as const,
};
