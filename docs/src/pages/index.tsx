import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={styles.heroBanner}>
      <div className={clsx('container', styles.container)}>
        <section>
          <img
            alt="Testmex logo"
            className={styles.heroLogo}
            src={useBaseUrl('/img/logo.svg')}
            height="220"
          />
          <p className={styles.heroTitle}>TESTMEX</p>
          <p className={styles.heroTagline}>{siteConfig.tagline}</p>
        </section>
        <div className={styles.buttons}>
          <Link
            className={clsx(
              'button button--secondary button--lg',
              styles.button,
            )}
            to="/docs/intro"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Features() {
  const features = [
    {
      title: 'JEST → VITEST',
      description:
        'Automated migration recipes for moving test suites from Jest to Vitest.',
    },
    {
      title: 'SAFE & INCREMENTAL',
      description:
        'Migrate file by file with confidence — no big-bang rewrite required.',
    },
    {
      title: 'OPEN SOURCE',
      description:
        'Built by the community, for teams modernizing their test tooling.',
    },
  ];

  return (
    <section className={styles.featuresSection}>
      <h2>WHY TESTMEX</h2>
      <div className={styles.featuresGrid}>
        {features.map(({ title, description }) => (
          <article
            key={title}
            className={clsx('card shadow--lt', styles.featureCard)}
          >
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      wrapperClassName={styles.wrapper}
      title={siteConfig.title}
      description={siteConfig.tagline}
    >
      <HomepageHeader />
      <main>
        <Features />
      </main>
    </Layout>
  );
}
