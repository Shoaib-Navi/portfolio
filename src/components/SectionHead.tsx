export default function SectionHead({
  kicker,
  title,
  lede,
}: {
  kicker: string;
  title: string;
  lede?: string;
}) {
  return (
    <div className="section__head reveal">
      <p className="eyebrow">{kicker}</p>
      <h2>{title}</h2>
      {lede && <p>{lede}</p>}
    </div>
  );
}
