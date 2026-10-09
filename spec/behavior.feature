# language: en
# Behavioural specification — wolfw.xyz
#
# Zone: RECOVERED (must be preserved)
#
# There is no test suite in the legacy repo (gaps.md#G8), so these scenarios
# executable against the LIVE site are the only parity ground truth available.
# Run them against https://wolfw.xyz before and after a rebuild; they are the
# definition of "same features".
#
# Not yet run. Gherkin + a runner is Study 1's remaining work.
# Each scenario cites the source of the claim it encodes.

Feature: Navigation and routing
  As a visitor
  I can reach every top-level section of the site
  So that I can find what I am looking for

  Scenario: Home page links to all four internal sections
    Given I am on /
    Then I can reach /work
    And I can reach /art
    And I can reach /about
    And I can reach /cv
    # index.js:19-24

  Scenario: Home page links to external profiles with safe rel attributes
    Given I am on /
    Then the github link targets github.com/KODHAGe
    And the linkedin link targets linkedin.com/in/wwwolf/
    And both external links carry target="_blank"
    And both external links carry rel="noopener noreferrer"
    # index.js:25-26

  Scenario: A contact mail link is present on the home page
    Given I am on /
    Then a mailto:wolf@grh.fi link is present
    # index.js:27

  Scenario: Subpages navigate back through history, not by re-routing
    Given I have arrived at /work from /about
    And I activate the "← BACK" control
    Then the previous entry in history is shown
    And the control does not navigate to /
    # about.js:11-16, work.js:10-15, art.js:10-15, cv.js:10-14, projectPage.js:12-17

  Scenario: Back control degrades to a plain link without JavaScript
    Given JavaScript is unavailable
    And I am on /work
    Then the back control is an anchor with href="/"
    # all five backlink sites carry href="/" alongside the preventDefault handler

  Scenario: Unknown paths return the 404 page
    When I request /this-does-not-exist
    Then the response status is 404
    And the page offers a link to the front page
    # live:/nope — verified 2026-10-08; 404.js:11


Feature: Project listings
  As a visitor
  I can browse projects by category
  So that I can find relevant work

  Scenario: Work page lists projects tagged Web or Visualization
    Given I am on /work
    Then every listed project has a category of "Web" or "Visualization"
    And projects are ordered by publication date, newest first
    # work.js:25

  Scenario: Art page lists projects tagged Experiment
    Given I am on /art
    Then every listed project has a category of "Experiment"
    And projects are ordered by publication date, newest first
    # art.js:25

  Scenario: Listings are backed by the CMS, not by files in the repository
    Given the Sanity dataset were unreachable
    Then the site would not build
    And no project content exists in the repository itself
    # gatsby-config.js:28-41 — no fallback content source

  Scenario: Each card shows category, title and a trailing arrow
    Given I am on /work
    Then each card reads "{category}: {title} →"
    # listItem.js:11

  Scenario: Projects with "agency" in the title are marked as locked
    Given a project title contains "agency"
    Then its card is prefixed with a lock glyph
    And this matching is case-insensitive
    # listItem.js:23-29

  Scenario: A project card links to its own detail page
    Given I am on /art
    And I follow the card for "Beyond Shape"
    Then I arrive at /beyond-shape
    # live:/art — verified 2026-10-08


Feature: Project detail pages
  As a visitor
  I can read about an individual project
  So that I can assess someone's capability

  Scenario: Detail pages exist at the project's own slug
    Given a project has slug "election-day-results"
    Then a page exists at /election-day-results
    And it renders the project title as a heading
    # gatsby-node.js:46; live:/election-day-results — verified 2026-10-08

  Scenario: Video plays automatically, silently and without controls
    Given a project has a mainVideo asset
    Then an embedded player is rendered
    And it is muted
    And it autoplays
    And it shows no controls
    # projectPage.js:20-26

  Scenario: Projects without video render no player
    Given a project has no mainVideo asset
    Then no player element is rendered
    And the page renders normally
    # projectPage.js:19 — conditional guard

  Scenario: Body content renders as rich text with images at bounded width
    Given a project has body content
    Then the body renders as block content
    And embedded images are constrained to 640px
    # projectPage.js:32-37

  Scenario: Body content renders at a different width than list thumbnails
    Given a project has both a main image and body images
    Then the list thumbnail is fluid at max width 700
    And the body images render at width 640
    # work.js:46, art.js:46 vs projectPage.js:34 — inconsistent, but current behaviour


Feature: Password gate
  As the site owner
  I can restrict the CV and client work
  So that some pages are not public

  Scenario: The CV is not publicly readable
    When I visit /cv without a password
    Then I am shown a password prompt
    And I do not see the CV content
    # live:/cv — verified 2026-10-08, gate confirmed live

  Scenario: Submitting a password writes a cookie and reloads
    Given I am at the password prompt
    And I submit a password
    Then a cookie named "gatsby-theme-password-protect" is written
    And the page reloads
    # PasswordProtect.js:13-17; utils.js:4, 6-8

  Scenario: The gate offers a way out and a way to ask
    Given I am at the password prompt
    Then a link back to the front page is offered
    And a mailto link to request access is offered
    # PasswordProtect.js:33-35

  Scenario: The gate never reads the password back on the client
    Given the password has been written to a cookie
    Then no client-side comparison of the submitted value occurs
    # utils.js:6-8 — write-only; getSessionPassword (utils.js:10-12) is defined but unused

  Scenario: The front page is never gated
    Given I visit /
    Then no password prompt is shown
    Even when partial matching is enabled
    # utils.js:23-25 — explicit index-page exemption

  @defect
  Scenario: The configured password is currently undefined
    Given the deployment defines NOT_VERY_SECRET
    And the site reads GATSBY_NO_SECRET
    Then the theme receives no password value
    # gatsby-config.js:22 vs now.json:4 — names do not match. Recovered.md#R5.5.
    # Do not replicate. Decide deliberately what protects /cv.

  @gap
  Scenario: URL-parameter access may bypass the gate
    Given a protected page is requested with ?secret=<value>
    Then access may be granted without the password form
    # utils.js:14-17 defines the parser; consumption unconfirmed. gaps.md#G6


Feature: Facts widget
  As a visitor to the about page
  I can reveal facts about the site owner one at a time
  So that I learn something unexpected

  Scenario: A fact is shown before any interaction
    Given I am on /about
    Then one fact is displayed
    And a progress indicator shows zero percent complete
    # facts.js:10 (initial state = first fact), facts.js:42-46

  Scenario: Each press reveals a fact not previously shown
    Given I press "get to know better"
    Then a fact is displayed
    And that fact has not been shown before
    # facts.js:13-16 — rejection sampling

  Scenario: The progress bar fills as facts are revealed
    Given the widget contains 37 facts
    And I have revealed 18
    Then the indicator shows approximately halfway
    # facts.js:20-24 — ten cells, floor(((n-1)/(len-1))*10)

  Scenario: The widget exhausts rather than repeating
    Given I have revealed every fact
    Then the control becomes a mailto link inviting a fact from the reader
    And the message changes to say all facts are available
    # facts.js:26-27, facts.js:40

  Scenario: A fact is never shown twice in one session
    Given facts remain unrevealed
    Then repeated presses always yield distinct facts
    # facts.js:13-16

  @defect
  Scenario: The widget breaks if only one fact is configured
    Given the fact list contains exactly one entry
    Then the progress computation divides by zero
    # facts.js:20 and facts.js:44 — divides by (facts.length - 1). Recovered.md#R7.3


Feature: Background
  As a visitor
  I see an animated-feeling graphical backdrop
  So that the site has a distinct atmosphere

  Scenario: A full-viewport SVG backdrop renders behind page content
    Given I am on any page
    Then an SVG element is present behind the main content
    # layout.js:13-14; background.js:23

  Scenario: The backdrop is composed of seven groups of sine curves
    Given the backdrop has rendered
    Then it contains seven grouped elements
    And each group contains one or more sine-curve paths
    # background.js:24-30; group sizes 1,10,7,7,2,10,6 per background.js:37-119

  Scenario: Paths are dashed rather than solid
    Given a path has rendered
    Then it uses a dashed stroke with round line caps
    # backgroundElement.js:38-40

  Scenario: Layout differs on every load
    Given I load any page twice
    Then positions, stroke widths, dash patterns and curve geometry differ
    # background.js:121-125 — getRandomIntAround returns a random value in [0.5v, 1.5v];
    # background.js:12-18 — positions randomised per load

  Scenario: Backdrop geometry is deferred until after mount
    Given the page is server-rendered
    Then the backdrop renders no groups
    And groups appear only after hydration
    # background.js:7-8 — useLayoutEffect plus browser state gate


Feature: CV
  As a reader
  I can read a full CV and print it
  So that I can assess fit for a role

  Scenario: The CV is organised into titled sections
    Given I am on /cv
    Then I see a "Recent positions" section
    And I see an "Education" section
    And I see a "Skills" section
    # cvList.js:11, 72, 86

  Scenario: Each entry shows dates, company, position and a description
    Given I am reading a CV entry
    Then it shows the date range
    And it shows the company
    And it shows the position
    And it shows a description
    # cvListItem.js:7-16

  Scenario: Optional fields are absent rather than blank
    Given an entry has no client list or keywords
    Then those fields render as empty rather than as labels
    # cvListItem.js:26-31 — defaults to ""

  Scenario: The CV can be printed
    Given I am on /cv
    And I press the print control
    Then the browser print dialog opens
    # cv.js:24 — window.print()

  Scenario: Printed output is styled
    Given the CV is printed
    Then print-specific styles apply
    And page margins are set
    # layout.css contains @page and @media print blocks.
    # Contents unspec'd — gaps.md#G10


Feature: Presentation and metadata
  As anyone
  I get correct titles, descriptions and an installable icon
  So that the site presents itself properly

  Scenario: Every page sets a title with a site suffix
    Given I am on any page
    Then the document title is "{page} | wolfw.xyz"
    # seo.js:36 — "%s | {siteTitle}"

  Scenario: Social and description metadata is present
    Given I am on any page
    Then Open Graph title, description and type are set
    And a Twitter card and creator are set
    And a description meta tag is present
    # seo.js:37-69

  Scenario: Pages fall back to the site description
    Given a page supplies no description of its own
    Then the site-level description is used
    # seo.js:28; gatsby-config.js:4

  Scenario: The site is installable as a PWA
    Given I visit the site
    Then a web manifest is served
    And it declares a theme colour of #663399
    And it declares nine icon sizes
    # gatsby-config.js:52-63; live:/manifest.webmanifest

  Scenario: A single typeface is used throughout
    Given I view any page
    Then all text renders in Necto Mono
    # fonts/fonts.css:1-7 — self-hosted woff2 and woff

  Scenario: Some pages render in whitebox mode
    Given I am on /about, /cv, or the password prompt
    Then the page renders in the alternate layout mode
    And other pages do not
    # layout.js:8-18; whitebox="true" at about.js:9, cv.js:9, PasswordProtect.js:20

  Scenario: Decorative emoji carry accessible labels
    Given I view the home page or CV with a screen reader
    Then the lock emoji is announced as "locked"
    And the print emoji is announced as "print icon"
    # index.js:24, cv.js:24 — role="img" aria-label
