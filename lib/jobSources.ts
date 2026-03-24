// Free job data sources — no API keys required

export interface RawJob {
  title: string;
  company: string;
  location: string;
  remote: boolean;
  description: string;
  requirements: string[];
  url: string;
  source: string;
  salaryMin?: number;
  salaryMax?: number;
  postedAt?: string;
}

// ─── Remotive (remote tech jobs) ──────────────────────────────────────────────
export async function fetchRemotiveJobs(query: string): Promise<RawJob[]> {
  try {
    const category = "software-dev";
    const url = `https://remotive.com/api/remote-jobs?category=${category}&search=${encodeURIComponent(query)}&limit=15`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs ?? []).map((j: any) => ({
      title: j.title ?? "",
      company: j.company_name ?? "",
      location: j.candidate_required_location || "Remote",
      remote: true,
      description: stripHtml(j.description ?? "").slice(0, 600),
      requirements: extractRequirements(j.tags ?? []),
      url: j.url ?? "",
      source: "Remotive",
      postedAt: j.publication_date,
    }));
  } catch {
    return [];
  }
}

// ─── Arbeitnow (general tech jobs) ────────────────────────────────────────────
export async function fetchArbeitnowJobs(query: string): Promise<RawJob[]> {
  try {
    const res = await fetch("https://arbeitnow.com/api/job-board-api", {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const q = query.toLowerCase();
    return (data.data ?? [])
      .filter((j: any) =>
        j.title?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q) ||
        j.tags?.some((t: string) => t.toLowerCase().includes(q))
      )
      .slice(0, 10)
      .map((j: any) => ({
        title: j.title ?? "",
        company: j.company_name ?? "",
        location: j.location || (j.remote ? "Remote" : ""),
        remote: !!j.remote,
        description: stripHtml(j.description ?? "").slice(0, 600),
        requirements: j.tags ?? [],
        url: j.url ?? "",
        source: "Arbeitnow",
        postedAt: j.created_at,
      }));
  } catch {
    return [];
  }
}

// ─── Hacker News "Who is Hiring" (via Algolia) ────────────────────────────────
export async function fetchHNJobs(query: string): Promise<RawJob[]> {
  try {
    // Find the most recent "Who is Hiring" thread
    const searchRes = await fetch(
      `https://hn.algolia.com/api/v1/search?query=Ask+HN%3A+Who+is+hiring&tags=ask_hn&hitsPerPage=1`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const storyId = searchData.hits?.[0]?.objectID;
    if (!storyId) return [];

    // Search comments in that thread for the query
    const commentsRes = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=comment,story_${storyId}&hitsPerPage=20`,
      { next: { revalidate: 300 } }
    );
    if (!commentsRes.ok) return [];
    const commentsData = await commentsRes.json();

    return (commentsData.hits ?? [])
      .filter((h: any) => h.comment_text && h.comment_text.length > 100)
      .slice(0, 10)
      .map((h: any) => {
        const text = stripHtml(h.comment_text ?? "").slice(0, 800);
        const firstLine = text.split("\n")[0].slice(0, 120);
        const companyMatch = firstLine.match(/^([A-Z][^|–\-]+?)\s*[|–\-]/);
        const company = companyMatch ? companyMatch[1].trim() : "HN Company";
        return {
          title: extractTitleFromHN(text) || query,
          company,
          location: extractLocationFromHN(text) || "Remote",
          remote: /remote/i.test(text),
          description: text.slice(0, 600),
          requirements: extractRequirementsFromText(text),
          url: `https://news.ycombinator.com/item?id=${h.objectID}`,
          source: "HN Who's Hiring",
        };
      });
  } catch {
    return [];
  }
}

// ─── Greenhouse boards (YC portfolio + top startups) ──────────────────────────
const YC_COMPANIES: { slug: string; name: string }[] = [
  { slug: "linear", name: "Linear" },
  { slug: "stripe", name: "Stripe" },
  { slug: "airbnb", name: "Airbnb" },
  { slug: "coinbase", name: "Coinbase" },
  { slug: "brex", name: "Brex" },
  { slug: "gusto", name: "Gusto" },
  { slug: "figma", name: "Figma" },
  { slug: "lattice", name: "Lattice" },
  { slug: "doordash", name: "DoorDash" },
  { slug: "rippling", name: "Rippling" },
  { slug: "plaid", name: "Plaid" },
  { slug: "retool", name: "Retool" },
  { slug: "vercel", name: "Vercel" },
  { slug: "posthog", name: "PostHog" },
  { slug: "clerk", name: "Clerk" },
  { slug: "supabase", name: "Supabase" },
];

export async function fetchGreenhouseJobs(query: string): Promise<RawJob[]> {
  const q = query.toLowerCase();
  const results: RawJob[] = [];

  await Promise.allSettled(
    YC_COMPANIES.map(async ({ slug, name }) => {
      try {
        const res = await fetch(
          `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
          { next: { revalidate: 600 } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const matched = (data.jobs ?? []).filter((j: any) =>
          j.title?.toLowerCase().includes(q) ||
          j.departments?.some((d: any) => d.name?.toLowerCase().includes(q))
        );
        for (const j of matched.slice(0, 3)) {
          results.push({
            title: j.title ?? "",
            company: name,
            location: j.location?.name || "Remote",
            remote: /remote/i.test(j.location?.name ?? ""),
            description: stripHtml(j.content ?? "").slice(0, 600),
            requirements: extractRequirementsFromText(j.content ?? ""),
            url: j.absolute_url ?? `https://boards.greenhouse.io/${slug}`,
            source: "Greenhouse (YC)",
          });
        }
      } catch {
        // silently skip failed boards
      }
    })
  );

  return results;
}

// ─── Lever boards (YC & VC-backed startups) ───────────────────────────────────
const LEVER_COMPANIES: { slug: string; name: string }[] = [
  { slug: "openai", name: "OpenAI" },
  { slug: "anthropic", name: "Anthropic" },
  { slug: "scale", name: "Scale AI" },
  { slug: "cohere", name: "Cohere" },
  { slug: "verkada", name: "Verkada" },
  { slug: "watershed", name: "Watershed" },
  { slug: "ramp", name: "Ramp" },
];

export async function fetchLeverJobs(query: string): Promise<RawJob[]> {
  const q = query.toLowerCase();
  const results: RawJob[] = [];

  await Promise.allSettled(
    LEVER_COMPANIES.map(async ({ slug, name }) => {
      try {
        const res = await fetch(
          `https://api.lever.co/v0/postings/${slug}?mode=json&limit=50`,
          { next: { revalidate: 600 } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const matched = (data ?? []).filter((j: any) =>
          j.text?.toLowerCase().includes(q) ||
          j.categories?.team?.toLowerCase().includes(q)
        );
        for (const j of matched.slice(0, 3)) {
          results.push({
            title: j.text ?? "",
            company: name,
            location: j.categories?.location || j.categories?.allLocations?.[0] || "Remote",
            remote: /remote/i.test(j.categories?.location ?? "") || /remote/i.test(j.categories?.commitment ?? ""),
            description: stripHtml(j.descriptionPlain ?? j.description ?? "").slice(0, 600),
            requirements: extractRequirementsFromText(j.descriptionPlain ?? ""),
            url: j.hostedUrl ?? `https://jobs.lever.co/${slug}`,
            source: "Lever (VC-backed)",
          });
        }
      } catch {
        // silently skip
      }
    })
  );

  return results;
}

// ─── Aggregate all sources ─────────────────────────────────────────────────────
export async function fetchAllJobs(
  query: string,
  location: string,
  seniority: string
): Promise<RawJob[]> {
  const searchQuery = `${seniority !== "Mid-level" ? seniority.toLowerCase() + " " : ""}${query}`.trim();

  const [remotive, arbeitnow, hn, greenhouse, lever] = await Promise.all([
    fetchRemotiveJobs(searchQuery),
    fetchArbeitnowJobs(searchQuery),
    fetchHNJobs(searchQuery),
    fetchGreenhouseJobs(query), // use base role for Greenhouse (seniority in title varies)
    fetchLeverJobs(query),
  ]);

  let all = [...greenhouse, ...lever, ...remotive, ...arbeitnow, ...hn];

  // Location filter (loose — if remote is OK or location matches)
  if (location && !/remote/i.test(location)) {
    const loc = location.toLowerCase();
    all = all.filter(
      (j) =>
        j.remote ||
        j.location.toLowerCase().includes(loc) ||
        loc.includes(j.location.toLowerCase().split(",")[0].toLowerCase())
    );
  }

  // Deduplicate by title+company
  const seen = new Set<string>();
  const deduped = all.filter((j) => {
    const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.slice(0, 25);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRequirements(tags: string[]): string[] {
  return tags.filter(Boolean).slice(0, 8);
}

function extractRequirementsFromText(text: string): string[] {
  const techKeywords = [
    "TypeScript", "JavaScript", "Python", "React", "Node.js", "Go", "Rust",
    "AWS", "GCP", "Azure", "PostgreSQL", "MongoDB", "Redis", "GraphQL",
    "Kubernetes", "Docker", "Terraform", "CI/CD", "Machine Learning", "LLMs",
    "Next.js", "Vue", "Angular", "SQL", "REST", "API",
  ];
  return techKeywords.filter((kw) =>
    new RegExp(`\\b${kw.replace(".", "\\.")}\\b`, "i").test(text)
  ).slice(0, 8);
}

function extractTitleFromHN(text: string): string {
  const roleMatch = text.match(
    /\b(engineer|developer|designer|manager|lead|architect|analyst|scientist|researcher)\b/i
  );
  if (!roleMatch) return "";
  const idx = text.indexOf(roleMatch[0]);
  return text.slice(Math.max(0, idx - 30), idx + roleMatch[0].length + 10).trim().slice(0, 60);
}

function extractLocationFromHN(text: string): string {
  const locMatch = text.match(
    /\b(Remote|San Francisco|New York|NYC|Seattle|Austin|Boston|London|Berlin|Toronto|Worldwide)\b/i
  );
  return locMatch ? locMatch[0] : "Remote";
}
