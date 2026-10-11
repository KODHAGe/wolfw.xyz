# Content and positioning strategy — wolfw.xyz

Zone: **DESIRED**. This document proposes changes; it does not describe recovered
behaviour. Every factual claim is cited to `file:line`, to the live site, or to
`spec/`. Where a fact is needed and does not exist in the repository, it is named
in **Appendix A** rather than invented.

**Provenance rule observed throughout.** No project name, client name, date or
line of copy in this document is invented. Quoted copy is verbatim. Where I say
"this should be written", I identify who must write it and what raw material
exists — I do not write it here.

---

## Part 1 — What the site currently communicates, and how well

### 1.1 The public site makes almost no professional claim

Reading the live site end to end, the total public assertion is:

| Surface | What it says | Citation |
|---|---|---|
| `/` | "wolfw.xyz" / "Hi, I'm Wolf W" / "I make web happen - both beautiful and useful." + six buttons + a mailto | `index.js:10-27`; verified `live:/` 2026-10-10 |
| `/work`, `/art` | `{category}: {title} →` over a thumbnail. No date, client, role, summary or outcome | `listItem.js:11`; verified `live:/work` |
| project pages | title, body prose, optional "Video available on request", optional `**Tech:**` trailer | `recovered.md#R2.3`; verified `live:/election-day-results` |
| `/about` | "About me", a portrait, a beard disclaimer, then one sentence — *"Hi, I'm Wolf Wikgren. Below you can get to know some truths (true at the time of writing, not aiming for permanence) about me."* — and a fact revealer | `about.js:17-20`; `facts.js:33`; verified `live:/about` |
| `/cv` | full employment history with dates | `cvList.js:9-95` — **gated** |

The structural finding: **the only page on the site that carries dates, employers,
clients and outcomes is the one behind a password prompt.** Everything a visitor
can reach without a password is either navigation or unlabelled prose. The site's
professional argument is locked in the page it hides.

That is not a contradiction of D3.1 — the gate is a UX affordance and the CV text
ships in the public bundle (`recovered.md#R5.7`, confirmed by the owner). But it
is a *positioning* failure: the gate's stated purpose is "not every visitor needs
to see this", and in practice it is the only place the site explains who he is.

### 1.2 The corpus is more coherent than the site admits

I read all 18 recovered bodies (`rebuild/src/content/projects/`). As a body of
thinking they hold together considerably better than as a listing.

**A consistent specialism, unclaimed.** At least four of the twelve work projects
name the Finnish news agency STT in the body text, and one names the State
Treasury:

- `election-day-results.md:21` — *"we at STT produced a set of real-time visualizations"*
- `diabetes.md:23` — *"Working together with a writing journalist, the incidence of diabetes in Finland was explored."*
- `stt-tarkkailija.md:26` — *"Working together with stakeholders within the news organization – sales, management and staff writers"*
- `lukiovertailu-high-school-comparison.md:24` — *"developed for STT news agency"*
- `visualizing-government.md:24` — *"As a part of the State Treasury data analyst team, our mission is to make the wealth of data produced by different processes of government accessible and understandable."*
- `veikkaus-beneficiaries.md:24` — *"we worked with Veikkaus to develop a tool in which this distribution could be observed in a more transparent fashion"*

Cross-referencing `cv/recent-positions.yaml`, Veikkaus is listed as an STT client
under "2014 – 2015". So **roughly half the work corpus is public-interest data
work for Finnish institutions** — a news agency, a ministry, a national lottery.
That is a real, specific, employable specialism. The site never states it.

**An explicit epistemological position, stated in his own words, four times.** This
is the strongest unclaimed asset in the corpus.

- `approval-rates.md:26` — *"The idea was not to present any particular hypotheses or conclusions, but to explore the given datasets by juxtaposing them with events that might affect them, leaving interpretation to the user while giving them all the information possible."*
- `beyond-shape.md:36` — *"Developing a concept of visualizing data in a way that could also communicate some of the fuzziness, uncertainty of interpretation included in the presentation."*
- `eurovision-som.md:28` — the process list includes *"Visualizing the progress and end result of that SOM-network"* — showing the model working, not just its output.
- `visualizing-government.md:24` — *"the translation of data into insight, insight into decisionmaking. And ultimately, better outcomes for us all. Hopefully."* — note the deliberate hedge on the last word.

Read together, that is a **point of view**: the job of a visualisation is to give
the reader enough to interpret for themselves, uncertainty included, rather than
to deliver a conclusion. It is a defensible and current position in data
visualisation practice. It appears nowhere in site copy, which says *"I make web
happen - both beautiful and useful"* (`index.js:14`).

**A research-through-making method, repeated.** Five bodies carry an explicit
`Process:` / `Process` list (`beyond-shape.md:32`, `brb-email.md:29`,
`eurovision-som.md:18`, `ilmastonmuuttajat-climate-changers.md:20`,
`stt-tarkkailija.md:28`).
That is a design-researcher's habit and it is the Aalto Media Lab MA
(`cv/education.yaml`, "MA in New Media Design and Production", 2015–2019) showing
through. It is currently rendered as flat prose after the body, indistinguishable
from the rest.

**A quieter second signature in the art work.** `inversion.md:26-42` is four
essays on surfaces, control and the emotions systems cause — the Amiga joystick
story, the wiimote rage, the online intimacy one. `i-can-t-let-you-do-that-human.md:26`
is a game about defeating a Kinect sensor. `instru-mental.md:26` is a networked
instrument. These are not a scatter of media experiments; they are **the same
thesis as the work projects, approached from the other side** — *the interface is
where a person meets a system, and that meeting is emotional and often badly
designed*. The site splits them into `/art` and `/work` as if unrelated
(`work.js:25`, `art.js:25`), which is exactly backwards: the art is what explains
the work.

### 1.3 Where the corpus is genuinely weak — stated plainly

This is not all recoverable by better copy.

- **Two of eighteen pages carry an unfulfilled six-year-old promise.** `beyond-shape.md:26` and `ilmastonmuuttajat-climate-changers.md:16` both read *"More content will follow, watch this space."* A careful visitor reads that as abandonment.
- **`conversions.md:21`** ends *"To be expanded."*, followed by two captions ("Conversion #1", "Conversion #3") with nothing else.
- **At least three outbound links are dead.** Checked 2026-10-10:
  - `http://esc-som.herokuapp.com/` (`eurovision-som.md:16`) — **404**
  - `http://lukiovertailu.herokuapp.com/` (`lukiovertailu-high-school-comparison.md:30`) — **503** (Heroku free tier was retired in Nov 2022)
  - `http://xn--kkriinen-0zad.fi/` (`kaekriaeinen.md:34` and `:36`, both http and https) — **no response**
  - `http://theseus.fi/handle/10024/86669` (`lukiovertailu-high-school-comparison.md:32`) — **403** to an automated client; may be bot-blocking rather than dead. **Needs a manual check** — do not treat this one as confirmed.
- **Ten of eighteen `summary` fields are truncated mid-word at exactly 160 characters** — e.g. `brb-email.md:6` ends `"...Exploring the modality of 'insta` and `diabetes.md:6` ends `"...[STT](http://stt.fi/). Th"`. This is a hard-coded 160-char excerpt from the Sanity era. **If the redesign surfaces summaries as card copy — which is the obvious readability move — 56% of the cards render as broken text.**
- **Typos in shipped copy**: `election-day-results.md:23` "deveral"; `kaekriaeinen.md:24` "ciritiques"; `runokuu-2020.md:21` "throrough"; `stt-tarkkailija.md:24` "its'"; `kaekriaeinen.md:30` "a custom a custom built". Cheap to fix, but it means **the copy needs an editorial pass, and that pass has not happened**.

### 1.4 Answer to Part 1

**Coherent in thought, incoherent in presentation, and partly rotten in fact.**
There is a real point of view here — public-interest Finnish data work, made
honestly, with uncertainty shown — and the site's two-sentence copy actively
conceals it. But three of the eighteen project pages are visibly abandoned and at
least three external links are dead, so the rot is not only presentational.

The strongest thing the copy does not claim: **"I build data visualisations for
public institutions, and I design them to let the reader draw their own
conclusions rather than mine."** That sentence is assembled entirely from the
owner's own words in `approval-rates.md:26`, `visualizing-government.md:24` and
`beyond-shape.md:36`. It needs his sign-off, not his invention.

---

## Part 2 — The staleness problem

### 2.1 The facts, precisely

- Git's last substantive commit to the legacy site is **2022-03-23** (`spec/gaps.md#G2`); the live deployment of 2026-10-03 is a redeployment of that source.
- **The live site shows no date on any project, anywhere.** `publishedAt` was queried only as a sort key (`work.js:25`); `listItem.js:11` renders category, title and arrow. Verified `live:/election-day-results` — title, body, `Tech:` line, no date.
- **The rebuild has introduced a date, and it is a fabrication.** Every project file carries `publishedAt: 2020-01-01` — a placeholder, per `spec/gaps.md#G3`: *"`publishedAt` was not recoverable from the rendered page … so dates are set to a placeholder and need the Sanity export (G1) to resolve properly."*
- **`rebuild/src/pages/[slug].astro:34` renders that placeholder on every project page.** So the rebuild currently asserts "2020-01-01" for at least four projects whose own bodies contradict it:
  - `election-day-results.md:21` — *"parliamentary elections of early 2015"*
  - `kaekriaeinen.md:26` — *"two issues, 3/2016 and 4/2016"*
  - `i-can-t-let-you-do-that-human.md:26` — *"Media Lab Spring Demo Day 2016"*
  - `runokuu-2020.md:21` — the year is right (the festival is named "Runokuu 2020"), though `01-01` as the month is almost certainly not.
- **The placeholder also destroyed the site's only chronological signal.** The legacy listing sorted by real `publishedAt` descending (`work.js:25`), and that order survives in the extraction — `extract/live/__listing_work.html`, in order: `visualizing-government`, `digitaalinenkirjallisuus-fi`, `runokuu-2020`, `brb-email`, `stt-tarkkailija`, `ilmastonmuuttajat-climate-changers`, `kaekriaeinen`, `veikkaus-beneficiaries`, `election-day-results`, `approval-rates`, `diabetes`, `lukiovertailu-high-school-comparison`. In the rebuild all 18 share one date, so `ProjectList.astro:29` sorts a full set of ties and the real order is gone.

**This is the single most important finding in this document.** Right now, today,
the rebuild is *less* honest than the legacy site on the one question every
portfolio visitor asks. A visual redesign layered on top of a fabricated date
makes the fabrication prettier; it does not make it true.

### 2.2 Should old work be dated explicitly?

**Yes. Explicitly, on every card and every project page.** Reasons, in order:

1. **Undated work reads as abandoned; dated work reads as established.** The identical corpus, presented with years, becomes "a decade of published work for Finnish institutions". Presented without, it becomes "a feed that stopped". The only variable is whether the years are printed.
2. **Hiding the date does not work.** The bodies contradict the pretence: `election-day-results.md:21` says "early 2015" in the first sentence. A visitor who reads one project learns the age of all of them — and learns that the site was not telling them.
3. **The dates are defensible.** They do not need to be invented. See 2.3.

**Form.** Year on the card (`2015`), year on the project page, and a period
statement on any index that aggregates (`2013–2020`). Precision should match
confidence: where only the year is known, show the year, not `YYYY-MM-DD`. The
current `[slug].astro:34` renders a full ISO date to the day, which asserts a
precision nobody has.

### 2.3 How to get the dates honestly

Three sources, in descending order of authority. **Do not proceed with option 4.**

1. **Sanity export** (`spec/gaps.md#G1`, `desired.md#D1.3` already mandates the export as part of decommissioning). `publishedAt` is a real field in the source dataset; it was simply not rendered. The export closes this exactly.
2. **The legacy listing order.** Already captured in `extract/live/__listing_work.html` and `__listing_art.html`. It is a strict `publishedAt DESC` sort (`work.js:25`, `art.js:25`), so it gives a total order even without values. Enough to place projects relative to one another.
3. **In-body evidence.** Four projects carry explicit years in their own text (2.1). Several more are anchored by the CV: the STT cluster (`election-day-results`, `diabetes`, `stt-tarkkailija`, `lukiovertailu`) falls inside the STT roles of 2013–2017 (`cv/recent-positions.yaml`); `visualizing-government` is the State Treasury role, "2020 – present".

Options 2 and 3 together give a defensible year for most of the corpus, flagged as
inferred. **Option 4 — leaving `2020-01-01` in place — is not available.** It is a
false statement shipped on eighteen pages.

**If the Sanity export is not obtained**, the schema should stop accepting a date
it cannot verify: render no date rather than a placeholder, and carry the
inferred year in a separately named, clearly-marked field. A field called
`publishedAt` that holds `2020-01-01` for a 2015 project is worse than no field.

### 2.4 The honest presentation of a portfolio whose newest item is 2020

Three moves, all of which are structural rather than cosmetic:

**(a) Frame the corpus as a period, not a feed.** Somewhere prominent — home or
`/work` — the site should say, in effect, *"Selected work, 2013–2020."* Naming the
period is what converts staleness into seniority. A site that lists work with no
dates invites the question *"is this current?"* A site that labels the period has
already answered it, and the answer is "this is a body of work, not a feed".

**(b) Lead with outcomes that time cannot date away.** Three exist verbatim in the
bodies and none is currently surfaced anywhere but the project page:
- `election-day-results.md:23` — *"closing in on 300 000 users in total across all of our clients' publications during the election night"*
- `stt-tarkkailija.md:24` — *"would later go on to receive generous funding from [Google DNI]"*
- `visualizing-government.md:26` — *"published as part of ministry reports … become parts of the developing https://www.exploreadministration.fi/ -portal"*

These are the strongest proof-of-calibre on the site. They are as valid in 2026 as
in 2015, and they are currently invisible from the listing.

**(c) Do not pretend the site is a current record of his work.** It is not, and
cannot be made one by relabelling. If there is no post-2020 work (Appendix A, Q2),
the honest structure is a single dated archive with a clear statement of what it
covers — not a "Recent work" heading over 2016 projects.

### 2.5 Should the structure change to accommodate newer work?

**Yes — but only if newer work exists.** This is the fork in the road and it
cannot be decided from the repository.

- **If post-2020 work exists** → the split is right: `Selected` (a small, dated, deliberately curated set — arguably 4–6 items drawn from the strongest outcomes in 2.4(b)) separated from `Archive` (the full dated corpus). This is the standard solution and it works precisely because the archive is explicitly labelled as an archive. `ProjectList.astro` already takes its filter as a prop, so adding a `featured: boolean` to the schema (`content.config.ts:20-57`) and a second route is a small change.
- **If post-2020 work does not exist** → do **not** build the split. A "Selected" section sitting above an "Archive" that contains everything, where both stop at 2020, is a costume; it implies a recency that is not there. The correct structure is one dated index with a period heading.

Either way the current two-way split — `/work` and `/art`, partitioned by a
Sanity category (`recovered.md#R1.3`) — is the wrong axis. It separates the
corpus by medium when the corpus is unified by subject. Whatever replaces it
should be organised by **what the work is about**, with the medium as a secondary
label, not the primary one.

---

## Part 3 — Home page

### 3.1 What it is now

`index.js:10-27`, verified `live:/`: an `h1` of the domain, two lines of copy, six
buttons (`work`, `art`, `about`, `cv 🔒`, `github`, `linkedin`) and a mailto. No
project, no image, no date, no sentence describing the work.

### 3.2 Assessment

The **skeleton** — identity, statement, routes, contact — is sound and can carry a
redesign. The **content** cannot, because the page answers none of the three
questions a portfolio visitor asks in the first five seconds:

| Question | Answer the home page gives |
|---|---|
| What does he do? | "I make web happen - both beautiful and useful" — two adjectives, no nouns, no domain (`index.js:14`) |
| What has he made? | Nothing. Zero project content. |
| Is he current and available? | Nothing. |

The page is a **link hub**, not a portfolio home. Six buttons, three of which
(`about`, `cv`, the two socials) are not about work. That is a defensible design
for a site with a rich interior — but this site's interior is currently
unlabelled, so the hub points at unlabeled rooms.

### 3.3 What the home page needs to become

Structure and emphasis only — the art director owns how any of this looks.

1. **One line of identity.** The raw material already exists and is verbatim in the source: `cv.js:19-21` gives *"Wolf Wikgren / designer, developer, data analyst / interface, experience, data and visualization / helsinki, finland"*. The site's own name for its owner is currently "Wolf W" (`index.js:12`) while the CV says "Wolf Wikgren" — pick one and use it everywhere.
2. **One statement of position.** The through-line from 1.2. **This must be written by the owner.** I am not writing it here, and it should not be generated: it is the single sentence that carries the site's credibility, and the raw material is four verbatim quotes listed in 1.2. Assembling someone's professional thesis on their behalf is not a design decision.
3. **Two or three projects, dated, as evidence.** Drawn from the outcomes in 2.4(b). This is the one structural change that most directly answers "is he any good" — and it is the change that most needs dates to be honest first.
4. **One availability line.** Does not exist in any source. **Owner-supplied** (Appendix A, Q6). Until it exists, the mailto at `index.js:27` is the whole answer and should at least be labelled as an invitation rather than sitting under six buttons.
5. **Routes to the rest.** Keep. The current set is fine once the three non-work links are visually subordinate to the work.

### 3.4 What the home page should not become

- **A feed of all 18 projects.** The corpus is a fixed set of eighteen. A home that scrolls through it is presenting a closed archive as a stream.
- **A hero animation with no content under it.** D4's background work (`desired.md#D4.4`) is the most visible thing the redesign adds. It must not become the home page's entire argument — the current live site already has a full-viewport animated field drawing over the text (`recovered.md#R6.5`) and it has not made the site's positioning any clearer.

---

## Part 4 — `/about`

### 4.1 What it actually says

Verified `live:/about`, 2026-10-10. The complete rendered page is:

> **About me**
> (DISCLAIMER: Usually my beard ain't this hobo, my hair ain't that nappy.)
> Hi, I'm Wolf Wikgren. Below you can get to know some truths (true at the time of
> writing, not aiming for permanence) about me.
> *[one random fact]* — "get to know better" — `[——————————] 0%`

That is the whole page. **One sentence of prose about the person**, plus a joke,
plus a randomiser.

Note what is *not* there. `about.js:28` queries `_rawBio` from Sanity and **no
component in the repo ever reads it** — `spec/gaps.md#G5`. The bio exists in the
CMS; it has never been rendered, and it was never extracted. The rebuild
faithfully reproduces this (`rebuild/src/pages/about.astro:8-13` documents the
decision).

There is a second regression worth flagging: **the rebuild's `/about` renders no
portrait at all.** The legacy rendered one (`about.js:18`, `gatsby-image` at
`maxWidth: 700`), and `recovered.md#R1.5` records it as a requirement. The image
lives in `sanityAuthor.image` and was never extracted — `spec/gaps.md#G3` scoped
recovery to the 18 *projects*. `rebuild/public/images/` contains only `projects/`
and `thumbs/`. So the rebuild's About page is a heading, a caption and a
fact-revealer, with no picture.

### 4.2 Does it do its job?

**No.** A portfolio's `/about` has to answer *"who is this person, and why should
I trust them with my project."* This page answers neither. It leads with trivia and
a self-deprecating caption and contains zero professional prose.

To be fair to the content it is hiding: **the facts widget is the most
personality-dense asset on the site**, and several of the 37 entries are
substantive positions rather than trivia —
*"I believe in data-driven decisionmaking, but also believe apophenia is a bigger risk than most think."*
*"I am comfortable with complexity"*
*"I think interfaces should sometimes be more delightful than useful"*
(`rebuild/src/content/facts/wolf.json`). Read consecutively, those three read like
a design philosophy. But they are behind a randomiser with a progress bar, so a
visitor sees one or two at random and leaves. **The widget's mechanism actively
prevents the best content on the page from being read.**

### 4.3 What a stronger version must contain

1. **A real bio** — 150–250 words. **Owner-supplied.** The raw material exists and is
   substantial: the CV bullets (`cv/recent-positions.yaml`), the facts file, and the
   through-line quotes from Part 1. The existing `_rawBio` in Sanity is the natural
   starting point if it still exists — `spec/gaps.md#G5`, recoverable with the same
   export that closes G1.
2. **The portrait.** Not in the rebuild. **Owner-supplied or re-extracted** (Appendix A, Q4).
3. **Disciplines named plainly.** Data visualisation, UX/UI, front-end — `cv.js:20`, and the three named language competences at `cv/other-skills.yaml`: *"I am fluent in Finnish, Swedish and English at a native level"*. Native trilingual in the Finnish market is a genuine differentiator and it is currently buried at the bottom of a list headed "Other more/less relevant skills".
4. **The facts widget — kept, demoted.** It should be the garnish, not the page's
   primary content. Consider also offering the facts as a readable list; the
   randomiser is charming and it is not a way to read 37 statements.
5. **A decision on the caption** (`about.js:19`). It is warm and it is currently the second-most-prominent sentence on the page. Owner's call.

### 4.4 Two decisions on `/about` that only the owner can make

- **Should `/about` name his current employer?** The CV is gated; `/about` is not. Today the only public mention of the State Treasury is inside a project body (`visualizing-government.md:24`) — a passing reference, not a bio. Putting "Data analyst | Team lead at the State Treasury" on a public `/about` is a different act. It also further weakens the CV gate's premise, which is already weakened by D3.1's correct reading that the gate is a UX affordance and not a confidentiality control. There is no right answer here and it is not mine to give.
- **Should the two `hidden: true` CV entries be shown?** `cv/recent-positions.yaml` carries the 2012 TWO internship and the GRH freelance role, preserved from a JSX comment (`recovered.md#R4.3`). The GRH entry is notable because **the public contact address is `wolf@grh.fi`** (`index.js:27`) — so the site's own mailto points at an entity the CV currently suppresses. Worth an explicit call.

---

## Part 5 — The uncomfortable recommendation

### 5.1 The direct answer

**Yes, redesign the site — but the redesign is currently the fifth most valuable
thing on the table, not the first, and if it ships before the four things below it
are fixed, it will make the site worse, not better.**

The bottleneck is not how the site looks. It is that the site's content is
partly false, partly rotten, and mostly unclaimed — and a visual pass on top of
that produces a beautiful site that lies about dates, links to error pages, and
still does not say what the man does.

### 5.2 The evidence, in the order that should drive the work

**1. The rebuild currently ships a fabricated date on eighteen pages.** `[slug].astro:34` renders `2020-01-01`; `election-day-results.md:21` says "early 2015"; `kaekriaeinen.md:26` says "3/2016 and 4/2016"; `i-can-t-let-you-do-that-human.md:26` says "Spring Demo Day 2016". Parity was declared against a system that showed *no* dates (`recovered.md#R1.3`, `listItem.js:11`); the rebuild added one, and it is wrong on at least four pages. **This is a correctness bug, not a content preference, and it is the cheapest high-value fix available.** (2.1, 2.3)

**2. The site's professional argument is trapped behind its own password prompt.**
Every page a visitor can reach without a password makes no dated, verifiable
claim. The one page that does is gated. (1.1)

**3. Three of eighteen project pages are visibly abandoned and at least three
outbound links are dead.** `beyond-shape.md:26` and `ilmastonmuuttajat-climate-changers.md:16` both promise *"More content will follow, watch this space."* — six years on. `esc-som.herokuapp.com` is 404, `lukiovertailu.herokuapp.com` is 503, `käkriäinen.fi` does not respond. These are the exact failure mode of a six-year freeze and they are visible to any visitor who clicks. (1.3)

**4. Ten of eighteen summaries are truncated mid-word at 160 characters.** If the
redesign surfaces summaries as card copy — which is the single most natural
readability improvement available, and almost certainly what "readability" means
in the brief — then **56% of the cards will render broken text on launch day.**
(1.3)

**5. The strongest claim in the corpus has never been made.** Public-interest
Finnish data work, with an explicit stated commitment to showing uncertainty
rather than conclusions, is a real and current specialism. The site says "I make
web happen - both beautiful and useful". (1.2)

**6. `/about` contains one sentence of prose and, in the rebuild, no portrait.**
(4.1)

### 5.3 What "redesign" should and should not mean here

What the redesign **should** do, in content terms:
- **Date everything, honestly.** This is the one change that converts the staleness problem into a seniority signal. It requires no new work from the owner, only the dates. (2.2–2.3)
- **Reframe `/work` around the through-line**, organised by subject rather than by the legacy `Work`/`Experiment` category split. (2.5)
- **Make the home page state a position** and show two or three dated pieces of evidence. (3.3)
- **Give `/about` a bio and a portrait.** (4.3)
- **Demote the facts widget from page content to garnish.** (4.3)

What the redesign **cannot** do:
- **It cannot make 2020 into 2026.** If there is no post-2020 work, no amount of GPU-accelerated background (`desired.md#D4.4`) changes what the corpus is. The honest move is to label the period and let the dated institutional work speak — which is genuinely a strong position — rather than to present a closed archive as a live feed.
- **It cannot fix the dead links, the truncated summaries or the "watch this space" promises.** Those are content tasks with no visual component.

### 5.4 Sequencing recommendation

Cheap, high value, do first — none of it needs the art director:

| | Task | Evidence |
|---|---|---|
| 1 | Resolve `publishedAt`: Sanity export (G1), or infer from listing order + in-body years, or remove the field and render no date. **Stop shipping `2020-01-01`.** | 2.1, 2.3 |
| 2 | Fix or remove the three dead links; decide on `theseus.fi` by hand | 1.3 |
| 3 | Remove the two "watch this space" lines and finish or cut `conversions.md` | 1.3 |
| 4 | Rewrite the ten truncated `summary` fields from the full bodies (already in-repo) | 1.3 |
| 5 | Editorial pass over the five typos | 1.3 |

Then the positioning work, which does need the owner:

| | Task | Needs from owner |
|---|---|---|
| 6 | Write the position statement for the home page | sign-off on the through-line; Appendix A Q1, Q2 |
| 7 | Write the `/about` bio | Appendix A Q1, Q4, Q5 |
| 8 | Add dates to cards and project pages | Appendix A Q3 |
| 9 | Decide `Selected` / `Archive` split | Appendix A Q2 — **decides whether the split is honest** |

The visual redesign (D4) runs alongside and after. It is real work, it is
in-domain for a motion designer, and it will be the least of this site's problems
if nine does not happen.

### 5.5 The one sentence to take away

**The site's problem is not that it looks like 2019. It is that it still says
"I make web happen", shows no dates, links to three dead demos, and hides the
only page that explains who he is. Fix those and a redesign becomes the icing.
Do the redesign first and it is lipstick.**

---

## Appendix A — Facts required from the owner

None of these exist in the repository. Each is a gate on a specific decision above.

| # | Question | Gates | Where the answer should come from |
|---|---|---|---|
| Q1 | **Is the "2020 – present, Data analyst \| Team lead, The State Treasury of Finland" entry still true as of October 2026?** Last CV commit is 2022-03-23 (`gaps.md#G2`). | Everything. If true, the site has a six-year continuous senior role it barely mentions — the staleness problem is largely a presentation problem. If not, the site makes a false present-tense claim on its one dated page. | Owner. `cv/recent-positions.yaml:6-18` |
| Q2 | **Has there been any work since 2020 that is not on the site?** | Whether the `Selected` / `Archive` split is honest (2.5); the period label on `/work` | Owner |
| Q3 | **Will you authorise the Sanity export (G1) to recover `publishedAt`?** | Task 1 and 8. If not, the fallback is inference from listing order + in-body evidence, which is weaker and must be labelled as inferred. | Sanity project `5re0s6iv`, dataset `prod` |
| Q4 | **Where is the `/about` portrait?** `sanityAuthor.image` was never extracted (`gaps.md#G3` scoped recovery to projects); the rebuild renders no photo. | Task 7 | Owner, or re-extract from Sanity |
| Q5 | **Does a bio text exist in Sanity (`_rawBio`), and can it be used?** Queried at `about.js:28`, never rendered, never extracted (`gaps.md#G5`). | Task 7 — this may already be most of the answer | Sanity export |
| Q6 | **What is the availability / contact line for the home page?** None exists in any source. | Task 6, item 4 (3.3) | Owner |
| Q7 | **Should `/about` name the current employer publicly?** | 4.4 — interacts with the CV gate's premise | Owner |
| Q8 | **Should the two `hidden: true` CV entries be shown?** Note the public contact address is `wolf@grh.fi`, which points at the suppressed GRH role. | 4.4 | Owner |
| Q9 | **Which external demos are still worth linking, and do you want archive snapshots (e.g. Wayback Machine) for the dead ones?** Three confirmed dead; `theseus.fi` returns 403 to automated clients and needs a manual check. | Task 2 | Owner + a browser |

## Appendix B — Content defect register

All verified against the repo or the live site on 2026-10-10.

| # | Defect | Location | Severity |
|---|---|---|---|
| B1 | Placeholder date `2020-01-01` rendered on all 18 project pages; contradicted by the body text of at least 4 | `rebuild/src/pages/[slug].astro:34`; all `rebuild/src/content/projects/*.md` line 5; per `gaps.md#G3` | **High — ships a false statement** |
| B2 | Legacy listing chronology lost; all 18 sort as ties | `rebuild/src/components/ProjectList.astro:29`; compare `extract/live/__listing_work.html` order | High |
| B3 | `esc-som.herokuapp.com` — 404 | `eurovision-som.md:16` | High |
| B4 | `lukiovertailu.herokuapp.com` — 503 | `lukiovertailu-high-school-comparison.md:30` | High |
| B5 | `käkriäinen.fi` — no response (http and https) | `kaekriaeinen.md:34`, `:36` | High |
| B6 | `theseus.fi` — 403 to automated client, unconfirmed | `lukiovertailu-high-school-comparison.md:32` | Medium — **manual check needed; do not assume dead** |
| B7 | Two pages promise "More content will follow, watch this space." six years on | `beyond-shape.md:26`, `ilmastonmuuttajat-climate-changers.md:16` | High — visible abandonment signal |
| B8 | `conversions.md` is "To be expanded." plus two image captions | `conversions.md:21-25` | Medium |
| B9 | 10 of 18 `summary` fields truncated mid-word at 160 chars | e.g. `brb-email.md:6`, `diabetes.md:6` | **High if summaries are used as card copy** |
| B10 | Five typos in shipped copy | `election-day-results.md:23`, `kaekriaeinen.md:24`, `:30`, `runokuu-2020.md:21`, `stt-tarkkailija.md:24` | Low |
| B11 | Rebuild `/about` renders no portrait; legacy did | `rebuild/src/pages/about.astro` vs `about.js:18`, `recovered.md#R1.5` | Medium |
| B12 | Home copy and `og:description` still claim "I make (mainly) web happen - both beautiful and useful." | `index.js:14`; `rebuild/src/layouts/Layout.astro:28` | High — this is the site's entire public claim |
| B13 | Owner named "Wolf W" on home, "Wolf Wikgren" on CV | `index.js:12` vs `cv.js:19` | Low |
