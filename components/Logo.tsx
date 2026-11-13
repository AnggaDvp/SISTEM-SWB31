// Logo SWB31 — replika dari aset perusahaan: "SWB31" merah tebal miring + "NSS FINANCE" hitam.
// Bila file public/swb31-logo.png ada, komponen akan memakai gambar itu; selain itu pakai SVG.
type Props = {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** "light" dipakai di atas latar merah/gelap (teks menjadi putih). */
  variant?: "default" | "light";
};

const DIM = { sm: 110, md: 150, lg: 200 } as const;

export default function Logo({ size = "md", className = "", variant = "default" }: Props) {
  const w = DIM[size];
  const h = Math.round(w * 0.42);
  const brand = variant === "light" ? "#ffffff" : "#e2001a";
  const sub = variant === "light" ? "rgba(255,255,255,.92)" : "#111111";
  return (
    <span className={`logo ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <svg width={w} height={h} viewBox="0 0 300 126" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SWB31 NSS Finance">
        <text
          x="4"
          y="74"
          fontFamily="Arial Black, Arial, sans-serif"
          fontSize="78"
          fontWeight="900"
          fontStyle="italic"
          fill={brand}
          letterSpacing="-2"
        >
          SWB31
        </text>
        <text
          x="42"
          y="112"
          fontFamily="Arial Black, Arial, sans-serif"
          fontSize="30"
          fontWeight="900"
          fill={sub}
          letterSpacing="3"
        >
          NSS FINANCE
        </text>
      </svg>
    </span>
  );
}
