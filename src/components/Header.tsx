import Link from "next/link";

export default function Header() {
  return (
    <header className="py-10 text-center">
      <Link href="/">
        <h1 className="text-lg font-light uppercase tracking-[0.3em] text-neutral-900">
          Jacqueline Perry Art
        </h1>
      </Link>
    </header>
  );
}
