# Content to supply / confirm

Search the code for `[PLACEHOLDER` and `[CONFIRM` to find every instance. All copy lives in `src/content/`.

## Brand (`src/content/site.ts`)
- [ ] Studio email (`brand.email`): used for the `mailto:` fallback
- [ ] Final domain (`brand.siteUrl`), and update `index.html` canonical/OG URLs, `public/robots.txt` and `public/sitemap.xml`

## About (`sections.ts → about`)
- [ ] Review `about.body`: now describes the existing services without unconfirmed location or team details
- [ ] Review the three prism philosophy lines

## Skills (`sections.ts → skills`), CONFIRM
- [ ] Tool lists per facet (I added TypeScript, Tailwind, Computer vision, Typography and Art direction; remove any that do not apply)

## Services
- [ ] Review the outcome lines

## Projects (`projects.ts`), every project needs `[CONFIRM public / permission]`
For each of Kaaya Cafe, Dolly Design Studio, Delivery robot (SN15), and Amuse:
- [ ] Permission to show publicly
- [ ] Cover image (16:10, ≥ 1600 px wide, put in `public/work/` and set `cover`)
- [ ] One-line outcome
- [ ] Idea / Delivered text + timeline step texts
- [ ] Live URL (optional)

## Process (`sections.ts → processSteps`)
- [ ] Typical timeframe for each of the 6 steps

## Contact
- [ ] Optional budget ranges (currency and bands); the form currently accepts a free-text budget
- [ ] Cloudflare env vars: `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM` (verified sender domain in Resend)

## Added in the page redesign
- [ ] `skills.ts`: tools copied from kethan.pages.dev without a note there (Streamlit, Render, Netlify, MySQL, Cloudflare R2, ipstack, DevOps & tools, AI tools, Python libraries, RViz, Inference, Validation, Datasets) have short notes written for this site — review

## Site refinement
- Contact displays **Kethan Artzz** and links to the existing LinkedIn profile until the studio email is supplied.
- Unconfirmed process timings remain in the source and are omitted from the public page.
- Contact delivery still requires the Cloudflare environment variables above. Failure preserves the message and offers the configured email or LinkedIn link.
