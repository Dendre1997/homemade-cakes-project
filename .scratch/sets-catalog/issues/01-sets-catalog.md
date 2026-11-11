# 01: Sets catalog

**What to build:** The baker manages sets in Admin Catalog the same way as diameters. A set has a name, a piece count, a set flavor limit, an optional icon, the categories it belongs to, and an optional base price for custom-order estimates. The icon uses the existing Cloudinary upload with preview, crop, and cleanup of unsaved uploads. Without an icon, the set shows the built-in box icon chosen by piece count. Customers see no change yet.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The Catalog landing page has a Sets card that opens a searchable list of sets with edit and delete
- [ ] Creating a set requires a name, a whole-number piece count of at least 1, and a whole-number set flavor limit of at least 1
- [ ] A set can be linked to any number of categories and saved with or without a base price
- [ ] Uploading an icon stores it on the set; removing or replacing it cleans up the unused upload
- [ ] A set without an icon shows the built-in box icon for its piece count
- [ ] Editing a set shows every saved value, and clearing the base price removes it
- [ ] Deleting a set that a product still uses is refused with a clear message
- [ ] Every admin set endpoint rejects a request without an admin session before doing anything else
- [ ] A public read endpoint lists sets, optionally filtered by category
