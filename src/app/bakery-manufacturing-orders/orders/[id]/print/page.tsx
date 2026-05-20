"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Order, Diameter, Flavor } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPickupInfo(order: Order): { date: string; slot: string } | null {
  const dates = order.deliveryInfo?.deliveryDates;
  if (!dates || dates.length === 0) return null;
  const first = dates[0];
  return {
    date: format(new Date(first.date), "EEEE, MMMM d, yyyy"),
    slot: first.timeSlot ?? "",
  };
}

function getDiameterLabel(
  diameterId: string | undefined,
  diameters: Diameter[],
) {
  if (!diameterId) return null;
  const d = diameters.find((x) => x._id?.toString() === diameterId?.toString());
  return d?.name ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrintOrderPage() {
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [diameters, setDiameters] = useState<Diameter[]>([]);
  const [flavorMap, setFlavorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [imgLoaded, setImgLoaded] = useState<Record<number, boolean>>({});
  const printTriggered = useRef(false);

  const getFlavorName = (id?: string) => {
    if (!id) return "—";
    if (id.length === 24 && /^[0-9a-fA-F]+$/.test(id)) {
         return flavorMap[id] || "—";
    }
    return id; 
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/admin/orders/${id}`).then((r) => r.json()),
      fetch("/api/admin/diameters").then((r) => r.json()),
      fetch("/api/admin/flavors").then((r) => r.json()),
    ]).then(([orderData, diametersData, flavorsData]) => {
      setOrder(orderData);
      setDiameters(diametersData);
      const map: Record<string, string> = {};
      (flavorsData as Flavor[]).forEach((f) => (map[f._id] = f.name));
      setFlavorMap(map);
      setLoading(false);
    });
  }, [id]);

  // Auto-print once images settle
  useEffect(() => {
    if (loading || printTriggered.current) return;
    const allItems = order?.items ?? [];
    const withImages = allItems.filter((item) => item.imageUrl);
    const allImgsReady =
      withImages.length === 0 || withImages.every((_, i) => imgLoaded[i]);

    if (allImgsReady) {
      printTriggered.current = true;
      setTimeout(() => window.print(), 400);
    }
  }, [loading, imgLoaded, order]);

  if (loading) {
    return (
      <div className="print-loading">
        <div className="spinner" />
        <p>Preparing production sheet…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="print-loading">
        <p>Order not found.</p>
      </div>
    );
  }

  const pickup = getPickupInfo(order);
  const isPaid = order.isPaid;
  const isPickup = order.deliveryInfo?.method === "pickup";
  const orderId = order._id?.toString().slice(-6).toUpperCase();
  const customer = order.customerInfo;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --ink: #111;
          --ink-mid: #444;
          --ink-light: #888;
          --line: #ddd;
          --accent: #c0392b;
          --accent-bg: #fdf3f2;
          --paid-color: #1a6b3c;
          --paid-bg: #edfaf3;
          --page: #fff;
          --label-size: 9px;
          --body-size: 13px;
          --mono: 'DM Mono', monospace;
          --display: 'Playfair Display', serif;
          --sans: 'DM Sans', sans-serif;
        }

        html, body {
          background: #e8e8e8;
          font-family: var(--sans);
          color: var(--ink);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* ── Page wrapper ── */
        .sheet {
          background: var(--page);
          width: 210mm;
          min-height: 297mm;
          margin: 24px auto;
          padding: 0;
          box-shadow: 0 4px 32px rgba(0,0,0,.14);
          display: flex;
          flex-direction: column;
        }

        /* ── Header bar ── */
        .header {
          display: flex;
          align-items: stretch;
          border-bottom: 3px solid var(--ink);
        }
        .header-id {
          background: var(--ink);
          color: #fff;
          padding: 14px 20px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 120px;
        }
        .header-id .label {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: .12em;
          text-transform: uppercase;
          opacity: .7;
          margin-bottom: 2px;
        }
        .header-id .value {
          font-family: var(--mono);
          font-size: 22px;
          font-weight: 500;
          letter-spacing: .04em;
        }
        .header-main {
          flex: 1;
          padding: 12px 20px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 3px;
        }
        .header-main .pickup-date {
          font-family: var(--display);
          font-size: 20px;
          color: var(--ink);
          line-height: 1.1;
        }
        .header-main .pickup-time {
          font-family: var(--mono);
          font-size: 13px;
          color: var(--accent);
          letter-spacing: .04em;
        }
        .header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
          gap: 6px;
          padding: 12px 20px;
          border-left: 1px solid var(--line);
          min-width: 110px;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--mono);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: .08em;
          text-transform: uppercase;
          padding: 4px 9px;
          border-radius: 3px;
        }
        .badge-paid {
          background: var(--paid-bg);
          color: var(--paid-color);
          border: 1px solid #a3d9bc;
        }
        .badge-unpaid {
          background: #fff8ec;
          color: #9a5e00;
          border: 1px solid #f0d090;
        }
        .badge-method {
          background: #f0f4ff;
          color: #2a4ba0;
          border: 1px solid #bbc9f0;
        }

        /* ── Created stamp ── */
        .header-created {
          font-family: var(--mono);
          font-size: 9px;
          color: var(--ink-light);
          letter-spacing: .06em;
        }

        /* ── Body ── */
        .body {
          flex: 1;
          padding: 0;
        }

        /* ── Item block ── */
        .item-block {
          border-bottom: 1px solid var(--line);
          display: grid;
          grid-template-columns: 220px 1fr;
        }
        .item-block:last-child { border-bottom: none; }

        .item-image-col {
          border-right: 1px solid var(--line);
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          background: #fafafa;
        }
        .item-image-col .img-label {
          font-family: var(--mono);
          font-size: 8px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--ink-light);
        }
        .item-image-col img {
          width: 180px;
          height: 180px;
          object-fit: cover;
          border: 1px solid var(--line);
          display: block;
        }
        .item-image-col .no-image {
          width: 180px;
          height: 180px;
          border: 2px dashed var(--line);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--mono);
          font-size: 10px;
          color: var(--ink-light);
          letter-spacing: .08em;
        }

        .item-details-col {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Item name */
        .item-name {
          font-family: var(--display);
          font-size: 22px;
          color: var(--ink);
          line-height: 1.1;
        }
        .item-qty-badge {
          display: inline-block;
          background: var(--ink);
          color: #fff;
          font-family: var(--mono);
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 2px;
          margin-left: 8px;
          vertical-align: middle;
          letter-spacing: .06em;
        }

        /* Spec grid */
        .spec-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 16px;
        }
        .spec-item {}
        .spec-item .spec-label {
          font-family: var(--mono);
          font-size: 8px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--ink-light);
          margin-bottom: 2px;
        }
        .spec-item .spec-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--ink);
          line-height: 1.2;
        }
        .spec-item .spec-value.empty {
          color: var(--ink-light);
          font-weight: 400;
          font-style: italic;
        }

        /* Addons */
        .addons-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }
        .addon-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-family: var(--sans);
          font-weight: 500;
          background: #f5f5f5;
          border: 1px solid var(--line);
          border-radius: 3px;
          padding: 3px 8px;
          color: var(--ink-mid);
        }
        .addon-chip img {
          width: 18px;
          height: 18px;
          object-fit: cover;
          border-radius: 2px;
        }
        .addon-chip-label {
          font-family: var(--mono);
          font-size: 8px;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--ink-light);
          margin-right: 2px;
        }

        /* Design notes */
        .design-note-box {
          background: var(--accent-bg);
          border-left: 3px solid var(--accent);
          padding: 10px 12px;
        }
        .design-note-box .note-label {
          font-family: var(--mono);
          font-size: 8px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 4px;
        }
        .design-note-box .note-text {
          font-size: 13px;
          line-height: 1.5;
          color: var(--ink);
        }

        /* Inscription box */
        .inscription-box {
          border: 1px dashed var(--line);
          padding: 8px 12px;
          min-height: 44px;
        }
        .inscription-box .note-label {
          font-family: var(--mono);
          font-size: 8px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--ink-light);
          margin-bottom: 3px;
        }
        .inscription-box .inscription-text {
          font-family: var(--display);
          font-size: 18px;
          color: var(--ink);
          line-height: 1.3;
        }
        .inscription-box .inscription-empty {
          font-size: 12px;
          color: var(--ink-light);
          font-style: italic;
        }

        /* ── Customer footer ── */
        .customer-footer {
          border-top: 3px solid var(--ink);
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
        }
        .footer-cell {
          padding: 12px 20px;
          border-right: 1px solid var(--line);
        }
        .footer-cell:last-child { border-right: none; }
        .footer-cell .f-label {
          font-family: var(--mono);
          font-size: 8px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--ink-light);
          margin-bottom: 3px;
        }
        .footer-cell .f-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink);
        }
        .footer-cell .f-sub {
          font-size: 11px;
          color: var(--ink-mid);
          margin-top: 1px;
        }

        /* ── Total strip ── */
        .total-strip {
          background: var(--ink);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
        }
        .total-strip .t-label {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: .12em;
          text-transform: uppercase;
          opacity: .7;
        }
        .total-strip .t-amount {
          font-family: var(--mono);
          font-size: 20px;
          font-weight: 500;
        }
        .total-strip .t-payment {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: .08em;
          opacity: .8;
        }

        /* ── Loading ── */
        .print-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 16px;
          font-family: var(--mono);
          color: #555;
        }
        .spinner {
          width: 32px; height: 32px;
          border: 3px solid #ddd;
          border-top-color: #111;
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Print overrides ── */
        @media print {
          html, body { background: white !important; }
          .sheet {
            margin: 0;
            box-shadow: none;
            width: 100%;
            min-height: 100vh;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Print button (hidden in print) */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "12px",
          gap: "12px",
          fontFamily: "var(--sans)",
        }}
      >
        <button
          onClick={() => window.print()}
          style={{
            background: "#111",
            color: "#fff",
            border: "none",
            padding: "8px 20px",
            cursor: "pointer",
            fontFamily: "DM Mono, monospace",
            fontSize: "12px",
            letterSpacing: ".08em",
          }}
        >
          PRINT / SAVE PDF
        </button>
        <button
          onClick={() => window.close()}
          style={{
            background: "#fff",
            color: "#111",
            border: "1px solid #ddd",
            padding: "8px 20px",
            cursor: "pointer",
            fontFamily: "DM Mono, monospace",
            fontSize: "12px",
            letterSpacing: ".08em",
          }}
        >
          CLOSE
        </button>
      </div>

      <div className="sheet">
        {/* ── HEADER ── */}
        <div className="header">
          <div className="header-id">
            <span className="label">Order</span>
            <span className="value">#{orderId}</span>
          </div>

          <div className="header-main">
            {pickup ? (
              <>
                <div className="pickup-date">
                  {isPickup ? "Pickup · " : "Delivery · "}
                  {pickup.date}
                </div>
                {pickup.slot && (
                  <div className="pickup-time">⏱ {pickup.slot}</div>
                )}
              </>
            ) : (
              <div className="pickup-date" style={{ color: "#999" }}>
                No date assigned
              </div>
            )}
          </div>

          <div className="header-right">
            <span className={`badge ${isPaid ? "badge-paid" : "badge-unpaid"}`}>
              {isPaid ? "✓ Paid" : "⚠ Unpaid"}
            </span>
            {order.paymentDetails?.expectedMethod && (
              <span className="badge badge-method">
                {order.paymentDetails.expectedMethod}
              </span>
            )}
            <span className="header-created">
              {format(new Date(order.createdAt), "MMM d, yyyy")}
            </span>
          </div>
        </div>

        {/* ── ITEMS ── */}
        <div className="body">
          {order.items.map((item, idx) => {
            const refImage =
              item.imageUrl || order.referenceImages?.[0] || null;

            const isComboSet = item.selectedConfig && !!item.selectedConfig.cake;
            const isSimpleSet = item.selectedConfig && !item.selectedConfig.cake && (item.selectedConfig.items?.length || 0) > 0;
            const isCustom = item.productType === 'custom' || item.isCustom;

            const sizeLabel =
              item.customSize ||
              item.selectedConfig?.quantityConfigId ||
              getDiameterLabel(item.diameterId?.toString(), diameters);

            const primaryFlavor =
              item.customFlavor ||
              (isComboSet ? getFlavorName(item.selectedConfig?.cake?.flavorId) : getFlavorName(item.flavor));

            const hasDesignNote =
              item.designInstructions &&
              item.designInstructions.trim().length > 0;

            const inscriptionText = item.inscription || item.selectedConfig?.cake?.inscription;
            const hasInscription =
              inscriptionText && inscriptionText.trim().length > 0;

            const treats = item.selectedConfig?.items;

            return (
              <div className="item-block" key={item.id}>
                {/* Image column */}
                <div className="item-image-col">
                  <span className="img-label">Reference</span>
                  {refImage ? (
                    <img
                      src={refImage}
                      alt="Reference"
                      onLoad={() =>
                        setImgLoaded((prev) => ({ ...prev, [idx]: true }))
                      }
                      onError={() =>
                        setImgLoaded((prev) => ({ ...prev, [idx]: true }))
                      }
                    />
                  ) : (
                    <div className="no-image">NO IMAGE</div>
                  )}
                  {/* Addon images if any */}
                  {item.addons
                    ?.filter((a) => a.imageUrl)
                    .map((addon) => (
                      <div key={addon.addonId} style={{ textAlign: "center" }}>
                        <span
                          className="img-label"
                          style={{ display: "block", marginBottom: 4 }}
                        >
                          {addon.name}
                        </span>
                        <img
                          src={addon.imageUrl}
                          alt={addon.variantName}
                          style={{ width: 60, height: 60 }}
                          onLoad={() => {}}
                          onError={() => {}}
                        />
                      </div>
                    ))}
                </div>

                {/* Details column */}
                <div className="item-details-col">
                  {/* Name + qty */}
                  <div>
                    <span className="item-name">
                      {item.name}
                      {item.quantity > 1 && (
                        <span className="item-qty-badge">×{item.quantity}</span>
                      )}
                    </span>
                  </div>

                  {/* Specs */}
                  <div className="spec-grid">
                    <div className="spec-item">
                      <div className="spec-label">Size</div>
                      <div
                        className={`spec-value ${!sizeLabel ? "empty" : ""}`}
                      >
                        {sizeLabel ?? "—"}
                      </div>
                    </div>
                    {!isSimpleSet && (
                      <div className="spec-item">
                        <div className="spec-label">{isComboSet ? "Bento Flavor" : "Flavour"}</div>
                        <div
                          className={`spec-value ${!primaryFlavor || primaryFlavor === "—" ? "empty" : ""}`}
                        >
                          {primaryFlavor}
                        </div>
                      </div>
                    )}
                    <div className="spec-item">
                      <div className="spec-label">Type</div>
                      <div
                        className="spec-value"
                        style={{ textTransform: "capitalize" }}
                      >
                        {item.productType ?? (isComboSet ? "combo set" : isSimpleSet ? "simple set" : "standard")}
                      </div>
                    </div>
                    <div className="spec-item">
                      <div className="spec-label">Unit Price</div>
                      <div className="spec-value">
                        ${item.price?.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Treats Breakdown for Sets */}
                  {treats && treats.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 8,
                          letterSpacing: ".14em",
                          textTransform: "uppercase",
                          color: "var(--ink-light)",
                          marginBottom: 6,
                        }}
                      >
                        Treats Breakdown
                      </div>
                      <div className="addons-row">
                        {treats.map((t, i) => (
                          <span className="addon-chip" key={i}>
                            <span style={{ fontWeight: "bold", marginRight: 4 }}>[{t.count}]</span>
                            {getFlavorName(t.flavorId)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Addons */}
                  {item.addons && item.addons.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 8,
                          letterSpacing: ".14em",
                          textTransform: "uppercase",
                          color: "var(--ink-light)",
                          marginBottom: 6,
                        }}
                      >
                        Add-ons
                      </div>
                      <div className="addons-row">
                        {item.addons.map((addon) => (
                          <span className="addon-chip" key={addon.addonId}>
                            {addon.imageUrl && (
                              <img
                                src={addon.imageUrl}
                                alt={addon.variantName}
                              />
                            )}
                            <span className="addon-chip-label">
                              {addon.name}:
                            </span>
                            {addon.variantName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inscription */}
                  <div className="inscription-box">
                    <div className="note-label">Inscription</div>
                    {hasInscription ? (
                      <div className="inscription-text">{inscriptionText}</div>
                    ) : (
                      <div className="inscription-empty">No inscription</div>
                    )}
                  </div>

                  {/* Design instructions */}
                  {hasDesignNote && (
                    <div className="design-note-box">
                      <div className="note-label">Design Instructions</div>
                      <div className="note-text">{item.designInstructions}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── TOTAL STRIP ── */}
        <div className="total-strip">
          <span className="t-label">Order Total</span>
          <span className="t-payment">
            {order.paymentDetails?.method === "manual"
              ? "Manually confirmed"
              : (order.paymentDetails?.method ?? "")}
            {order.paymentDetails?.paidAt
              ? ` · ${format(new Date(order.paymentDetails.paidAt), "MMM d, yyyy")}`
              : ""}
          </span>
          <span className="t-amount">${order.totalAmount?.toFixed(2)}</span>
        </div>

        {/* ── CUSTOMER FOOTER ── */}
        <div className="customer-footer">
          <div className="footer-cell">
            <div className="f-label">Customer</div>
            <div className="f-value">{customer.name}</div>
            {customer.notes && <div className="f-sub">{customer.notes}</div>}
          </div>
          <div className="footer-cell">
            <div className="f-label">Contact</div>
            {customer.phone ? (
              <div className="f-value">{customer.phone}</div>
            ) : customer.socialNickname ? (
              <div className="f-value">
                @{customer.socialNickname}
                {customer.socialPlatform && (
                  <span
                    style={{
                      fontWeight: 400,
                      fontSize: 11,
                      color: "#888",
                      marginLeft: 4,
                    }}
                  >
                    ({customer.socialPlatform})
                  </span>
                )}
              </div>
            ) : (
              <div
                className="f-value"
                style={{ color: "#999", fontWeight: 400 }}
              >
                {customer.email}
              </div>
            )}
            {customer.phone && customer.socialNickname && (
              <div className="f-sub">
                @{customer.socialNickname} ({customer.socialPlatform})
              </div>
            )}
          </div>
          <div className="footer-cell">
            <div className="f-label">
              {isPickup ? "Pickup Method" : "Delivery"}
            </div>
            <div className="f-value" style={{ textTransform: "capitalize" }}>
              {order.deliveryInfo.method}
            </div>
            {pickup?.slot && <div className="f-sub">Slot: {pickup.slot}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
