/**
 * The SEO checklist Rank Math shows in the WordPress editor, run in the CRM.
 *
 * Rank Math scores a post in the browser as it is written, so there is no
 * server call to borrow. This runs the same tests — focus keyword placement,
 * length, links, readability — with the same pass rules, weighted to a score
 * out of 100. The score is saved to Rank Math's own field on the post, so the
 * posts list in WordPress agrees with the CRM; Rank Math recalculates it with
 * its exact weights whenever the post is opened in its own editor.
 */

export interface SeoInput {
  title: string;
  seoTitle: string;
  description: string;
  slug: string;
  html: string;
  keyword: string;
  siteUrl: string;
  usedKeywords: string[];
}

export interface SeoTest {
  id: string;
  label: string;
  pass: boolean;
  /** Part credit is possible on length and density. */
  score: number;
  max: number;
  hint: string;
}

export interface SeoGroup {
  label: string;
  tests: SeoTest[];
}

export interface SeoResult {
  score: number;
  groups: SeoGroup[];
  words: number;
  density: number;
}

const POWER = [
  "amazing", "best", "proven", "essential", "ultimate", "complete", "simple", "easy", "free",
  "guide", "secret", "powerful", "effective", "quick", "fast", "instant", "new", "exclusive",
  "guaranteed", "important", "must", "top", "expert", "smart", "save", "profit", "cheap",
  "affordable", "step-by-step", "how", "why", "tips", "mistakes", "avoid", "boost", "increase",
];

const SENTIMENT = [
  "best", "better", "great", "good", "amazing", "awesome", "love", "happy", "success", "successful",
  "profitable", "easy", "reliable", "trusted", "safe", "win", "winning", "worst", "bad", "avoid",
  "mistake", "mistakes", "fail", "failure", "risk", "risky", "costly", "problem", "problems",
  "warning", "never", "wrong", "hidden", "danger", "dangerous", "stop", "loss",
];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function countPhrase(text: string, phrase: string): number {
  if (!phrase) return 0;
  const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (text.match(new RegExp(`(^|[^\\p{L}\\p{N}])${esc}(?=$|[^\\p{L}\\p{N}])`, "giu")) ?? []).length;
}

const has = (text: string, phrase: string) => countPhrase(norm(text), phrase) > 0;

interface Parsed {
  text: string;
  headings: string[];
  paragraphs: string[];
  images: { alt: string }[];
  videos: number;
  links: { href: string; rel: string }[];
}

function parse(html: string): Parsed {
  // Without a browser parser (the server render) — or with nothing to parse —
  // return exactly what the browser would find in an empty post, so the two
  // renders agree.
  if (typeof DOMParser === "undefined" || !html.trim()) {
    const text = html.replace(/<[^>]+>/g, " ");
    return { text, headings: [], paragraphs: text.trim() ? [text] : [], images: [], videos: 0, links: [] };
  }
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const all = (sel: string) => Array.from(doc.querySelectorAll(sel));
  return {
    text: doc.body.textContent ?? "",
    headings: all("h2,h3,h4,h5,h6").map((h) => h.textContent ?? ""),
    paragraphs: all("p").map((p) => p.textContent ?? "").filter((t) => t.trim()),
    images: all("img").map((i) => ({ alt: i.getAttribute("alt") ?? "" })),
    videos: all("video,iframe").length,
    links: all("a[href]").map((a) => ({ href: a.getAttribute("href") ?? "", rel: a.getAttribute("rel") ?? "" })),
  };
}

const words = (s: string) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function analyzeSeo(input: SeoInput): SeoResult {
  const kw = norm(input.keyword.split(",")[0] ?? "");
  const title = input.seoTitle.trim() || input.title.trim();
  const p = parse(input.html);
  const text = norm(p.text);
  const wc = words(p.text);
  const occurrences = countPhrase(text, kw);
  const density = wc ? (occurrences * (kw.split(" ").length || 1) * 100) / wc : 0;
  const site = hostOf(input.siteUrl);

  const internal = p.links.filter((l) => l.href.startsWith("/") || l.href.startsWith("#") || (site && hostOf(l.href) === site));
  const external = p.links.filter((l) => /^https?:\/\//i.test(l.href) && hostOf(l.href) !== site);
  const dofollow = external.filter((l) => !/nofollow/i.test(l.rel));

  const t = (id: string, label: string, pass: boolean, max: number, hint: string, score?: number): SeoTest => ({
    id,
    label,
    pass,
    max,
    score: kw ? (score ?? (pass ? max : 0)) : 0,
    hint,
  });

  const lengthScore = wc >= 2500 ? 8 : wc >= 2000 ? 7 : wc >= 1500 ? 6 : wc >= 1000 ? 4 : wc >= 600 ? 2 : 0;
  const densityScore = density >= 1 && density <= 1.5 ? 6 : density >= 0.5 && density <= 2.5 ? 3 : 0;
  const slugKw = kw.replace(/\s+/g, "-");
  const urlLen = (site + "/" + input.slug).length;
  const firstTenth = text.slice(0, Math.max(200, Math.ceil(text.length * 0.1)));
  const titleAt = norm(title).indexOf(kw);
  const longParas = p.paragraphs.filter((x) => words(x) > 120).length;
  const media = p.images.length + p.videos;
  const tw = norm(title).split(/[^\p{L}\p{N}-]+/u);

  const groups: SeoGroup[] = [
    {
      label: "Basic SEO",
      tests: [
        t("kw_title", "Focus keyword in the SEO title", has(title, kw), 8, "Put the focus keyword in the title people see in Google."),
        t("kw_desc", "Focus keyword in the meta description", has(input.description, kw), 5, "Use the focus keyword in the meta description."),
        t("kw_url", "Focus keyword in the URL", norm(input.slug).includes(slugKw), 5, "Put the focus keyword in the URL slug."),
        t("kw_start", "Focus keyword at the start of the content", has(firstTenth, kw), 5, "Use the focus keyword in the first 10% of the post."),
        t("kw_content", "Focus keyword in the content", occurrences > 0, 5, "Use the focus keyword in the body of the post."),
        t("length", `Content length (${wc} words)`, wc >= 600, 8, "Aim for 600–2,500 words; longer, thorough posts score higher.", lengthScore),
      ],
    },
    {
      label: "Additional",
      tests: [
        t("kw_sub", "Focus keyword in a subheading", p.headings.some((h) => has(h, kw)), 5, "Use the focus keyword in at least one H2 or H3."),
        t("kw_alt", "Focus keyword in an image's alt text", p.images.some((i) => has(i.alt, kw)), 4, "Add an image whose alt text includes the focus keyword."),
        t("density", `Keyword density ${density.toFixed(2)}% (${occurrences}×)`, densityScore > 0, 6, "Aim for 1–1.5%: often enough to be clear, not stuffed.", densityScore),
        t("url_len", `URL length (${urlLen} characters)`, urlLen <= 75, 3, "Keep the URL under 75 characters."),
        t("ext", "Links to other websites", external.length > 0, 3, "Link to a useful source on another website."),
        t("dofollow", "At least one followed external link", dofollow.length > 0, 2, "Leave at least one external link without nofollow."),
        t("int", "Links to other pages on this site", internal.length > 0, 5, "Link to another page or post on brandsquare.shop."),
        t("unique", "Focus keyword not used before", !input.usedKeywords.includes(kw), 3, "Another post already targets this keyword; pick a different one so they don't compete."),
      ],
    },
    {
      label: "Title readability",
      tests: [
        t("title_start", "Focus keyword near the start of the title", titleAt >= 0 && titleAt <= norm(title).length / 2, 4, "Move the focus keyword to the first half of the title."),
        t("sentiment", "Title carries a positive or negative word", tw.some((w) => SENTIMENT.includes(w)), 3, "Words like best, avoid or mistakes make a title more clickable."),
        t("power", "Title has a power word", tw.some((w) => POWER.includes(w)), 3, "Words like proven, essential or complete draw attention."),
        t("number", "Title has a number", /\d/.test(title), 3, "Numbers — “7 ways”, “2026” — raise click-through."),
      ],
    },
    {
      label: "Content readability",
      tests: [
        t(
          "toc",
          "Table of contents",
          p.headings.some((h) => /contents/i.test(h)) || p.links.filter((l) => l.href.startsWith("#")).length >= 3,
          4,
          "Add a short table of contents linking to the sections of a long post."
        ),
        t("paras", "Short paragraphs", p.paragraphs.length > 0 && longParas === 0, 8, "Keep every paragraph under 120 words."),
        t("media", `Images or videos (${media})`, media > 0, 8, "Add images or a video; posts with four or more score best.", media >= 4 ? 8 : media > 0 ? 5 : 0),
      ],
    },
  ];

  const score = kw ? Math.round(groups.flatMap((g) => g.tests).reduce((n, x) => n + x.score, 0)) : 0;
  return { score: Math.min(100, score), groups, words: wc, density };
}

export function scoreColour(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

export function scoreLabel(score: number): string {
  if (score >= 80) return "Good";
  if (score >= 50) return "Needs work";
  return "Poor";
}
