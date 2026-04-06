import Svg, { Path, Circle, Line, Polyline, Rect } from 'react-native-svg';

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconHome({ width = 24, height = 24, color = 'currentColor', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Path stroke={color} strokeWidth={strokeWidth} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </Svg>
  );
}

export function IconPill({ width = 24, height = 24, color = 'currentColor', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Path stroke={color} strokeWidth={strokeWidth} d="M10.5 20.5L3.5 13.5a4.95 4.95 0 117-7l7 7a4.95 4.95 0 11-7 7z" />
      <Line stroke={color} strokeWidth={strokeWidth} x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
    </Svg>
  );
}

export function IconUsers({ width = 24, height = 24, color = 'currentColor', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Path stroke={color} strokeWidth={strokeWidth} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <Circle stroke={color} strokeWidth={strokeWidth} cx="9" cy="7" r="4" />
      <Path stroke={color} strokeWidth={strokeWidth} d="M23 21v-2a4 4 0 00-3-3.87" />
      <Path stroke={color} strokeWidth={strokeWidth} d="M16 3.13a4 4 0 010 7.75" />
    </Svg>
  );
}

export function IconGroup({ width = 24, height = 24, color = 'currentColor', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Path stroke={color} strokeWidth={strokeWidth} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </Svg>
  );
}

export function IconBell({ width = 24, height = 24, color = 'currentColor', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Path stroke={color} strokeWidth={strokeWidth} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path stroke={color} strokeWidth={strokeWidth} d="M13.73 21a2 2 0 01-3.46 0" />
    </Svg>
  );
}

export function IconChevronRight({ width = 24, height = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Path stroke={color} strokeWidth={strokeWidth} d="M9 18l6-6-6-6" />
    </Svg>
  );
}

export function IconChevronDown({ width = 24, height = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Path stroke={color} strokeWidth={strokeWidth} d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function IconPlus({ width = 24, height = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Line stroke={color} strokeWidth={strokeWidth} x1="12" y1="5" x2="12" y2="19" />
      <Line stroke={color} strokeWidth={strokeWidth} x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  );
}

export function IconX({ width = 24, height = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Line stroke={color} strokeWidth={strokeWidth} x1="18" y1="6" x2="6" y2="18" />
      <Line stroke={color} strokeWidth={strokeWidth} x1="6" y1="6" x2="18" y2="18" />
    </Svg>
  );
}

export function IconCheck({ width = 24, height = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Polyline stroke={color} strokeWidth={strokeWidth} points="20 6 9 17 4 12" />
    </Svg>
  );
}

export function IconAlertTriangle({ width = 24, height = 24, color = 'currentColor', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Path stroke={color} strokeWidth={strokeWidth} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <Line stroke={color} strokeWidth={strokeWidth} x1="12" y1="9" x2="12" y2="13" />
      <Line stroke={color} strokeWidth={strokeWidth} x1="12" y1="17" x2="12.01" y2="17" />
    </Svg>
  );
}

export function IconPencil({ width = 24, height = 24, color = 'currentColor', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Path stroke={color} strokeWidth={strokeWidth} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <Path stroke={color} strokeWidth={strokeWidth} d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Svg>
  );
}

export function IconTrash({ width = 24, height = 24, color = 'currentColor', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Polyline stroke={color} strokeWidth={strokeWidth} points="3 6 5 6 21 6" />
      <Path stroke={color} strokeWidth={strokeWidth} d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </Svg>
  );
}

export function IconCamera({ width = 24, height = 24, color = 'currentColor', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Path stroke={color} strokeWidth={strokeWidth} d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <Circle stroke={color} strokeWidth={strokeWidth} cx="12" cy="13" r="4" />
    </Svg>
  );
}

export function IconLogOut({ width = 24, height = 24, color = 'currentColor', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Path stroke={color} strokeWidth={strokeWidth} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </Svg>
  );
}

export function IconRefresh({ width = 24, height = 24, color = 'currentColor', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Polyline stroke={color} strokeWidth={strokeWidth} points="23 4 23 10 17 10" />
      <Polyline stroke={color} strokeWidth={strokeWidth} points="1 20 1 14 7 14" />
      <Path stroke={color} strokeWidth={strokeWidth} d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </Svg>
  );
}

export function IconClock({ width = 24, height = 24, color = 'currentColor', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Circle stroke={color} strokeWidth={strokeWidth} cx="12" cy="12" r="10" />
      <Polyline stroke={color} strokeWidth={strokeWidth} points="12 6 12 12 16 14" />
    </Svg>
  );
}

export function IconCopy({ width = 24, height = 24, color = 'currentColor', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Rect stroke={color} strokeWidth={strokeWidth} x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <Path stroke={color} strokeWidth={strokeWidth} d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </Svg>
  );
}

export function IconPackage({ width = 24, height = 24, color = 'currentColor', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg {...base} width={width} height={height}>
      <Path stroke={color} strokeWidth={strokeWidth} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </Svg>
  );
}
