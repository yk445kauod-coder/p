import React from "react";
import Svg, { Path, Circle, Rect } from "react-native-svg";

export function TabIcon({ name, color, size = 24 }: { name: string; color: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24" };
  switch (name) {
    case "home":
      return (
        <Svg {...common}>
          <Path d="M4 11 L12 4 L20 11 L20 20 L4 20 Z" stroke={color} strokeWidth={1.9} fill="none" strokeLinejoin="round" />
          <Rect x={10} y={14} width={4} height={6} stroke={color} strokeWidth={1.6} fill="none" />
        </Svg>
      );
    case "library":
      return (
        <Svg {...common}>
          <Rect x={4} y={4} width={4} height={16} rx={1} stroke={color} strokeWidth={1.8} fill="none" />
          <Rect x={10} y={4} width={4} height={16} rx={1} stroke={color} strokeWidth={1.8} fill="none" />
          <Path d="M16 5 L20 6 L17 20 L15 19 Z" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
        </Svg>
      );
    case "stats":
      return (
        <Svg {...common}>
          <Path d="M5 19 L5 11 M12 19 L12 5 M19 19 L19 14" stroke={color} strokeWidth={2.1} strokeLinecap="round" />
        </Svg>
      );
    case "profile":
      return (
        <Svg {...common}>
          <Circle cx={12} cy={8.5} r={3.6} stroke={color} strokeWidth={1.9} fill="none" />
          <Path d="M5 20 C5 15.6 8.1 13.6 12 13.6 C15.9 13.6 19 15.6 19 20" stroke={color} strokeWidth={1.9} fill="none" strokeLinecap="round" />
        </Svg>
      );
    default:
      return null;
  }
}
