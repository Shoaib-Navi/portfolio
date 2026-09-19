import type { SkillGroup } from "@/data/profile";

export default function Tools({ group }: { group: SkillGroup }) {
  return (
    <div className="skillgroup">
      <h3>{group.label}</h3>
      <div className="s-tools">
        {group.tools.map((tool) => (
          <span key={tool.name} className={tool.logo ? "s-tool" : "s-tool s-tool--text"}>
            {tool.logo && (
              <img src={tool.logo} alt="" width={30} height={30} loading="lazy" decoding="async" />
            )}
            {tool.name}
          </span>
        ))}
      </div>
    </div>
  );
}
