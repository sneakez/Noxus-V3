# Snapshot before UI restoration

31/10/2026. User changed scope to restoring original Ocean pages before login followup was finished.

Login quick-fill emails were corrected from .vn to active .io profiles, with Owner/Growth added. Unit 128/128, typecheck, Windows build, core UI 14, edges 8 and followup 5 passed on this worktree. Build log and UAT JSONs are in this folder.

New login lifecycle UAT is **FAIL**, not accepted: repeated logout immediately after reload did not reach the login form in the automated browser; latest failure retained Warehouse session. Earlier attempts progressed differently. No page error was recorded. Do not describe this as an all-role login PASS. Both selector/keyboard activation and load-idle waiting were tried. The login page in the manual Codex browser did successfully show all five corrected accounts after logout. No production authentication was tested.

All current code and evidence are being preserved on the backup branch before UI restoration. Source manifests in artifacts/business-fix predate these login changes.
