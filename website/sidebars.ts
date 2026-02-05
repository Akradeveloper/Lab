import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    { type: 'doc', id: 'intro', label: 'Introducción' },
    { type: 'doc', id: 'getting-started', label: 'Getting Started' },
    { type: 'doc', id: 'environment', label: 'Variables de entorno' },
    { type: 'doc', id: 'architecture', label: 'Arquitectura' },
    { type: 'doc', id: 'guia-alumno', label: 'Guía del alumno' },
    { type: 'doc', id: 'guia-admin', label: 'Guía del administrador' },
    { type: 'doc', id: 'contributing', label: 'Contribuir' },
  ],
};

export default sidebars;
