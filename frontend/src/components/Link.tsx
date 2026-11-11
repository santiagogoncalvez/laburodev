import { Link as NavLink, type LinkProps as RouterLinkProps } from 'react-router'

type LinkProps = Omit<RouterLinkProps, 'to'> & { href: string }

export function Link ({ href, children, ...restOfProps }: LinkProps) {
  return (
    <NavLink to={href} {...restOfProps}>
      {children}
    </NavLink>
  )
}
