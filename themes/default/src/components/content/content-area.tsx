"use client";

import React from "react";
import { useThemeSettings } from "../../hooks/use-theme-settings";

interface ContentAreaProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  background?: boolean;
}

export default function ContentArea({
  children,
  className = "",
  padding = true,
  background = false,
}: ContentAreaProps) {
  const { settings } = useThemeSettings();
  const contentSpacing = settings.content_spacing || 2;

  const areaClasses = `
    ${background ? "bg-card border border-border rounded-lg" : ""}
    ${padding ? `p-${Math.round(contentSpacing * 4)}` : ""}
    ${className}
  `.trim();

  return (
    <div
      className={areaClasses}
      style={
        {
          "--content-spacing": `${contentSpacing}rem`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
