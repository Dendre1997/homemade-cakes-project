import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Img,
  Section,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface ContactRequestEmailProps {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const ContactRequestEmail = ({
  name,
  email,
  phone,
  message,
}: ContactRequestEmailProps) => (
  <Html>
    <Head />
    <Preview>New Contact Request from {name}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header with Logo */}
        <Section style={header}>
          <Img
            src={`${baseUrl}/logo-placeholder.png`}
            width="180"
            height="45"
            alt="Homemade Cakes Logo"
          />
        </Section>

        {/* Main Heading */}
        <Heading style={h1}>New Contact Request 📬</Heading>
        <Text style={subheading}>
          You have received a new message from the contact form.
        </Text>

        <Section style={card}>
          {/* Sender Details */}
          <Heading as="h2" style={sectionHeading}>
            Sender Details
          </Heading>
          <Text style={details}>
            <strong>Name:</strong> {name}
          </Text>
          <Text style={details}>
            <strong>Email:</strong> {email}
          </Text>
          <Text style={details}>
            <strong>Phone:</strong> {phone}
          </Text>

          <Hr style={hr} />

          {/* Message */}
          <Heading as="h2" style={sectionHeading}>
            Message
          </Heading>
          <Text style={messageText}>{message}</Text>
        </Section>

        {/* Footer */}
        <Text style={footer}>Homemade Cakes Admin Notification</Text>
      </Container>
    </Body>
  </Html>
);

export default ContactRequestEmail;

// --- STYLES (Reused from NewOrderEmail.tsx) ---

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

const subheading = {
  color: "#4A2E2C",
  fontSize: "16px",
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

const messageText = {
  color: "#4A2E2C",
  fontSize: "16px",
  lineHeight: "26px",
  whiteSpace: "pre-wrap" as const,
  margin: "0",
};

const hr = {
  borderColor: "#EAE2D8",
  margin: "24px 0",
};

const footer = {
  color: "rgba(74, 46, 44, 0.6)",
  fontSize: "14px",
  textAlign: "center" as const,
  marginTop: "32px",
};
