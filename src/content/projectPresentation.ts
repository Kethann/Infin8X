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
    name: 'Kaaya', subtitle: 'From table to menu, with a scan.', light: '220 156 96',
    statement: 'Ordering starts at the table.',
    notes: [
      {label:'At the table',text:'Guests scan a QR code to open the menu on their phone.'},
      {label:'Made for mobile',text:'A mobile layout guides guests through browsing the menu and placing an order.'},
      {label:'A warmer interface',text:'Coffee tones and generous spacing give the menu a warm, readable feel.'},
      {label:'The foundation',text:'React, QR access and a mobile-first approach define the project’s scope.'},
    ],
  },
  'dolly-design-studio': {
    name: 'Dolly', subtitle: 'Posters, title design, typography and logos.', light: '214 160 92',
    statement: 'The cover page of cinema.',
    notes: [
      {label:'The studio',text:'Dolly Design Studio specialises in film publicity and title design.'},
      {label:'Cinema first',text:'The site presents the studio as the cover page of a book called Cinema.'},
      {label:'Gold on maroon',text:'A gold marquee logo and drifting stars give the site a classic film mood.'},
      {label:'The foundation',text:'Web design, portfolio structure and SEO form the project’s focus.'},
    ],
  },
  'unicre8': {
    name: 'UC8', subtitle: 'Marketing, content and web in one place.', light: '240 132 52',
    statement: 'Make the brand stop the scroll.',
    notes: [
      {label:'The studio',text:'UniCre8 is a digital marketing, content and web studio.'},
      {label:'One place',text:'From shoots and edits to design and the website, the brand’s work is handled in one place.'},
      {label:'The work table',text:'A filterable work table presents the studio’s client projects.'},
      {label:'The foundation',text:'Web design, development and motion for the studio’s own site.'},
    ],
  },
  'ka': {
    name: 'KA', subtitle: 'Ideas, unfolded.', light: '232 88 64',
    statement: 'Visual stories. Crafted with intention.',
    notes: [
      {label:'Art meets engineering',text:'Graphic design, UI/UX, full-stack apps and robotics, presented in one portfolio.'},
      {label:'Film publicity',text:'Campaign and publicity design for theatrical releases sits beside interface and brand work.'},
      {label:'A crafted opening',text:'The site opens on the KA mark, lit like crystal.'},
      {label:'The foundation',text:'Design, motion and code in one personal site.'},
    ],
  },
};
