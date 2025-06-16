// ===================================================================
// COMPONENT UTILITY - src/utils/component.ts (FIXED)
// ===================================================================

import React from 'react';
import type { ComponentPropsWithoutRef, ElementType } from 'react';

/**
 * Improved polymorphic component props utility that handles HTML/SVG differences
 */
export type PolymorphicProps<E extends ElementType> = {
  as?: E;
} & ComponentPropsWithoutRef<E>;

/**
 * Create polymorphic component with proper type constraints
 */
export function createPolymorphicComponent<DefaultElement extends ElementType>(
  defaultElement: DefaultElement
) {
  return React.forwardRef<
    React.ElementRef<DefaultElement>,
    PolymorphicProps<DefaultElement> & { children?: React.ReactNode }
  >(function PolymorphicComponent({ as, children, ...props }, ref) {
    const Component = (as || defaultElement) as ElementType;
    return React.createElement(Component, { ...props, ref }, children);
  });
}

/**
 * Better polymorphic ref type that constrains to proper element
 */
export type PolymorphicRef<T extends ElementType> = React.ComponentPropsWithRef<T>['ref'];

/**
 * Constrained polymorphic component props that prevents HTML/SVG mixing
 */
export type PolymorphicComponentProps<T extends ElementType, P = {}> = P & 
  Omit<ComponentPropsWithoutRef<T>, keyof P> & {
    as?: T;
  };

/**
 * Generate unique ID for components
 */
export function generateId(prefix = 'ui'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Compose refs utility
 */
export function composeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  return (instance: T) => {
    refs.forEach(ref => {
      if (typeof ref === 'function') {
        ref(instance);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = instance;
      }
    });
  };
}

/**
 * Debounce utility for component events
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if element is in viewport
 */
export function isInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}