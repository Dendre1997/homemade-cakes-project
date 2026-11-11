# 01: Sets catalog

**What to build:** The baker manages sets in Admin Catalog the same way as diameters. A set has a name, a piece count, a set flavor limit, an optional icon, the categories it belongs to, and an optional base price for custom-order estimates. The icon uses the existing Cloudinary upload with preview, crop, and cleanup of unsaved uploads. Without an icon, the set shows the built-in box icon chosen by piece count. Customers see no change yet.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] The Catalog landing page has a Sets card that opens a searchable list of sets with edit and delete
- [x] Creating a set requires a name, a whole-number piece count of at least 1, and a whole-number set flavor limit of at least 1 (and no more than the piece count)
- [x] A set can be linked to any number of categories and saved with or without a base price
- [x] Uploading an icon stores it on the set; removing or replacing it cleans up the unused upload
- [x] A set without an icon shows the built-in box icon for its piece count
- [x] Editing a set shows every saved value, and clearing the base price removes it
- [x] Deleting a set that a product still uses is refused with a clear message
- [x] Every admin set endpoint rejects a request without an admin session before doing anything else
- [x] A public read endpoint lists sets, optionally filtered by category

Notes:
- The delete guard checks the product field that ticket 03 introduces; it can only refuse once products carry sets.
- A previously saved icon that is replaced is left in Cloudinary, same as diameters; only unsaved uploads are cleaned up.
- The admin UI was not clicked through in a browser (admin login needs Google sign-in).
