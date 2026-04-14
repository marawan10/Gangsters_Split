import { createContext, useContext, useState, useCallback } from 'react';

const LANG_KEY = 'gangsters-lang';

const AR_NAMES = {
  'El Maro': 'مارو',
  'El Kemo': 'كيمو',
  'El Back': 'باك',
};

const translations = {
  en: {
    appName: 'Gangsters Split',
    whoAreYou: 'Who are you?',
    pickOnce: 'You only pick this once',
    reset: 'Reset',
    confirmReset: 'Delete all expenses? This cannot be undone.',
    quickAdd: 'Quick Add',
    shoppingTrip: 'Shopping Trip',

    // ExpenseForm
    addExpense: 'Add Expense',
    editExpense: 'Edit Expense',
    cancel: 'Cancel',
    category: 'Category',
    itemName: 'Item name',
    itemPlaceholder: 'e.g. Dinner, Uber, Groceries',
    totalAmount: 'Total amount',
    whosIncluded: "Who's included?",
    each: 'each',
    whoPaid: 'Who paid?',
    loanWarning_one: "paid but isn't included — treated as a loan.",
    loanWarning_many: "paid but aren't included — treated as a loan.",
    paidMismatch: 'Paid ({paid}) ≠ amount ({amount}).',
    saveChanges: 'Save Changes',
    owes: 'owes',

    // Validation
    errCategory: 'Select a category.',
    errItemName: 'Enter an item name.',
    errAmount: 'Enter an amount greater than 0.',
    errParticipant: 'Select at least one participant.',
    errWhoPaid: 'Enter who paid.',

    // ShoppingTrip
    whoWentShopping: 'Who went shopping?',
    items: 'Items',
    addItem: 'Add item',
    forLabel: 'For:',
    addNItems: 'Add {n} item{s} · {total}',
    errTripEmpty: "Add at least one item with a name, amount, and who it's for.",
    errTripAmount: 'Item {n}: enter an amount.',
    errTripName: 'Item {n}: enter a name.',
    errTripFor: "Item {n}: select who it's for.",

    // ExpenseList
    activeExpenses: 'Active Expenses',
    edit: 'Edit',
    delete: 'Delete',
    confirm: 'Confirm',
    by: 'by',

    // Summary
    overview: 'Overview',
    total: 'Total',
    balances: 'Balances',
    share: 'Share',
    getsBack: 'gets back',
    settled: 'settled',
    verified: 'Verified ✓',
    offBy: 'Off by {amount}',
    item_one: 'item',
    item_other: 'items',
    settlementPlan: 'Settlement Plan',
    paidNe: 'Paid ({paid}) ≠ amounts ({amount})',

    // WhatsApp share
    waTotalPaid: 'Total paid per person:',
    waBalances: 'Balances:',
    waSettlement: 'Settlement:',
    waPays: '{from} pays {to} → {amount}',

    // History
    history: 'History',
    send: 'Send',
    sure: 'Sure?',
    today: 'Today',

    // Date
    yesterday: 'Yesterday',
    daysAgo: '{n} days ago',
    todayAt: 'Today, {time}',
    am: 'AM',
    pm: 'PM',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

    // Categories
    cat_food: 'Food',
    cat_transport: 'Transport',
    cat_shopping: 'Shopping',
    cat_bills: 'Bills',
    cat_others: 'Others',

    // Notification
    notifAdded: '{who} added {item} — {amount}',

    // Dashboard
    tabDashboard: 'Dashboard',
    tabExpenses: 'Expenses',
    dashGreeting: 'Hey {name}',
    dashSubtitle: 'Your settlement overview',
    dashStats: 'All-time Stats',
    dashYouPaid: 'You Paid',
    dashGroupTotal: 'Group Total',
    dashExpenses: 'Expenses',
    dashYouOwe: 'You owe',
    dashOwesYou: 'Owes you',
    dashAllClear: 'All clear',
    dashNotSentYet: 'Not sent yet',
    dashWaitingFor: 'Waiting for {name}',
    dashYouSent: 'You sent it ✓',
    dashSentBy: 'Sent by {name}',
    dashCopy: 'Copy',
    dashCopied: 'Copied!',
    dashPayInstapay: 'Pay via InstaPay',
    dashPayAmountCopied:
      'Amount copied — paste it in InstaPay if the app does not fill it automatically.',
    dashOpenInstapay: 'Open InstaPay',
    dashISentIt: 'I Sent It',
    dashTapConfirm: 'Tap to confirm',
    dashConfirmReceived: 'Confirm Received',
    dashWaiting: 'Waiting for them',
    dashWaitingConfirm: 'Waiting for {name} to confirm',
    dashStillToSend: 'Still to send: {amount}',
    dashHint:
      'Numbers include all expenses (archive too) and follow the app settlement plan. They drop only after someone confirms they received the payment.',

    spendingPopup: '{amount} ?? خخخخخ احنا لازم نتقشف',
  },

  ar: {
    appName: 'Gangsters Split',
    whoAreYou: 'انت مين؟',
    pickOnce: 'هتختار مرة واحدة بس',
    reset: 'مسح',
    confirmReset: 'تمسح كل المصاريف؟ مش هتقدر ترجعها.',
    quickAdd: 'إضافة سريعة',
    shoppingTrip: 'رحلة تسوق',

    addExpense: 'أضف مصروف',
    editExpense: 'تعديل مصروف',
    cancel: 'إلغاء',
    category: 'النوع',
    itemName: 'اسم الحاجة',
    itemPlaceholder: 'مثلاً: عشا، أوبر، بقالة',
    totalAmount: 'المبلغ',
    whosIncluded: 'مين معانا؟',
    each: 'لكل واحد',
    whoPaid: 'مين دفع؟',
    loanWarning_one: 'دفع بس مش مشارك — يعتبر سلف.',
    loanWarning_many: 'دفعوا بس مش مشاركين — يعتبر سلف.',
    paidMismatch: 'المدفوع ({paid}) ≠ المبلغ ({amount})',
    saveChanges: 'حفظ التعديل',
    owes: 'عليه',

    errCategory: 'اختار نوع.',
    errItemName: 'اكتب اسم الحاجة.',
    errAmount: 'اكتب مبلغ أكبر من صفر.',
    errParticipant: 'اختار شخص واحد على الأقل.',
    errWhoPaid: 'اكتب مين دفع.',

    whoWentShopping: 'مين اللي راح يشتري؟',
    items: 'الحاجات',
    addItem: 'أضف حاجة',
    forLabel: 'لـ:',
    addNItems: 'أضف {n} حاجة · {total}',
    errTripEmpty: 'أضف حاجة واحدة على الأقل باسم ومبلغ ولمين.',
    errTripAmount: 'حاجة {n}: اكتب المبلغ.',
    errTripName: 'حاجة {n}: اكتب الاسم.',
    errTripFor: 'حاجة {n}: اختار لمين.',

    activeExpenses: 'المصاريف الحالية',
    edit: 'تعديل',
    delete: 'حذف',
    confirm: 'تأكيد',
    by: 'من',

    overview: 'ملخص',
    total: 'الإجمالي',
    balances: 'الحسابات',
    share: 'شير',
    getsBack: 'له فلوس',
    owes: 'عليه',
    settled: 'خلص',
    verified: 'متظبط ✓',
    offBy: 'فرق {amount}',
    item_one: 'حاجة',
    item_other: 'حاجات',
    settlementPlan: 'خطة التسوية',
    paidNe: 'المدفوع ({paid}) ≠ المبلغ ({amount})',

    waTotalPaid: 'اللي كل واحد دفعه:',
    waBalances: 'الحسابات:',
    waSettlement: 'التسوية:',
    waPays: '{from} يدفع لـ {to} → {amount}',

    history: 'السجل',
    send: 'ابعت',
    sure: 'متأكد؟',
    today: 'النهارده',

    yesterday: 'امبارح',
    daysAgo: 'من {n} أيام',
    todayAt: 'النهارده، {time}',
    am: 'ص',
    pm: 'م',
    months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],

    cat_food: 'أكل',
    cat_transport: 'مواصلات',
    cat_shopping: 'تسوق',
    cat_bills: 'فواتير',
    cat_others: 'تاني',

    notifAdded: '{who} ضاف {item} — {amount}',

    tabDashboard: 'الرئيسية',
    tabExpenses: 'المصاريف',
    dashGreeting: 'أهلاً يا {name}',
    dashSubtitle: 'ملخص الحسابات بينك وبين الشباب',
    dashStats: 'إحصائيات عامة',
    dashYouPaid: 'دفعت',
    dashGroupTotal: 'إجمالي الكل',
    dashExpenses: 'عمليات',
    dashYouOwe: 'عليك',
    dashOwesYou: 'ليك عنده',
    dashAllClear: 'الحساب مظبوط',
    dashNotSentYet: 'لسه متبعتش',
    dashWaitingFor: 'مستني {name} يبعت',
    dashYouSent: 'بعتها ✓',
    dashSentBy: '{name} بعتها',
    dashCopy: 'نسخ',
    dashCopied: 'تم النسخ!',
    dashPayInstapay: 'ادفع InstaPay',
    dashPayAmountCopied: 'نسخنا المبلغ — الصقه في InstaPay لو التطبيق ما حطّوش تلقائي.',
    dashOpenInstapay: 'افتح InstaPay',
    dashISentIt: 'أنا بعتها',
    dashTapConfirm: 'اضغط للتأكيد',
    dashConfirmReceived: 'وصلتني ✓',
    dashWaiting: 'مستنيهم يبعتوا',
    dashWaitingConfirm: 'مستني {name} يأكد الاستلام',
    dashStillToSend: 'لسه تبعت: {amount}',
    dashHint:
      'الأرقام على كل المصاريف (حتى اللي في الأرشيف) وحسب خطة التسوية في التطبيق. المبلغ بينقص لما حد يأكد إنه استلم الفلوس.',

    spendingPopup: '{amount} ?? خخخخخ احنا لازم نتقشف',
  },
};

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem(LANG_KEY) || 'en',
  );

  function setLang(l) {
    localStorage.setItem(LANG_KEY, l);
    setLangState(l);
  }

  const t = useCallback(
    (key, vars) => {
      let str = translations[lang]?.[key] ?? translations.en[key] ?? key;
      if (typeof str === 'string' && vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replaceAll(`{${k}}`, v);
        });
      }
      return str;
    },
    [lang],
  );

  const isRTL = lang === 'ar';

  const shortName = useCallback(
    (fullName) => {
      if (lang === 'ar') return AR_NAMES[fullName] || fullName.replace('El ', '');
      return fullName.replace('El ', '');
    },
    [lang],
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t, isRTL, shortName }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LangContext);
}
