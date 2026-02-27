import { Artwork } from "@/lib/types";

export default function ArtworkDetails({ artwork }: { artwork: Artwork }) {
  const specEntries = Object.entries(artwork.specs).filter(
    ([, value]) => value !== undefined && value !== ""
  );

  return (
    <div>
      <h1 className="text-2xl font-light text-neutral-900">{artwork.title}</h1>
      <p className="mt-2 text-lg text-neutral-500">{artwork.price}</p>
      {artwork.description && (
        <p className="mt-6 text-sm leading-relaxed text-neutral-700">
          {artwork.description}
        </p>
      )}
      {specEntries.length > 0 && (
        <ul className="mt-6 space-y-2">
          {specEntries.map(([key, value]) => (
            <li key={key} className="text-sm text-neutral-600">
              <span className="font-medium capitalize text-neutral-900">
                {key}:
              </span>{" "}
              {value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
