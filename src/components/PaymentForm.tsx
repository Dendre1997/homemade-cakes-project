import { Lock } from "lucide-react";

const PaymentForm = () => {
  return (
    <div>
      <h2 className="font-heading text-h3 text-primary">Payment Details</h2>
      <div className="mt-md rounded-medium border border-border p-md bg-card-background">
        <p className="font-body text-primary/80">
          Your payment provider`s form (e.g., Stripe) will be embedded here. It
          will be styled to match your inputs automatically.
        </p>
      </div>
      <div className="mt-sm flex items-center gap-sm text-small text-primary/80">
        <Lock className="h-4 w-4" />
        <span>Secure Payment</span>
      </div>
    </div>
  );
};

export default PaymentForm;
