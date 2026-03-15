import { PropsWithChildren, Ref } from "react";
import { Link } from "react-router-dom";

export function LinkComponent({
  href,
  ref,
  ...rest
}: PropsWithChildren<{ href: string; ref?: Ref<HTMLAnchorElement> }>) {
  return <Link ref={ref} to={href} {...rest} />;
}
