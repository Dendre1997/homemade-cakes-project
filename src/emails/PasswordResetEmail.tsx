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
  Button,
} from "@react-email/components";

interface PasswordResetEmailProps {
  resetLink: string;
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const PasswordResetEmail = ({
  resetLink,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your Homemade Cakes password</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header with Logo */}
        <Section style={header}>
          <Img
            src={`${baseUrl}/new_logo_svg.png`}
            width="180"
            alt="D&K Creations Logo"
            style={{ margin: "0 auto" }}
          />
        </Section>

        {/* Main Heading */}
        <Heading style={h1}>Reset Your Password</Heading>

        <Section style={card}>
          <Text style={details}>
            Hello,
          </Text>
          <Text style={messageText}>
            We received a request to reset the password for your D&K Creations account. 
            If you made this request, please click the button below to securely reset your password.
          </Text>
          
          <Section style={btnContainer}>
            <Button style={button} href={resetLink}>
              Reset Password
            </Button>
          </Section>

          <Text style={messageText}>
            If you did not request a password reset, you can safely ignore this email.
          </Text>

          <Hr style={hr} />
          
          <Text style={{ ...messageText, fontSize: "14px", color: "rgba(74, 46, 44, 0.7)" }}>
            If the button above doesn't work, copy and paste this link into your browser: <br/>
            <span style={{ wordBreak: "break-all", color: "#8A6E56" }}>{resetLink}</span>
          </Text>
        </Section>

        {/* Footer */}
        <Text style={footer}>Homemade Cakes Security Notification</Text>
      </Container>
    </Body>
  </Html>
);

export default PasswordResetEmail;

// --- STYLES ---

const main = {
  backgroundColor: "#F5F2ED",
  fontFamily: '"Existence Light", "Helvetica Neue", Helvetica, Arial, sans-serif',
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
  margin: "0 0 20px 0",
};

const card = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #EAE2D8",
  borderRadius: "8px",
  padding: "32px",
};

const details = {
  color: "#4A2E2C",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px 0",
};

const messageText = {
  color: "#4A2E2C",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 16px 0",
};

const btnContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#8A6E56",
  borderRadius: "6px",
  color: "#fff",
  fontFamily: '"Existence Light", "Helvetica Neue", Helvetica, Arial, sans-serif',
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 24px",
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
