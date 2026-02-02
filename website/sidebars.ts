import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    { type: 'doc', id: 'intro', label: 'Introducción' },
    { type: 'doc', id: 'getting-started', label: 'Getting Started' },
    { type: 'doc', id: 'architecture', label: 'Arquitectura' },
    { type: 'doc', id: 'contributing', label: 'Contribuir' },
  ],
};

export default sidebars;
