import type { ReactNode, SVGProps } from 'react'

const base = (children: ReactNode, p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" {...p}>
    {children}
  </svg>
)

export const IconPlay = (p: SVGProps<SVGSVGElement>) => base(<path d="M8 5v14l11-7z" />, p)
export const IconPause = (p: SVGProps<SVGSVGElement>) =>
  base(<path d="M6 5h4v14H6zM14 5h4v14h-4z" />, p)
export const IconNext = (p: SVGProps<SVGSVGElement>) =>
  base(<path d="M6 5v14l9-7zM16 5h2v14h-2z" />, p)
export const IconPrev = (p: SVGProps<SVGSVGElement>) =>
  base(<path d="M18 5v14l-9-7zM6 5h2v14H6z" />, p)
export const IconShuffle = (p: SVGProps<SVGSVGElement>) =>
  base(
    <path d="M16 4l4 4-4 4V9h-2.6l-2.2 3L9 15H4v-2h4l2-3-2-3H4V5h5l2.2 3 2.2 3H16zm0 8l4 4-4 4v-3h-2.6l-2.2-3 1.2-1.6L13.4 16H16z" />,
    p,
  )
export const IconRepeat = (p: SVGProps<SVGSVGElement>) =>
  base(<path d="M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z" />, p)
export const IconVolume = (p: SVGProps<SVGSVGElement>) =>
  base(
    <path d="M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0014 8v8a4.5 4.5 0 002.5-4zM14 3.2v2.1a7 7 0 010 13.4v2.1a9 9 0 000-17.6z" />,
    p,
  )
export const IconChevronLeft = (p: SVGProps<SVGSVGElement>) =>
  base(<path d="M15.4 5.4L14 4l-8 8 8 8 1.4-1.4L8.8 12z" />, p)
export const IconChevronRight = (p: SVGProps<SVGSVGElement>) =>
  base(<path d="M8.6 5.4L10 4l8 8-8 8-1.4-1.4 6.6-6.6z" />, p)
export const IconArrowUp = (p: SVGProps<SVGSVGElement>) =>
  base(<path d="M12 4l8 9h-5v7H9v-7H4z" />, p)
export const IconArrowDown = (p: SVGProps<SVGSVGElement>) =>
  base(<path d="M12 20l-8-9h5V4h6v7h5z" />, p)
