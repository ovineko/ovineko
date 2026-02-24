import type { ComponentProps } from "react";
import { useMemo } from "react";

import { getOptions } from "@ovineko/spa-guard/_internal";

type SpinnerProps = Omit<ComponentProps<"div">, "children" | "dangerouslySetInnerHTML">;

/**
 * Renders the spa-guard spinner inside a div.
 * Returns null if spinner is disabled or no content available.
 * All div props forwarded to wrapper element.
 */
export function Spinner(props: SpinnerProps): null | React.ReactElement {
  const opts = getOptions();
  const content = opts.spinner?.disabled ? undefined : opts.spinner?.content;

  const innerHtml = useMemo(() => (content ? { __html: content } : null), [content]);

  if (!innerHtml) {
    return null;
  }

  return <div {...props} dangerouslySetInnerHTML={innerHtml} />;
}
