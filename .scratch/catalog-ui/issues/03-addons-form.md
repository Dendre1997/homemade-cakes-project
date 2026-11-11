# 03: Addon form

**What to build:** The baker creates or edits an addon, including its variants, prices, and photos, with the same glass surface and field heights as the other catalog forms. Upload and remove-variant are comfortable to tap. Adding a variant, changing a price, and uploading a photo still do what they do today. On a phone, Save and Cancel stick to the bottom without covering the sidebar.

**Blocked by:** 01: Catalog hub and list shell

**Status:** done

- [x] The addon form uses the glass surface, `rounded-xl` fields, and `h-11` / `h-10` heights
- [x] Upload and remove-variant controls are about 44px
- [x] On a phone, Save and Cancel sit in a bottom bar that clears the sidebar and the safe area
- [x] On a wide screen, Save stays at the end of the form
- [x] Adding a variant, editing a price, uploading, and saving send the same data as today

**Notes:**
- Uses the same `CatalogFormActions` bar as the other column forms. Cancel appears only while editing.
- Submit stays disabled during the main image upload, as it did before.
- `npx tsc --noEmit` passed. The admin catalog needs Google sign-in, so this form was not opened in the browser.
