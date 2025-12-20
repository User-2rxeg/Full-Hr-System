declare module 'next/link' {
  import { ComponentProps, ReactNode } from 'react';

  type LinkProps = {
    href: string | { pathname?: string; query?: Record<string, string | string[]> };
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    prefetch?: boolean;
    locale?: string | false;
    legacyBehavior?: boolean;
    children?: ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  } & Omit<ComponentProps<'a'>, 'href' | 'children'>;

  export default function Link(props: LinkProps): JSX.Element;
}

