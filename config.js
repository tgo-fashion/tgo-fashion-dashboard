// TGO Fashion Dashboard configuration
// Google Sheet ID from your link:
window.TGO_CONFIG = {
  spreadsheetId: "12kbzuIeb1GKxjwy3u4Y78nRG82txOlvk",
  // If your Google Sheet is private, publish the required sheets to the web
  // or use a Google Apps Script JSON endpoint. This dashboard uses Google
  // Visualization (gviz) by default.
  sheetNames: {
    stock: "ပစ္စည်းစာရင်း",
    incoming: "ပစ္စည်းအဝင်",
    sales: "အရောင်းစာရင်း",
    profit: "အမြတ်စာရင်း"
  },
  refreshMs: 60000
};
