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

export const IconBolt = (p: SVGProps<SVGSVGElement>) =>
  base(<path d="M13 2L4 14h6l-1 8 9-12h-6z" />, p)
export const IconStopwatch = (p: SVGProps<SVGSVGElement>) =>
  base(<path d="M9 1h6v2H9zm3 4a8 8 0 108 8 8 8 0 00-8-8zm1 8.4l-4-2.3.9-1.5L11 11.9V8h2z" />, p)
export const IconRoad = (p: SVGProps<SVGSVGElement>) =>
  base(<path d="M8 2h2l-1 20H4zm8 0h-2l1 20h5zM11 4h2v4h-2zm0 6h2v4h-2zm0 6h2v4h-2z" />, p)
export const IconBattery = (p: SVGProps<SVGSVGElement>) =>
  base(<path d="M16 4h-2V2h-4v2H8a1 1 0 00-1 1v16a1 1 0 001 1h8a1 1 0 001-1V5a1 1 0 00-1-1z" />, p)
export const IconPlug = (p: SVGProps<SVGSVGElement>) =>
  base(<path d="M16 7V2h-2v5h-4V2H8v5H6v6a5 5 0 004 4.9V22h4v-4.1a5 5 0 004-4.9V7z" />, p)
export const IconDrive = (p: SVGProps<SVGSVGElement>) =>
  base(
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 3l2 4h-4zm-7 7h4v2H5zm14 0v2h-4v-2zm-7 7l-2-4h4z" />,
    p,
  )
export const IconStop = (p: SVGProps<SVGSVGElement>) => base(<path d="M6 6h12v12H6z" />, p)
export const IconStar = (p: SVGProps<SVGSVGElement>) =>
  base(
    <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" />,
    p,
  )
export const IconStarOutline = (p: SVGProps<SVGSVGElement>) =>
  base(
    <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8zm0 4.3l-1.6 3.4-3.7.5 2.7 2.6-.7 3.7 3.3-1.8 3.3 1.8-.7-3.7 2.7-2.6-3.7-.5z" />,
    p,
  )
export const IconHelp = (p: SVGProps<SVGSVGElement>) =>
  base(
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 16h-2v-2h2zm2.1-7.7l-.9.9c-.7.7-1.2 1.3-1.2 2.8h-2v-.5c0-1.1.5-2.1 1.2-2.8l1.2-1.3a2 2 0 10-3.4-1.4h-2a4 4 0 118 .3c0 .7-.4 1.3-.9 1.9z" />,
    p,
  )
