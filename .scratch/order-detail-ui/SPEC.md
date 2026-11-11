# Production order detail polish

## Problem Statement

The production order page is harder to use on a phone than the custom request page. Line items sit above the customer, the date, and the status actions. The bottom bar shares a layer with the sidebar drawer, so it can cover the menu. Controls in the header and the bar are shorter and less even than the catalog and request pages.

## Solution

On a phone the baker sees the customer, the date actions, and the calendar above the line items. On a wide screen the line items stay in the left column and the aside stays on the right. The bottom bar sits under the sidebar drawer, with room so it does not cover the last content. Header and bar controls match the shared height, radius, and icon size. Status updates, marking paid, and opening tools behave as they do today.

## User Stories

1. As a baker on a phone, I want the customer contact above the line items, so that I can call or message before I scroll the cakes.
2. As a baker on a phone, I want the date actions and the calendar above the line items, so that the pickup day is visible without a long scroll.
3. As a baker on a wide screen, I want the line items in the left column, so that the desktop layout stays familiar.
4. As a baker on a wide screen, I want the customer and the date actions in the right column, so that the aside stays where it is today.
5. As a baker on a phone, I want the last notes and items to clear the bottom bar, so that I can read them.
6. As a baker opening the sidebar on a phone, I want the bottom bar underneath that drawer, so that the menu stays usable.
7. As a baker, I want the status control and the save button in the bar tall enough to tap, so that I do not miss them.
8. As a baker, I want Mark as paid in the bar at the same height, so that the bar feels even.
9. As a baker, I want the back control and the tools button tall enough and not crushed on a narrow phone, so that I can leave or open tools.
10. As a baker, I want the status chip and the payment chip readable on a 375px screen, so that the header does not collide.
11. As a baker, I want Save status to update the order the same way, so that this polish does not change the order.
12. As a baker, I want Mark as paid to charge the same action, so that payment behavior is unchanged.
13. As a baker, I want Tools to open the same drawer, so that print, receipt, and payment links stay put.
14. As a baker, I want the bar to keep its safe-area inset, so that a home indicator does not cover the buttons.
15. As a baker on a wide screen, I want the phone bar hidden, so that status stays in the aside.

## Implementation Decisions

- Phone column order matches the custom request page: the aside is first on a narrow screen and second from the `lg` breakpoint. The main column stays two tracks wide on the left at that breakpoint.
- The shell bottom padding grows to clear a two-row phone bar and returns to the desktop padding from `lg`.
- The phone bar uses a lower layer than the sidebar drawer. It stays full width and hides from `lg`. It does not gain a docked-sidebar offset.
- Status trigger, Save, and Mark as paid in the bar use the shared control height and radius. Icons in those controls stay a fixed size and do not shrink.
- The back control and the tools trigger use the same height, radius, and icon size. The header row may stack on a narrow phone so the title and the tools button do not squeeze each other.
- Status update, mark paid, and the tools click handlers are unchanged.

## Testing Decisions

- A good check is the phone column order, the bar sitting under the sidebar drawer, and the header and bar controls at the shared height. Status save, mark paid, and opening tools must still call the same actions.
- There is no project test runner. The check is `npx tsc --noEmit` and one pass of the order page on a phone width.
- The line-item editor, the customer card body, notes, and the receipt are out of this first slice.

## Out of Scope

- Line item view and edit forms.
- Customer fields, calendar internals, notes, the tools drawer body, and the receipt.
- Payment and document cards that this page does not render.
- Any change to price, status, payment, or date-saving behavior.

## Further Notes

- Three tickets. The shell can ship alone. Items and the remaining cards follow, and they do not block each other after the shell exists. The shell does not need them.
