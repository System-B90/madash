import type { HelpTopic, Tour } from "@system-b90/onboarding";

/**
 * Every tour anchor id in madash, in one place, so a tour step and the
 * `useTourAnchor` call it points at can't drift apart silently (#77).
 */
export const ANCHORS = {
    paletteButton: "header.palette",
    themeSelector: "header.theme",
    helpButton: "header.help",
    callToHadas: "home.call-to-hadas",
    calledToHadas: "home.called-to-hadas",
    statusBoard: "home.status-board",
    madratMessage: "home.madrat-message",
    journalDate: "journal.date",
    journalTasks: "journal.tasks",
} as const;

export const HOME_TOUR = {
    id: "home.intro",
    title: "סיור במדש",
    autoStart: true,
    steps: [
        {
            id: "welcome",
            title: "ברוכים הבאים למדש",
            body: "לוח הבקרה של המדר\"ת: קריאות לחד\"ס, מצב המערכות והודעת המדר\"ת. נעבור בקצרה על כל חלק.",
            placement: "center",
        },
        {
            id: "call",
            title: "קריאה לחד\"ס",
            body: "בוחרים חניך או קבוצה, כותבים סיבה ושולחים. הקריאה מופיעה מיד אצל כל מי שמחובר.",
            anchor: ANCHORS.callToHadas,
            placement: "inline-end",
        },
        {
            id: "called",
            title: "סטטוס קריאות",
            body: "כל הקריאות הפתוחות. לחיצה על הכפתור בצ'יפ מסמנת שהחניך עודכן, ולחיצה נוספת מסמנת שהגיע.",
            anchor: ANCHORS.calledToHadas,
            placement: "inline-end",
        },
        {
            id: "status",
            title: "מצב העולם",
            body: "מצב המערכות: הקישור למדש, הייב, בלוז ו־Peek-a-Boo. ירוק תקין, כתום חלקי או איטי, אדום לא זמין.",
            anchor: ANCHORS.statusBoard,
            placement: "block-end",
        },
        {
            id: "madrat",
            title: "הודעת המדר\"ת",
            body: "הודעה משותפת שכל המחוברים רואים ומתעדכנת בזמן אמת.",
            anchor: ANCHORS.madratMessage,
            placement: "block-start",
            optional: true,
        },
        {
            id: "palette",
            title: "שורת הפקודות",
            body: "כל פעולה זמינה גם מהמקלדת: Ctrl+K פותח את שורת הפקודות. נסו ללחוץ.",
            anchor: ANCHORS.paletteButton,
            placement: "block-end",
            interactive: true,
        },
        {
            id: "help",
            title: "עזרה",
            body: "אפשר לחזור לסיור הזה ולהסברים נוספים בכל רגע מכפתור העזרה.",
            anchor: ANCHORS.helpButton,
            placement: "block-end",
        },
    ],
} as const satisfies Tour;

export const JOURNAL_TOUR = {
    id: "journal.intro",
    title: "סיור ביומן",
    autoStart: true,
    steps: [
        {
            id: "date",
            title: "בחירת יום",
            body: "החצים עוברים יום אחורה או קדימה, ואפשר גם לבחור תאריך ישירות.",
            anchor: ANCHORS.journalDate,
            placement: "block-end",
        },
        {
            id: "tasks",
            title: "שם היום והמשימות",
            body: "את היום הנוכחי ואת הימים הבאים אפשר לערוך. ימים שעברו לקריאה בלבד.",
            anchor: ANCHORS.journalTasks,
            placement: "block-start",
            optional: true,
        },
    ],
} as const satisfies Tour;

export const TOURS: readonly Tour[] = [ HOME_TOUR, JOURNAL_TOUR ];

export const HOME_HELP_TOPICS: readonly HelpTopic[] = [
    {
        id: "home.tour",
        title: "סיור במדש",
        body: "סקירה קצרה של לוח הבקרה.",
        tourId: HOME_TOUR.id,
        order: 0,
    },
    {
        id: "home.status-legend",
        title: "מקרא מצב העולם",
        body: "ירוק: תקין. כתום: זמין אבל איטי, עמוס או עם תלות לא תקינה. אדום: לא זמין. אפור: לא מוגדר או עדיין נטען. הגרף הקטן מראה את זמן התגובה לאורך זמן.",
        order: 1,
    },
    {
        id: "home.call-flow",
        title: "קריאה לחד\"ס, מההתחלה עד הסוף",
        body: "1. בוחרים חניך וכותבים סיבה. 2. הקריאה מופיעה בסטטוס הקריאות. 3. לחיצה ראשונה: החניך עודכן. 4. לחיצה שנייה: החניך הגיע והקריאה נסגרת.",
        order: 2,
    },
];

export const JOURNAL_HELP_TOPICS: readonly HelpTopic[] = [
    {
        id: "journal.tour",
        title: "סיור ביומן",
        body: "איך עוברים בין ימים ומה אפשר לערוך.",
        tourId: JOURNAL_TOUR.id,
        order: 0,
    },
];
