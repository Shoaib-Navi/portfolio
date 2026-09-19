import Link from "next/link";
import Bar from "@/components/Bar";
import DocFoot from "@/components/DocFoot";

export default function NotFound() {
  return (
    <div className="site">
      <Bar back={{ href: "/", label: "Home" }} />
      <div className="doc">
        <main>
          <p className="doc__meta">404</p>
          <h1>Page not found.</h1>
          <p className="doc__lede">
            That page doesn&apos;t exist. Everything else is one click away.
          </p>
          <p>
            <Link className="cta" href="/">
              <span className="cta__fill" aria-hidden />
              <span className="cta__text">Back home</span>
              <span className="cta__icon" aria-hidden>
                →
              </span>
            </Link>
          </p>
        </main>
        <DocFoot back={{ href: "/", label: "Home" }} />
      </div>
    </div>
  );
}
