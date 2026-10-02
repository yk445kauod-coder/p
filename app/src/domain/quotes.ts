/**
 * Daily quote decks.
 *
 * Arabic quotes are ported from the original "10 Warqat" tracker; the English
 * deck is a parallel set of habit and reading lines. A quote is chosen
 * deterministically from the day of the year, so it is stable within a day and
 * changes each morning.
 */
import type { Lang } from "../i18n/translations";

export interface Quote {
  text: string;
  source: string;
}

export const QUOTES_AR: Quote[] = [
  { text: "أنت لا ترتقي لمستوى أهدافك، أنت تهبط لمستوى أنظمتك.", source: "العادات الذرية" },
  { text: "كل عادة صغيرة هي تصويت لهوية الشخص الذي تريد أن تصبح عليه.", source: "جيمس كلير" },
  { text: "الانضباط هو أن تفعل ما يجب حتى عندما لا تريد.", source: "حكمة رياضية" },
  { text: "يوم واحد لا يكفي لتغيير حياتك، لكن كل يوم يهم.", source: "العادات الذرية" },
  { text: "لا تنتظر أن تكون متحفزاً لتبدأ، ابدأ لتصبح متحفزاً.", source: "عقلية البطل" },
  { text: "الـ 1% تحسّن يومي = 37 ضعف بعد سنة.", source: "رياضيات العادات" },
  { text: "النجاح هو مجموع جهود صغيرة تتكرر كل يوم.", source: "روبرت كولير" },
  { text: "ما تفعله كل يوم أهم مما تفعله مرة واحدة.", source: "العادات الذرية" },
  { text: "الكتاب يقرأك كما تقرأه.", source: "حكمة" },
  { text: "القراءة كل يوم = 12 كتاب في السنة.", source: "حقيقة" },
  { text: "العقل مثل العضلة، كل ما درّبته كبر.", source: "علم النفس" },
  { text: "من لا يقرأ يعيش حياة واحدة، ومن يقرأ يعيش ألف حياة.", source: "مثل" },
  { text: "العزيمة لا تأتي وأنت مرتاح، تأتي وأنت بتكمل رغم التعب.", source: "مصري أصيل" },
  { text: "الالتزام أهم من الحماس، الحماس يخلص، الالتزام بيكمّل.", source: "كوبي براينت" },
  { text: "لو تعبت النهاردة، افتكر انت بتتعب ليه.", source: "تذكير يومي" },
  { text: "اقرأ كأنك هتعيش للأبد، وعيش كأنك هتموت بكرة.", source: "غاندي" },
  { text: "التفوق مش صدفة، التفوق عادة يومية.", source: "أرسطو" },
  { text: "اتعلم كأنك مبتدئ كل يوم، هتفضل تنمو للأبد.", source: "بوذية" },
  { text: "الحياة مش سباق سرعة، سباق نفس طويل.", source: "نصيحة" },
  { text: "كل صفحة بتقرأها بتبني طوبة في مستقبلك.", source: "تحفيز" },
  { text: "الخوف من الفشل هو اللي بيخليك تفشل بجد.", source: "علم نفس" },
  { text: "اعمل اللي تقدر عليه، باللي معاك، في المكان اللي انت فيه.", source: "روزفلت" },
  { text: "الاستمرارية تغلب الموهبة كل مرة.", source: "رياضة" },
  { text: "ما ندمت على قراءة كتاب قط.", source: "ابن الجوزي" },
  { text: "العلم يرفع بيتاً لا عماد له.", source: "حكمة عربية" },
  { text: "قليل دائم خير من كثير منقطع.", source: "حديث شريف" },
  { text: "لا تحقرن صغيرة، إن الجبال من الحصى.", source: "شعر عربي" },
  { text: "من جد وجد، ومن زرع حصد.", source: "مثل عربي" },
  { text: "الوقت كالسيف إن لم تقطعه قطعك.", source: "ابن القيم" },
  { text: "اقرأ باسم ربك الذي خلق.", source: "أول آية" },
  { text: "البطل مش اللي مبيقعش، البطل اللي كل ما يقع يقوم.", source: "نيلسون مانديلا" },
  { text: "لو عايز نتيجة مختلفة، اعمل حاجة مختلفة النهاردة.", source: "أينشتاين" },
  { text: "التأجيل هو مقبرة الفرص.", source: "حكمة" },
  { text: "خليك ممل في التزامك، هتبقى مذهل في نتائجك.", source: "العادات الذرية" },
  { text: "الهوية تسبق العادة: أنا قارئ، عشان كده بقرأ.", source: "جيمس كلير" },
  { text: "بيئتك أهم من إرادتك. حط الكتاب جنب السرير.", source: "العادات الذرية" },
  { text: "العائق هو الطريق.", source: "رواقية" },
  { text: "ركز على النظام، النتيجة هتيجي لوحدها.", source: "العادات الذرية" },
  { text: "ما لا يُقاس لا يُحسّن. عشان كده بنسجل كل يوم.", source: "بيتر دراكر" },
  { text: "التعب المؤقت أهون من الندم الدائم.", source: "رياضي" },
  { text: "كل يوم بتقرأ فيه، انت بتكسب على نسختك بتاعة امبارح.", source: "تحفيز" },
  { text: "العظمة رحلة يومية، مش ضربة حظ.", source: "جون وودن" },
  { text: "الثقة بالنفس بتيجي من وعود صغيرة توفي بيها لنفسك.", source: "العادات الذرية" },
  { text: "مستقبلك هو مجموع قراراتك الصغيرة النهاردة.", source: "حكمة" },
  { text: "لا تقارن بدايتك بذروة شخص آخر.", source: "نصيحة" },
  { text: "القراءة هي تدريب مخك على التركيز في زمن التشتت.", source: "كال نيوبورت" },
  { text: "لو التزمت 30 يوم، هتبقى شخص تاني. جرّب.", source: "تحدي" },
  { text: "النجاح مش محتاج تكون عبقري، محتاج تكون مستمر.", source: "حقيقة" },
  { text: "كل كتاب تقرأه بيفتح باب عمرك ما كنت شايفه.", source: "حكمة" },
  { text: "الراحة الحقيقية بعد الإنجاز، مش قبله.", source: "فلسفة" },
  { text: "القراءة استثمار، مش تضييع وقت.", source: "وارن بافيت" },
  { text: "العادة السيئة تكسرها بعادة أحسن، مش بالإرادة بس.", source: "العادات الذرية" },
  { text: "خليك 1% أحسن كل يوم، كفاية.", source: "جيمس كلير" },
  { text: "التعلم هو المهارة الوحيدة اللي محدش يقدر ياخدها منك.", source: "حكمة" },
  { text: "لو عايز تبقى قائد، لازم تبقى قارئ أولاً.", source: "هاري ترومان" },
  { text: "العقل يصدأ مثل الحديد إذا لم يُستعمل.", source: "مثل" },
  { text: "الكسل يولد الندم، والعمل يولد الفخر.", source: "مصري" },
  { text: "اليوم اللي بتفوت فيه القراءة، انت بتفوت على نفسك فرصة تبقى أحسن.", source: "تذكير" },
  { text: "اقرأ التاريخ عشان متكررش أخطاء اللي قبلك.", source: "تاريخ" },
  { text: "اقرأ السياسة عشان تفهم اللعبة اللي بتتلعب عليك.", source: "سياسة" },
  { text: "اقرأ الإنجليزي عشان تفتح لنفسك عالم تاني.", source: "لغة" },
  { text: "الرياضة بتعلمك تخسر وتكسب، والقراءة بتعلمك تفهم ليه.", source: "رياضة" },
  { text: "ما تسيبش يوم يعدي من غير ما تتعلم حاجة جديدة.", source: "قاعدة ذهبية" },
  { text: "الالتزام في الأيام الصعبة هو اللي بيصنع الفرق.", source: "ديفيد جوجينز" },
  { text: "لو زهقت، غيّر الكتاب مش العادة.", source: "نصيحة عملية" },
  { text: "خلي عندك دفتر حكمة، اكتب فيه اللي اتعلمته.", source: "العادات الذرية" },
  { text: "التكرار هو أبو المهارات.", source: "توني روبنز" },
  { text: "العقل الفارغ هو ورشة الشيطان، املاه قراءة.", source: "مثل" },
  { text: "العادات الذرية بتقول: خليها واضحة، جذابة، سهلة، مُرضية.", source: "القوانين الأربعة" },
  { text: "لو نسيت تقرأ، اقرأ صفحة واحدة بس. المهم متكسرش السلسلة.", source: "قاعدة الدقيقتين" },
  { text: "انت مجموع الكتب اللي قريتها والناس اللي قابلتها.", source: "جيم رون" },
  { text: "مفيش شخص فاشل، فيه شخص معندوش نظام.", source: "حقيقة مرة" },
  { text: "الورقات دي هي الفرق بينك وبين اللي زيك.", source: "ميزة تنافسية" },
  { text: "ابدأ صغير، كمل كبير.", source: "العادات الذرية" },
  { text: "القراءة بتعلمك تفكر، مش تحفظ بس.", source: "تعليم" },
  { text: "لو عايز تغير حياتك، غيّر ما تقرأه قبل النوم.", source: "روتين" },
  { text: "العقل السليم في الجسم اللي بيقرأ كل يوم.", source: "حكمة" },
];

export const QUOTES_EN: Quote[] = [
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", source: "James Clear" },
  { text: "Every action you take is a vote for the person you wish to become.", source: "James Clear" },
  { text: "Discipline is choosing between what you want now and what you want most.", source: "Abraham Lincoln" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act but a habit.", source: "Will Durant" },
  { text: "A year from now you may wish you had started today.", source: "Karen Lamb" },
  { text: "The journey of a thousand miles begins with a single step.", source: "Lao Tzu" },
  { text: "Small daily improvements are the key to staggering long-term results.", source: "Robin Sharma" },
  { text: "Reading is to the mind what exercise is to the body.", source: "Joseph Addison" },
  { text: "A reader lives a thousand lives before he dies.", source: "George R. R. Martin" },
  { text: "The more that you read, the more things you will know.", source: "Dr. Seuss" },
  { text: "Books are a uniquely portable magic.", source: "Stephen King" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", source: "Seneca" },
  { text: "The obstacle is the way.", source: "Marcus Aurelius" },
  { text: "What gets measured gets managed.", source: "Peter Drucker" },
  { text: "Motivation gets you started. Habit keeps you going.", source: "Jim Ryun" },
  { text: "Consistency is what transforms average into excellence.", source: "Unknown" },
  { text: "Never break the chain.", source: "Jerry Seinfeld" },
  { text: "A little progress each day adds up to big results.", source: "Satya Nani" },
  { text: "The best time to plant a tree was twenty years ago. The second best time is now.", source: "Proverb" },
  { text: "You don't have to be great to start, but you have to start to be great.", source: "Zig Ziglar" },
  { text: "Fall seven times, stand up eight.", source: "Japanese proverb" },
  { text: "Reading is a conversation. All books talk. But a good book listens as well.", source: "Mark Haddon" },
  { text: "Until you make the unconscious conscious, it will direct your life.", source: "Carl Jung" },
  { text: "Slow is smooth, smooth is fast.", source: "Proverb" },
  { text: "Success is the sum of small efforts repeated day in and day out.", source: "Robert Collier" },
  { text: "The man who does not read good books has no advantage over the man who cannot read them.", source: "Mark Twain" },
  { text: "Knowledge is the only treasure you can give away and still keep.", source: "Unknown" },
  { text: "Amateurs sit and wait for inspiration. The rest of us just get up and go to work.", source: "Stephen King" },
  { text: "An investment in knowledge pays the best interest.", source: "Benjamin Franklin" },
  { text: "Don't count the days. Make the days count.", source: "Muhammad Ali" },
  { text: "He who has a why to live can bear almost any how.", source: "Friedrich Nietzsche" },
  { text: "The habit of reading is the only enjoyment in which there is no alloy.", source: "Anthony Trollope" },
  { text: "There is no friend as loyal as a book.", source: "Ernest Hemingway" },
  { text: "Sleep is the best meditation.", source: "Dalai Lama" },
  { text: "First we form habits, then they form us.", source: "Rob Gilbert" },
  { text: "Start where you are. Use what you have. Do what you can.", source: "Arthur Ashe" },
  { text: "Compound interest works on habits too.", source: "Unknown" },
  { text: "You will never always be motivated. You must learn to be disciplined.", source: "Unknown" },
  { text: "The pain of discipline weighs ounces; the pain of regret weighs tons.", source: "Jim Rohn" },
  { text: "Read. Read anything. Read the things they say are not literature.", source: "Natalie Goldberg" },
];

const DECKS: Record<Lang, Quote[]> = { ar: QUOTES_AR, en: QUOTES_EN };

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

/** Stable quote for the day; `offset` lets the reader shuffle. */
export function dailyQuote(lang: Lang, date: Date = new Date(), offset = 0): Quote {
  const deck = DECKS[lang] ?? QUOTES_EN;
  const idx = ((dayOfYear(date) + offset) % deck.length + deck.length) % deck.length;
  return deck[idx];
}

export function quotesFor(lang: Lang): Quote[] {
  return DECKS[lang] ?? QUOTES_EN;
}
