# Social Studies Analytical Writing Lab

Interactive complete-essay practice for EFL social-studies students. The dashboard contains all sixteen model essays: four sources each for `17-3`, `17-4`, `17-5`, and `17-6`. Each essay is divided into Introduction, Body 1, Body 2, Body 3, and Conclusion. Every sentence follows the same mastery loop: listen, complete up to ten selected action verbs, theme nouns, and adjectives using first-letter hints, correct the blanks, then read the complete sentence aloud with at least 60% speech-recognition accuracy. Proper names, dates, and years remain visible. Beginning with `17-3 source 2`, ordinary-word hints use lowercase first letters while naturally capitalized words keep uppercase hints.

Open `dashboard.html` on GitHub Pages. For local microphone testing, double-click `Start Website.cmd`; current Chrome or Edge is recommended.

## Results

The site submits six fields matching the connected Google Sheet headers: `timeDate`, `studentName`, `unitNumber`, `subquiznumber`, `accuracyRateForTyping`, and `accuracyRateForPronunciation`. The deployed Apps Script `/exec` endpoint is configured in `config.js`; `google-apps-script/Code.gs` contains the collector source.

## Content maintenance

The first essay is stored in `essay-data.js`, the other 17-3/17-4 essays are stored in `essay-data-2-8.js`, and the eight 17-5/17-6 essays are stored in `essay-data-17-5-17-6.js`. Each unit has its own `essay-*.html` page. The earlier vocabulary and sentence-pattern files are retained in the repository but are no longer listed on the dashboard.
