import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <p className="text-5xl" aria-hidden>🧭</p>
      <h1 className="mt-2 text-xl font-black">העמוד לא נמצא · Page not found</h1>
      <Link href="/" className="btn btn-primary mt-4">PokéTrade</Link>
    </div>
  );
}
