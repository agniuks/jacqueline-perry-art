import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h2 className="text-2xl font-light text-neutral-900">Page Not Found</h2>
      <p className="mt-3 text-sm text-neutral-500">
        The artwork you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-6 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
      >
        &larr; Back to Gallery
      </Link>
    </div>
  );
}
