import type { ReactNode } from "react";

// TODO: Remove 'as any' when @docusaurus/theme-common ships React 19 types
import HeadingLib from "@theme/Heading";
const Heading = HeadingLib as any;
import styles from "./styles.module.css";

interface FeatureItem {
  description: ReactNode;
  title: string;
}

const FeatureList: FeatureItem[] = [
  {
    description: (
      <>
        Born from production chunk errors that plagued real apps. Automatic retry with cache
        busting, beacon error reporting — retry logic refined over months of observation, not
        guesswork.
      </>
    ),
    title: "SPA Guard",
  },
  {
    description: (
      <>
        No more runtime route errors. Type-safe React Router v7 wrapper with valibot validation and
        typed params. Solve the repeated pain of route mistakes once and for all.
      </>
    ),
    title: "Type-Safe Routing",
  },
  {
    description: (
      <>
        Pre-configured Fastify with observability, zero-config package cleanup, shared linting.
        Opinionated solutions that don&apos;t disappear into old projects.
      </>
    ),
    title: "Developer Utilities",
  },
];

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Feature({ description, title }: FeatureItem) {
  return (
    <div className="col col--4">
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}
