# Key-copy feedback (#268)

Generated-key and saved-key Copy buttons briefly show the existing translated Copied label after the clipboard write resolves, then restore their label after 900 ms. A second successful copy restarts that interval. The button reserves its measured width during feedback, so surrounding controls do not move. Its polite live announcement contains only the label, never the key.

Clipboard rejection uses a translated error pointing to Download and never reports success. Page exit and a new generated identity clear feedback; an old pending copy cannot restore it after exit. Masking, exact copied key bytes, downloads, saved-key erasure and sign-in remain unchanged. The existing translation catalogs provide all ten locales.

The login page advances its browser-script version so existing visitors receive the matching copy-feedback code.
