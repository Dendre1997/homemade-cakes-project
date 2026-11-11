# 02: Glass cards and scannable line items

**What to build:** The cards on a custom request use the same glass surface as a production order. On a phone the message preview starts at a few lines, with WhatsApp and SMS directly under the card title, and the baker can still open and edit the full message. Each line item leads with its category, size, flavor, and price so it can be scanned. The control that removes a reference photo is comfortable to tap. Phone and email fields and keyboard focus are easier to use. Uploading photos, confirming a delete, applying a quote suggestion, and the messaging links behave exactly as they do today.

**Blocked by:** 01 (Phone chrome for a custom request).

**Status:** done

- [x] The request cards use the shared glass surface from the production order
- [x] On a phone the message starts short, with WhatsApp and SMS visible under the title, and the full text can still be edited
- [x] Each line item shows category, size, flavor, and price at a glance
- [x] Removing a reference photo has a tap target large enough for a thumb
- [x] Phone and email fields use the right keyboard, and focus stays visible
- [x] Upload, delete confirmation, quote apply, and messaging links still do what they do today

**Notes:**
- Cards use the same glass surface as a production order. Section titles, field heights, and the gap between cards follow that page.
- The sticky header and the phone bar use one control height. Convert, save, and discard sit in a single row and clear the home gesture.
- The message starts at a few lines. WhatsApp, SMS, and copy sit under the title. The full text still edits in place.
- Each line item leads with category, size, flavor, and price. A typed agreed price of 0 stays 0. The photo delete control is 44px.
- The admin page needs Google sign-in, so this was not opened in the browser. `npx tsc --noEmit` passed.
