# Issues

## Open
- [ ] #8 — Support college football: board creation should allow selecting college football teams (logo lookup, team name mapping) in addition to NFL teams
- [ ] #11 — Donations: add optional donation prompt for admins and players via Venmo and Cash App
- [ ] #15 — Needs to be more mobile friendly (reactive).
- [ ] #20 — When a user joins, send an email which contains all of the details about the game and their personal link and qr code.
## In Progress

## Resolved
- [x] #21 — All headers should show payout information in the exact same format and position.  Also, if reverse is selected for a quarter and/or final, it should show that too.
- [x] #1 — Board creation: admin should have the option to rotate numbers each quarter or keep the same numbers for the entire game; when rotating, the grid should display all 4 sets of numbers along both axes (one column/row per quarter: Q1, Q2, Q3, Final), similar to the quarter-lines board layout
- [x] #2 — Scoring moments: a board should have either Q4 or Final, not both
- [x] #3 — Board creation: admin phone number should be collected during board setup
- [x] #4 — JoinFlow: allow player to enter an optional display name shown in their squares; fall back to initials if not provided; squares must stay fixed size regardless of name length
- [x] #5 — Scoring: add reverse payout option — if a player holds the square matching the reversed winning digits (e.g. home=3, away=7 wins, then away=3, home=7 also pays out a configured amount)
- [x] #6 — Admin dashboard: when displaying a winner, show the winner's contact information (name, email, phone)
- [x] #7 — Winner notifications: replace auto-notify with manual notify buttons (email and/or phone, shown only if contact info exists); track and display notification history per winner (notified: yes/no, timestamp, method)
- [x] #9 — Auth: implement authentication and authorization for admins; design an appropriate access solution for players (e.g. token-based links, magic links, or lightweight login)
- [x] #10 — Bug: clicking "Join a Board" navigates to an empty page
- [x] #12 — Bug: scoring moment dropdown in ScoreEntry had white text on white background
- [x] #13 — After a player finishes claiming their squares, they should be directed into a payment flow.
- [x] #14 — The live board header doesn't match the styling of the other headers.
- [x] #17 — Add a share icon to the player and live view header. If the game is locked, only the url and barcode option for live view should show.  If not locked, it should also give the url and barcode option for joining the board.
- [x] #18 — I also want to add join code functionality. All board should show the join code in the header. A join code should be able to be entered on the dashboard.
- [x] #19 — When randomly selecting squares, don't allow selecting more than are available.
