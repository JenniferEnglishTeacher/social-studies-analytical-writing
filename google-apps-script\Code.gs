const SPREADSHEET_ID = "1mfIzLMu5ofBM2maXWOjW06q-PY3ZdLODkHBpwWidpeA";
const SHEET_NAME = "Sheet1";
const FIELDS = ["timeDate","studentName","unitNumber","subquiznumber","accuracyRateForTyping","accuracyRateForPronunciation"];

function doPost(e) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const values = FIELDS.map(field => e.parameter[field] || "");
  LockService.getScriptLock().waitLock(10000);
  try { sheet.appendRow(values); }
  finally { LockService.getScriptLock().releaseLock(); }
  return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput("Social Studies Analytical Writing result collector is online.");
}
