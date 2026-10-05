# TGO Fashion Dashboard

ဒီ project က မင်းပေးထားတဲ့ `TGO_FASHION_Master.xlsx` ရဲ့ structure ကိုအခြေခံပြီးလုပ်ထားတဲ့ mobile-friendly web dashboard ပါ။

## Google Sheet
Spreadsheet ID:
`12kbzuIeb1GKxjwy3u4Y78nRG82txOlvk`

ဖတ်မယ့် Sheet များ:
- ပစ္စည်းစာရင်း
- ပစ္စည်းအဝင်
- အရောင်းစာရင်း
- အမြတ်စာရင်း

## Dashboard မှာပါဝင်တာ
- ပစ္စည်းအမျိုးအစားစုစုပေါင်း
- လက်ကျန်ပစ္စည်းစုစုပေါင်း
- စုစုပေါင်းရောင်းရငွေ
- စုစုပေါင်းအမြတ်
- ပစ္စည်းနည်း
- နေ့အလိုက်အရောင်း chart
- အမျိုးအစားအလိုက်အရောင်း chart
- အရောင်းအများဆုံးပစ္စည်း
- Stock warning
- ပစ္စည်းစာရင်း table + search/filter
- အရောင်းစာရင်း table + search/date filter
- ပစ္စည်းအဝင် table
- အမြတ်စာရင်း

## Vercel တင်နည်း
1. ဒီ folder ကို GitHub repository တစ်ခုထဲ upload လုပ်ပါ။
2. Vercel ထဲမှာ `Add New Project` → GitHub repo ကိုရွေးပါ။
3. Framework preset ကို `Other` / static site အဖြစ်ထားပါ။
4. Build Command မလိုပါ။
5. Output Directory ကို `.` ထားပါ။
6. Deploy နှိပ်ပါ။

## အရေးကြီး
Dashboard က Google Visualization endpoint (`gviz`) ကနေ Google Sheet ကိုဖတ်ပါတယ်။
Google Sheet ကို web ကနေဖတ်လို့ရအောင် publish/share setting လိုနိုင်ပါတယ်။

အကယ်၍ private sheet အဖြစ်ပဲထားချင်ရင် နောက်တစ်ဆင့်မှာ Google Apps Script JSON API သုံးတဲ့ secure version ပြောင်းနိုင်ပါတယ်။
