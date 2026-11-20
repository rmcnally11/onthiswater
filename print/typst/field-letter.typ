// Scout print sheet. Does not replace PrintSheet in components/house-art.tsx
// or the @media print rules in app/globals.css.
//
// Compile from the repo root:
//   typst compile --root . --font-path print/typst/fonts \
//     --ignore-system-fonts --ignore-embedded-fonts \
//     print/typst/field-letter.typ print/typst/sample/field-letter.pdf

#let data = json("/print/typst/sample/letter-print.json")

#let paper = rgb("#F4EBD8")
#let ink = rgb("#4A4742")
#let sky = rgb("#EECBCD")
#let peach = rgb("#EED2C5")
#let sun = rgb("#F3E095")
#let teal = rgb("#85BCB1")
#let sand = rgb("#E7D3A2")
#let hull = rgb("#99825E")
#let green = rgb("#9A9D56")
#let wash = (peach, sand, sun, sky)

#set document(title: data.title, author: "On This Water")
#set smartquote(enabled: false)
#set text(font: "Geist", size: 10.5pt, fill: ink, hyphenate: false)
#set par(leading: 0.55em, spacing: 0.65em)

#show link: it => underline(text(fill: hull, it), stroke: 0.4pt + hull)

#set page(
  paper: "us-letter",
  fill: paper,
  margin: (top: 0.62in, bottom: 0.52in, x: 0.55in),
  numbering: none,
  header: context {
    if counter(page).get().first() > 1 [
      #grid(
        columns: (auto, 1fr, auto),
        column-gutter: 8pt,
        align: horizon,
        image("/public/art/logo-v2-64.png", width: 16pt),
        text(font: "Newsreader", size: 11pt, fill: ink)[On This Water],
        text(font: "Geist", size: 8pt, fill: hull)[#data.weekLabel],
      )
      #v(3pt)
      #line(length: 100%, stroke: 0.6pt + teal)
    ]
  },
  footer: context [
    #line(length: 100%, stroke: 0.4pt + sand)
    #v(4pt)
    #grid(
      columns: (1fr, auto),
      column-gutter: 10pt,
      align: horizon,
      link(data.newsletter)[#data.newsletter],
      text(font: "Geist", size: 8pt, fill: hull)[#data.weekLabel · #counter(page).display("1")],
    )
  ],
)

#let kicker(label, tint: green) = text(
  font: "Geist",
  size: 8pt,
  weight: 600,
  tracking: 0.16em,
  fill: tint,
  upper(label),
)

#let water-card(desk, tint) = block(
  width: 100%,
  fill: tint,
  inset: 9pt,
  radius: 6pt,
  breakable: false,
)[
  #kicker(desk.desk)
  #v(2pt)
  #text(font: "Newsreader", size: 14pt, fill: ink)[#desk.name]
  #h(0.35em)
  #text(font: "Geist", size: 8pt, fill: hull)[#desk.kicker]
  #if desk.headline != none [
    #v(3pt)
    #text(font: "Newsreader", size: 11pt)[#desk.headline]
  ] else if desk.error != none [
    #v(3pt)
    #text(size: 9pt, fill: hull)[#desk.error]
  ]
  #if desk.conditions != none [
    #v(2pt)
    #text(size: 9pt)[#desk.conditions]
  ]
  #if desk.window != none [
    #v(2pt)
    #text(size: 8.5pt)[#text(font: "Geist", weight: 600, fill: hull)[Window. ]#desk.window]
  ]
  #if desk.inPlay.len() > 0 [
    #v(2pt)
    #text(size: 8pt, fill: hull)[#desk.inPlay.join(" · ")]
  ]
  #if desk.why != none and desk.why.len() > 0 [
    #v(3pt)
    #for line in desk.why [
      #text(size: 8pt)[— #line]
      #linebreak()
    ]
  ]
  #if desk.seasonal != none [
    #text(size: 8pt, fill: hull)[#desk.seasonal]
  ]
  #if desk.hab != none [
    #v(2pt)
    #text(size: 8.5pt)[#desk.hab]
  ]
]

#block(
  width: 100%,
  fill: peach,
  inset: (x: 12pt, y: 10pt),
  radius: 8pt,
)[
  #grid(
    columns: (auto, 1fr, auto),
    column-gutter: 10pt,
    align: horizon,
    image("/public/art/logo-v2-128.png", width: 36pt),
    [
      #text(font: "Newsreader", size: 16pt, fill: ink)[On This Water]
      #v(2pt)
      #kicker("Saturday on your water")
    ],
    align(right)[
      #kicker("Vol. 1")
      #v(1pt)
      #text(font: "Newsreader", size: 14pt, fill: ink)[No. #data.weekNumber]
    ],
  )
]

#v(12pt)
#text(font: "Newsreader", size: 26pt, fill: ink)[#{data.title}.]
#v(4pt)
#line(length: 100%, stroke: 1.5pt + teal)
#v(6pt)
#text(font: "Geist", size: 9pt, fill: hull)[#data.meta]
#v(2pt)
#text(font: "Geist", size: 9pt)[Permalink: #link(data.permalink)[#data.permalink]]
#v(8pt)

#box(width: 100%, height: 1.02in, radius: 6pt, clip: true)[
  #image("/public/art/sheet-header.jpg", width: 100%, height: 1.02in, fit: "cover")
]

#v(10pt)
#text(font: "Newsreader", size: 13pt, fill: ink)[#data.letter]

#v(12pt)
#block(
  width: 100%,
  fill: sky,
  inset: 12pt,
  radius: 8pt,
  breakable: false,
)[
  #kicker(data.lead.desk)
  #v(3pt)
  #text(font: "Newsreader", size: 22pt, fill: ink)[#data.lead.name]
  #h(0.4em)
  #text(font: "Geist", size: 9pt, fill: hull)[#data.lead.kicker]
  #if data.lead.headline != none [
    #v(6pt)
    #text(font: "Newsreader", size: 14pt)[#data.lead.headline]
  ]
  #if data.lead.conditions != none [
    #v(4pt)
    #text(size: 10.5pt)[#data.lead.conditions]
  ]
  #if data.lead.window != none [
    #v(3pt)
    #text(size: 10pt)[#text(weight: 600, fill: hull)[Window. ]#data.lead.window]
  ]
  #if data.lead.moon != none [
    #v(2pt)
    #text(size: 10pt, fill: hull)[#data.lead.moon]
  ]
  #if data.lead.inPlay.len() > 0 [
    #v(4pt)
    #text(size: 9.5pt)[#data.lead.inPlay.join(" · ")]
  ]
  #if data.lead.why.len() > 0 [
    #v(4pt)
    #for line in data.lead.why [
      #text(size: 9.5pt)[— #line]
      #linebreak()
    ]
  ]
  #if data.lead.seasonal != none [
    #v(2pt)
    #text(size: 9.5pt, fill: hull)[#data.lead.seasonal]
  ]
  #if data.lead.hab != none [
    #v(3pt)
    #text(size: 9.5pt)[#data.lead.hab]
  ]
]

#pagebreak(weak: true)
#kicker(data.edition)
#v(2pt)
#text(font: "Newsreader", size: 18pt)[#data.weekHeading]
#v(8pt)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 8pt,
  row-gutter: 8pt,
  ..data.waters.enumerate().map(pair => {
    let index = pair.first()
    let desk = pair.last()
    water-card(desk, wash.at(calc.rem(index, wash.len())))
  }),
)

#v(16pt)
#kicker("The month · " + data.monthName)
#v(2pt)
#text(font: "Newsreader", size: 18pt)[In peak this month]
#v(8pt)
#if data.peaks.len() == 0 [
  No primary species is marked peak this month. Check present fish on the
  #link("https://www.onthiswater.com/fundamentals")[season page].
] else [
  #for peak in data.peaks [
    #block(breakable: false, inset: (bottom: 7pt))[
      #text(font: "Newsreader", size: 13pt)[#peak.name]
      #linebreak()
      #text(font: "Geist", size: 8pt, fill: hull)[#peak.theaters]
      #v(1pt)
      #text(size: 9pt)[#peak.why]
    ]
  ]
]

#v(6pt)
#block(width: 100%, fill: sun, inset: 11pt, radius: 8pt, breakable: false)[
  #kicker("Rules")
  #v(2pt)
  #text(font: "Newsreader", size: 16pt)[Closed or closing]
  #v(6pt)
  #if data.closures.len() == 0 [
    No coast-wide harvest closure is on the board this week. Still verify before you keep a fish.
  ] else [
    #for closure in data.closures [
      #block(breakable: false, inset: (bottom: 7pt))[
        #text(font: "Newsreader", size: 12pt, fill: hull)[#closure.title]
        #v(1pt)
        #text(size: 9.5pt)[#closure.body]
      ]
    ]
  ]
]

#v(10pt)
#block(width: 100%, fill: sand, inset: 11pt, radius: 8pt)[
  #text(font: "Newsreader", size: 12pt, style: "italic")[#data.disclaimer]
  #v(4pt)
  #link(data.newsletter)[#data.newsletter]
]
