import type { ReactNode } from "react";

import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
// TODO: Remove 'as any' when @docusaurus/theme-common ships React 19 types
import HeadingLib from "@theme/Heading";
const Heading = HeadingLib as any;
import Layout from "@theme/Layout";
import clsx from "clsx";

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
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">A quiet guardian at the threshold</p>
        <p className={styles.heroDescription}>
          Tools born from friction. Solutions that stay. When you solve a problem once, it should
          never need solving again.
        </p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/intro">
            Explore
          </Link>
        </div>
      </div>
    </header>
  );
}
