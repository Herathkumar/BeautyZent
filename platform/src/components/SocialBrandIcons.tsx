/** Compact brand marks for Instagram / Facebook contact rows. */

export function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2Zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2Z" />
      <path d="M17.5 6.1a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0Z" />
      <path d="M12 2.5c-2.6 0-2.9 0-3.9.1-2.6.1-4 1.5-4.1 4.1-.1 1 0 1.3 0 3.9s0 2.9.1 3.9c.1 2.6 1.5 4 4.1 4.1 1 .1 1.3 0 3.9 0s2.9 0 3.9-.1c2.6-.1 4-1.5 4.1-4.1.1-1 0-1.3 0-3.9s0-2.9-.1-3.9c-.1-2.6-1.5-4-4.1-4.1-1-.1-1.3 0-3.9 0Zm0 1.5c2.5 0 2.8 0 3.8.1 1.9.1 2.8 1 2.9 2.9.1 1 0 1.3 0 3.8s0 2.8-.1 3.8c-.1 1.9-1 2.8-2.9 2.9-1 .1-1.3 0-3.8 0s-2.8 0-3.8-.1c-1.9-.1-2.8-1-2.9-2.9-.1-1 0-1.3 0-3.8s0-2.8.1-3.8c.1-1.9 1-2.8 2.9-2.9 1-.1 1.3 0 3.8 0Z" />
    </svg>
  );
}

export function FacebookIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M22 12.07C22 6.53 17.52 2 12 2S2 6.53 2 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.91h2.54V9.84c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22c4.78-.75 8.44-4.91 8.44-9.93Z" />
    </svg>
  );
}
