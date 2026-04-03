import type { ReactNode } from "react";

import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import clsx from "clsx";

import HomepageFeatures from "../components/HomepageFeatures";
import styles from "./index.module.css";

export default function Home(): ReactNode {
  return (
    <Layout description="Tools born from friction. Solutions that stay.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero", styles.heroBanner)}>
      <div className="container">
        <img alt={siteConfig.title} className={styles.heroLogo} src="/img/logo.png" />
        <p className="hero__subtitle">A quiet guardian at the threshold</p>
        <hr className={styles.heroDivider} />
        <p className={styles.heroDescription}>{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/intro">
            Explore
          </Link>
        </div>
      </div>
    </header>
  );
}
