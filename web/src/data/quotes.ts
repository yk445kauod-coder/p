/**
 * Daily quote decks.
 *
 * A quote is chosen deterministically from the day number, so it is stable
 * within a day and changes each morning. The Arabic deck is Egyptian-friendly
 * and mirrors the English one rather than translating it literally.
 */
export interface QuoteDef {
  text: string;
  source: string;
}

export const DAILY_QUOTES: Record<"en" | "ar", QuoteDef[]> = {
  en: [
    { text: "You do not rise to the level of your goals. You fall to the level of your systems.", source: "Atomic Habits" },
    { text: "Every action you take is a vote for the type of person you wish to become.", source: "James Clear" },
    { text: "A reader lives a thousand lives before he dies.", source: "George R.R. Martin" },
    { text: "Discipline is choosing between what you want now and what you want most.", source: "Abraham Lincoln" },
    { text: "One day is not enough to change your life, but every day matters.", source: "Atomic Habits" },
    { text: "Books are a uniquely portable magic.", source: "Stephen King" },
    { text: "Small daily improvements are the key to staggering long-term results.", source: "Robin Sharma" },
    { text: "The reading of all good books is like a conversation with the finest minds.", source: "René Descartes" },
    { text: "You don't have to be great to start, but you have to start to be great.", source: "Zig Ziglar" },
    { text: "A room without books is like a body without a soul.", source: "Cicero" },
    { text: "Motivation gets you going, but habit gets you there.", source: "Zig Ziglar" },
    { text: "Reading is to the mind what exercise is to the body.", source: "Joseph Addison" },
  ],
  ar: [
    { text: "أنت لا ترتقي لمستوى أهدافك، أنت تهبط لمستوى أنظمتك.", source: "العادات الذرية" },
    { text: "كل عادة صغيرة هي تصويت لهوية الشخص الذي تريد أن تصبح عليه.", source: "جيمس كلير" },
    { text: "القارئ يعيش ألف حياة قبل أن يموت.", source: "جورج مارتن" },
    { text: "الانضباط هو أن تختار بين ما تريده الآن وما تريده أكثر.", source: "أبراهام لينكولن" },
    { text: "يوم واحد لا يكفي لتغيير حياتك، لكن كل يوم يهم.", source: "العادات الذرية" },
    { text: "الكتب سحر متنقل.", source: "ستيفن كينج" },
    { text: "التحسينات الصغيرة اليومية هي مفتاح النتائج الكبيرة.", source: "روبن شارما" },
    { text: "قراءة الكتب الجيدة كأنها محادثة مع أعظم العقول.", source: "رينيه ديكارت" },
    { text: "مش لازم تكون عظيم عشان تبدأ، لازم تبدأ عشان تبقى عظيم.", source: "زيج زيجلار" },
    { text: "أوضة من غير كتب زي جسم من غير روح.", source: "شيشرون" },
    { text: "الحماس بيخليك تبدأ، بس العادة هي اللي بتوصلك.", source: "زيج زيجلار" },
    { text: "القراية للعقل زي الرياضة للجسم.", source: "جوزيف أديسون" },
  ],
};
