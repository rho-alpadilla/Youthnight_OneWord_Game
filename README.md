# LifeBeats — One Word Bible Challenge

The supplied Lifechangers Ministry Incorporated logo is embedded in the HTML; no separate image file is needed.

## Play

1. Open `index.html` in your browser. No installation or internet connection is needed.
2. Open **Teams** to rename, add, or remove teams, then **Save**. The game starts with four teams and supports any number, with at least one team. Select **Fullscreen** for the event.
3. The highlighted team chooses a tile. Press **Start** to reveal its clue and begin the **20-second timer**.
4. Select the team answering. The choosing team is selected by default.
5. If correct, press **Correct +points**. The points go straight to that team's total and the answer appears. Updated scores are visible inside the clue window.
6. If wrong, press **Incorrect**, then **Steal**, and select another team. Their 20-second timer starts automatically. Press **Correct +points** if they answer correctly; otherwise repeat Incorrect → Steal. Teams that already answered incorrectly cannot try again on the same clue. Wrong answers do not deduct points.
7. Optionally add **Bonus +5** for explaining the biblical connection.
8. Press **Next** to mark the clue played and move to the next choosing team. If nobody answers correctly, press Next without awarding points. The choosing order stays the same even after a steal.

After 20 played clues, the highest score wins. Ties are supported.

## Other controls

- Drag a team's **⋮⋮** handle to another card to change the order. You can also drag inside **Teams**, or use its **↑ / ↓** buttons. A focused handle supports arrow keys. Names, scores, and team colors stay attached to the team.
- Before the first clue, the first team in the arranged order starts. During a game, the current chooser stays selected and future turns follow the new order.
- In **Teams**, **+ Add team** creates a team with zero points; **×** removes a team and its score when you press **Save**. **Cancel** discards edits. **Undo** can restore saved roster changes, including removed scores. The last team cannot be removed.
- **Show answer** reveals the answer without awarding points and ends stealing. Leave the answer hidden until the teams have finished guessing.
- **Pause / Resume / ↺ 20s** control the timer. Selecting a team to answer pauses it; selecting a stealing team starts a fresh countdown.
- Each team's **+10 / −10** and **Adjust score** controls can add, subtract, or set a total. Whole numbers from −999,999 to 999,999 are supported.
- **Undo** reverses scoring, wrong-answer decisions, steals, marking played, and other game actions. The timer pauses. Up to 60 actions are available until the page is refreshed or the game is reset.
- **× / Escape** returns to the board and pauses the timer. Reopen the **IN PLAY** tile to continue. Finish it before choosing another clue.
- **Next team** changes the choosing team when no clue is open.
- **Reset** asks before clearing progress. Keep your teams and order checked to retain the roster with zero scores; uncheck it to restore four default teams. Reset cannot be undone.
- Scores, names, played clues, and the active challenge save in the same browser when storage is allowed. Refresh restores the timer paused. Switching tabs also pauses it. A warning appears if storage is unavailable. Scores do not sync between devices.

Keyboard shortcuts with the clue background focused: **Space** starts/pauses/resumes; **A** shows the answer. **F** on the board requests fullscreen. Buttons also work with Tab and Enter/Space.

This is operated by one emcee, with teams raising their hands in the room. The emcee decides whether an answer is correct. Accept alternatives with a clear scriptural basis.

## Canva Code

1. Open Canva Code / **Code for me** and upload `index.html`. Canva supports [HTML/code uploads](https://www.canva.com/ai-code-generator/).
2. Use `CANVA-PROMPT.txt` to preserve the minimal interface, instant scoring, steals, and 20-second timer. If your view offers only a text prompt, paste that prompt followed by the complete HTML file.
3. Test one sample round in the interactive preview, including an incorrect answer, a steal, instant scoring, bonus, and refresh. Canva may adapt imported code. Reset before the event.
4. Select **Publish**, set the address and settings, and open the live link. See [Canva's publishing instructions](https://www.canva.com/help/publish-canva-code/).

Use the interactive experience or published website; an exported image, PDF, or static slide cannot run the controls. If fullscreen is blocked inside an embed, open the published link directly or use browser fullscreen.

## Simple hosting

Upload only `index.html` to your static website's public folder. Keep that filename so it opens as the home page. No build command or server component is needed. Choose the final local file or hosted address before setting up your event; browser storage is separate for each location.

## Finalized clue key

| Category | 10 | 20 | 30 | 40 |
| --- | --- | --- | --- | --- |
| Characters | Hair → Samson | Rooster → Peter | Dreams → Joseph | Lions → Daniel |
| Places | Walls → Jericho | Manger → Bethlehem | Tower → Babel | Crucifixion → Golgotha |
| Objects | Noah → Ark | David → Sling | Moses → Staff | Judas → Silver coins |
| Events | Rainbow → Noah's Flood / Covenant | Shout → Fall of Jericho | Loaves → Feeding of 5,000 | Tomb → Resurrection |
| Bible Books | Beginning → Genesis | Queen → Esther | Armor → Ephesians | Fruit → Galatians |

All clues are one word; some finalized answers contain multiple words. Answers and Scripture references appear only when revealed or scored correct.

## Verification

All 155 behavior checks passed with `node verify.cjs`, covering pointer and keyboard reordering, adding/removing teams, preserving scores and identities, roster changes during clues and steals, undo, saved-state migration, dynamic turns, and the existing game controls. Browser visual testing remains unavailable because the preview browser blocked local-file access; drag tests use simulated pointer events. Canva import, actual browser dragging, and fullscreen must be checked in the final environment.

