"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { sendEmailVerification, signOut } from "firebase/auth";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { Mail, LogOut,  Loader2 } from "lucide-react";
import { useAlert } from "@/contexts/AlertContext";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Initial check and setup
    const checkUser = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      setEmail(user.email);
      
      if (user.emailVerified) {
        router.push("/profile");
      }
    };

    checkUser();

    // Polling interval
    const intervalId = setInterval(async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          await user.reload();
          if (user.emailVerified) {
             showAlert("Email verified! Redirecting...", "success");
             router.push("/profile");
          }
        } catch (error) {
           console.error("Error checking verification status:", error);
        }
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(intervalId);
  }, [router, showAlert]);

  const handleResendEmail = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setIsResending(true);
    try {
      await sendEmailVerification(user);
      showAlert("Verification email sent! Check your inbox.", "success");
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        showAlert("Too many requests. Please check your spam folder or wait a moment.", "warning");
      } else {
        console.error("Error sending verification email:", error);
        showAlert("Failed to send email. Please try again.", "error");
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      showAlert("Failed to log out", "error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md text-center border-border shadow-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Mail className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-heading font-bold">Check your inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We sent a verification link to <span className="font-semibold text-foreground">{email}</span>.
          </p>
          <p className="text-sm text-muted-foreground">
             Please click the link to continue. This page will update automatically once verified.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button 
            onClick={handleResendEmail} 
            disabled={isResending} 
            className="w-full"
          >
            {isResending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                </>
            ) : (
                "Resend Email"
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full text-muted-foreground hover:text-foreground"
          >
             <LogOut className="mr-2 h-4 w-4" />
             Log out / Use different email
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
