/** Editable art direction for the inner project pages. Copy describes concepts, not verified results. */
export interface ProjectPresentation {
  name: string;
  subtitle: string;
  light: string; // space-separated RGB, used by the studio background
  statement: string;
  notes: { label: string; text: string }[];
}
export const projectPresentation: Record<string, ProjectPresentation> = {
  'kaaya-cafe': {
    name: 'Kaaya', subtitle: 'A café & restaurant website.', light: '220 156 96',
    statement: 'A little of the café, before you arrive.',
    notes: [
      {label:'The place',text:'A website for Kaaya, a café and restaurant.'},
      {label:'The direction',text:'Bring the character of a physical place into its online presence.'},
      {label:'A warmer welcome',text:'Hospitality shapes the visual direction: inviting, personal and easy to explore.'},
      {label:'The focus',text:'Café and restaurant identity, web design and a mobile-first experience.'},
    ],
  },
  'dolly-design-studio': {
    name: 'Dolly', subtitle: 'An agency portfolio website.', light: '214 160 92',
    statement: 'An agency introduced through its work.',
    notes: [
      {label:'The agency',text:'An agency portfolio for Dolly Design Studio, presenting its creative work.'},
      {label:'Cinema first',text:'The site presents the studio as the cover page of a book called Cinema.'},
      {label:'Gold on maroon',text:'A gold marquee logo and drifting stars give the site a classic film mood.'},
      {label:'The foundation',text:'Web design, portfolio structure and SEO form the project’s focus.'},
    ],
  },
  'unicre8': {
    name: 'UC8', subtitle: 'A digital marketing agency website.', light: '240 132 52',
    statement: 'Make the brand stop the scroll.',
    notes: [
      {label:'The agency',text:'UniCre8 is a digital marketing agency, bringing marketing, content and web together.'},
      {label:'One place',text:'From shoots and edits to design and the website, the brand’s work is handled in one place.'},
      {label:'The work table',text:'A filterable work table presents the agency’s client projects.'},
      {label:'The foundation',text:'Web design, development and motion for the agency’s own site.'},
    ],
  },
  'ka': {
    name: 'KA', subtitle: 'A creative portfolio website.', light: '232 88 64',
    statement: 'Visual stories. Crafted with intention.',
    notes: [
      {label:'Art meets engineering',text:'Graphic design, UI/UX, full-stack apps and robotics, presented in one portfolio.'},
      {label:'Film publicity',text:'Campaign and publicity design for theatrical releases sits beside interface and brand work.'},
      {label:'A crafted opening',text:'The site opens on the KA mark, lit like crystal.'},
      {label:'The foundation',text:'Design, motion and code in one personal site.'},
    ],
  },
};
