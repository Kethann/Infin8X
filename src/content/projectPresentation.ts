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
    name: 'Dolly', subtitle: 'A home for the studio’s work.', light: '196 116 122',
    statement: 'Let the portfolio lead.',
    notes: [
      {label:'Studio identity',text:'The website brings the studio’s portfolio and visual identity into one place.'},
      {label:'Editorial space',text:'Large type and open layouts keep the portfolio easy to browse.'},
      {label:'Material contrast',text:'Sculptural forms and warm colours frame the work.'},
      {label:'The foundation',text:'Web design, portfolio structure and SEO form the project’s focus.'},
    ],
  },
  'delivery-robot-sn15': {
    name: 'SN15', subtitle: 'Exploring autonomous indoor delivery.', light: '153 144 228',
    statement: 'Map the space. Plan the route.',
    notes: [
      {label:'Indoor delivery',text:'The project explores how a robot can navigate indoors to deliver items.'},
      {label:'Spatial awareness',text:'Mapping records the space; localisation identifies the robot’s position within it.'},
      {label:'Navigation',text:'Path planning finds a route from the robot’s position to its destination.'},
      {label:'The foundation',text:'ROS 2, navigation and computer vision underpin this robotics exploration.'},
    ],
  },
  'amuse-portfolio': {
    name: 'Amuse', subtitle: 'Creative work, type and motion.', light: '113 178 232',
    statement: 'A portfolio with room to explore.',
    notes: [
      {label:'Creative collection',text:'The concept brings different creative projects into one portfolio.'},
      {label:'Type in focus',text:'Expressive lettering gives the portfolio its visual character.'},
      {label:'A sense of movement',text:'Orbiting forms add motion and depth around the central identity.'},
      {label:'The foundation',text:'Portfolio design and motion define the concept.'},
    ],
  },
};
