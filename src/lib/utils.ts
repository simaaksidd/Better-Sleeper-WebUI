import { SLEEPER_CDN } from "./constants";

export function playerImageUrl(playerId: string): string {
  return `${SLEEPER_CDN}/content/nfl/players/${playerId}.jpg`;
}

export function avatarUrl(avatarId: string | null): string | null {
  if (!avatarId) return null;
  return `${SLEEPER_CDN}/avatars/${avatarId}`;
}

export function fantasyPoints(fpts: number, fptsDecimal: number): number {
  return fpts + fptsDecimal / 100;
}

export function formatRecord(w: number, l: number, t: number): string {
  if (t > 0) return `${w}-${l}-${t}`;
  return `${w}-${l}`;
}

export function scoringType(rec: number | undefined): string {
  if (rec === 1) return "PPR";
  if (rec === 0.5) return "Half PPR";
  return "Standard";
}
