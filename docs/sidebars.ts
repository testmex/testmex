import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Vitestify',
      collapsed: false,
      items: [
        'vitestify/getting-started',
        'vitestify/why-vitestify',
        'vitestify/future-work',
      ],
    },
  ],
};

export default sidebars;
