Capacity & Scheduling Engine
Configuration Interface
The entire scheduling system is governed by a single document stored in the MongoDB settings collection. Its shape is defined by the ScheduleSettings interface (

src/types/index.ts:378
):

ts
export interface ScheduleSettings {
  _id: string;
  leadTimeDays: number;           // Minimum advance-notice days before any order can be placed
  defaultWorkMinutes: number;     // Total baking capacity per calendar day, in minutes
  defaultAvailableHours: string[]; // Master list of pickup/delivery time slots for all days
  weekdayHours?: {
    [day: number]: string[];       // 0=Sunday … 6=Saturday — per-weekday time slot overrides
  };
  dateOverrides: {
    date: Date;
    workMinutes?: number;          // Custom capacity override for a specific calendar day
    isBlocked?: boolean;           // When true, the day is 100% disabled regardless of capacity
    availableHours?: string[];     // Additional time slots for this specific date
  }[];
}
ScheduleSettings is the single source of truth for all scheduling decisions. It is persisted via PUT /api/admin/schedule-settings (

source
), which performs a db.collection('settings').updateOne({}, { $set: updateData }, { upsert: true }) — a singleton upsert pattern that guarantees only one settings document ever exists in the collection. The dateOverrides array is processed during the write to convert date strings to BSON Date objects before storage:

ts
dateOverrides: dateOverrides?.map(override => ({
  ...override,
  date: new Date(override.date),
  availableHours: override.availableHours || [],
})) || []
The admin UI for managing these settings is at 

/bakery-manufacturing-orders/schedule
. On load it issues two parallel requests: GET /api/admin/schedule-settings for the current ScheduleSettings document, and POST /api/availability with an empty itemsInCart payload to retrieve the current minutesBookedPerDay map — which is rendered on an AdminDatePicker component for a visual heat-map of committed baking time.

Capacity Calculation Algorithm — POST /api/availability
This route (

source
) is the authoritative capacity oracle. It is the strict check used by the checkout flow and is always force-dynamic (never cached). Both GET and POST are aliased to the same handler.

Step 1 — Settings and manufacturing time map. The route reads the settings singleton and all categories documents. From categories it builds a flat lookup map:

ts
const manufacturingTimes: { [categoryId: string]: number } = {};
categories.forEach(cat => {
  if (cat.manufacturingTimeInMinutes) {
    manufacturingTimes[cat._id.toString()] = cat.manufacturingTimeInMinutes;
  }
});
This is the core data structure that connects product categories to their production cost in minutes. For example, if the "Cakes" category has manufacturingTimeInMinutes: 90, then every cake item committed to a given date consumes 90 minutes of that day's defaultWorkMinutes budget.

Step 2 — Booking tally across existing orders. The route fetches all non-cancelled Order documents from MongoDB that have at least one deliveryInfo.deliveryDates.date >= today, scoped to a 3-month lookahead window:

ts
const potentiallyRelevantOrders = await db.collection("orders").find({
  "deliveryInfo.deliveryDates.date": { $gte: today },
  status: { $nin: ["cancelled"] }
}).toArray();
For each order, the route iterates deliveryInfo.deliveryDates — the array of { date, itemIds, timeSlot } entries that represent the split-delivery schedule. For each deliveryDate entry, it loops entry.itemIds and resolves each unitId back to its parent CartItem via extractOriginalItemId(unitId) (which strips the trailing -<unitIndex> suffix appended by createUnitId()). Once the parent item is found, its categoryId is used to look up the manufacturing time:

ts
timeForThisDateEntry += manufacturingTimes[categoryIdString] || 0;
Two special cases are handled:

Manual items (unitId.startsWith("manual-")): Skipped entirely — admin-inserted manual items have no catalog manufacturing time.
Custom items (unitId.includes("custom")): Have no categoryId. The engine falls back to the first category whose name contains "cake" — a name-based heuristic that assumes custom orders consume cake-level production time.
All per-entry totals are accumulated into minutesBookedPerDay: Record<string, number> keyed by "yyyy-MM-dd" formatted date strings.

Step 3 — Net availability computation. The route iterates every single calendar day in the 3-month window using eachDayOfInterval. For each day:

Search ScheduleSettings.dateOverrides for an exact date match (compared via format(startOfDay(new Date(o.date)), "yyyy-MM-dd")).
If override.isBlocked === true: the day is written as availableMinutesPerDay[dateString] = 0 and added to adminBlockedDates[].
Otherwise: totalWorkMinutes = override.workMinutes ?? defaultWorkMinutes (override wins over global default), and the remaining capacity is:
ts
availableMinutesPerDay[dateString] = Math.max(0,
  totalWorkMinutes - (minutesBookedPerDay[dateString] || 0)
);
The Math.max(0, ...) guard prevents negative values when a day is over-committed.

Response payload. The route returns the complete map to the client:

ts
{
  leadTimeDays,
  manufacturingTimes,      // categoryId → minutes lookup
  availableMinutesPerDay,  // dateString → remaining minutes
  adminBlockedDates,       // string[] of fully-blocked YYYY-MM-DD dates
  defaultAvailableHours,
  weekdayHours,
  dateOverrides,           // serialized with date.toISOString()
}
Public Calendar Endpoint — GET /api/shop/calendar-blocks
This is a separate, unauthenticated read-only endpoint (

source
) used by the custom order wizard Step 1 date picker — before a product is chosen, so manufacturing cost is unknown. It applies the same booking tally algorithm as /api/availability but with two significant differences:

Optimistic blocking policy: A date is added to blockedDates only when booked >= capacity (completely full). Any day with even 1 remaining minute is considered available, because the wizard does not yet know how much time the customer's eventual order will consume.

Converted custom orders contribute to capacity. The route queries custom_orders for documents with status: 'converted' and adds cakeFallbackMinutes to the booking total for each:

ts
const convertedCustomOrders = await db.collection("custom_orders").find({
  status: "converted", date: { $gte: today }
}).toArray();
for (const co of convertedCustomOrders) {
  minutesBooked[ds] = (minutesBooked[ds] ?? 0) + cakeFallbackMinutes;
}
This prevents double-booking by including confirmed custom requests in the capacity tally even though they exist in a separate collection. Note: pending_review and rejected custom orders do NOT consume capacity — only converted (committed) ones.

Security: The response only exposes { blockedDates, leadTimeDays, defaultAvailableHours, weekdayHours, dateOverrides } — raw capacity counts, revenue, and order details are never sent to the public-facing endpoint.

Client-Side Split-Order Algorithm — CheckoutClientPage
The 

CheckoutClientPage
\checkout\CheckoutClientPage.tsx) fetches the full /api/availability payload on mount and performs all split-detection and date-blocking logic entirely client-side.

Cart total minutes computation. On every render, the total manufacturing cost of the cart is calculated:

ts
cartTotalMinutes = items.reduce(
  (sum, item) => sum + (manufacturingTimes[item.categoryId] || 0) * item.quantity,
  0
);
This uses the manufacturingTimes map returned by the availability API — each item's categoryId is resolved to a per-unit minute cost, then multiplied by item.quantity.

Live available minutes map. The raw availableMinutesPerDay from the API represents server-side committed time. As the customer allocates items to dates during checkout, the map is updated in-place to reflect the in-session provisional allocations:

ts
formData.deliveryDates.forEach(dd => {
  const dateString = format(dd.date, "yyyy-MM-dd");
  const timeAllocated = dd.itemIds.reduce((sum, unitId) => {
    const originalItem = items.find(i => i.id === extractOriginalItemId(unitId));
    return sum + (originalItem ? manufacturingTimes[originalItem.categoryId] || 0 : 0);
  }, 0);
  const currentMins = availableMinutesPerDay.get(dateString) || 0;
  availableMinutesPerDay.set(dateString, currentMins - timeAllocated);  // Deduct in-session allocation
});
This means the date picker always shows the customer a live, accurate view of remaining capacity including their own in-progress selections.

Split detection. After the available minutes map is updated, a split is necessary when the cart's total manufacturing cost exceeds any single day's remaining capacity:

ts
const maxAvailableSlot = Math.max(0, ...Array.from(availableMinutesPerDay.values()));
needsSplit = cartTotalMinutes > maxAvailableSlot;
When needsSplit is true and no split confirmation is already shown, setShowSplitConfirmation(true) is deferred via Promise.resolve().then(...) to avoid illegal state mutation mid-render. The DeliveryScheduler component then renders a warning block offering three options:

Split Order Across Dates: Sets isSplitRequired = true and switches the date picker into multi-date allocation mode.
Buy Anyway (Requires Confirmation): Submits the order with status: "pending_confirmation" and deliveryDates: [], routing it to the admin confirmation queue instead of the normal checkout flow.
Modify Cart: Returns the customer to their cart.
Unavailable date computation. The full set of dates the picker must disable is computed as a union:

ts
// 1. Lead time days (today to today+leadTimeDays-1)
eachDayOfInterval({ start: today, end: addDays(firstAvailableDate, -1) })
  .forEach(d => newUnavailableSet.add(format(d, "yyyy-MM-dd")));
// 2. Admin-blocked dates from the availability API
adminBlockedDates.forEach(ds => newUnavailableSet.add(ds));
// 3. Dates with zero remaining capacity
initialAvailableMinutes.forEach((initialMinutes, dateString) => {
  const minutesLeft = availableMinutesPerDay.get(dateString);
  if (minutesLeft !== undefined && minutesLeft <= 0) {
    newUnavailableSet.add(dateString);
  } else if (!needsSplit && cartTotalMinutes > initialMinutes) {
    // In single-date mode: also block any date that can't fit the full cart
    newUnavailableSet.add(dateString);
  }
});
The third condition is critical: in single-date mode (!needsSplit), any day whose initialMinutes is less than cartTotalMinutes is blocked even if it still has some capacity left — because the whole cart must fit on one day. In split mode, this restriction is removed, and only fully-exhausted days are blocked.

Manual item allocation in split mode. When isSplitRequired is confirmed, items are expanded into a flat UniqueCartItem[] where each physical unit (quantity > 1) becomes a separate entry with a unique createUnitId(item.id, unitIndex) identifier. The customer then manually drags each UniqueCartItem to a date via handleAllocateItem. At the point of allocation, the item's manufacturing time is checked against the currently-selected date's remaining minutes:

ts
const itemTime = availabilityMap[itemToAllocate.categoryId] || 0;
const minutesLeft = availableMinutesPerDay.get(dateString);
if (minutesLeft === undefined || itemTime > minutesLeft) {
  showAlert("Oops! We're all booked up for that date", "error");
  return;
}
Each successful allocation appends the unit's uniqueId to formData.deliveryDates[entryIndex].itemIds and removes it from unallocatedItems. The customer cannot proceed to Step 2 (payment) until unallocatedItems.length === 0.

Time slot resolution per date. The available time slots for the selected date are resolved at checkout by availableHoursForSelectedDate:

ts
let hours = [...availability.defaultAvailableHours]; // ScheduleSettings.defaultAvailableHours
const override = availability.dateOverrides.find(o => isSameDay(new Date(o.date), selectedDate));
if (override?.availableHours?.length > 0) {
  hours = Array.from(new Set([...hours, ...override.availableHours]));
}
Note: weekdayHours from ScheduleSettings is returned by the API and forwarded to the DeliveryScheduler but the time-slot resolution at checkout level currently merges only the global defaultAvailableHours and per-date availableHours overrides. Per-weekday time slots are consumed by the custom order wizard's calendar step, which uses the separate GET /api/shop/calendar-blocks endpoint.

Order submission — deliveryDates payload. When the customer submits, formData.deliveryDates is sent verbatim to POST /api/orders. In single-date mode, this array has exactly one entry containing all unit IDs. In split mode, it contains one entry per allocated date, each with its own date, timeSlot, and itemIds[] subset. The server does not re-validate capacity at write time — the client-side check is the only guard. The deliveryDates are stored as-is in the Order.deliveryInfo.deliveryDates array, which the availability engine reads back on subsequent requests to compute future booked minutes.