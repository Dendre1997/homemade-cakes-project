"use client";

import { Order } from "@/types";

interface OrderDetailCustomerProps {
  customerInfo: Order["customerInfo"];
  deliveryInfo: Order["deliveryInfo"];
}

const OrderDetailCustomer = ({
  customerInfo,
  deliveryInfo,
}: OrderDetailCustomerProps) => {
  return (
    <div className="bg-card-background p-lg rounded-large shadow-md">
      <h2 className="font-heading text-h3 text-primary mb-md">
        Customer Details
      </h2>
      <div className="space-y-sm font-body text-body text-primary">
        <p>
          <strong>Name:</strong> {customerInfo.name}
        </p>
        <p>
          <strong>Email:</strong> {customerInfo.email}
        </p>
        <p>
          <strong>Phone:</strong> {customerInfo.phone}
        </p>
        <p>
          <strong>Method:</strong>{" "}
          <span className="capitalize">{deliveryInfo.method}</span>
        </p>
        {deliveryInfo.address && (
          <p>
            <strong>Address:</strong> {deliveryInfo.address}
          </p>
        )}
      </div>
    </div>
  );
};

export default OrderDetailCustomer;
