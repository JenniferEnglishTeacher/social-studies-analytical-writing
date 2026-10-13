# Social Studies Analytical Writing Lab

Interactive complete-essay practice for EFL social-studies students. The current dashboard prototype contains `17-3 source 1`, divided into Introduction, Body 1, Body 2, Body 3, and Conclusion. Every sentence follows the same mastery loop: listen, dictate every word using first-letter hints, correct the response, then read it aloud with at least 60% speech-recognition accuracy.

Open `dashboard.html` on GitHub Pages. For local microphone testing, double-click `Start Website.cmd`; current Chrome or Edge is recommended.

## Results

The site submits six fields matching the connected Google Sheet headers: `timeDate`, `studentName`, `unitNumber`, `subquiznumber`, `accuracyRateForTyping`, and `accuracyRateForPronunciation`. The deployed Apps Script `/exec` endpoint is configured in `config.js`; `google-apps-script/Code.gs` contains the collector source.

## Content maintenance

The visible essay prototype is stored in `essay-data.js` and loaded by `essay-17-3-source-1.html`. The earlier vocabulary and sentence-pattern files are retained in the repository but are no longer listed on the dashboard.

