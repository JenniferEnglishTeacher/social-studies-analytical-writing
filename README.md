# Social Studies Analytical Writing Lab

Interactive Module 17 practice for EFL social-studies students. Every prompt follows the same mastery loop: listen, dictate every word using first-letter hints, correct the response, then read it aloud with at least 60% speech-recognition accuracy.

Open `dashboard.html` on GitHub Pages. For local microphone testing, double-click `Start Website.cmd`; current Chrome or Edge is recommended.

## Results

The site submits six fields matching the connected Google Sheet headers: `timeDate`, `studentName`, `unitNumber`, `subquiznumber`, `accuracyRateForTyping`, and `accuracyRateForPronunciation`. Deploy `google-apps-script/Code.gs` as a Google Apps Script web app and paste its `/exec` URL into `config.js`.

## Rebuild content

Run `node tools/build-site.mjs <path-to-Module17_3-4_Writing_Toolkit_Words_and_Patterns.md>` after changing the source handout. This regenerates `data.js`, the individual quiz pages, and `quiz-manifest.tsv`.
