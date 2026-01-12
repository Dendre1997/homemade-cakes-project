"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAlert } from "@/contexts/AlertContext";
import { ShieldAlert, ArrowRight, Loader2 } from "lucide-react";

export default function VerifyAccessPage() {
  const [step, setStep] = useState<"initial" | "sent">("initial");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const { showAlert } = useAlert();
  const router = useRouter();

  const handleSendCode = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/2fa/send", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setStep("sent");
        showAlert("Verification code sent to your email.", "success");
      } else {
        showAlert(data.error || "Failed to send code.", "error");
      }
    } catch (error) {
        console.error(error);
      showAlert("An unexpected error occurred.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length < 6) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/2fa/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (res.ok) {
        showAlert("Device verified! Redirecting...", "success");
        router.push("/bakery-manufacturing-orders");
      } else {
        showAlert(data.error || "Invalid code.", "error");
      }
    } catch (error) {
        console.error(error);
      showAlert("Verification failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader className="flex flex-col items-center space-y-4">
          <div className="rounded-full bg-red-100 p-3">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Security Check</CardTitle>
          <CardDescription>
            {step === "initial"
              ? "This area is restricted. We need to verify your identity before proceeding."
              : "Enter the 6-digit code sent to your admin email."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === "initial" ? (
            <div className="py-4">
              <p className="text-sm text-gray-500 mb-6">
                You will need access to your email account to retrieve the verification code.
              </p>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <Input
                type="text"
                placeholder="123456"
                className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          {step === "initial" ? (
            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleSendCode} 
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send Verification Code
            </Button>
          ) : (
            <>
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleVerify}
                disabled={loading || code.length !== 6}
              >
                 {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verify & Enter <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="text"
                className="text-sm text-gray-500"
                onClick={handleSendCode}
                disabled={loading}
              >
                Resend Code
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
