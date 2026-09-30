/** Small outline icons used in the header (24px grid, currentColor). */
const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const UserIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
  </svg>
);

export const BagIcon = () => (
  <svg {...base}>
    <path d="M5 8h14l-1 13H6L5 8z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const HomeIcon = () => (
  <svg {...base}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9.5z" />
  </svg>
);

export const PinIcon = () => (
  <svg {...base}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

export const CartIcon = () => (
  <svg {...base}>
    <path d="M3 4h2l2.4 11h10.2L20 7H6.2" />
    <circle cx="9" cy="19.5" r="1.3" />
    <circle cx="17" cy="19.5" r="1.3" />
  </svg>
);

export const BoxIcon = () => (
  <svg {...base} width={32} height={32}>
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <path d="M10 4v5l2-1.2L14 9V4" />
  </svg>
);

export const RocketIcon = () => (
  <svg {...base} width={32} height={32}>
    <path d="M14 4c3.5-.8 5.8.2 6 .5.3.2 1.3 2.5.5 6-.6 2.7-3.3 5.3-6.5 7l-4.5-4.5c1.7-3.2 4.3-5.9 7-6.5" />
    <circle cx="15.5" cy="8.5" r="1.8" />
    <path d="M9.5 13.5 6 13l2.5-3.5 3 .5M13 17.5l.5 3.5 3.5-2.5-.5-3M7 17l-3 3M8.5 18.5 6 21M5.5 15.5 3 18" />
  </svg>
);

export const StoreIcon = () => (
  <svg {...base} width={32} height={32}>
    <path d="M4 9 5.5 4h13L20 9M4 9v11h16V9M4 9h16" />
    <path d="M10 20v-6h4v6" />
  </svg>
);

export const TruckIcon = () => (
  <svg {...base} width={32} height={32}>
    <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
    <circle cx="7" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </svg>
);

export const PackageIcon = () => (
  <svg {...base} width={20} height={20}>
    <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3z" />
    <path d="M4 7.5 12 12l8-4.5M12 12v9M8 5.3l8 4.5" />
  </svg>
);

export const HeartIcon = () => (
  <svg {...base} width={20} height={20}>
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z" />
  </svg>
);

export const GearIcon = () => (
  <svg {...base} width={20} height={20}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

export const LogoutIcon = () => (
  <svg {...base} width={20} height={20}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

export const ChevronIcon = () => (
  <svg {...base} width={18} height={18}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
