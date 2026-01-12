"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase/client";
import { sendEmailVerification } from "firebase/auth";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Mail } from "lucide-react";
import { useAlert } from "@/contexts/AlertContext";

const EmailVerificationRequired = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { showAlert } = useAlert();
  const user = auth.currentUser;

  const handleResend = async () => {
    if (!user) {
      console.error("Debug: No current user found.");
      return;
    }

    console.log("Debug: Starting email verification for:", user.email);
    console.log("Debug: User Object:", user);

    setIsLoading(true);
    try {
      await sendEmailVerification(user);
      console.log("Debug: Email sent successfully.");
      showAlert("Verification email sent! Please check your inbox.", "success");
    } catch (error: any) {
      if (error.code === "auth/too-many-requests") {
        showAlert(
          "Too many requests. Please wait a few minutes before trying again.",
          "error"
        );
      } else {
        console.error("Debug: Error sending verification email:", error);
        showAlert(
          "Failed to send verification email. Please try again later.",
          "error"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="flex flex-col items-center space-y-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Mail className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verify your email address</CardTitle>
          <CardDescription className="text-base">
            We have sent a verification link to{" "}
            <span className="font-semibold text-foreground">{user.email}</span>.
            Please check your inbox and spam folder to access your order history and profile
            settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleResend}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? "Sending..." : "Resend Verification Email"}
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-muted-foreground hover:text-primary underline transition-colors"
          >
            Already verified? Refresh Page
          </button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EmailVerificationRequired;
