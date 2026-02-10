import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const alt = "Redakta Labs - Passiv domänanalys och klassificerad förhandsvy";

export default function OpenGraphImage() {
  const frame = {
    display: "flex",
    width: "100%",
    height: "100%",
    background: "#f8fafc",
    color: "#0f172a",
    padding: "44px",
    fontFamily: "Inter, Arial, sans-serif",
  } as const;

  const card = {
    display: "flex",
    width: "100%",
    height: "100%",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    boxShadow: "8px 8px 0 rgba(15,23,42,0.08)",
    padding: "42px",
  } as const;

  const label = {
    fontSize: 16,
    letterSpacing: "0.22em",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    color: "#64748b",
  } as const;

  const statCard = {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
    border: "1px solid #dbe4ee",
    background: "#f8fafc",
    padding: "14px 16px",
  } as const;

  return new ImageResponse(
    (
      <div style={frame}>
        <div style={card}>
          <div style={{ display: "flex", width: "100%", gap: "26px" }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={label}>REDAKTA LABS // PASSIV ANALYS</div>

              <div
                style={{
                  marginTop: "18px",
                  display: "flex",
                  flexDirection: "column",
                  fontSize: 72,
                  lineHeight: 1.03,
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                }}
              >
                <span>Passiv domänanalys</span>
                <span style={{ color: "#2563eb" }}>på under 30 sekunder.</span>
              </div>

              <div
                style={{
                  marginTop: "28px",
                  paddingLeft: "16px",
                  borderLeft: "3px solid #dbe4ee",
                  fontSize: 28,
                  lineHeight: 1.28,
                  color: "#475569",
                }}
              >
                Operativ förhandsvy baserad på öppna signaler.
              </div>

              <div style={{ display: "flex", marginTop: "auto", gap: "10px" }}>
                <span
                  style={{
                    border: "1px solid #dbe4ee",
                    background: "#ffffff",
                    padding: "8px 10px",
                    fontSize: 14,
                    textTransform: "uppercase",
                    letterSpacing: "0.16em",
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  Status: Ytanalys
                </span>
                <span
                  style={{
                    border: "1px solid #dbe4ee",
                    background: "#ffffff",
                    padding: "8px 10px",
                    fontSize: 14,
                    textTransform: "uppercase",
                    letterSpacing: "0.16em",
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  Powered by SEKURA.SE
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", width: "290px", gap: "10px" }}>
              <div style={statCard}>
                <span style={label}>Analystyp</span>
                <span style={{ fontSize: 25, textTransform: "uppercase", fontWeight: 800 }}>Passiv yta</span>
              </div>
              <div style={statCard}>
                <span style={label}>Databredd</span>
                <span style={{ fontSize: 25, textTransform: "uppercase", fontWeight: 800 }}>DNS + OSINT</span>
              </div>
              <div style={statCard}>
                <span style={label}>Leverans</span>
                <span style={{ fontSize: 25, textTransform: "uppercase", fontWeight: 800 }}>Förhandsvy</span>
              </div>
              <div
                style={{
                  ...statCard,
                  border: "1px solid #0f172a",
                  boxShadow: "4px 4px 0 rgba(15,23,42,0.15)",
                  background: "#ffffff",
                }}
              >
                <span style={label}>Länk</span>
                <span style={{ fontSize: 24, textTransform: "uppercase", fontWeight: 900 }}>redakta.nu</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
