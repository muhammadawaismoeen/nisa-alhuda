/**
 * Auth layout — pass-through. Each auth page wraps its own content in
 * <AuthShell> which owns the split-screen framing, decorative panel, and
 * animations. Keeping the layout thin means we don't stack two cards.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
