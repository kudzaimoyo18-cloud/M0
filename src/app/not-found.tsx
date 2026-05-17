import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70svh] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-display text-display">404</h1>
        <p className="mt-4 text-ink-500">This page does not exist.</p>
        <Link href="/" className="btn-secondary mt-8">Go home</Link>
      </div>
    </div>
  );
}
