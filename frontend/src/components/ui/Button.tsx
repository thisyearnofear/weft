"use client";

import React from "react";
import Link from "next/link";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "nav" | "navGhost";
type ButtonSize = "sm" | "md";

interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

interface LinkButtonProps extends BaseButtonProps {
  href: string;
  external?: boolean;
  onClick?: () => void;
}

interface PlainButtonProps extends BaseButtonProps {
  onClick?: () => void;
  disabled?: boolean;
}

export type ButtonProps = LinkButtonProps | PlainButtonProps;

function isLink(props: ButtonProps): props is LinkButtonProps {
  return "href" in props;
}

export const Button = React.forwardRef<HTMLAnchorElement | HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    const { variant = "primary", size = "md", children, className = "", ariaLabel } = props;
    const classes = `${styles.btn} ${styles[variant]} ${styles[size]} ${className}`;

    if (isLink(props)) {
      const { href, external, onClick } = props;

      if (external) {
        return (
          <a
            ref={ref as React.Ref<HTMLAnchorElement>}
            href={href}
            className={classes}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
            aria-label={ariaLabel}
          >
            {children}
          </a>
        );
      }

      return (
        <Link
          href={href}
          className={classes}
          onClick={onClick}
          ref={ref as React.Ref<HTMLAnchorElement>}
          aria-label={ariaLabel}
        >
          {children}
        </Link>
      );
    }

    const { onClick, disabled } = props;

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        className={classes}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
