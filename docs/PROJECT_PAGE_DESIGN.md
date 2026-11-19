# Editing the project pages

All four inner pages share `src/pages/CaseStudy.tsx`.

- Edit names, subtitles, introductory statements, detail notes and each project's RGB lighting colour in `src/content/projectPresentation.ts`.
- Edit underlying project titles, summaries, tags, cover image paths and links in `src/content/projects.ts`.
- Adjust the shared finish in `src/styles/case-study.css`. The first rule exposes `--case-light-strength`, `--case-radius` and `--case-entry-duration`. Set light strength to `0` to remove the coloured atmosphere.
- The project visuals come from `src/sections/ProjectCover.tsx`. A real cover image in project data replaces the conceptual artwork. Keep conceptual artwork labelled as such; add delivery results only after they have been verified.

The background uses layered studio-light gradients and a subtle horizon. Entry motion runs once, uses opacity and transforms, and switches off for reduced motion. No additional WebGL context, image dependency, continuous render loop or pointer tracking is added. The home intro and its logo geometry remain independent.

Check with `npm run build` and `node scripts/check-case-design.mjs`. The latter exercises all four routes at mobile, tablet and desktop sizes, including next/back navigation, project anchors and reduced motion.
