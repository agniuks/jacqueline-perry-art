import Link from "next/link";

export default function BackLink() {
  return (
    <Link
      href="/"
      className="inline-block text-sm text-neutral-500 transition-colors hover:text-neutral-900"
    >
      &larr; Back to Gallery
    </Link>
  );
}
